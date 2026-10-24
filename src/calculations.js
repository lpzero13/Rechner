(function (root) {
  'use strict';
  const numbers = typeof module === 'object' && module.exports ? require('./numbers.js') : root.PositionNumbers;
  const profiles = ['none', 'tr', 'tr-direct', 'ing', 'ing-young', 'manual'];

  function orderFee(volumeCents, side, costs) {
    if (volumeCents === 0n) return 0n;
    switch (costs.profile) {
      case 'none': return 0n;
      case 'tr': return 100n;
      case 'tr-direct': return 200n;
      case 'manual': return side === 'buy' ? costs.buyCents : costs.sellCents;
      case 'ing-young': return 190n + costs.extraCents;
      case 'ing': {
        const commission = 490n + (volumeCents + 200n) / 400n;
        return (commission < 6990n ? commission : 6990n) + costs.extraCents;
      }
      default: throw new RangeError('Unbekanntes Kostenmodell');
    }
  }

  function normalizeCosts(costs = {}) {
    const normalized = { profile: costs.profile ?? 'none', buyCents: costs.buyCents ?? 0n, sellCents: costs.sellCents ?? 0n, extraCents: costs.extraCents ?? 0n };
    if (!profiles.includes(normalized.profile) || ![normalized.buyCents, normalized.sellCents, normalized.extraCents].every(v => typeof v === 'bigint' && v >= 0n)) throw new RangeError('Ungültige Kosten');
    return normalized;
  }

  // The predicates are monotone, including rounded/capped ING commissions.
  function maximumShares(upper, allowed) {
    let lower = 0n;
    while (lower < upper) {
      const middle = (lower + upper + 1n) / 2n;
      if (allowed(middle)) lower = middle;
      else upper = middle - 1n;
    }
    return lower;
  }

  function priceForNetGain(shares, entryCents, buyFeeCents, costs, wantedGain) {
    if (shares === 0n) return null;
    const maxSellFee = costs.profile === 'ing' ? 6990n + costs.extraCents : orderFee(shares * entryCents, 'sell', costs);
    let lower = entryCents;
    let upper = entryCents + (wantedGain + buyFeeCents + maxSellFee + shares - 1n) / shares;
    while (lower < upper) {
      const middle = (lower + upper) / 2n;
      const netGain = shares * (middle - entryCents) - buyFeeCents - orderFee(shares * middle, 'sell', costs);
      if (netGain >= wantedGain) upper = middle;
      else lower = middle + 1n;
    }
    return lower;
  }

  function validateInputs(raw) {
    const values = { portfolio: numbers.parseMoney(raw.portfolio), risk: numbers.parseDecimal(raw.risk), entry: numbers.parseMoney(raw.entry), stop: numbers.parseMoney(raw.stop) };
    const costProfile = raw.costProfile ?? 'none';
    const costFields = costProfile === 'manual' ? ['buyFee', 'sellFee'] : ['ing', 'ing-young'].includes(costProfile) ? ['extraFee'] : [];
    for (const field of costFields) values[field] = numbers.parseMoney(raw[field]);
    const errors = {};
    for (const [name, value] of Object.entries(values)) {
      if (value.status === 'invalid') errors[name] = value.message;
      else if (!costFields.includes(name) && value.status === 'valid' && value.numerator <= 0n) errors[name] = 'Bitte einen Wert größer als null eingeben.';
    }
    if (!profiles.includes(costProfile)) errors.costProfile = 'Bitte ein gültiges Kostenmodell wählen.';
    if (values.risk.status === 'valid' && values.risk.numerator > 100n * values.risk.scale) errors.risk = 'Das Risiko darf höchstens 100 % betragen.';
    if (values.stop.status === 'valid' && values.entry.status === 'valid' && values.stop.cents >= values.entry.cents) errors.stop = 'Der Stop-Loss muss unter dem Kaufkurs liegen.';
    const status = Object.keys(errors).length ? 'invalid' : Object.values(values).some(value => value.status !== 'valid') ? 'incomplete' : 'valid';
    return { status, errors, values };
  }

  function calculatePosition({ portfolioCents, entryCents, stopCents, riskNumerator, riskScale, costs: rawCosts }) {
    if (![portfolioCents, entryCents, stopCents, riskNumerator, riskScale].every(value => typeof value === 'bigint') || portfolioCents <= 0n || entryCents <= 0n || stopCents <= 0n || stopCents >= entryCents || riskScale <= 0n || riskNumerator <= 0n || riskNumerator > 100n * riskScale) throw new RangeError('Ungültige Berechnungswerte');
    // Fractions of a cent in the budget are discarded conservatively.
    const budgetCents = portfolioCents * riskNumerator / (100n * riskScale);
    const costs = normalizeCosts(rawCosts);
    const lossPerShareCents = entryCents - stopCents;
    const riskShares = maximumShares(budgetCents / lossPerShareCents, n => n * lossPerShareCents + orderFee(n * entryCents, 'buy', costs) + orderFee(n * stopCents, 'sell', costs) <= budgetCents);
    const capitalShares = maximumShares(portfolioCents / entryCents, n => n * entryCents + orderFee(n * entryCents, 'buy', costs) <= portfolioCents);
    const shares = riskShares < capitalShares ? riskShares : capitalShares;
    const buyFeeCents = orderFee(shares * entryCents, 'buy', costs);
    const stopFeeCents = orderFee(shares * stopCents, 'sell', costs);
    const targetCents = entryCents + 3n * lossPerShareCents;
    const targetFeeCents = orderFee(shares * targetCents, 'sell', costs);
    const lossCents = shares * lossPerShareCents + buyFeeCents + stopFeeCents;
    const gainCents = shares * 3n * lossPerShareCents - buyFeeCents - targetFeeCents;
    const netTargetCents = priceForNetGain(shares, entryCents, buyFeeCents, costs, 3n * lossCents);
    return {
      portfolioCents, entryCents, stopCents, budgetCents, lossPerShareCents, riskShares, capitalShares, shares,
      purchaseCents: shares * entryCents + buyFeeCents,
      stockValueCents: shares * entryCents,
      lossCents, targetCents, gainCents, buyFeeCents, stopFeeCents, targetFeeCents,
      stopCostsCents: buyFeeCents + stopFeeCents,
      grossLossCents: shares * lossPerShareCents,
      grossGainCents: shares * 3n * lossPerShareCents,
      breakEvenCents: priceForNetGain(shares, entryCents, buyFeeCents, costs, 0n),
      netTargetCents,
      netTargetGainCents: shares === 0n ? null : shares * (netTargetCents - entryCents) - buyFeeCents - orderFee(shares * netTargetCents, 'sell', costs),
      sharesWithoutCosts: budgetCents / lossPerShareCents < portfolioCents / entryCents ? budgetCents / lossPerShareCents : portfolioCents / entryCents,
      capitalLimited: capitalShares < riskShares,
    };
  }

  function evaluate(raw) {
    const validation = validateInputs(raw);
    if (validation.status !== 'valid') return validation;
    const v = validation.values;
    return { ...validation, result: calculatePosition({ portfolioCents: v.portfolio.cents, entryCents: v.entry.cents, stopCents: v.stop.cents, riskNumerator: v.risk.numerator, riskScale: v.risk.scale, costs: { profile: raw.costProfile ?? 'none', buyCents: v.buyFee?.cents ?? 0n, sellCents: v.sellFee?.cents ?? 0n, extraCents: v.extraFee?.cents ?? 0n } }) };
  }

  const api = { validateInputs, calculatePosition, evaluate, orderFee, normalizeCosts };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PositionCalculator = api;
})(typeof globalThis === 'object' ? globalThis : this);
