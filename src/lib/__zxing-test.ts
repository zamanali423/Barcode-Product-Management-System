import JsBarcode from 'jsbarcode';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import { barcodeFormatLabel, normalizeDecodedBarcode } from './barcodeFormats';
import zxingWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

let ready = false;

function ensureReady() {
  if (ready) return;
  prepareZXingModule({
    overrides: { locateFile: () => zxingWasmUrl },
    fireImmediately: true,
  });
  ready = true;
}

function render(format: string, value: string, scale = 4) {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, value, {
    format,
    width: scale,
    height: 140,
    margin: 16,
    displayValue: false,
    background: '#ffffff',
    lineColor: '#000000',
  });
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no 2d context');
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export async function run() {
  ensureReady();
  const cases = [
    ['EAN13', '5901234123457'],
    ['EAN8', '96385074'],
    ['UPC', '123456789012'],
    ['UPCE', '04252614'],
    ['CODE128', 'ABC-12345'],
    ['CODE39', 'CODE39TEST'],
    ['ITF14', '10012345000017'],
    ['codabar', 'A123456789A'],
  ] as const;
  const output: unknown[] = [];
  for (const [format, value] of cases) {
    const imageData = render(format, value);
    try {
      const results = await readBarcodes(imageData, {
        formats: [format === 'UPC' ? 'UPC-A' : format === 'UPCE' ? 'UPC-E' : format === 'codabar' ? 'Codabar' : format === 'CODE128' ? 'Code128' : format === 'CODE39' ? 'Code39' : format === 'ITF14' ? 'ITF' : format],
        tryHarder: true,
      });
      output.push({
        input: `${format}:${value}`,
        results: results.map((r) => ({
          text: r.text,
          format: r.format,
          label: barcodeFormatLabel(r.format),
          normalized: normalizeDecodedBarcode(r.text, r.format, r.extra),
          valid: r.isValid,
        })),
      });
    } catch (error) {
      output.push({ input: `${format}:${value}`, error: String(error) });
    }
  }
  return output;
}
