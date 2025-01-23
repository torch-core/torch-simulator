import { Address } from '@ton/core';
import { Asset } from '@torch-finance/core';

export enum HopAction {
  SWAP = 'Swap',
  DEPOSIT = 'Deposit',
  WITHDRAW = 'Withdraw',
}
export interface SimulateHop {
  action: HopAction;
  pool: Address;
  assetIn: Asset;
  assetOut: Asset;
}
