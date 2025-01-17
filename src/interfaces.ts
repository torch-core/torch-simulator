import { Allocation, Asset } from '@torch-finance/core';
import {
  SimulatorDepositResult,
  SimulatorSwapResult,
  SimulateWithdrawResult,
  SimulatorSnapshot,
  SimulateDepositParams,
  SimulateSwapParams,
  SimulateWithdrawParams,
} from './types';

export interface IPoolSimulator {
  getA(): number;
  getIndex(asset: Asset): number;
  getD(xp: bigint[], amp: number): bigint;
  getDMem(balances: bigint[], rates: bigint[], amp: number): bigint;
  getVirtualPrice(rates?: Allocation[] | null): bigint;
  getY(i: number, j: number, x: bigint, xp: bigint[]): bigint;
  getYD(i: number, xp: bigint[], d: bigint): bigint;
  dy(i: number, j: number, dx: bigint, rates: bigint[]): bigint;
  deposit(depositParams: SimulateDepositParams): SimulatorDepositResult;
  swap(swapParams: SimulateSwapParams): SimulatorSwapResult;
  withdraw(withdrawParams: SimulateWithdrawParams): SimulateWithdrawResult;
  claimAdminFees(rates?: Allocation[]): SimulatorDepositResult;
  rampA(futureA: number, futureATime: number, nowBeforeRampA: number): void;
  stopRampA(now: number): void;
  swapExactOut(swapExactOutParams: SimulateSwapParams): bigint;
  saveSnapshot(): SimulatorSnapshot;
  restoreSnapshot(state: SimulatorSnapshot): void;
}
