import { Asset, Allocation } from '@torch-finance/core';
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
  _xp(_rates: bigint[]): bigint[];
  _xp_mem(_balances: bigint[], _rates: bigint[]): bigint[];
  _get_index(asset: Asset): number;
  _setRates(rates: Allocation[]): void;
  _withdrawBalanced(amount: bigint): SimulateWithdrawResult;
  _withdrawOne(amount: bigint, target: Asset): SimulateWithdrawResult;
  getD(xp: bigint[], amp: bigint): bigint;
  getD_mem(_balances: bigint[], _rates: bigint[], amp: bigint): bigint;
  getVirtualPrice(): bigint;
  getY(i: number, j: number, x: bigint, xp_: bigint[]): bigint;
  getYD(i: number, xp: bigint[], d: bigint): bigint;
  dy(i: number, j: number, dx: bigint, _rates: bigint[]): bigint;
  deposit(depositParams: SimulateDepositParams): SimulatorDepositResult;
  swap(swapParams: SimulateSwapParams): SimulatorSwapResult;
  withdraw(withdrawParams: SimulateWithdrawParams): SimulateWithdrawResult;
  swapExactOut(swapExactOutParams: SimulateSwapParams): bigint;
  saveSnapshot(): SimulatorSnapshot;
  restoreSnapshot(state: SimulatorSnapshot): void;
}
