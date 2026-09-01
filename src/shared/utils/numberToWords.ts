/**
 * Utility to convert numeric numbers into formal uppercase English words for financial/legal documents.
 * Example: 7500 -> "SEVEN THOUSAND FIVE HUNDRED"
 */

const ONES = [
  '',
  'ONE',
  'TWO',
  'THREE',
  'FOUR',
  'FIVE',
  'SIX',
  'SEVEN',
  'EIGHT',
  'NINE',
  'TEN',
  'ELEVEN',
  'TWELVE',
  'THIRTEEN',
  'FOURTEEN',
  'FIFTEEN',
  'SIXTEEN',
  'SEVENTEEN',
  'EIGHTEEN',
  'NINETEEN',
];

const TENS = [
  '',
  '',
  'TWENTY',
  'THIRTY',
  'FORTY',
  'FIFTY',
  'SIXTY',
  'SEVENTY',
  'EIGHTY',
  'NINETY',
];

function convertBelowThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) {
    const ten = TENS[Math.floor(n / 10)];
    const rem = ONES[n % 10];
    return rem ? `${ten}-${rem}` : ten;
  }
  const hundred = `${ONES[Math.floor(n / 100)]} HUNDRED`;
  const rem = n % 100;
  if (rem === 0) return hundred;
  return `${hundred} ${convertBelowThousand(rem)}`;
}

export function numberToWords(num: number): string {
  if (num === 0) return 'ZERO';
  const integerPart = Math.floor(Math.abs(num));

  if (integerPart === 0) return 'ZERO';

  const parts: string[] = [];

  const billions = Math.floor(integerPart / 1_000_000_000);
  const millions = Math.floor((integerPart % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((integerPart % 1_000_000) / 1_000);
  const remainder = integerPart % 1_000;

  if (billions > 0) {
    parts.push(`${convertBelowThousand(billions)} BILLION`);
  }
  if (millions > 0) {
    parts.push(`${convertBelowThousand(millions)} MILLION`);
  }
  if (thousands > 0) {
    parts.push(`${convertBelowThousand(thousands)} THOUSAND`);
  }
  if (remainder > 0) {
    parts.push(convertBelowThousand(remainder));
  }

  return parts.join(' ').trim();
}

/**
 * Format salary amount into formal UAE Dirhams legal wording.
 * e.g. 7500 -> "AED 7,500 (SEVEN THOUSAND FIVE HUNDRED UAE DIRHAMS) PER MONTH."
 */
export function formatSalaryLegalWording(amount: number): string {
  const formattedNumber = amount.toLocaleString('en-US');
  const words = numberToWords(amount).replace(/-/g, ' ');
  return `AED ${formattedNumber} (${words} UAE DIRHAMS) PER MONTH.`;
}

/**
 * Format quotation amount into verbal representation.
 * e.g. 5775 -> "Five Thousand Seven Hundred Seventy-Five UAE Dirhams Only"
 */
export function formatQuotationWords(amount: number): string {
  const integer = Math.floor(amount);
  const words = numberToWords(integer);
  const title = words
    .toLowerCase()
    .split(' ')
    .map((w) => {
      if (w.includes('-')) {
        return w
          .split('-')
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join('-');
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
  return `${title} UAE Dirhams Only`;
}
