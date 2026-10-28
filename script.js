
/* ==========================
   ELEMENTOS DA PÁGINA
========================== */

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

const coresCategorias = [
    "#2563eb",
    "#16a34a",
    "#f59e0b",
    "#dc2626",
    "#8b5cf6",
    "#0891b2",
    "#ec4899",
    "#64748b"
];

// Instâncias dos gráficos (declaradas antes de qualquer chamada)
let graficoComparativo = null;
let graficoCategorias = null;

/* ==========================
   FUNÇÕES AUXILIARES
========================== */

// Retorna a data de hoje no formato AAAA-MM-DD
function obterDataLocal() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

// Formata os valores em reais
function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

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

/* ==========================
   DADOS (LOCALSTORAGE)
========================== */

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

function somarPorTipo(tipo) {
    return transacoes
        .filter((item) => item.tipo === tipo)
        .reduce((total, item) => total + item.valor, 0);
}

/* ==========================
   RESUMO
========================== */

function atualizarResumo() {
    const receitas = somarPorTipo("receita");
    const despesas = somarPorTipo("despesa");
    const saldo = receitas - despesas;

    saldoElemento.textContent = formatarMoeda(saldo);
    receitasElemento.textContent = formatarMoeda(receitas);
    despesasElemento.textContent = formatarMoeda(despesas);

    saldoElemento.style.color =
        saldo < 0 ? "var(--despesa)" : "var(--texto)";

    receitasElemento.style.color = "var(--receita)";
    despesasElemento.style.color = "var(--despesa)";
}

/* ==========================
   GRÁFICOS
========================== */

function atualizarGraficos() {
    if (typeof Chart === "undefined") {
        console.warn("Chart.js não foi carregado. Os gráficos não serão exibidos.");
        return;
    }

    const receitas = somarPorTipo("receita");
    const despesas = somarPorTipo("despesa");

    // Gráfico 1: Receitas x Despesas
    const canvasComparativo = document.getElementById("graficoComparativo");

    if (canvasComparativo) {
        if (!graficoComparativo) {
            graficoComparativo = new Chart(canvasComparativo, {
                type: "bar",
                data: {
                    labels: ["Receitas", "Despesas"],
                    datasets: [{
                        label: "Valor em reais",
                        data: [receitas, despesas],
                        backgroundColor: ["#16a34a", "#dc2626"],
                        borderRadius: 8,
                        maxBarThickness: 70
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (contexto) => formatarMoeda(contexto.raw)
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (valor) => formatarMoeda(valor)
                            },
                            grid: { color: "#e2e8f0" }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        } else {
            graficoComparativo.data.datasets[0].data = [receitas, despesas];
            graficoComparativo.update();
        }
    }

    // Gráfico 2: Despesas por categoria
    const canvasCategorias = document.getElementById("graficoCategorias");

    if (canvasCategorias) {
        const totais = {};

        transacoes
            .filter((item) => item.tipo === "despesa")
            .forEach((item) => {
                const categoria = item.categoria || "outros";
                totais[categoria] = (totais[categoria] || 0) + item.valor;
            });

        const categorias = Object.keys(totais);
        const temDespesas = categorias.length > 0;

        // Sem despesas: mostra um anel cinza em vez de um gráfico vazio
        const rotulos = temDespesas
            ? categorias.map((c) => nomesCategorias[c] || "Outros")
            : ["Sem despesas"];

        const valores = temDespesas
            ? categorias.map((c) => totais[c])
            : [1];

        const cores = temDespesas
            ? categorias.map((_, i) => coresCategorias[i % coresCategorias.length])
            : ["#e2e8f0"];

        if (!graficoCategorias) {
            graficoCategorias = new Chart(canvasCategorias, {
                type: "doughnut",
                data: {
                    labels: rotulos,
                    datasets: [{
                        data: valores,
                        backgroundColor: cores,
                        borderWidth: 3,
                        borderColor: "#ffffff",
                        hoverOffset: 7
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "65%",
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: {
                                usePointStyle: true,
                                padding: 18
                            }
                        },
                        tooltip: {
                            enabled: temDespesas,
                            callbacks: {
                                label: (contexto) =>
                                    `${contexto.label}: ${formatarMoeda(contexto.raw)}`
                            }
                        }
                    }
                }
            });
        } else {
            graficoCategorias.data.labels = rotulos;
            graficoCategorias.data.datasets[0].data = valores;
            graficoCategorias.data.datasets[0].backgroundColor = cores;
            graficoCategorias.options.plugins.tooltip.enabled = temDespesas;
            graficoCategorias.update();
        }
    }
}

/* ==========================
   HISTÓRICO
========================== */

function mostrarTransacoes() {
    listaTransacoes.replaceChildren();

    if (transacoes.length === 0) {
        const mensagem = document.createElement("li");
        mensagem.textContent = "Nenhum lançamento cadastrado.";
        listaTransacoes.appendChild(mensagem);
        return;
    }

    // Mais recentes primeiro: ordena pela data e, em empate, pelo último cadastrado
    const ordenadas = [...transacoes]
        .reverse()
        .sort((a, b) => b.data.localeCompare(a.data));

    ordenadas.forEach((transacao) => {
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

/* ==========================
   DASHBOARD (ATUALIZA TUDO)
========================== */

function atualizarDashboard() {
    atualizarResumo();
    atualizarGraficos();
    mostrarTransacoes();
}

/* ==========================
   FORMULÁRIO
========================== */

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

    transacoes.push({
        id: crypto.randomUUID(),
        descricao: descricao,
        valor: Math.round(valor * 100) / 100,
        tipo: tipo,
        categoria: campoCategoria.value,
        data: campoData.value || obterDataLocal()
    });

    salvarTransacoes();
    atualizarDashboard();

    form.reset();
    campoData.value = obterDataLocal();
    campoDescricao.focus();
});

/* ==========================
   MENU LATERAL
========================== */

const linksMenu = document.querySelectorAll(".menu-link");

const secoesMenu = [
    document.getElementById("inicio"),
    document.getElementById("resumo"),
    document.getElementById("formulario"),
    document.getElementById("historico")
].filter(Boolean);

function marcarLinkAtivo(idSecao) {
    linksMenu.forEach((link) => {
        link.classList.toggle(
            "ativo",
            link.getAttribute("href") === `#${idSecao}`
        );
    });
}

// Destaca o link clicado
linksMenu.forEach((link) => {
    link.addEventListener("click", () => {
        marcarLinkAtivo(link.getAttribute("href").slice(1));
    });
});

// Atualiza o destaque conforme a seção visível
if ("IntersectionObserver" in window) {
    const observador = new IntersectionObserver((entradas) => {
        const visiveis = entradas
            .filter((entrada) => entrada.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visiveis.length > 0) {
            marcarLinkAtivo(visiveis[0].target.id);
        }
    }, {
        rootMargin: "-10% 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1]
    });

    secoesMenu.forEach((secao) => observador.observe(secao));
}

// No fim da página, marca "Histórico" (a última seção nem sempre chega ao topo)
window.addEventListener("scroll", () => {
    const fimDaPagina =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;

    if (fimDaPagina) {
        marcarLinkAtivo("historico");
    }
}, { passive: true });

/* ==========================
   INICIALIZAÇÃO
========================== */

campoData.value = obterDataLocal();
atualizarDashboard();