import { Allocation } from '@torch-finance/core';
import {
  SimulateDepositParams,
  SimulateSwapExactInParams,
  SimulateSwapExactOutParams,
  SimulateWithdrawParams,
} from '@torch-finance/dex-contract-wrapper';
import { SimulatorState } from '../../src/types';

export enum OperationType {
  DEPOSIT,
  WITHDRAW,
  SWAP_EXACT_IN,
  SWAP_EXACT_OUT,
}

export interface Operation {
  type: OperationType;
  params: SimulateDepositParams | SimulateWithdrawParams | SimulateSwapExactInParams | SimulateSwapExactOutParams;
  virtualPrice: string;
}

export abstract class BaseFuzzer {
  protected state: SimulatorState;
  protected operationHistory: Operation[] = [];

  constructor(protected initialState: SimulatorState) {
    this.state = initialState;
  }

  abstract deposit(params: SimulateDepositParams): void;
  abstract withdraw(params: SimulateWithdrawParams): void;
  abstract swap(params: SimulateSwapExactInParams | SimulateSwapExactOutParams): void;
  abstract getVirtualPrice(): bigint;
  abstract get lpTotalSupply(): bigint;

  // Add getter for operation history
  get history(): Operation[] {
    return this.operationHistory;
  }

  protected randomBigInt(min: bigint, max: bigint): bigint {
    const range = max - min;
    const bits = range.toString(2).length;
    let result: bigint;
    do {
      result = BigInt('0b' + Array.from({ length: bits }, () => (Math.random() < 0.5 ? '0' : '1')).join(''));
    } while (result > range);
    return min + result;
  }

  performRandomDeposit(): Operation {
    const depositAmounts = this.state.decimals.map((d) => ({
      asset: d.asset,
      value: this.randomBigInt(1n * 10n ** 18n, 100n * 10n ** 18n),
    }));

    const params: SimulateDepositParams = {
      depositAmounts: Allocation.createAllocations(depositAmounts),
      rates: this.state.rates,
    };

    this.deposit(params);

    const operation = {
      type: OperationType.DEPOSIT,
      params,
      virtualPrice: this.getVirtualPrice().toString(),
    };
    this.operationHistory.push(operation);
    return operation;
  }

  performRandomWithdraw(): Operation | undefined {
    if (this.lpTotalSupply === 0n) return;

    const maxWithdraw = this.lpTotalSupply / 4n;
    const withdrawAmount = this.randomBigInt(1n, maxWithdraw);
    const assetIndex = Math.floor(Math.random() * this.state.decimals.length);

    const params: SimulateWithdrawParams = {
      lpAmount: withdrawAmount,
      rates: this.state.rates,
      assetOut: this.state.decimals[assetIndex].asset,
    };

    this.withdraw(params);

    const operation = {
      type: OperationType.WITHDRAW,
      params,
      virtualPrice: this.getVirtualPrice().toString(),
    };
    this.operationHistory.push(operation);
    return operation;
  }

  performRandomSwapExactIn(): Operation {
    const assetInIndex = Math.floor(Math.random() * this.state.decimals.length);
    let assetOutIndex;
    do {
      assetOutIndex = Math.floor(Math.random() * this.state.decimals.length);
    } while (assetOutIndex === assetInIndex);

    const params: SimulateSwapExactInParams = {
      mode: 'ExactIn',
      assetIn: this.state.decimals[assetInIndex].asset,
      assetOut: this.state.decimals[assetOutIndex].asset,
      amountIn: this.randomBigInt(1n * 10n ** 18n, 10n * 10n ** 18n),
      rates: this.state.rates,
    };

    this.swap(params);

    const operation = {
      type: OperationType.SWAP_EXACT_IN,
      params,
      virtualPrice: this.getVirtualPrice().toString(),
    };
    this.operationHistory.push(operation);
    return operation;
  }

  performRandomSwapExactOut(): Operation {
    const assetInIndex = Math.floor(Math.random() * this.state.decimals.length);
    let assetOutIndex;
    do {
      assetOutIndex = Math.floor(Math.random() * this.state.decimals.length);
    } while (assetOutIndex === assetInIndex);

    const params: SimulateSwapExactOutParams = {
      mode: 'ExactOut',
      assetIn: this.state.decimals[assetInIndex].asset,
      assetOut: this.state.decimals[assetOutIndex].asset,
      amountOut: this.randomBigInt(1n * 10n ** 18n, 10n * 10n ** 18n),
      rates: this.state.rates,
    };

    this.swap(params);

    const operation = {
      type: OperationType.SWAP_EXACT_OUT,
      params,
      virtualPrice: this.getVirtualPrice().toString(),
    };
    this.operationHistory.push(operation);
    return operation;
  }
}
