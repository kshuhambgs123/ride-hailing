// Launch market is Delhi NCR, so rupees with Indian digit grouping
// (₹1,23,456.00) are the default everywhere amounts are shown.
export class CurrencyFormatter {
    static format(amount: number, currency: string = "INR", locale: string = "en-IN"): string {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
        }).format(Number(amount) || 0);
    }
}
