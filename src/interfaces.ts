import { Asset } from '@torch-finance/core';
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
  getA(): bigint;
  get_index(asset: Asset): number;
  getD(xp: bigint[], amp: bigint): bigint;
  getD_mem(_balances: bigint[], _rates: bigint[], amp: bigint): bigint;
  getVirtualPrice(): bigint;
  getY(i: number, j: number, x: bigint, xp_: bigint[]): bigint;
  getYD(i: number, xp: bigint[], d: bigint): bigint;
  dy(i: number, j: number, dx: bigint, _rates: bigint[]): bigint;
  deposit(depositParams: SimulateDepositParams): SimulatorDepositResult;
  swap(swapParams: SimulateSwapParams): SimulatorSwapResult;
  withdraw(withdrawParams: SimulateWithdrawParams): SimulateWithdrawResult;
  claimAdminFees(): SimulatorDepositResult;
  rampA(futureA: number, futureATime: number, nowBeforeRampA: number): void;
  stopRampA(now: number): void;
  swapExactOut(swapExactOutParams: SimulateSwapParams): bigint;
  saveSnapshot(): SimulatorSnapshot;
  restoreSnapshot(state: SimulatorSnapshot): void;
}
