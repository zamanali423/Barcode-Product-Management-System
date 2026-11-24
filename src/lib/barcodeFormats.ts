export const UNKNOWN_BARCODE_FORMAT = 'Unknown Format';

/**
 * Symbologies enabled for camera recognition. These are zxing-wasm format
 * names; the wasm build is used because the pure-JS ZXing port cannot decode
 * UPC-E reliably.
 */
export const SUPPORTED_BARCODE_FORMATS = [
  'Code128',
  'Code39',
  'Code93',
  'Codabar',
  'EAN13',
  'EAN8',
  'UPCA',
  'UPCE',
  'ITF',
  'DataBar',
  'DataBarExp',
  'QRCode',
  'MicroQRCode',
  'DataMatrix',
  'Aztec',
  'PDF417',
  'MaxiCode',
] as const;

/** Canonical zxing/wasm format name to the label shown in the scanner UI. */
const FORMAT_LABELS: Record<string, string> = {
  Aztec: 'Aztec',
  AztecCode: 'Aztec',
  Codabar: 'Codabar',
  Code39: 'CODE39',
  Code39Std: 'CODE39',
  Code39Ext: 'CODE39',
  Code93: 'CODE93',
  Code128: 'CODE128',
  CompactPDF417: 'PDF417',
  DataBar: 'GS1 DataBar',
  DataBarOmni: 'GS1 DataBar',
  DataBarStk: 'GS1 DataBar',
  DataBarStkOmni: 'GS1 DataBar',
  DataBarLtd: 'GS1 DataBar',
  DataBarExp: 'GS1 DataBar Expanded',
  DataBarExpStk: 'GS1 DataBar Expanded',
  DataMatrix: 'Data Matrix',
  EAN8: 'EAN-8',
  EAN13: 'EAN-13',
  ITF: 'ITF',
  ITF14: 'ITF-14',
  MaxiCode: 'MaxiCode',
  MicroQRCode: 'Micro QR',
  PDF417: 'PDF417',
  QRCode: 'QR Code',
  QRCodeModel1: 'QR Code',
  QRCodeModel2: 'QR Code',
  RMQRCode: 'rMQR',
  UPCA: 'UPC-A',
  UPCE: 'UPC-E',
};

const FORMAT_LABEL_SET = new Set(Object.values(FORMAT_LABELS));

/**
 * Human-readable name for a decoded symbology. Accepts canonical zxing names
 * and labels already produced by this function, so stored scan records can be
 * re-interpreted safely. Returns undefined for "None"/unknown values.
 */
export function barcodeFormatLabel(format: string | null | undefined): string | undefined {
  if (!format) return undefined;
  const value = format.trim();
  if (!value || value === 'None' || value === UNKNOWN_BARCODE_FORMAT) return undefined;
  return FORMAT_LABELS[value] ?? (FORMAT_LABEL_SET.has(value) ? value : undefined);
}

