'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate, calculatePosition, orderFee, normalizeCosts } = require('../src/calculations.js');
const { parseMoney, parseDecimal, formatMoney, formatPercent, formatRatio } = require('../src/numbers.js');
const base = { portfolio: '10.000,00', risk: '1', entry: '50,00', stop: '47,50' };
const result = changes => {
  const evaluation = evaluate({ ...base, ...changes });
  assert.equal(evaluation.status, 'valid');
  return evaluation.result;
};

test('verbindliches Beispiel: alle Geldbeträge und Kennzahlen', () => {
  const r = result();
  assert.equal(r.shares, 40n);
  assert.equal(r.budgetCents, 10000n);
  assert.equal(r.lossPerShareCents, 250n);
  assert.equal(r.purchaseCents, 200000n);
  assert.equal(r.lossCents, 10000n);
  assert.equal(r.targetCents, 5750n);
  assert.equal(r.gainCents, 30000n);
  assert.equal(formatPercent(r.lossCents, r.portfolioCents), '1,00\u00a0%');
  assert.equal(formatPercent(r.purchaseCents, r.portfolioCents), '20,00\u00a0%');
  assert.equal(formatPercent(r.lossPerShareCents, r.entryCents), '5,00\u00a0%');
  assert.equal(formatPercent(r.targetCents - r.entryCents, r.entryCents, true), '+15,00\u00a0%');
});
test('Risikopresets 0,5 % und 2 %', () => {
  assert.equal(result({ risk: '0,5' }).shares, 20n);
  assert.equal(result({ risk: '2' }).shares, 80n);
});
test('individueller Risikowert und enge / weite Stop-Abstände', () => {
  assert.equal(result({ risk: '1,25' }).shares, 50n);
  assert.equal(result({ stop: '49,00' }).shares, 100n);
  assert.equal(result({ stop: '40,00' }).shares, 10n);
});
test('Kapital begrenzt den Kaufbetrag', () => {
  const r = result({ stop: '49,99' });
  assert.equal(r.shares, 200n);
  assert.equal(r.purchaseCents, r.portfolioCents);
  assert.equal(r.capitalLimited, true);
  assert.equal(r.lossCents, 200n);
});
test('gleiche Kapital- und Risikogrenze benötigt keinen Kapitalhinweis', () => {
  assert.equal(result({ stop: '49,50' }).capitalLimited, false);
});
test('zu kleines Risikobudget ergibt null ganze Aktien', () => {
  const r = result({ portfolio: '100', risk: '0,5' });
  assert.equal(r.shares, 0n);
  assert.equal(r.lossCents, 0n);
  assert.equal(r.gainCents, 0n);
});
test('zu kleiner Depotwert ergibt null Aktien trotz ausreichendem Risiko', () => {
  const r = result({ portfolio: '49', risk: '100' });
  assert.equal(r.shares, 0n);
  assert.equal(r.capitalLimited, true);
});
for (const stop of ['50', '51', '0', '-1', 'NaN', 'Infinity', '47,501']) {
  test(`ungültiger Stop-Loss ${stop}`, () => {
    const e = evaluate({ ...base, stop });
    assert.equal(e.status, 'invalid');
    assert.ok(e.errors.stop);
    assert.equal(e.result, undefined);
  });
}
for (const field of ['portfolio', 'risk', 'entry', 'stop']) {
  test(`leeres oder unvollständiges Feld ${field}`, () => {
    for (const value of ['', ' ', '47,']) {
      const e = evaluate({ ...base, [field]: value });
      assert.equal(e.status, 'incomplete');
      assert.equal(e.result, undefined);
    }
  });
}
test('deutsche Zahlenformate und ungruppierter Dezimalpunkt', () => {
  assert.equal(parseMoney('10.000,00').cents, 1000000n);
  assert.equal(parseMoney('1.234.567,89').cents, 123456789n);
  assert.equal(parseMoney(' 47,50 ').cents, 4750n);
  assert.equal(parseMoney('47.50').cents, 4750n);
  assert.equal(parseMoney('1.000').cents, 100000n);
  assert.equal(parseDecimal('0.5').numerator, 5n);
});
test('kleine Prozentwerte mit Dezimalpunkt bleiben exakte Prozentwerte', () => {
  assert.equal(result({ risk: '0.001' }).budgetCents, 10n);
  assert.equal(result({ risk: '1.000' }).budgetCents, 10000n);
  assert.equal(parseMoney('0.001').status, 'invalid');
});
for (const raw of ['1,234', '12.3456', '1,2,3', '1.23,45', '1e3', '€ 50', '-1', '1 000', '12foo', '.5', '9'.repeat(121)]) {
  test(`fehlerhafte Geldangabe ${raw.slice(0, 20)}`, () => assert.equal(parseMoney(raw).status, 'invalid'));
}
test('Wertebereich von Depotwert, Kaufkurs und Risiko', () => {
  for (const changes of [{ portfolio: '0' }, { entry: '0' }, { risk: '0' }, { risk: '100,01' }, { risk: '-1' }]) assert.equal(evaluate({ ...base, ...changes }).status, 'invalid');
  assert.equal(result({ risk: '100' }).shares, 200n);
});
test('exakter Centfall, bei dem Gleitkommadivision eine Aktie verliert', () => {
  const r = result({ portfolio: '10', risk: '1', entry: '0,30', stop: '0,29' });
  assert.equal(r.shares, 10n);
  assert.equal(r.purchaseCents, 300n);
  assert.equal(r.lossCents, 10n);
  assert.equal(r.targetCents, 33n);
});
test('Restbudget und Bruchteile eines Cents werden nicht aufgerundet', () => {
  assert.equal(result({ portfolio: '999,99', risk: '1', entry: '10', stop: '7' }).shares, 3n);
  const r = result({ portfolio: '1', risk: '0,999999', entry: '0,02', stop: '0,01' });
  assert.equal(r.budgetCents, 0n);
  assert.equal(r.shares, 0n);
});
test('große Beträge bleiben auch jenseits Number.MAX_SAFE_INTEGER centgenau', () => {
  const r = result({ portfolio: '9007199254740993,01', risk: '1', entry: '1', stop: '0,99' });
  assert.equal(r.portfolioCents, 900719925474099301n);
  assert.equal(formatMoney(r.portfolioCents), '9.007.199.254.740.993,01\u00a0€');
});
test('Formatierung rundet Prozentwerte kaufmännisch, Geld bleibt exakt', () => {
  assert.equal(formatPercent(1n, 32n), '3,13\u00a0%');
  assert.equal(formatMoney(30000n, true), '+300,00\u00a0€');
  assert.equal(formatMoney(0n, true), '0,00\u00a0€');
});
test('reine Berechnungsfunktion weist ungültige direkte Aufrufe ab', () => {
  for (const patch of [{ stopCents: 5000n }, { riskScale: 0n }, { riskNumerator: 101n }, { portfolioCents: 0n }, { entryCents: 50 }]) {
    assert.throws(() => calculatePosition({ portfolioCents: 1000000n, entryCents: 5000n, stopCents: 4750n, riskNumerator: 1n, riskScale: 1n, ...patch }), RangeError);
  }
});
test('2.000 deterministische Fälle: Grenzen und maximal mögliche ganze Aktienzahl', () => {
  let seed = 23917;
  const random = limit => { seed = (seed * 16807) % 2147483647; return BigInt(seed % limit); };
  for (let i = 0; i < 2000; i++) {
    const portfolioCents = random(100000000) + 1n;
    const entryCents = random(100000) + 2n;
    const stopCents = random(Number(entryCents - 1n)) + 1n;
    const riskNumerator = random(10000) + 1n;
    const r = calculatePosition({ portfolioCents, entryCents, stopCents, riskNumerator, riskScale: 100n });
    assert.ok(r.purchaseCents <= portfolioCents);
    assert.ok(r.lossCents * 10000n <= portfolioCents * riskNumerator);
    assert.ok(r.shares >= 0n);
    assert.ok((r.shares + 1n) * entryCents > portfolioCents || (r.shares + 1n) * (entryCents - stopCents) * 10000n > portfolioCents * riskNumerator);
    assert.equal(r.gainCents, 3n * r.lossCents);
  }
});

