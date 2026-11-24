/** Generates a 12-digit numeric barcode value, compact enough for small labels. */
export function generateBarcodeCandidate(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes, (byte) => (byte % 10).toString()).join('');
  const stamp = String(Date.now()).slice(-6);
  return `29${stamp}${random}`;
}

export function normalizeBarcode(value: string): string {
  return value.trim();
}

export const BARCODE_FORMAT = 'CODE128';

export const barcodeOptions = {
  format: BARCODE_FORMAT,
  displayValue: true,
  margin: 0,
  background: '#FFFFFF',
  lineColor: '#0B1736',
  font: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontOptions: '',
  textMargin: 2,
  fontSize: 13,
} as const;
