/**
 * Centralized Money & Tax Precision Utility
 * Prevents IEEE-754 floating-point drift and guarantees standard UAE 5% VAT calculations.
 */

export class CurrencyPrecision {
  /**
   * Round monetary values safely to 2 decimal places using Number.EPSILON
   * Avoids classic floating point rounding anomalies like 1.005 rounding to 1.00 instead of 1.01.
   */
  static round(amount: number): number {
    if (isNaN(amount) || !isFinite(amount)) return 0;
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  /**
   * Convert standard major units (e.g. AED) to minor units (e.g. Fils / Cents)
   */
  static toMinorUnits(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100);
  }

  /**
   * Convert minor units (Fils) back to standard major units (AED)
   */
  static fromMinorUnits(fils: number): number {
    return Math.round(fils + Number.EPSILON) / 100;
  }

  /**
   * Standard UAE 5% VAT calculation with strict 2-decimal precision
   */
  static calculateVat(taxableAmount: number, vatRate = 5): number {
    if (taxableAmount <= 0) return 0;
    const rawTax = (taxableAmount * vatRate) / 100;
    return this.round(rawTax);
  }

  /**
   * Proportional Line-Item VAT with discount allocation
   */
  static calculateLineItemVat(
    rate: number,
    qty: number,
    proportionalDiscount = 0,
    taxRate = 5,
  ): number {
    const grossLine = (rate || 0) * (qty || 0);
    const taxableLine = Math.max(0, grossLine - proportionalDiscount);
    return this.calculateVat(taxableLine, taxRate);
  }

  /**
   * Clamps discount so it cannot exceed subtotal or be negative
   */
  static clampDiscount(subtotal: number, requestedDiscount = 0): number {
    const validDiscount = Math.max(0, requestedDiscount || 0);
    return this.round(Math.min(subtotal, validDiscount));
  }

  /**
   * Safe financial sum across an array of numbers
   */
  static sum(numbers: number[]): number {
    const totalMinor = numbers.reduce((acc, val) => acc + this.toMinorUnits(val || 0), 0);
    return this.fromMinorUnits(totalMinor);
  }
}
