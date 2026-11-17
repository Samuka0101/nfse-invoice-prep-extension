// These functions run in the active tab. Keep their browser-side dependencies local.
export async function runPortalStage(stage, cycle, date) {
  const steps = {
    people: "pessoas",
    service: "servico",
    values: "tributacao",
    review: "emitirnfse"
  };
  const path = location.pathname.toLowerCase().replace(/\/$/, "");
  if (location.origin !== "https://www.nfse.gov.br" || !Object.hasOwn(steps, stage) || path !== `/emissornacional/dps/${steps[stage]}`) {
    return { error: "A aba não está mais na etapa esperada do Emissor Nacional." };
  }
  if (!cycle?.description || !cycle?.amountInput || !cycle?.reference || !cycle?.serviceMonth) {
    return { error: "Capture primeiro um ciclo na NetSupport." };
  }

  const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
  const norm = value => clean(value).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const normalizeAmount = value => clean(value).replace(/^R\$\s*/, "").replace(/\.(?=\d{3}(?:\.|,))/g, "");

  if (stage === "review") {
    const summary = clean(document.body?.innerText);
    const amounts = [...summary.matchAll(/\bvalor (?:do|dos) servi[cç]os?\s*:?\s*(?:R\$\s*)?([\d.]+,\d{2})\b/giu)];
    return { checks: [
      { label: "Referência do ciclo", ok: summary.includes(cycle.reference) },
      { label: "Descrição do serviço", ok: norm(summary).includes(norm(cycle.description)) },
      { label: "Valor do serviço", ok: amounts.length === 1 && normalizeAmount(amounts[0][1]) === cycle.amountInput }
    ] };
  }

  const fields = {
    people: ["DataCompetencia", "Data de competência"],
    service: ["ServicoPrestado_Descricao", "Descrição do serviço"],
    values: ["Valores_ValorServico", "Valor do serviço"]
  };
  const [id, label] = fields[stage];
  const field = document.getElementById(id);
  if (!field || field.disabled || field.readOnly) return { checks: [{ label, ok: false }] };

  if (stage === "people") {
    const calendarDate = new Date(`${date}T00:00:00Z`);
    if (!Number.isFinite(calendarDate.valueOf()) || calendarDate.toISOString().slice(0, 10) !== date || date.slice(0, 7) !== cycle.serviceMonth) {
      return { error: "Confirme uma data válida no mês do serviço informado pela NetSupport." };
    }
  }

  const expected = {
    people: () => field.type === "date" ? date : date.split("-").reverse().join("/"),
    service: () => cycle.description,
    values: () => field.type === "number" ? cycle.amountInput.replace(",", ".") : cycle.amountInput
  }[stage]();

  field.focus();
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), "value")?.set;
  if (setter) setter.call(field, expected);
  else field.value = expected;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
  field.blur();
  await new Promise(resolve => setTimeout(resolve, 300));

  const actual = document.getElementById(id)?.value;
  const numeric = stage === "values" && field.type === "number" ? /^(\d+)(?:\.(\d{1,2}))?$/.exec(clean(actual)) : null;
  const readback = numeric ? `${numeric[1]},${(numeric[2] ?? "").padEnd(2, "0")}` : normalizeAmount(actual);
  const ok = stage === "values" ? readback === cycle.amountInput : clean(actual) === expected;
  return { checks: [{ label, ok }] };
}

export function checkDuplicate(cycle) {
  const path = location.pathname.toLowerCase();
  if (location.origin !== "https://www.nfse.gov.br" || !/^\/emissornacional(?:\/|$)/.test(path) || /^\/emissornacional\/dps(?:\/|$)/.test(path)) {
    return { error: "Abra a lista de notas emitidas no Emissor Nacional." };
  }
  if (!cycle?.reference || !cycle?.amountInput) return { error: "Capture primeiro um ciclo na NetSupport." };

  let matches = 0;
  const localDate = cycle.reference.split("-").reverse().join("/");
  for (const row of document.querySelectorAll("tbody tr, [role=row]")) {
    if (!row.getClientRects().length || getComputedStyle(row).visibility !== "visible") continue;
    const text = String(row.innerText ?? "").replace(/\s+/g, " ");
    const dates = text.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{2}\/\d{2}\/\d{4}\b/g) ?? [];
    const amounts = text.match(/\b(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}\b/g) ?? [];
    if ((dates.includes(cycle.reference) || dates.includes(localDate)) && amounts.some(value => value.replace(/\./g, "") === cycle.amountInput)) {
      matches++;
    }
  }
  return { status: matches > 0 ? "possible" : "inconclusive", matches };
}
