
const form = document.getElementById("form-transacao");
const campoDescricao = document.getElementById("descricao");
const campoValor = document.getElementById("valor");
const campoTipo = document.getElementById("tipo");
const campoCategoria = document.getElementById("categoria");
const campoData = document.getElementById("data");

const saldoElemento = document.getElementById("saldo");
const receitasElemento = document.getElementById("receitas");
const despesasElemento = document.getElementById("despesas");
const listaTransacoes = document.getElementById("lista-transacoes");

// Retorna a data de hoje no formato AAAA-MM-DD
function obterDataLocal() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

campoData.value = obterDataLocal();

// Recupera os lançamentos salvos no navegador
let transacoes = [];

try {
    const dadosSalvos = JSON.parse(
        localStorage.getItem("transacoes-financeiras") || "[]"
    );

    if (Array.isArray(dadosSalvos)) {
        transacoes = dadosSalvos.filter((item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.descricao === "string" &&
            Number.isFinite(item.valor) &&
            item.valor > 0 &&
            ["receita", "despesa"].includes(item.tipo)
        );
    }
} catch (erro) {
    console.error("Não foi possível recuperar os lançamentos.", erro);
}

// Completa categoria e data nos lançamentos antigos
transacoes = transacoes.map((item) => ({
    ...item,
    categoria: item.categoria || "outros",
    data: item.data || obterDataLocal()
}));

// Aceita qualquer formato: 1500 | 1.500 | 1500,50 | 1.500,50 | 1500.50 | R$ 1.500,00
function converterValor(texto) {
    let limpo = texto.replace(/R\$|\s/g, "");

    if (!/^[\d.,]+$/.test(limpo)) {
        return NaN;
    }

    const temPonto = limpo.includes(".");
    const temVirgula = limpo.includes(",");

    if (temPonto && temVirgula) {
        // O separador que aparece por último é o decimal
        if (limpo.lastIndexOf(",") > limpo.lastIndexOf(".")) {
            limpo = limpo.replace(/\./g, "").replace(",", ".");   // 1.500,50
        } else {
            limpo = limpo.replace(/,/g, "");                      // 1,500.50
        }
    } else if (temVirgula) {
        // Só vírgula: decimal (150,5) ou milhar repetido (1,500,000)
        limpo = (limpo.match(/,/g).length > 1)
            ? limpo.replace(/,/g, "")
            : limpo.replace(",", ".");
    } else if (temPonto) {
        const partes = limpo.split(".");
        const ultimaParte = partes[partes.length - 1];

        // Vários pontos, ou um ponto seguido de 3 dígitos, é milhar
        if (partes.length > 2 || ultimaParte.length === 3) {
            limpo = limpo.replace(/\./g, "");
        }
    }

    return Number(limpo);
}

// Formata os valores em reais
function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// Salva os lançamentos no navegador
function salvarTransacoes() {
    try {
        localStorage.setItem(
            "transacoes-financeiras",
            JSON.stringify(transacoes)
        );
    } catch (erro) {
        alert("Não foi possível salvar os dados no navegador.");
        console.error(erro);
    }
}

// Atualiza os cartões de resumo
function atualizarResumo() {
    const receitas = transacoes
        .filter((item) => item.tipo === "receita")
        .reduce((total, item) => total + item.valor, 0);

    const despesas = transacoes
        .filter((item) => item.tipo === "despesa")
        .reduce((total, item) => total + item.valor, 0);

    const saldo = receitas - despesas;

    saldoElemento.textContent = formatarMoeda(saldo);
    receitasElemento.textContent = formatarMoeda(receitas);
    despesasElemento.textContent = formatarMoeda(despesas);

    saldoElemento.style.color =
        saldo < 0 ? "var(--despesa)" : "var(--texto)";

    receitasElemento.style.color = "var(--receita)";
    despesasElemento.style.color = "var(--despesa)";
}

const nomesCategorias = {
    alimentacao: "Alimentação",
    transporte: "Transporte",
    moradia: "Moradia",
    saude: "Saúde",
    lazer: "Lazer",
    educacao: "Educação",
    salario: "Salário",
    outros: "Outros"
};

// Mostra os lançamentos na tela
function mostrarTransacoes() {
    listaTransacoes.replaceChildren();

    if (transacoes.length === 0) {
        const mensagem = document.createElement("li");
        mensagem.textContent = "Nenhum lançamento cadastrado.";
        listaTransacoes.appendChild(mensagem);
        return;
    }

    // Mostra os lançamentos mais recentes primeiro
    [...transacoes].reverse().forEach((transacao) => {
        const item = document.createElement("li");
        const informacoes = document.createElement("div");
        const detalhes = document.createElement("div");
        const descricao = document.createElement("strong");
        const categoria = document.createElement("small");
        const data = document.createElement("small");
        const valor = document.createElement("span");
        const excluir = document.createElement("button");

        descricao.textContent = transacao.descricao;

        categoria.textContent =
            nomesCategorias[transacao.categoria] || "Outros";

        data.textContent = transacao.data
            ? transacao.data.split("-").reverse().join("/")
            : "Sem data";

        detalhes.style.display = "flex";
        detalhes.style.flexDirection = "column";
        detalhes.style.gap = "5px";

        categoria.style.color = "var(--texto-secundario)";
        data.style.color = "var(--texto-secundario)";

        detalhes.append(descricao, categoria, data);

        valor.textContent =
            `${transacao.tipo === "receita" ? "+" : "-"} ` +
            formatarMoeda(transacao.valor);

        valor.style.color =
            transacao.tipo === "receita"
                ? "var(--receita)"
                : "var(--despesa)";

        informacoes.style.display = "flex";
        informacoes.style.justifyContent = "space-between";
        informacoes.style.alignItems = "center";
        informacoes.style.gap = "12px";
        informacoes.style.flexWrap = "wrap";

        informacoes.append(detalhes, valor);

        excluir.type = "button";
        excluir.textContent = "Excluir";
        excluir.style.marginTop = "8px";
        excluir.style.padding = "6px 10px";
        excluir.style.cursor = "pointer";
        excluir.setAttribute(
            "aria-label",
            `Excluir lançamento: ${transacao.descricao}`
        );

        excluir.addEventListener("click", () => {
            transacoes = transacoes.filter(
                (outra) => outra.id !== transacao.id
            );

            salvarTransacoes();
            atualizarDashboard();
        });

        item.append(informacoes, excluir);
        listaTransacoes.appendChild(item);
    });
}

// Atualiza todas as informações do dashboard
function atualizarDashboard() {
    atualizarResumo();
    mostrarTransacoes();
}

// Cadastra uma receita ou despesa
form.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const descricao = campoDescricao.value.trim();
    const valor = converterValor(campoValor.value);
    const tipo = campoTipo.value;

    if (!descricao) {
        alert("Digite a descrição do lançamento.");
        campoDescricao.focus();
        return;
    }

    if (!Number.isFinite(valor) || valor <= 0) {
        alert("Digite um valor maior que zero.");
        campoValor.focus();
        return;
    }

    if (!["receita", "despesa"].includes(tipo)) {
        alert("Selecione um tipo de lançamento válido.");
        return;
    }

    const novaTransacao = {
        id: crypto.randomUUID(),
        descricao: descricao,
        valor: Math.round(valor * 100) / 100,
        tipo: tipo,
        categoria: campoCategoria.value,
        data: campoData.value || obterDataLocal()
    };

    transacoes.push(novaTransacao);

    salvarTransacoes();
    atualizarDashboard();

    form.reset();
    campoData.value = obterDataLocal();
    campoDescricao.focus();
});

// Inicializa o dashboard
atualizarDashboard();
