import { Allocation, Asset } from '@torch-finance/core';
import {
  SimulateDepositParams,
  SimulateDepositResult,
  SimulateSwapParams,
  SimulateSwapResult,
  SimulateWithdrawParams,
  SimulateWithdrawResult,
} from '@torch-finance/dex-contract-wrapper';
import { SimulatorSnapshot } from './types';

export interface IPoolSimulator {
  getA(): number;
  getIndex(asset: Asset): number;
  getD(xp: bigint[], amp: number): bigint;
  getDMem(balances: bigint[], rates: bigint[], amp: number): bigint;
  getVirtualPrice(rates?: Allocation[] | null): bigint;
  getY(i: number, j: number, x: bigint, xp: bigint[]): bigint;
  getYD(i: number, xp: bigint[], d: bigint): bigint;
  dy(i: number, j: number, dx: bigint, rates: bigint[]): bigint;
  deposit(depositParams: SimulateDepositParams): SimulateDepositResult;
  swap(swapParams: SimulateSwapParams): SimulateSwapResult;
  withdraw(withdrawParams: SimulateWithdrawParams): SimulateWithdrawResult;
  claimAdminFees(rates?: Allocation[]): SimulateDepositResult;
  rampA(futureA: number, futureATime: number, nowBeforeRampA: number): void;
  stopRampA(now: number): void;
  saveSnapshot(): SimulatorSnapshot;
  restoreSnapshot(state: SimulatorSnapshot): void;
}
