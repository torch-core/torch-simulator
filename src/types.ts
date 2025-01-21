import { Allocation } from '@torch-finance/core';

// export type SimulateDepositParams = {
//   depositAmounts: Allocation[]; // amount of tokens to be deposited
//   rates?: Allocation[]; // external rates for yield bearing stable pool
// };

// export type SimulatorDepositResult = {
//   lpTokenOut: bigint; // amount of lp tokens minted
//   virtualPriceBefore: bigint; // virtual price before deposit
//   virtualPriceAfter: bigint; // virtual price after deposit
//   lpTotalSupply: bigint; // total supply of lp tokens
// };

// export type SimulateSwapParams = {
//   assetIn: Asset; // asset to be swapped in
//   assetOut: Asset; // asset to be swapped out
//   amount: bigint; // amount of asset to be swapped
//   rates?: Allocation[]; // external rates for yield bearing stable pool
// };

// export type SimulatorSwapResult = {
//   amountOut: bigint; // amount of asset received
//   virtualPriceBefore: bigint; // virtual price before swap
//   virtualPriceAfter: bigint; // virtual price after swap
// };

// export type SimulateWithdrawParams = {
//   lpAmount: bigint; // amount of lp tokens to be burned
//   assetOut?: Asset; // asset to be withdrawn
//   rates?: Allocation[]; // external rates for yield bearing stable pool
// };

// export type SimulateWithdrawResult = {
//   amountOuts: bigint[]; // amount of assets received
//   virtualPriceBefore: bigint; // virtual price before withdraw
//   virtualPriceAfter: bigint; // virtual price after withdraw
// };

export interface SimulatorState {
  initA: number; // initial amplification coefficient
  futureA: number; // future amplification coefficient
  initATime: number; // initial time of amplification coefficient
  futureATime: number; // future time of amplification coefficient
  feeNumerator: number; // fee numerator
  adminFeeNumerator: number; // admin fee numerator
  adminFees: Allocation[]; // admin fees
  reserves: Allocation[]; // reserves
  lpTotalSupply: bigint; // total supply of lp tokens
  decimals: Allocation[]; // decimals of assets
  rates?: Allocation[]; // external rates for yield bearing stable pool
}

export interface SimulatorSnapshot {
  initA: number; // initial amplification coefficient
  futureA: number; // future amplification coefficient
  initATime: number; // initial time of amplification coefficient
  futureATime: number; // future time of amplification coefficient
  now: number; // current time
  adminFees: bigint[]; // admin fees
  reserves: bigint[]; // reserves
  lpTotalSupply: bigint; // total supply of lp tokens
  rates: bigint[]; // external rates for yield bearing stable pool
}
