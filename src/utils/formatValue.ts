/**
 * Utility function to format numeric values with SI unit prefixes.
 * Converts values to appropriate scale (Pico to Tera) for display.
 */

interface SIPrefix {
  threshold: number;
  symbol: string;
}

const SI_PREFIXES: SIPrefix[] = [
  { threshold: 1e12, symbol: "T" }, // Tera
  { threshold: 1e9, symbol: "G" }, // Giga
  { threshold: 1e6, symbol: "M" }, // Mega
  { threshold: 1e3, symbol: "k" }, // Kilo
  { threshold: 1, symbol: "" }, // Base unit
  { threshold: 1e-3, symbol: "m" }, // Milli
  { threshold: 1e-6, symbol: "μ" }, // Micro
  { threshold: 1e-9, symbol: "n" }, // Nano
  { threshold: 1e-12, symbol: "p" }, // Pico
];

/**
 * Formats a numeric value with appropriate SI prefix.
 *
 * @param value - The numeric value to format
 * @param unit - The base unit symbol (e.g., 'Ω', 'V', 'A')
 * @param precision - Number of decimal places (default: 2)
 * @returns Formatted string with SI prefix and unit
 *
 * @example
 * formatValue(1000, 'Ω') // "1kΩ"
 * formatValue(0.001, 'A') // "1mA"
 * formatValue(1000000, 'V') // "1MV"
 * formatValue(0.000001, 'Ω') // "1μΩ"
 */
export function formatValue(value: number, unit: string, precision: number = 2): string {
  if (value === 0) {
    return `0${unit}`;
  }

  const absValue = Math.abs(value);

  // Find the appropriate SI prefix
  for (const prefix of SI_PREFIXES) {
    if (absValue >= prefix.threshold) {
      const scaledValue = value / prefix.threshold;

      // Remove trailing zeros and unnecessary decimal point
      const formatted = Number.parseFloat(scaledValue.toFixed(precision)).toString();

      return `${formatted}${prefix.symbol}${unit}`;
    }
  }

  // If value is smaller than pico, just show it in scientific notation
  return `${value.toExponential(precision)}${unit}`;
}
