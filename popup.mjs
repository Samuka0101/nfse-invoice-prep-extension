import { captureStatement } from "./capture.mjs";
import { matchesServiceMonth, stageForUrl, validateCycle } from "./logic.mjs";
import { checkDuplicate, runPortalStage } from "./portal.mjs";

const element = id => document.getElementById(id);
const status = text => { element("status").textContent = text; };
const actions = ["capture", "copy", "clear", "prepare"];
const steps = {
  people: ["Pessoas", "Preencher data de competência"],
  service: ["Serviço", "Preencher descrição"],
  values: ["Valores", "Preencher valor do serviço"],
  review: ["Revisão", "Conferir dados do ciclo"],
  duplicate: ["Consultar notas", "Procurar referência e valor na lista"]
};

let cycle;
let stage;
let busy = false;

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return { tab, currentStage: stageForUrl(tab?.url) };
}

function showChecks(checks) {
  const list = element("checks");
  list.replaceChildren();
  for (const check of checks) {
    const row = document.createElement("li");
    row.textContent = `${check.label} — ${check.ok ? "conferido" : "revise manualmente"}`;
    list.append(row);
  }
  list.hidden = checks.length === 0;
}

function render() {
  element("capture").hidden = stage !== "capture";
  element("cycle").hidden = !cycle;
  element("portal").hidden = !cycle || !steps[stage];
  element("service-date-field").hidden = stage !== "people";
  element("prepare").textContent = steps[stage]?.[1] ?? "";
  element("context").textContent = stage === "capture"
    ? "Extrato de Pagamentos da NetSupport"
    : steps[stage] ? `Emissor Nacional · ${steps[stage][0]}` : "Abra o Extrato de Pagamentos da NetSupport para começar.";

  element("reference").textContent = cycle?.reference ?? "";
  element("service-month").textContent = cycle ? cycle.serviceMonth.split("-").reverse().join("/") : "";
  element("amount").textContent = cycle?.amount ?? "";
  element("description").textContent = cycle?.description ?? "";
}

async function inject(tabId, func, args = []) {
  let result;
  try {
    const [execution] = await chrome.scripting.executeScript({ target: { tabId }, func, args });
    result = execution?.result;
  } catch {
    throw new Error("Não foi possível ler a aba. Reabra a extensão na página correspondente.");
  }
  if (result?.error) throw new Error(result.error);
  if (!result) throw new Error("A página não retornou dados para esta ação.");
  return result;
}

async function capture() {
  const { tab, currentStage } = await activeTab();
  if (currentStage !== "capture") throw new Error("Abra o Extrato de Pagamentos da NetSupport.");
  await clear();
  render();
  status("Lendo a instrução do ciclo…");
  const data = validateCycle(await inject(tab.id, captureStatement));
  await chrome.storage.session.set({ cycle: data });
  cycle = data;
  status("Ciclo capturado. Confira os dados com o extrato.");
}

async function prepare() {
  showChecks([]);
  const { tab, currentStage } = await activeTab();
  if (!cycle || !steps[currentStage] || currentStage !== stage) {
    throw new Error("Capture um ciclo e reabra a extensão na etapa que deseja conferir.");
  }

  if (stage === "duplicate") {
    const result = await inject(tab.id, checkDuplicate, [cycle]);
    status(result.status === "possible"
      ? "Possível duplicidade. Há uma linha visível com a mesma data e valor. Abra a nota e compare o tomador e a referência."
      : "Conferência inconclusiva. Verifique a lista e os filtros do portal antes de preparar uma nova nota.");
    return;
  }

  const date = element("service-date").value;
  if (stage === "people" && !matchesServiceMonth(date, cycle.serviceMonth)) {
    throw new Error("Confirme uma data válida no mês do serviço informado no extrato.");
  }

  const { checks } = await inject(tab.id, runPortalStage, [stage, cycle, date]);
  showChecks(checks);
  if (stage === "review") {
    status("Compare também tomador, valores e opções fiscais no resumo do portal antes de decidir sobre a emissão.");
  } else {
    status("Confira os campos e as demais opções na página do portal. Use o botão Avançar do portal quando estiver pronto.");
  }
}

async function copy() {
  if (!cycle) return;
  await navigator.clipboard.writeText([
    `Referência: ${cycle.reference}`,
    `Competência: ${cycle.serviceMonth}`,
    `Valor: ${cycle.amount}`,
    `Descrição: ${cycle.description}`
  ].join("\n"));
  status("Dados copiados para a área de transferência.");
}

async function clear() {
  await chrome.storage.session.remove("cycle");
  cycle = undefined;
  element("service-date").value = "";
  showChecks([]);
  status("Ciclo removido da extensão.");
}

function bind(id, action) {
  element(id).addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    for (const key of actions) element(key).disabled = true;
    try {
      await action();
    } catch (error) {
      status(error.message || "Não foi possível concluir a ação.");
    } finally {
      busy = false;
      for (const key of actions) element(key).disabled = false;
      render();
    }
  });
}

try {
  ({ currentStage: stage } = await activeTab());
  ({ cycle } = await chrome.storage.session.get("cycle"));
  render();
  bind("capture", capture);
  bind("prepare", prepare);
  bind("copy", copy);
  bind("clear", clear);
} catch {
  status("A extensão precisa de uma versão atualizada do Chrome ou Edge para guardar o ciclo durante a sessão.");
}
