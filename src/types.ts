import { Allocation, Asset } from '@torch-finance/core';

export type SimulateDepositParams = {
  depositAmounts: Allocation[]; // amount of tokens to be deposited
  rates?: Allocation[]; // external rates for yield bearing stable pool
};

export type SimulatorDepositResult = {
  lpTokenOut: bigint;
  virtualPriceBefore: bigint;
  virtualPriceAfter: bigint;
  lpTotalSupply: bigint;
};

export type SimulateSwapParams = {
  assetIn: Asset;
  assetOut: Asset;
  amount: bigint;
  rates?: Allocation[];
};

export type SimulatorSwapResult = {
  amountOut: bigint;
  virtualPriceBefore: bigint;
  virtualPriceAfter: bigint;
};

export type SimulateWithdrawParams = {
  lpAmount: bigint;
  assetOut?: Asset;
  rates?: Allocation[];
};

export type SimulateWithdrawResult = {
  amountOuts: bigint[];
  virtualPriceBefore: bigint;
  virtualPriceAfter: bigint;
};

export interface SimulatorState {
  initA: number;
  futureA: number;
  initATime: number;
  futureATime: number;
  balances: Allocation[];
  feeNumerator: number;
  adminFeeNumerator: number;
  adminFees: Allocation[];
  lpTotalSupply: bigint;
  assetsAndDecimals: Allocation[];
  rates?: Allocation[];
}

export interface SimulatorSnapshot {
  A: number;
  futureA: number;
  initATime: number;
  futureATime: number;
  now: number;
  balances: bigint[];
  adminFees: bigint[];
  lpTotalSupply: bigint;
  rates: bigint[];
}
