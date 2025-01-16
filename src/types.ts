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
  feeNumerator: number;
  adminFeeNumerator: number;
  adminFees: Allocation[];
  balances: Allocation[];
  lpTotalSupply: bigint;
  decimals: Allocation[];
  rates?: Allocation[];
}

export interface SimulatorSnapshot {
  initA: number;
  futureA: number;
  initATime: number;
  futureATime: number;
  now: number;
  adminFees: bigint[];
  balances: bigint[];
  lpTotalSupply: bigint;
  rates: bigint[];
}
