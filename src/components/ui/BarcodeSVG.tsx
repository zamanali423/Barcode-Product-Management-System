import JsBarcode from 'jsbarcode';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

interface BarcodeSVGProps {
  value: string;
  height?: number;
  width?: number;
  fontSize?: number;
  displayValue?: boolean;
  className?: string;
  lineColor?: string;
}

export function BarcodeSVG({
  value,
  height = 52,
  width = 2,
  fontSize = 13,
  displayValue = true,
  className,
  lineColor = '#0B1736',
}: BarcodeSVGProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    if (!value.trim()) {
      setError('No barcode value');
      return;
    }
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width,
        height,
        displayValue,
        fontSize,
        textMargin: 2,
        margin: 0,
        background: '#FFFFFF',
        lineColor,
        font: 'Inter, ui-sans-serif, system-ui, sans-serif',
        valid: () => undefined,
      });
      setError(null);
    } catch {
      setError('Barcode could not be rendered');
    }
  }, [value, width, height, displayValue, fontSize, lineColor]);

  if (error) {
    return (
      <span className={cn('block py-3 text-center text-[11px] text-danger', className)}>
        {error}
      </span>
    );
  }

  return (
    <span className={cn('label-barcode block', className)}>
      <svg
        ref={svgRef}
        role="img"
        aria-label={`Barcode ${value}`}
        className="block h-auto w-full"
      />
    </span>
  );
}
