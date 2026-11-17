// This function is serialized and executed in the active statement tab.
export async function captureStatement() {
  if (location.origin !== "https://nssupport.netsupport.com.br" || !/^\/supporter\/extrato\/?$/i.test(location.pathname)) {
    return { error: "Abra o Extrato de Pagamentos da NetSupport." };
  }

  const text = element => (element?.innerText || element?.textContent || element?.value || "").replace(/\s+/g, " ").trim();
  const visible = element => element.getClientRects().length > 0 && getComputedStyle(element).visibility === "visible";
  const buttons = "button, a, [role=button], input[type=button], input[type=submit]";
  let pending;
  for (const button of document.querySelectorAll(buttons)) {
    if (button.disabled || !visible(button) || !/^nota fiscal$/i.test(text(button).replace(/^[^\p{L}]+/u, ""))) continue;

    for (let card = button.parentElement; card && card !== document.body; card = card.parentElement) {
      const cardText = text(card);
      const cycles = [...cardText.matchAll(/\bCICLO\s+(SEMANAL|MENSAL)\b/gi)];
      if (cycles.length > 1 || /\bvalidado\b/i.test(cardText)) break;
      if (!cycles.length) continue;

      const date = /previs[aã]o de pagamento\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i.exec(cardText)?.[1];
      const amount = /\btotal\s*:?\s*(R\$\s*[\d.]+,\d{2})/i.exec(cardText)?.[1];
      if (date && amount) {
        pending = { button, date, amount, kind: cycles[0][1].toUpperCase() };
        break;
      }
    }
    if (pending) break;
  }

  if (!pending) return { error: "Nenhum ciclo pendente com data e valor total foi encontrado no extrato." };

  const reference = pending.date.split("/").reverse().join("-");
  const instruction = /Servi[cç]o prestado em\s+[\p{L}]+\/\d{4}\s*\|\s*Ciclo refer[eê]ncia:\s*(\d{4}-\d{2}-\d{2})/giu;
  pending.button.click();

  for (let attempt = 0; attempt < 32; attempt++) {
    const match = [...text(document.body).matchAll(instruction)].find(item => item[1] === reference);
    if (match) return { date: pending.date, amount: pending.amount, kind: pending.kind, description: match[0] };
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  return { error: "A NetSupport não mostrou a instrução para a referência capturada. Confira o ciclo aberto no extrato." };
}
