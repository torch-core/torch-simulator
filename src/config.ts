import { Decimal as DecimalJS } from 'decimal.js';

export const Decimal = DecimalJS.clone({ precision: 100 });
