import JsBarcode from 'jsbarcode';
import type { CurrencyCode, LabelSize, Product } from '../types';
import { downloadBlob, formatPrice, slugifyFilename } from './utils';
import { barcodeOptions } from './barcode';

interface LabelDownloadOptions {
  storeName: string;
  currency: CurrencyCode;
  size: LabelSize;
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === 0) return [text];

  // Ellipsize the last line if content was cut.
  const joined = lines.join(' ');
  if (joined.length < text.replace(/\s+/g, ' ').length) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && context.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last}…`;
  }
  return lines;
}

async function renderLabel(
  product: Product,
  { storeName, currency, size }: LabelDownloadOptions,
): Promise<Blob> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const dimensions =
    size === 'large'
      ? { width: 1200, height: 698, padding: 46 }
      : { width: 900, height: 534, padding: 34 };
  const { width, height, padding } = dimensions;
  const scale = width / (size === 'large' ? 1200 : 900);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not create the label image.');

  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = '#D7DEE8';
  context.lineWidth = Math.max(2, Math.round(2 * scale));
  context.strokeRect(1, 1, width - 2, height - 2);

  const priceText = formatPrice(product.price, currency);
  const priceFontSize = (size === 'large' ? 52 : 40) * scale;
  const nameFontSize = (size === 'large' ? 36 : 30) * scale;
  const metaFontSize = (size === 'large' ? 24 : 20) * scale;

  context.font = `700 ${priceFontSize}px Inter, system-ui, sans-serif`;
  const priceWidth = context.measureText(priceText).width;
  const nameMaxWidth = width - padding * 2 - priceWidth - 24 * scale;

  context.fillStyle = '#172033';
  context.textBaseline = 'top';
  context.font = `600 ${nameFontSize}px Inter, system-ui, sans-serif`;
  const nameLines = fitText(context, product.name, nameMaxWidth, 2);
  const lineHeight = nameFontSize * 1.22;
  nameLines.forEach((line, index) => {
    context.fillText(line, padding, padding + index * lineHeight);
  });

  context.fillStyle = '#172554';
  context.textAlign = 'right';
  context.font = `700 ${priceFontSize}px Inter, system-ui, sans-serif`;
  context.fillText(priceText, width - padding, padding);

  const barcodeCanvas = document.createElement('canvas');
  JsBarcode(barcodeCanvas, product.barcode, {
    ...barcodeOptions,
    width: 3,
    height: 96,
    fontSize: 22,
    displayValue: true,
  });
  const barcodeTop = padding + lineHeight * 2 + 8 * scale;
  const barcodeAreaHeight = height - barcodeTop - padding - 38 * scale;
  const usableWidth = width - padding * 2;
  const barcodeScale = Math.min(
    usableWidth / barcodeCanvas.width,
    barcodeAreaHeight / barcodeCanvas.height,
  );
  const drawWidth = barcodeCanvas.width * barcodeScale;
  const drawHeight = barcodeCanvas.height * barcodeScale;
  context.drawImage(
    barcodeCanvas,
    padding + (usableWidth - drawWidth) / 2,
    barcodeTop + (barcodeAreaHeight - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );

  context.textAlign = 'left';
  context.textBaseline = 'bottom';
  context.fillStyle = '#475569';
  context.font = `600 ${metaFontSize}px Inter, system-ui, sans-serif`;
  context.fillText(product.sku || 'No SKU', padding, height - padding + 4 * scale);

  context.textAlign = 'right';
  context.fillStyle = '#94A3B8';
  context.font = `500 ${metaFontSize * 0.9}px Inter, system-ui, sans-serif`;
  context.fillText(storeName.toUpperCase(), width - padding, height - padding + 4 * scale);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The label image could not be created.'));
    }, 'image/png');
  });
}

export async function downloadBarcodeLabel(
  product: Product,
  options: LabelDownloadOptions,
): Promise<void> {
  const blob = await renderLabel(product, options);
  const suffix = product.sku || product.barcode;
  downloadBlob(blob, `${slugifyFilename(product.name)}-${slugifyFilename(suffix)}.png`);
}