test('Trade Republic Bestpreis: beide Orderseiten im Risiko, Kaufkosten im Kapital', () => {
  const r = result({ costProfile: 'tr' });
  assert.equal(r.shares, 39n);
  assert.equal(r.buyFeeCents, 100n);
  assert.equal(r.stopFeeCents, 100n);
  assert.equal(r.purchaseCents, 195100n);
  assert.equal(r.lossCents, 9950n);
  assert.equal(r.targetCents, 5750n);
  assert.equal(r.gainCents, 29050n);
  assert.equal(formatRatio(r.gainCents, r.lossCents), '2,92 : 1');
  assert.equal(r.netTargetCents, 5771n);
  assert.equal(r.netTargetGainCents, 29869n);
  assert.equal(r.breakEvenCents, 5006n);
  assert.equal(r.sharesWithoutCosts, 40n);
});
test('Trade Republic Direktpreis: 2 Euro je Kauf und Verkauf', () => {
  const r = result({ costProfile: 'tr-direct' });
  assert.equal(r.shares, 38n);
  assert.equal(r.stopCostsCents, 400n);
  assert.equal(r.lossCents, 9900n);
  assert.equal(r.gainCents, 28100n);
});
test('ING: Verkaufsgebühr wird getrennt am Stop und am Ziel berechnet', () => {
  const r = result({ costProfile: 'ing', extraFee: '0' });
  assert.equal(r.shares, 32n);
  assert.equal(r.buyFeeCents, 890n);
  assert.equal(r.stopFeeCents, 870n);
  assert.equal(r.targetFeeCents, 950n);
  assert.equal(r.purchaseCents, 160890n);
  assert.equal(r.lossCents, 9760n);
  assert.equal(r.gainCents, 22160n);
  assert.equal(r.netTargetCents, 5974n);
  assert.equal(r.breakEvenCents, 5056n);
});
test('ING-Provisionsdeckel gilt vor Handelsplatzzuschlag, Centhälften runden auf', () => {
  const costs = normalizeCosts({ profile: 'ing', extraCents: 290n });
  assert.equal(orderFee(200n, 'buy', costs), 781n); // 4,90 + 0,005 + 2,90
  assert.equal(orderFee(2600000n, 'buy', costs), 7280n);
  assert.equal(orderFee(100000000n, 'buy', costs), 7280n);
  assert.equal(orderFee(0n, 'buy', costs), 0n);
});
test('ING Young und Zusatzkosten', () => {
  const r = result({ costProfile: 'ing-young', extraFee: '2,90' });
  assert.equal(r.shares, 36n);
  assert.equal(r.stopCostsCents, 960n);
  assert.equal(r.lossCents, 9960n);
  const standard = result({ costProfile: 'ing', extraFee: '2,90' });
  assert.ok(standard.shares < result({ costProfile: 'ing', extraFee: '0' }).shares);
});
test('manuelle Kosten: asymmetrisch, null erlaubt und nicht doppelt gerechnet', () => {
  const r = result({ costProfile: 'manual', buyFee: '2', sellFee: '3' });
  assert.equal(r.shares, 38n);
  assert.equal(r.purchaseCents, 190200n);
  assert.equal(r.lossCents, 10000n);
  assert.equal(r.gainCents, 28000n);
  assert.equal(r.netTargetCents, 5803n);
  assert.equal(result({ costProfile: 'manual', buyFee: '0', sellFee: '0' }).shares, 40n);
});
test('Gebühren allein können eine sonst mögliche Aktie verhindern', () => {
  const r = result({ portfolio: '100', risk: '2,5', costProfile: 'tr' });
  assert.equal(r.shares, 0n);
  assert.equal(r.sharesWithoutCosts, 1n);
  assert.equal(r.lossCents, 0n);
  assert.equal(r.stopCostsCents, 0n);
  assert.equal(r.netTargetCents, null);
  assert.equal(r.breakEvenCents, null);
  assert.equal(formatRatio(r.gainCents, r.lossCents), '—');
});
test('Kaufkosten reduzieren die theoretische Kapitalgrenze', () => {
  const r = result({ portfolio: '100', risk: '100', entry: '50', stop: '49', costProfile: 'tr' });
  assert.equal(r.shares, 1n);
  assert.equal(r.capitalLimited, true);
  assert.equal(r.purchaseCents, 5100n);
});
test('ein Kursziel kann trotz Kursgewinn nach Gebühren Verlust bedeuten', () => {
  const r = result({ portfolio: '100', risk: '5', entry: '50', stop: '49,99', costProfile: 'tr' });
  assert.equal(r.shares, 1n);
  assert.equal(r.gainCents, -197n);
  assert.equal(formatMoney(r.gainCents, true), '−1,97\u00a0€');
  assert.match(formatRatio(r.gainCents, r.lossCents), /^−/);
});
test('leere, negative und übergenaue Kosten werden nur im aktiven Modell geprüft', () => {
  for (const patch of [{ costProfile: 'manual', buyFee: '', sellFee: '0' }, { costProfile: 'ing', extraFee: '' }]) assert.equal(evaluate({ ...base, ...patch }).status, 'incomplete');
  for (const patch of [{ costProfile: 'manual', buyFee: '-1', sellFee: '0' }, { costProfile: 'manual', buyFee: '0', sellFee: '1,001' }, { costProfile: 'ing', extraFee: '-1' }, { costProfile: 'unknown' }]) assert.equal(evaluate({ ...base, ...patch }).status, 'invalid');
  assert.equal(result({ costProfile: 'tr', buyFee: '-1', extraFee: '1,001' }).shares, 39n);
  assert.throws(() => normalizeCosts({ profile: 'manual', buyCents: -1n }), RangeError);
});
test('unabhängige vollständige Suche: Aktienzahl, Gewinnschwelle und Nettoziel', () => {
  // Small complete domains, independent integer arithmetic and linear search.
  for (const profile of ['none', 'tr', 'tr-direct', 'manual', 'ing', 'ing-young']) {
    for (let index = 1; index <= 50; index++) {
      const portfolio = 1000 + index * 111;
      const entry = 100 + index * 3;
      const stop = entry - 1 - index;
      const budget = Math.floor(portfolio * 0.1);
      const fee = (volume, buy) => {
        if (!volume || profile === 'none') return 0;
        if (profile === 'tr') return 100;
        if (profile === 'tr-direct') return 200;
        if (profile === 'manual') return buy ? 30 : 70;
        if (profile === 'ing-young') return 190 + 5;
        return Math.min(6990, 490 + Math.round(volume / 400)) + 5;
      };
      let expected = 0;
      for (let n = 1; n <= Math.floor(portfolio / entry); n++) {
        if (n * (entry - stop) + fee(n * entry, true) + fee(n * stop, false) <= budget && n * entry + fee(n * entry, true) <= portfolio) expected = n;
      }
      const r = calculatePosition({ portfolioCents: BigInt(portfolio), entryCents: BigInt(entry), stopCents: BigInt(stop), riskNumerator: 10n, riskScale: 1n, costs: { profile, buyCents: 30n, sellCents: 70n, extraCents: 5n } });
      assert.equal(r.shares, BigInt(expected), profile + ':' + index);
      if (!expected) continue;
      const net = price => expected * (price - entry) - fee(expected * entry, true) - fee(expected * price, false);
      let price = entry;
      while (net(price) < 0) price++;
      assert.equal(r.breakEvenCents, BigInt(price));
      while (net(price) < 3 * Number(r.lossCents)) price++;
      assert.equal(r.netTargetCents, BigInt(price));
      assert.ok(r.netTargetGainCents >= 3n * r.lossCents);
    }
  }
});
