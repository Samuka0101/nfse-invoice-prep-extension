const months = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

export function stageForUrl(url) {
  let page;
  try {
    page = new URL(url);
  } catch {
    return null;
  }

  if (page.origin === "https://nssupport.netsupport.com.br") {
    return /^\/supporter\/extrato\/?$/i.test(page.pathname) ? "capture" : null;
  }
  if (page.origin !== "https://www.nfse.gov.br") return null;

  const parts = page.pathname.toLowerCase().replace(/\/$/, "").split("/");
  if (parts[1] !== "emissornacional") return null;
  if (parts[2] !== "dps") return "duplicate";
  if (parts.length !== 4) return null;
  const stages = { pessoas: "people", servico: "service", tributacao: "values", emitirnfse: "review" };
  return Object.hasOwn(stages, parts[3]) ? stages[parts[3]] : null;
}

function isCalendarDate(value) {
  if (typeof value !== "string" || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function matchesServiceMonth(date, serviceMonth) {
  return isCalendarDate(date) && date.slice(0, 7) === serviceMonth;
}

export function validateCycle({ date, amount, kind, description } = {}) {
  const dateParts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  const reference = dateParts?.slice(1).reverse().join("-");
  if (!isCalendarDate(reference)) throw new Error("A data do ciclo no extrato é inválida.");

  const cleanDescription = String(description ?? "").replace(/\s+/g, " ").trim();
  const details = /^Servi[cç]o prestado em ([\p{L}]+)\/(\d{4})\s*\|\s*Ciclo refer[eê]ncia:\s*(\d{4}-\d{2}-\d{2})$/iu.exec(cleanDescription);
  const month = details ? months.indexOf(details[1].toLowerCase()) + 1 : 0;
  if (!details || !month || details[2] === "0000" || details[3] !== reference) {
    throw new Error("A instrução do ciclo precisa conter o mês do serviço e a mesma referência do extrato.");
  }

  const money = /^(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})$/.exec(String(amount ?? "").trim());
  if (!money || !/[1-9]/.test(money[1] + money[2])) throw new Error("O valor do ciclo no extrato é inválido.");
  const integer = money[1].replace(/\./g, "").replace(/^0+(?=\d)/, "");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (kind !== "MENSAL" && kind !== "SEMANAL") throw new Error("O tipo de ciclo no extrato é inválido.");

  return {
    reference,
    serviceMonth: `${details[2]}-${String(month).padStart(2, "0")}`,
    amount: `R$ ${grouped},${money[2]}`,
    amountInput: `${integer},${money[2]}`,
    description: cleanDescription,
    kind
  };
}
