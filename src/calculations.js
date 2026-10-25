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
      portfolioCents, entryCents, stopCents, budgetCents, lossPerShareCents, riskShares, capitalShares, shares, costs,
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

  function calculateSaleScenario(position, saleCents) {
    if (typeof saleCents !== 'bigint' || saleCents <= 0n || typeof position?.shares !== 'bigint' || position.shares < 0n || typeof position.entryCents !== 'bigint' || position.entryCents <= 0n || typeof position.buyFeeCents !== 'bigint' || position.buyFeeCents < 0n) throw new RangeError('Ungültige Szenariowerte');
    const costs = normalizeCosts(position.costs);
    const { shares, entryCents } = position;
    const buyFeeCents = shares === 0n ? 0n : position.buyFeeCents;
    const saleValueCents = shares * saleCents;
    const sellFeeCents = orderFee(saleValueCents, 'sell', costs);
    const totalCostsCents = buyFeeCents + sellFeeCents;
    const grossGainCents = shares * (saleCents - entryCents);
    return {
      shares, saleCents, saleValueCents, buyFeeCents, sellFeeCents, totalCostsCents, grossGainCents,
      netProceedsCents: saleValueCents - sellFeeCents,
      netGainCents: grossGainCents - totalCostsCents,
      investedCents: shares * entryCents + buyFeeCents,
    };
  }

  function evaluateSaleScenario(rawPrice, position) {
    const price = numbers.parseMoney(rawPrice);
    if (price.status === 'invalid') return { status: 'invalid', message: price.message };
    if (price.status !== 'valid') return { status: 'incomplete' };
    if (price.cents <= 0n) return { status: 'invalid', message: 'Der Verkaufskurs muss größer als null sein.' };
    if (!position) return { status: 'unavailable' };
    if (position.shares === 0n) return { status: 'no-shares' };
    return { status: 'valid', result: calculateSaleScenario(position, price.cents) };
  }

  function parseCalendarDate(raw) {
    const value = String(raw ?? '').trim();
    if (!value) return { status: 'empty' };
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!parts) return { status: 'invalid' };
    const [, year, month, day] = parts.map(Number);
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return { status: 'invalid' };
    // Use UTC calendar days. Local DST must never change a holding period.
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(0, 0, 0, 0);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return { status: 'invalid' };
    return { status: 'valid', value, dayNumber: date.getTime() / 86400000 };
  }

  function evaluateHoldingPeriod(rawBuyDate, rawSaleDate, netGainCents = null) {
    if (netGainCents !== null && typeof netGainCents !== 'bigint') throw new RangeError('Ungültiges Szenarioergebnis');
    const buy = parseCalendarDate(rawBuyDate);
    const sale = parseCalendarDate(rawSaleDate);
    const errors = {};
    if (buy.status === 'invalid') errors.buyDate = 'Bitte ein gültiges Kaufdatum eingeben.';
    if (sale.status === 'invalid') errors.saleDate = 'Bitte ein gültiges Verkaufsdatum eingeben.';
    if (buy.status === 'valid' && sale.status === 'valid' && sale.dayNumber < buy.dayNumber) errors.saleDate = 'Das Verkaufsdatum darf nicht vor dem Kaufdatum liegen.';
    if (Object.keys(errors).length) return { status: 'invalid', errors };
    if (buy.status === 'empty' || sale.status === 'empty') return { status: buy.status === 'empty' && sale.status === 'empty' ? 'empty' : 'incomplete', errors };
    const days = sale.dayNumber - buy.dayNumber;
    let dailyAverageCents = null;
    if (days > 0 && netGainCents !== null) {
      const absolute = netGainCents < 0n ? -netGainCents : netGainCents;
      const rounded = (absolute + BigInt(days) / 2n) / BigInt(days);
      dailyAverageCents = netGainCents < 0n ? -rounded : rounded;
    }
    return { status: 'valid', errors, days, buyDate: buy.value, saleDate: sale.value, dailyAverageCents };
  }

  const api = { validateInputs, calculatePosition, evaluate, orderFee, normalizeCosts, calculateSaleScenario, evaluateSaleScenario, evaluateHoldingPeriod };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PositionCalculator = api;
})(typeof globalThis === 'object' ? globalThis : this);
