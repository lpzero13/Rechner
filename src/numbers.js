(function (root) {
  'use strict';

  // Keep decimal input exact: neither money nor risk passes through a float.
  function parseDecimal(raw, maxFraction = Infinity, grouping = false) {
    const value = String(raw ?? '').trim();
    if (!value) return { status: 'empty' };
    if (value.length > 120) return { status: 'invalid', message: 'Bitte eine kürzere Zahl eingeben (maximal 120 Zeichen).' };
    if (/^\d+[,.]$/.test(value)) return { status: 'incomplete' };
    let normalized = value;
    if (value.includes(',')) {
      if (!(grouping ? /^(?:\d+|[1-9]\d{0,2}(?:\.\d{3})+),\d+$/ : /^\d+,\d+$/).test(value)) return invalid();
      normalized = value.replace(/\./g, '').replace(',', '.');
    } else if (grouping && /^[1-9]\d{0,2}(?:\.\d{3})+$/.test(value)) {
      normalized = value.replace(/\./g, '');
    } else if (!/^\d+(?:\.\d+)?$/.test(value)) {
      return invalid();
    }
    const [whole, fraction = ''] = normalized.split('.');
    if (fraction.length > maxFraction) {
      return { status: 'invalid', message: 'Geldwerte dürfen höchstens zwei Nachkommastellen haben.' };
    }
    return { status: 'valid', numerator: BigInt(whole + fraction), scale: 10n ** BigInt(fraction.length) };
  }

  function invalid() {
    return { status: 'invalid', message: 'Bitte eine Zahl eingeben, zum Beispiel 47,50. Tausenderpunkte sind möglich.' };
  }

  function parseMoney(raw) {
    const result = parseDecimal(raw, 2, true);
    return result.status === 'valid' ? { ...result, cents: result.numerator * 100n / result.scale } : result;
  }

  const integerFormatter = new Intl.NumberFormat('de-DE');
  function formatInteger(value) { return integerFormatter.format(value); }
  function formatFixed(hundredths) {
    const sign = hundredths < 0n ? '−' : '';
    const absolute = hundredths < 0n ? -hundredths : hundredths;
    return sign + formatInteger(absolute / 100n) + ',' + String(absolute % 100n).padStart(2, '0');
  }
  function formatMoney(cents, positive = false) {
    return (positive && cents > 0n ? '+' : '') + formatFixed(cents) + '\u00a0€';
  }
  function formatMoneyInput(raw) {
    const parsed = parseMoney(raw);
    if (parsed.status !== 'valid') return String(raw ?? '');
    const formatted = formatFixed(parsed.cents);
    return formatted.length <= 120 ? formatted : String(raw ?? '');
  }
  function percentHundredths(numerator, denominator) {
    if (denominator <= 0n || numerator < 0n) throw new RangeError('Ungültiges Verhältnis');
    return (numerator * 10000n + denominator / 2n) / denominator;
  }
  function formatPercent(numerator, denominator, positive = false) {
    return (positive && numerator > 0n ? '+' : '') + formatFixed(percentHundredths(numerator, denominator)) + '\u00a0%';
  }
  function formatRatio(numerator, denominator) {
    if (denominator <= 0n) return '—';
    const absolute = numerator < 0n ? -numerator : numerator;
    return (numerator < 0n ? '−' : '') + formatFixed((absolute * 100n + denominator / 2n) / denominator) + ' : 1';
  }
  function formatSignedPercent(numerator, denominator) {
    const absolute = numerator < 0n ? -numerator : numerator;
    const rounded = percentHundredths(absolute, denominator);
    const sign = rounded === 0n ? '' : numerator < 0n ? '−' : '+';
    return sign + formatFixed(rounded) + '\u00a0%';
  }

  const api = { parseDecimal, parseMoney, formatInteger, formatMoney, formatMoneyInput, formatPercent, percentHundredths, formatRatio, formatSignedPercent };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PositionNumbers = api;
})(typeof globalThis === 'object' ? globalThis : this);
