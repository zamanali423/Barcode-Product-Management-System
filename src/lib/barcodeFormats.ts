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

/** Human-readable names for the formats zxing-wasm can decode. */
export function barcodeFormatLabel(
  format: string | null | undefined,
): string | undefined {
  switch (format) {
    case 'Aztec':
    case 'AztecCode':
      return 'Aztec';
    case 'Codabar':
      return 'Codabar';
    case 'Code39':
    case 'Code39Std':
    case 'Code39Ext':
      return 'CODE39';
    case 'Code93':
      return 'CODE93';
    case 'Code128':
      return 'CODE128';
    case 'DataMatrix':
      return 'Data Matrix';
    case 'EAN8':
      return 'EAN-8';
    case 'EAN13':
      return 'EAN-13';
    case 'ITF':
      return 'ITF';
    case 'ITF14':
      return 'ITF-14';
    case 'MaxiCode':
      return 'MaxiCode';
    case 'PDF417':
    case 'CompactPDF417':
      return 'PDF417';
    case 'QRCode':
    case 'QRCodeModel1':
    case 'QRCodeModel2':
      return 'QR Code';
    case 'MicroQRCode':
      return 'Micro QR';
    case 'RMQRCode':
      return 'rMQR';
    case 'DataBar':
    case 'DataBarOmni':
    case 'DataBarStk':
    case 'DataBarStkOmni':
      return 'GS1 DataBar';
    case 'DataBarExp':
    case 'DataBarExpStk':
      return 'GS1 DataBar Expanded';
    case 'UPCA':
      return 'UPC-A';
    case 'UPCE':
      return 'UPC-E';
    default:
      return undefined;
  }
}

/**
 * Normalizes values returned by the native decoder. zxing-wasm expands UPC-E
 * to a GTIN-13, so the original eight-digit code is read from the extra
 * metadata; UPC-A is returned as a thirteen-digit GTIN with a leading zero.
 */
export function normalizeDecodedBarcode(
  rawText: string,
  decodedFormat?: string | null,
  extra?: string | null,
): string {
  const text = rawText.trim();
  if (decodedFormat === 'UPCE' && extra) {
    try {
      const metadata = JSON.parse(extra) as { UPCE?: unknown };
      if (typeof metadata.UPCE === 'string' && /^\d{8}$/.test(metadata.UPCE)) {
        return metadata.UPCE;
      }
    } catch {
      // Fall back to the decoder text below.
    }
  }
  if (decodedFormat === 'UPCA' && /^0\d{12}$/.test(text)) {
    return text.slice(1);
  }
  return text;
}

export interface BarcodeFormatResolution {
  /** A detected format name, or {@link UNKNOWN_BARCODE_FORMAT}. */
  format: string;
  /** Whether a format-specific check digit passed. Undefined when not applicable. */
  checkDigitValid?: boolean;
  /** Explains an invalid check digit or an incomplete format hint. */
  note?: string;
}

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

/**
 * Expands an eight-digit UPC-E value to the eleven UPC-A digits (without the
 * check digit) used for its checksum. Returns null when the number system or
 * payload shape is not UPC-E.
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

function isUpcE(value: string): boolean {
  const body = upcEExpandedBody(value);
  return body !== null && gs1CheckDigit(body) === Number(value[7]);
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
 * Resolves a barcode format without consulting the product catalogue.
 *
 * Camera decoders supply a format; keyboard-wedge scanners and manual entry
 * only supply text. In that case, conservative format-specific rules identify
 * GTIN-family values (including their check digits). Values that cannot be
 * identified safely remain "Unknown Format" rather than being guessed.
 */
export function resolveBarcodeFormat(
  rawValue: string,
  decodedFormat?: string | null,
): BarcodeFormatResolution {
  const value = rawValue.trim();
  const supplied = decodedFormat?.trim();

  if (supplied && supplied !== UNKNOWN_BARCODE_FORMAT) {
    const effectiveFormat =
      supplied === 'ITF' && isItf14(value) ? 'ITF-14' : supplied;
    const validation = validateDecodedFormat(effectiveFormat, value);
    if (validation.valid === false) {
      return {
        format: UNKNOWN_BARCODE_FORMAT,
        checkDigitValid: false,
        note: `${validation.note} The decoded value is preserved below.`,
      };
    }
    return { format: effectiveFormat, checkDigitValid: validation.valid };
  }

  if (!/^\d+$/.test(value)) {
    return { format: UNKNOWN_BARCODE_FORMAT };
  }

  switch (value.length) {
    case 13:
      if (isEan13(value)) {
        return { format: 'EAN-13', checkDigitValid: true };
      }
      return {
        format: UNKNOWN_BARCODE_FORMAT,
        checkDigitValid: false,
        note: 'This is a 13-digit value, but its EAN-13 check digit is invalid.',
      };
    case 12:
      if (isUpcA(value)) {
        return { format: 'UPC-A', checkDigitValid: true };
      }
      return {
        format: UNKNOWN_BARCODE_FORMAT,
        checkDigitValid: false,
        note: 'This is a 12-digit value, but its UPC-A check digit is invalid.',
      };
    case 8:
      if (isUpcE(value)) {
        return { format: 'UPC-E', checkDigitValid: true };
      }
      if (isEan8(value)) {
        return { format: 'EAN-8', checkDigitValid: true };
      }
      return {
        format: UNKNOWN_BARCODE_FORMAT,
        checkDigitValid: false,
        note: 'This 8-digit value does not pass EAN-8 or UPC-E check-digit validation.',
      };
    case 14:
      if (isItf14(value)) {
        return { format: 'ITF-14', checkDigitValid: true };
      }
      return {
        format: UNKNOWN_BARCODE_FORMAT,
        checkDigitValid: false,
        note: 'This is a 14-digit value, but its GS1 check digit is invalid.',
      };
    default:
      return { format: UNKNOWN_BARCODE_FORMAT };
  }
}
