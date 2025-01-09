import { Decimal } from './config';

export const FEE_DENOMINATOR = new Decimal(10).pow(10);
export const PRECISION = new Decimal(10).pow(18);
export const A_PRECISION = 100;
export const A_PRECISION_D = new Decimal(A_PRECISION);
export const MIN_RAMP_TIME = 86400;
export const MAX_A_CHANGE = 10;
export const MAX_A = 1000000;
export const MAX_ITERATIONS = 255;
