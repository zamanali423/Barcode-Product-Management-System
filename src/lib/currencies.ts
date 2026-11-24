import type { CurrencyCode } from '../types';

export const CURRENCIES: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'PKR', label: 'Pakistani Rupee' },
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'AED', label: 'UAE Dirham' },
  { code: 'SAR', label: 'Saudi Riyal' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'BDT', label: 'Bangladeshi Taka' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'PKR';

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && CURRENCIES.some((currency) => currency.code === value);
}
