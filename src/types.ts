import { Allocation } from '@torch-finance/core';

interface SimulatorConfig {
  initA: number; // initial amplification coefficient
  futureA: number; // future amplification coefficient
  initATime: number; // initial time of amplification coefficient
  futureATime: number; // future time of amplification coefficient
  feeNumerator: number; // fee numerator
  adminFeeNumerator: number; // admin fee numerator
}

export interface SimulatorState extends SimulatorConfig {
  adminFees: Allocation[]; // admin fees
  reserves: Allocation[]; // reserves
  lpTotalSupply: bigint; // total supply of lp tokens
  decimals: Allocation[]; // decimals of assets
  rates?: Allocation[]; // external rates for yield bearing stable pool
}

export interface SimulatorSnapshot extends SimulatorConfig {
  now: number; // current time
  adminFees: bigint[]; // admin fees
  reserves: bigint[]; // reserves
  lpTotalSupply: bigint; // total supply of lp tokens
  rates: bigint[]; // external rates for yield bearing stable pool
}
