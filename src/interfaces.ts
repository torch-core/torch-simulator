import { Asset, Allocation } from '@torch-finance/core';
import { SimulatorDeposit, SimulatorSwap, SimulateWithdraw, SimulateWithdrawOne, SimulatorSnapshot } from './types';
import { Decimal as DecimalType } from 'decimal.js';

export interface IPoolSimulator {
  getA(): DecimalType;
  _xp(_rates: DecimalType[]): DecimalType[];
  _xp_mem(_balances: DecimalType[], _rates: DecimalType[]): DecimalType[];
  _get_index(asset: Asset): number;
  getD(xp: DecimalType[], amp: DecimalType): DecimalType;
  getD_mem(_balances: DecimalType[], _rates: DecimalType[], amp: DecimalType): DecimalType;
  getVirtualPrice(): DecimalType;
  addLiquidity(alloc: Allocation[]): SimulatorDeposit;
  claimAdminFee(alloc: Allocation[]): SimulatorDeposit;
  getY(i: number, j: number, x: DecimalType, xp_: DecimalType[]): DecimalType;
  getYD(i: number, xp: DecimalType[], d: DecimalType): DecimalType;
  dy(i: number, j: number, dx: DecimalType, _rates: DecimalType[]): DecimalType;
  exchange(assetIn: Asset, assetOut: Asset, _dx: bigint): SimulatorSwap;
  removeLiquidityBalanced(_amount: bigint): SimulateWithdraw;
  removeLiquidityImbalance(_amounts: bigint[], _rates: DecimalType[]): DecimalType;
  removeLiquidityOne(_amount: bigint, target: Asset): SimulateWithdrawOne;
  getDx(assetIn: Asset, assetOut: Asset, dy: bigint, needRates?: boolean): DecimalType;
  rampA(futureA: bigint, futureATime: bigint, nowBeforeRampA: number): void;
  stopRampA(now: number): void;
  saveSnapshot(): SimulatorSnapshot;
  restoreSnapshot(state: SimulatorSnapshot): void;
}
