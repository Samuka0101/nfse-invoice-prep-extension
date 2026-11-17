const $ = (id) => document.getElementById(id);
const NETSUPPORT_ORIGIN = "https://nssupport.netsupport.com.br/";
const NFSE_ORIGIN = "https://www.nfse.gov.br/";

function normalizar(texto) {
  return (texto || "").replace(/\s+/g, " ").trim();
}

function dataIso(dataBr) {
  const match = dataBr?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

function competenciaDaReferencia(referencia) {
  const match = referencia.match(/^(\d{4})-(\d{2})-/);
  if (!match) return "";
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${meses[Number(match[2]) - 1]}/${match[1]}`;
}

function mostrarDados(dados) {
  if (!dados) return;
  $("dados").hidden = false;
  $("referencia").textContent = dados.referencia;
  $("competencia").textContent = dados.competencia;
  $("valor").textContent = dados.valor;
  $("descricao").textContent = dados.descricao;
}

async function dadosSalvos() {
  return (await chrome.storage.local.get("cicloPendente")).cicloPendente;
}

async function contextoAtual() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";
  if (url.startsWith(NETSUPPORT_ORIGIN)) {
    $("contexto").textContent = "NetSupport detectada";
    $("captura").hidden = false;
  } else if (url.startsWith(NFSE_ORIGIN)) {
    $("contexto").textContent = "Emissor Nacional detectado";
    const salvo = await dadosSalvos();
    if (!salvo) $("mensagem").textContent = "Capture primeiro um ciclo na NetSupport.";
  } else {
    $("contexto").textContent = "Abra a NetSupport ou o Emissor Nacional.";
  }
  mostrarDados(await dadosSalvos());
  return tab;
}

async function capturar() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith(NETSUPPORT_ORIGIN)) {
    $("mensagem").textContent = "Abra o Extrato de Pagamentos da NetSupport antes de capturar.";
    return;
  }
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const texto = (el) => (el?.innerText || "").replace(/\s+/g, " ").trim();
      const botoes = [...document.querySelectorAll("button, a")];
      const botaoNota = botoes.find((el) => /nota fiscal/i.test(texto(el)));
      if (!botaoNota) return { erro: "Nenhum ciclo com botão Nota Fiscal foi encontrado." };
      const alvo = botaoNota.getBoundingClientRect();
      const centroY = alvo.top + alvo.height / 2;
      const visivel = (el) => {
        const r = el.getBoundingClientRect();
        const estilo = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && estilo.display !== "none" && estilo.visibility !== "hidden";
      };
      const candidatos = [...document.querySelectorAll("body *")].filter(visivel);
      const maisProximo = (regex) => candidatos
        .map((el) => {
          const conteudo = texto(el);
          const r = el.getBoundingClientRect();
          const distancia = Math.abs((r.top + r.height / 2) - centroY);
          return { conteudo, distancia, tamanho: conteudo.length };
        })
        .filter((item) => regex.test(item.conteudo) && item.tamanho < 180)
        .sort((a, b) => (a.distancia - b.distancia) || (a.tamanho - b.tamanho))[0]?.conteudo || "";

      const textoData = maisProximo(/\b\d{2}\/\d{2}\/\d{4}\b/);
      const textoValor = maisProximo(/R\$\s*[\d.]+,\d{2}/);
      const datas = [...textoData.matchAll(/\b\d{2}\/\d{2}\/\d{4}\b/g)].map((m) => m[0]);
      const valores = [...textoValor.matchAll(/R\$\s*[\d.]+,\d{2}/g)].map((m) => m[0]);
      return { data: datas.at(-1) || datas[0] || "", valor: valores.at(-1) || "" };
    }
  });

  if (result.erro) {
    $("mensagem").textContent = result.erro;
    return;
  }
  const referencia = dataIso(result.data);
  const competencia = competenciaDaReferencia(referencia);
  const dados = {
    referencia,
    competencia,
    valor: normalizar(result.valor),
    descricao: `Serviço prestado em ${competencia} | Ciclo referência: ${referencia}`,
    capturadoEm: new Date().toISOString()
  };
  await chrome.storage.local.set({ cicloPendente: dados });
  mostrarDados(dados);
  $("mensagem").textContent = "Ciclo capturado. Confira todos os campos antes de emitir.";
}

async function copiar() {
  const dados = await dadosSalvos();
  if (!dados) return;
  await navigator.clipboard.writeText([
    `Referência: ${dados.referencia}`,
    `Competência: ${dados.competencia}`,
    `Valor: ${dados.valor}`,
    `Descrição: ${dados.descricao}`
  ].join("\n"));
  $("mensagem").textContent = "Dados copiados.";
}

async function limpar() {
  await chrome.storage.local.remove("cicloPendente");
  $("dados").hidden = true;
  $("mensagem").textContent = "Dados apagados.";
}

$("capturar").addEventListener("click", capturar);
$("copiar").addEventListener("click", copiar);
$("limpar").addEventListener("click", limpar);
contextoAtual();
