(function () {
  'use strict';
  const { evaluate, evaluateSaleScenario, evaluateHoldingPeriod } = globalThis.PositionCalculator;
  const { parseDecimal, formatMoney, formatPercent, formatInteger, percentHundredths, formatRatio, formatSignedPercent } = globalThis.PositionNumbers;
  const byId = id => document.getElementById(id);
  const loadStatus = byId('app-status');
  window.addEventListener('error', () => {
    loadStatus.hidden = false;
    loadStatus.textContent = 'Der Rechner konnte nicht vollständig ausgeführt werden. Lade die Seite vollständig neu (Strg+Umschalt+R) und prüfe, ob alle Projektdateien zusammen aktualisiert wurden.';
  });
  const fields = ['portfolio', 'risk', 'entry', 'stop', 'costProfile', 'extraFee', 'buyFee', 'sellFee'];
  const outputIds = ['shares', 'purchase', 'loss', 'allocation', 'budget', 'per-share', 'actual-risk', 'stop-distance', 'target', 'rise', 'gain', 'buy-cost', 'stop-cost', 'total-cost', 'break-even', 'target-cost', 'net-ratio', 'net-target'];
  const defaultExplanation = byId('explanation-text').textContent;
  const themeSelect = byId('theme-select');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  function updateTheme() {
    const choice = themeSelect.value;
    const dark = choice === 'dark' || (choice === 'system' && systemTheme.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }
  updateTheme();
  themeSelect.addEventListener('change', updateTheme);
  systemTheme.addEventListener('change', updateTheme);

  const costHints = {
    none: 'Vergleichsrechnung ohne Orderkosten. Wähle deinen Broker für eine Rechnung mit Gebühren.',
    tr: '1,00 € je Kauf und Verkauf. Bestpreis, Einzelorders, keine Sparpläne.',
    'tr-direct': '2,00 € je Kauf und Verkauf: 1 € Abwicklung + 1 € Handelsplatzgebühr. Nur Euro-Orders.',
    ing: 'Je Order 4,90 € + 0,25 % vom jeweiligen Kurswert, maximal 69,90 €, zuzüglich Zusatzkosten unten.',
    'ing-young': '1,90 € je Order zuzüglich Zusatzkosten unten. Nur bei gültigen Young-Konditionen.',
    manual: 'Trage die erwarteten Gesamtkosten je Order aus der Kosteninformation deines Brokers ein.',
  };

  function renderPeriod(scenario) {
    let period = evaluateHoldingPeriod(byId('buyDate').value, byId('saleDate').value, scenario?.netGainCents ?? null);
    for (const name of ['buyDate', 'saleDate']) {
      const validity = byId(name).validity;
      if (validity.badInput || validity.rangeOverflow || validity.rangeUnderflow) period = { status: 'invalid', errors: { ...period.errors, [name]: 'Bitte ein vollständiges, gültiges Datum eingeben.' } };
    }
    for (const name of ['buyDate', 'saleDate']) {
      byId(name + '-error').textContent = period.errors[name] || '';
      byId(name).setAttribute('aria-invalid', String(Boolean(period.errors[name])));
    }
    byId('scenario-days').textContent = '—';
    byId('scenario-daily-average').textContent = '—';
    if (period.status !== 'valid') {
      byId('period-summary').textContent = period.status === 'invalid' ? 'Bitte prüfe den Zeitraum. Das fiktive Kursergebnis bleibt davon unabhängig.' : period.status === 'incomplete' ? 'Ergänze das zweite Datum, um die Haltedauer zu sehen.' : 'Ergänze optional Kauf- und Verkaufsdatum für die Haltedauer.';
      return;
    }
    const formatDate = value => value.split('-').reverse().join('.');
    const days = `${formatInteger(period.days)} ${period.days === 1 ? 'Kalendertag' : 'Kalendertage'}`;
    const dates = period.days === 0 ? formatDate(period.buyDate) : `${formatDate(period.buyDate)} – ${formatDate(period.saleDate)}`;
    byId('scenario-days').textContent = days;
    if (period.dailyAverageCents !== null) byId('scenario-daily-average').textContent = formatMoney(period.dailyAverageCents, true);
    byId('period-summary').textContent = scenario ? `${formatMoney(scenario.netGainCents, true)} nach Orderkosten ${period.days === 0 ? 'am selben Tag' : 'in ' + days.replace(/Kalendertage$/, 'Kalendertagen')} (${dates}).${period.days === 0 ? ' Kein Tagesdurchschnitt bei 0 Tagen.' : ''}` : `${days} Haltedauer (${dates}). Für ein Ergebnis in diesem Zeitraum vervollständige dein Kursszenario.`;
  }

  function renderScenario(position) {
    const scenario = evaluateSaleScenario(byId('salePrice').value, position);
    renderPeriod(scenario.status === 'valid' ? scenario.result : null);
    const outputs = ['scenario-net', 'scenario-sale-value', 'scenario-gross', 'scenario-buy-fee', 'scenario-sell-fee', 'scenario-total-fees', 'scenario-return', 'scenario-portfolio-return'];
    byId('salePrice-error').textContent = scenario.message || '';
    byId('salePrice').setAttribute('aria-invalid', String(scenario.status === 'invalid'));
    byId('scenario-shares').textContent = position ? formatInteger(position.shares) : '—';
    byId('scenario-entry').textContent = position ? formatMoney(position.entryCents) : '—';
    byId('scenario-broker').textContent = byId('costProfile').selectedOptions[0].textContent + ' · Kaufkosten werden einmal berücksichtigt.';
    byId('scenario-net').classList.remove('positive', 'negative');
    if (scenario.status !== 'valid') {
      for (const id of outputs) byId(id).textContent = '—';
      byId('scenario-status').textContent = scenario.status === 'invalid' ? 'Bitte prüfe den eingegebenen Verkaufskurs.' : !position ? 'Berechne zuerst oben eine gültige Position.' : position.shares === 0n ? 'Ohne ganze Aktie ist keine Gewinnrechnung möglich.' : 'Trage einen Verkaufskurs ein, um dein Szenario zu berechnen.';
      return;
    }
    const s = scenario.result;
    const values = {
      'scenario-net': formatMoney(s.netGainCents, true),
      'scenario-sale-value': formatMoney(s.saleValueCents),
      'scenario-gross': formatMoney(s.grossGainCents, true),
      'scenario-buy-fee': formatMoney(s.buyFeeCents),
      'scenario-sell-fee': formatMoney(s.sellFeeCents),
      'scenario-total-fees': formatMoney(s.totalCostsCents),
      'scenario-return': formatSignedPercent(s.netGainCents, s.investedCents),
      'scenario-portfolio-return': formatSignedPercent(s.netGainCents, position.portfolioCents),
    };
    for (const [id, value] of Object.entries(values)) byId(id).textContent = value;
    if (s.netGainCents !== 0n) byId('scenario-net').classList.add(s.netGainCents > 0n ? 'positive' : 'negative');
    const outcome = s.netGainCents > 0n ? 'Fiktiver Gewinn' : s.netGainCents < 0n ? 'Fiktiver Verlust' : 'Weder Gewinn noch Verlust';
    byId('scenario-status').textContent = `${outcome}: ${formatMoney(s.netGainCents, true)} nach Orderkosten bei Verkauf aller ${formatInteger(s.shares)} Aktien zu ${formatMoney(s.saleCents)}. Vor Steuern.`;
  }

  function render() {
    const raw = Object.fromEntries(fields.map(name => [name, byId(name).value]));
    byId('ing-costs').hidden = !['ing', 'ing-young'].includes(raw.costProfile);
    byId('manual-costs').hidden = raw.costProfile !== 'manual';
    byId('cost-help').textContent = costHints[raw.costProfile] || '';
    const evaluation = evaluate(raw);
    for (const name of fields) {
      byId(name + '-error').textContent = evaluation.errors[name] || '';
      byId(name).setAttribute('aria-invalid', String(Boolean(evaluation.errors[name])));
    }
    const risk = parseDecimal(raw.risk);
    for (const button of document.querySelectorAll('[data-risk]')) {
      const preset = parseDecimal(button.dataset.risk);
      button.setAttribute('aria-pressed', String(risk.status === 'valid' && risk.numerator * preset.scale === preset.numerator * risk.scale));
    }
    byId('limit-note').hidden = true;
    if (evaluation.status !== 'valid') {
      for (const id of outputIds) byId(id).textContent = '—';
      byId('allocation-fill').style.width = '0%';
      byId('result-status').textContent = evaluation.status === 'invalid' ? 'Bitte prüfe die markierten Eingaben.' : 'Vervollständige deine Eingaben und das gewählte Kostenmodell.';
      byId('explanation-text').textContent = defaultExplanation;
      byId('cost-effect').textContent = 'Kauf- und Verkaufskosten teilen sich dein Risikobudget mit dem Kursverlust.';
      byId('gain').classList.remove('negative');
      renderScenario();
      return;
    }
    const r = evaluation.result;
    const text = {
      shares: formatInteger(r.shares), purchase: formatMoney(r.purchaseCents), loss: formatMoney(r.lossCents),
      allocation: formatPercent(r.purchaseCents, r.portfolioCents), budget: formatMoney(r.budgetCents),
      'per-share': formatMoney(r.lossPerShareCents), 'actual-risk': formatPercent(r.lossCents, r.portfolioCents),
      'stop-distance': formatPercent(r.lossPerShareCents, r.entryCents), target: formatMoney(r.targetCents),
      rise: formatPercent(3n * r.lossPerShareCents, r.entryCents, true), gain: formatMoney(r.gainCents, true),
      'buy-cost': formatMoney(r.buyFeeCents), 'stop-cost': formatMoney(r.stopFeeCents),
      'total-cost': formatMoney(r.stopCostsCents), 'break-even': r.breakEvenCents === null ? '—' : formatMoney(r.breakEvenCents),
      'target-cost': formatMoney(r.targetFeeCents), 'net-ratio': formatRatio(r.gainCents, r.lossCents),
      'net-target': r.netTargetCents === null ? '—' : formatMoney(r.netTargetCents),
    };
    for (const [id, value] of Object.entries(text)) byId(id).textContent = value;
    byId('gain').classList.toggle('negative', r.gainCents < 0n);
    const fewerShares = r.sharesWithoutCosts - r.shares;
    byId('cost-effect').textContent = r.shares === 0n ? `Ohne Kosten wären ${formatInteger(r.sharesWithoutCosts)} Aktien möglich. Ohne Kauf fallen in diesem Modell keine Orderkosten an.` : `${formatMoney(r.stopCostsCents)} deines Risikobudgets entfallen auf Kauf und Verkauf am Stop. ${fewerShares > 0n ? `Dadurch ${formatInteger(fewerShares)} ${fewerShares === 1n ? 'Aktie' : 'Aktien'} weniger als ohne Kosten.` : 'Die ganze Aktienanzahl bleibt gegenüber der Rechnung ohne Kosten gleich.'}`;
    byId('allocation-fill').style.width = (Number(percentHundredths(r.purchaseCents, r.portfolioCents)) / 100) + '%';
    byId('result-status').textContent = r.shares === 0n ? 'Mit diesen Angaben ist keine ganze Aktie möglich.' : `${formatInteger(r.shares)} ${r.shares === 1n ? 'ganze Aktie' : 'ganze Aktien'} · auf Basis deines geplanten Risikos`;
    const notes = [];
    if (r.riskShares === 0n) notes.push('Dein Risikobudget reicht nicht für den Kursverlust einer ganzen Aktie einschließlich Kauf- und Verkaufskosten.');
    if (r.capitalShares === 0n) notes.push('Eine Aktie einschließlich Kaufkosten kostet mehr als dein gesamter Depotwert.');
    if (r.capitalLimited) notes.push('Die Depotwertgrenze begrenzt deine Aktienanzahl. Dein Risikobudget würde mehr Aktien erlauben. Die tatsächlich verfügbare Liquidität wird nicht geprüft.');
    if (notes.length) { byId('limit-note').textContent = notes.join(' '); byId('limit-note').hidden = false; }
    byId('explanation-text').textContent = `Bei einem Kauf zu ${formatMoney(r.entryCents)} und einem Stop bei ${formatMoney(r.stopCents)} planst du ${formatMoney(r.lossPerShareCents)} Kursverlust je Aktie. Mit ${formatInteger(r.shares)} ${r.shares === 1n ? 'Aktie' : 'Aktien'} ergibt das ${formatMoney(r.grossLossCents)} Kursverlust plus ${formatMoney(r.stopCostsCents)} Orderkosten: insgesamt ${formatMoney(r.lossCents)} oder ${formatPercent(r.lossCents, r.portfolioCents)} deines Depots. Gebühren senken den Nettogewinn; der Kurs für 3:1 nach Kosten liegt deshalb meist höher.`;
    renderScenario(r);
  }

  byId('position-form').addEventListener('submit', event => event.preventDefault());
  byId('position-form').addEventListener('input', render);
  byId('position-form').addEventListener('change', render);
  byId('scenario-form').addEventListener('submit', event => event.preventDefault());
  byId('scenario-form').addEventListener('input', render);
  byId('scenario-form').addEventListener('change', render);
  for (const button of document.querySelectorAll('[data-risk]')) button.addEventListener('click', () => { byId('risk').value = button.dataset.risk; render(); });
  // Clear values also on history restoration; never restore financial input.
  window.addEventListener('pageshow', () => { byId('position-form').reset(); byId('scenario-form').reset(); render(); });
  render();
  loadStatus.hidden = true;
})();
