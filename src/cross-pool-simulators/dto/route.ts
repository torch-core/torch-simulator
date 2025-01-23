import { Address } from '@ton/core';
import { Asset } from '@torch-finance/core';

export enum HopAction {
  SWAP = 'swap',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
}
export interface Hop {
  action: HopAction;
  pool: Address;
  assetIn: Asset;
  assetOut: Asset;
}
