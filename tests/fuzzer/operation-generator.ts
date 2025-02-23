import { Allocation } from '@torch-finance/core';
import { SimulatorState } from '../../src/types';
import { Operation, OperationType } from './base-fuzzer';

export class OperationGenerator {
  constructor(private state: SimulatorState) {}

  private randomBigInt(min: bigint, max: bigint): bigint {
    const range = max - min;
    const bits = range.toString(2).length;
    let result: bigint;
    do {
      result = BigInt('0b' + Array.from({ length: bits }, () => (Math.random() < 0.5 ? '0' : '1')).join(''));
    } while (result > range);
    return min + result;
  }

  generateDeposit(minDepositAmount: bigint = 1n, maxDepositAmount: bigint = 100_000_000_000n): Operation {
    const numAssetsToDeposit = Math.floor(Math.random() * this.state.decimals.length) + 1;

    const selectedIndices = new Set<number>();
    while (selectedIndices.size < numAssetsToDeposit) {
      selectedIndices.add(Math.floor(Math.random() * this.state.decimals.length));
    }

    const depositAmounts = Array.from(selectedIndices).map((index) => ({
      asset: this.state.decimals[index].asset,
      value: this.randomBigInt(minDepositAmount, maxDepositAmount),
    }));

    return {
      type: OperationType.DEPOSIT,
      params: {
        depositAmounts: Allocation.createAllocations(depositAmounts),
        rates: this.state.rates,
      },
      virtualPrice: '0', // Will be set by fuzzer
      state: this.state,
    };
  }

  generateWithdraw(
    lpTotalSupply: bigint,
    probabilityOfBalancedWithdraw: number = 1 / 3,
    probabilityOfWithdrawAllLiquidity: number = 1 / 3,
    minWithdrawAmount: bigint = 1n,
    maxWithdrawAmount: bigint = lpTotalSupply - 1n,
  ): Operation | undefined {
    if (lpTotalSupply === 0n) return undefined;

    const withdrawAmount =
      Math.random() < probabilityOfWithdrawAllLiquidity
        ? lpTotalSupply
        : this.randomBigInt(minWithdrawAmount, maxWithdrawAmount);

    const useBalancedWithdraw = Math.random() < probabilityOfBalancedWithdraw;
    const assetOut = useBalancedWithdraw
      ? null
      : this.state.decimals[Math.floor(Math.random() * this.state.decimals.length)].asset;

    return {
      type: OperationType.WITHDRAW,
      params: {
        lpAmount: withdrawAmount,
        rates: this.state.rates,
        assetOut,
      },
      virtualPrice: '0', // Will be set by fuzzer
      state: this.state,
    };
  }

  generateSwapExactIn(minSwapAmount: bigint = 1n, maxSwapAmount: bigint = 100_000_000_000n): Operation {
    const assetInIndex = Math.floor(Math.random() * this.state.decimals.length);
    let assetOutIndex;
    do {
      assetOutIndex = Math.floor(Math.random() * this.state.decimals.length);
    } while (assetOutIndex === assetInIndex);

    return {
      type: OperationType.SWAP_EXACT_IN,
      params: {
        mode: 'ExactIn',
        assetIn: this.state.decimals[assetInIndex].asset,
        assetOut: this.state.decimals[assetOutIndex].asset,
        amountIn: this.randomBigInt(minSwapAmount, maxSwapAmount),
        rates: this.state.rates,
      },
      virtualPrice: '0', // Will be set by fuzzer
      state: this.state,
    };
  }

  generateSwapExactOut(
    minSwapAmount: bigint = 1n,
    maxSwapAmount: bigint = 100_000_000_000n,
    reserves?: Allocation[],
  ): Operation {
    const assetInIndex = Math.floor(Math.random() * this.state.decimals.length);
    let assetOutIndex;
    do {
      assetOutIndex = Math.floor(Math.random() * this.state.decimals.length);
    } while (assetOutIndex === assetInIndex);

    // If reserves are provided, limit the maxSwapAmount to the available reserve
    const effectiveMaxAmount = reserves
      ? maxSwapAmount < reserves[assetOutIndex].value
        ? maxSwapAmount
        : reserves[assetOutIndex].value
      : maxSwapAmount;

    return {
      type: OperationType.SWAP_EXACT_OUT,
      params: {
        mode: 'ExactOut',
        assetIn: this.state.decimals[assetInIndex].asset,
        assetOut: this.state.decimals[assetOutIndex].asset,
        amountOut: this.randomBigInt(minSwapAmount, effectiveMaxAmount),
        rates: this.state.rates,
      },
      virtualPrice: '0', // Will be set by fuzzer
      state: this.state,
    };
  }
}