/** GS1 mod-10 check digit for a body of digits (weighting 3,1 from the right). */
function gs1CheckDigit(body: string): number {
  let sum = 0;
  for (let index = 0; index < body.length; index += 1) {
    const digit = Number(body[body.length - 1 - index]);
    sum += digit * (index % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

function passesGs1CheckDigit(value: string): boolean {
  if (!/^\d{2,}$/.test(value)) return false;
  return gs1CheckDigit(value.slice(0, -1)) === Number(value[value.length - 1]);
}

function isUpcE(value: string): boolean {
  const upcA = upcEToUpcA(value);
  return upcA !== null;
}

function isEan13(value: string): boolean {
  return /^\d{13}$/.test(value) && passesGs1CheckDigit(value);
}

function isEan8(value: string): boolean {
  return /^\d{8}$/.test(value) && passesGs1CheckDigit(value);
}

function isUpcA(value: string): boolean {
  return /^\d{12}$/.test(value) && passesGs1CheckDigit(value);
}

function isItf14(value: string): boolean {
  return /^\d{14}$/.test(value) && passesGs1CheckDigit(value);
}

/**
 * Expands the eleven UPC-A digits (without the check digit) encoded by an
 * eight-digit UPC-E value. Returns null when the number system or payload
 * shape is not UPC-E.
 */
function upcEExpandedBody(value: string): string | null {
  if (!/^[01]\d{7}$/.test(value)) return null;
  const numberSystem = value[0];
  const payload = value.slice(1, 7);
  const last = payload[5];
  let body: string;

  switch (last) {
    case '0':
    case '1':
    case '2':
      body = `${numberSystem}${payload.slice(0, 2)}${last}0000${payload.slice(2, 5)}`;
      break;
    case '3':
      body = `${numberSystem}${payload.slice(0, 3)}00000${payload.slice(3, 5)}`;
      break;
    case '4':
      body = `${numberSystem}${payload.slice(0, 4)}00000${payload.slice(4, 5)}`;
      break;
    default:
      body = `${numberSystem}${payload.slice(0, 5)}0000${last}`;
      break;
  }

  return body.length === 11 ? body : null;
}

/** Expands a verified eight-digit UPC-E value to its twelve-digit UPC-A form. */
function upcEToUpcA(value: string): string | null {
  const body = upcEExpandedBody(value);
  if (!body) return null;
  if (gs1CheckDigit(body) !== Number(value[7])) return null;
  return `${body}${value[7]}`;
}

/**
 * zxing-cpp reports UPC-A symbols as a thirteen-digit EAN-13 value with a
 * leading zero. GS1 defines that number as UPC-A, so strip the zero when the
 * remaining twelve digits form a valid UPC-A.
 */
function upcAFromGtin13(value: string): string | null {
  if (!/^0\d{12}$/.test(value)) return null;
  const upcA = value.slice(1);
  return isUpcA(upcA) ? upcA : null;
}

function upcEFromExtra(extra?: string | null): string | null {
  if (!extra) return null;
  try {
    const metadata = JSON.parse(extra) as { UPCE?: unknown };
    return typeof metadata.UPCE === 'string' && /^\d{8}$/.test(metadata.UPCE)
      ? metadata.UPCE
      : null;
  } catch {
    return null;
  }
}

function validateDecodedFormat(
  format: string,
  value: string,
): { valid?: boolean; note?: string } {
  switch (format) {
    case 'EAN-13':
      return isEan13(value)
        ? { valid: true }
        : { valid: false, note: 'The EAN-13 value does not pass its check digit.' };
    case 'EAN-8':
      return isEan8(value)
        ? { valid: true }
        : { valid: false, note: 'The EAN-8 value does not pass its check digit.' };
    case 'UPC-A':
      return isUpcA(value)
        ? { valid: true }
        : { valid: false, note: 'The UPC-A value does not pass its check digit.' };
    case 'UPC-E':
      return isUpcE(value)
        ? { valid: true }
        : { valid: false, note: 'The UPC-E value does not pass its check digit.' };
    case 'ITF-14':
      return isItf14(value)
        ? { valid: true }
        : { valid: false, note: 'The ITF-14 value does not pass its check digit.' };
    default:
      return {};
  }
}

/**
 * Values to try against the local catalogue. The decoded value is always
 * first; UPC/GTIN equivalents cover records stored in another valid form,
 * e.g. a UPC-A saved as its thirteen-digit GTIN or a UPC-E saved expanded.
 */
function barcodeLookupVariants(value: string): string[] {
  const variants = new Set<string>();
  if (value) variants.add(value);

  if (/^\d{8}$/.test(value)) {
    const upcA = upcEToUpcA(value);
    if (upcA) {
      variants.add(upcA);
      variants.add(`0${upcA}`);
    }
  } else if (/^\d{12}$/.test(value)) {
    variants.add(`0${value}`);
  } else if (/^0\d{12}$/.test(value)) {
    const upcA = value.slice(1);
    if (isUpcA(upcA)) variants.add(upcA);
  }

  return [...variants];
}

export interface BarcodeInterpretation {
  /** Value to display, store and prefill. Preserved unless it is a UPC form. */
  value: string;
  /** Detected or validated symbology label, or "Unknown Format". */
  format: string;
  /** Whether a format-specific check digit passed. Undefined when not applicable. */
  checkDigitValid?: boolean;
  /** Explains an invalid check digit or an inferred format. */
  note?: string;
  /** Values to search in Dexie: the value plus valid GTIN equivalents. */
  lookupValues: string[];
}

function buildInterpretation(
  value: string,
  format: string,
  checkDigitValid?: boolean,
  note?: string,
): BarcodeInterpretation {
  return {
    value,
    format,
    checkDigitValid,
    note,
    lookupValues: barcodeLookupVariants(value),
  };
}

/**
 * Interprets a scanned value independently of the product catalogue.
 *
 * Camera decoders supply a symbology and optional metadata; keyboard-wedge
 * scanners and manual entry only supply text. Without decoder metadata,
 * GTIN-family formats are inferred only when their check digit passes. A
 * decoder-supplied format is always displayed, with a note when the value
 * fails validation, instead of being hidden.
 */
export function interpretBarcode(
  rawValue: string,
  decodedFormat?: string | null,
  extra?: string | null,
): BarcodeInterpretation {
  const original = rawValue.trim();
  if (!original) return buildInterpretation(original, UNKNOWN_BARCODE_FORMAT);

  const decodedLabel = barcodeFormatLabel(decodedFormat);

  if (decodedLabel) {
    let value = original;
    if (decodedLabel === 'UPC-E') {
      value = upcEFromExtra(extra) ?? original;
    }

    if (decodedLabel === 'EAN-13' || decodedLabel === 'UPC-A') {
      const upcA = upcAFromGtin13(value);
      if (upcA) return buildInterpretation(upcA, 'UPC-A', true);
    }

    const effectiveFormat =
      decodedLabel === 'ITF' && isItf14(value) ? 'ITF-14' : decodedLabel;
    const validation = validateDecodedFormat(effectiveFormat, value);
    if (validation.valid === false) {
      return buildInterpretation(
        value,
        effectiveFormat,
        false,
        `${validation.note} The decoded value is preserved below.`,
      );
    }
    return buildInterpretation(value, effectiveFormat, validation.valid);
  }

  if (!/^\d+$/.test(original)) {
    return buildInterpretation(original, UNKNOWN_BARCODE_FORMAT);
  }

  switch (original.length) {
    case 8: {
      if (isUpcE(original)) return buildInterpretation(original, 'UPC-E', true);
      if (isEan8(original)) return buildInterpretation(original, 'EAN-8', true);
      return buildInterpretation(
        original,
        UNKNOWN_BARCODE_FORMAT,
        false,
        'This 8-digit value does not pass EAN-8 or UPC-E check-digit validation.',
      );
    }
    case 12: {
      if (isUpcA(original)) return buildInterpretation(original, 'UPC-A', true);
      return buildInterpretation(
        original,
        UNKNOWN_BARCODE_FORMAT,
        false,
        'This is a 12-digit value, but its UPC-A check digit is invalid.',
      );
    }
    case 13: {
      const upcA = upcAFromGtin13(original);
      if (upcA) return buildInterpretation(upcA, 'UPC-A', true);
      if (isEan13(original)) return buildInterpretation(original, 'EAN-13', true);
      return buildInterpretation(
        original,
        UNKNOWN_BARCODE_FORMAT,
        false,
        'This is a 13-digit value, but its EAN-13 check digit is invalid.',
      );
    }
    case 14: {
      if (isItf14(original)) return buildInterpretation(original, 'ITF-14', true);
      return buildInterpretation(
        original,
        UNKNOWN_BARCODE_FORMAT,
        false,
        'This is a 14-digit value, but its GS1 check digit is invalid.',
      );
    }
    default:
      return buildInterpretation(original, UNKNOWN_BARCODE_FORMAT);
  }
}

/** Backwards-compatible helper returning only the normalized decoded value. */
export function normalizeDecodedBarcode(
  rawText: string,
  decodedFormat?: string | null,
  extra?: string | null,
): string {
  return interpretBarcode(rawText, decodedFormat, extra).value;
}
