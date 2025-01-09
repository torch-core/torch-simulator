import { Asset } from '@torch-finance/core';
import { Decimal as DecimalType } from 'decimal.js';

export type SimulatorDeposit = {
  lpAmount: DecimalType;
  vpBefore: DecimalType;
  vpAfter: DecimalType;
  adminFeesDiff: DecimalType[];
};

export type SimulatorSwap = {
  amountOut: DecimalType;
  vpBefore: DecimalType;
  vpAfter: DecimalType;
};

export type SimulateWithdraw = {
  amountOuts: DecimalType[];
  vpBefore: DecimalType;
  vpAfter: DecimalType;
};

export type SimulateWithdrawOne = {
  amountOut: DecimalType;
  vpBefore: DecimalType;
  vpAfter: DecimalType;
};

export interface SimulatorState {
  initA: number;
  futureA: number;
  initATime: number;
  futureATime: number;
  now: number;
  n: number;
  rates: bigint[];
  balances: bigint[];
  fee: bigint;
  adminFee: bigint;
  adminFees: bigint[];
  totalSupply: bigint;
  assets: Asset[];
  decimals: number[];
}

export interface SimulatorSnapshot {
  A: DecimalType;
  futureA: DecimalType;
  initATime: DecimalType;
  futureATime: DecimalType;
  now: DecimalType;
  balances: string[];
  adminFees: string[];
  totalSupply: string;
}
