import { Allocation } from '@torch-finance/core';
import {
  SimulateDepositParams,
  SimulateSwapExactInParams,
  SimulateSwapExactOutParams,
  SimulateWithdrawParams,
} from '@torch-finance/dex-contract-wrapper';
import { SimulatorState } from '../../src/types';

export abstract class OperationType {
  static readonly DEPOSIT = 'DEPOSIT';
  static readonly WITHDRAW = 'WITHDRAW';
  static readonly SWAP_EXACT_IN = 'SWAP_EXACT_IN';
  static readonly SWAP_EXACT_OUT = 'SWAP_EXACT_OUT';

  static readonly values = [
    OperationType.DEPOSIT,
    OperationType.WITHDRAW,
    OperationType.SWAP_EXACT_IN,
    OperationType.SWAP_EXACT_OUT,
  ] as const;
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
      value: this.randomBigInt(1n * 10n ** d.value, 100_000_000n * 10n ** d.value),
    }));

    const params: SimulateDepositParams = {
      depositAmounts: Allocation.createAllocations(depositAmounts),
      rates: this.state.rates,
    };

    this.deposit(params);

    const operation: Operation = {
      type: OperationType.DEPOSIT,
      params,
      virtualPrice: this.getVirtualPrice().toString(),
    };
    this.operationHistory.push(operation);
    return operation;
  }

  performRandomWithdraw(
    probabilityOfBalancedWithdraw: number = 1 / 3,
    probabilityOfWithdrawAllLiquidity: number = 1 / 3,
  ): Operation | undefined {
    if (this.lpTotalSupply === 0n) return;

    const withdrawAmount =
      Math.random() < probabilityOfWithdrawAllLiquidity
        ? this.lpTotalSupply
        : this.randomBigInt(1n, this.lpTotalSupply);

    const useBalancedWithdraw = Math.random() < probabilityOfBalancedWithdraw;
    const assetOut = useBalancedWithdraw
      ? null
      : this.state.decimals[Math.floor(Math.random() * this.state.decimals.length)].asset;

    const params: SimulateWithdrawParams = {
      lpAmount: withdrawAmount,
      rates: this.state.rates,
      assetOut,
    };

    this.withdraw(params);

    const operation: Operation = {
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
      amountIn: this.randomBigInt(
        // FIXME
        1n * 10n ** this.state.decimals[assetInIndex].value,
        100_000_000n * 10n ** this.state.decimals[assetInIndex].value,
      ),
      rates: this.state.rates,
    };

    this.swap(params);

    const operation: Operation = {
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
      amountOut: this.randomBigInt(1n, this.state.reserves[assetOutIndex].value),
      rates: this.state.rates,
    };

    this.swap(params);

    const operation: Operation = {
      type: OperationType.SWAP_EXACT_OUT,
      params,
      virtualPrice: this.getVirtualPrice().toString(),
    };
    this.operationHistory.push(operation);
    return operation;
  }
}
