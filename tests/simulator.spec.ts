// Jest test suite for PoolSimulator
import { PoolSimulator } from '../src/pool-simulator/simulator';
import { Allocation, Asset } from '@torch-finance/core';
import { SimulatorState } from '../src/types';
import {
  SimulateDepositParams,
  SimulateSwapExactInParams,
  SimulateSwapExactOutParams,
  SimulateWithdrawParams,
} from '@torch-finance/dex-contract-wrapper';
import { SimulatorSnapshot } from '../dist';

// Helper function to create a new SimulatorState
function createSimulatorState(): SimulatorState {
  const tonAsset = Asset.ton();
  const jettonAsset = Asset.jetton('kQDMNIkeVbm1yBuijkIp8ryRHK4OGkBUgqpqVIxtP4-4Zs78');

  return {
    poolAddress: '0x0000000000000000000000000000000000000000',
    initA: 100,
    futureA: 200,
    initATime: Math.floor(Date.now() / 1000),
    futureATime: Math.floor(Date.now() / 1000) + 3600,
    decimals: Allocation.createAllocations([
      { asset: tonAsset, value: 18n },
      { asset: jettonAsset, value: 18n },
    ]),
    feeNumerator: 30,
    adminFeeNumerator: 10,
    reserves: Allocation.createAllocations([
      { asset: tonAsset, value: 0n },
      { asset: jettonAsset, value: 0n },
    ]),
    adminFees: Allocation.createAllocations([
      { asset: tonAsset, value: 0n },
      { asset: jettonAsset, value: 0n },
    ]),
    lpTotalSupply: 0n,
    rates: Allocation.createAllocations([
      { asset: tonAsset, value: 1000000000000000000n },
      { asset: jettonAsset, value: 1000000000000000000n },
    ]),
  };
}

describe('PoolSimulator', () => {
  let simulator: PoolSimulator;
  let state: SimulatorState;
  let initState: SimulatorSnapshot;

  beforeEach(() => {
    state = createSimulatorState();
    simulator = PoolSimulator.create(state);
    const depositParams: SimulateDepositParams = {
      depositAmounts: Allocation.createAllocations([
        { asset: state.decimals[0].asset, value: 100n * 10n ** 18n },
        { asset: state.decimals[1].asset, value: 200n * 10n ** 18n },
      ]),
      rates: state.rates,
    };

    simulator.deposit(depositParams);
    initState = simulator.saveSnapshot();
  });

  it('Initializes correctly from state', () => {
    expect(simulator.initA).toBe(state.initA);
    expect(simulator.futureA).toBe(state.futureA);
  });

  it('Performs deposit correctly', () => {
    const depositParams: SimulateDepositParams = {
      depositAmounts: Allocation.createAllocations([
        { asset: state.decimals[0].asset, value: 200n * 10n ** 18n },
        { asset: state.decimals[1].asset, value: 200n * 10n ** 18n },
      ]),
      rates: state.rates,
    };

    const result = simulator.deposit(depositParams);
    expect(result.lpTokenOut).toBeGreaterThan(0n);
    expect(result.virtualPriceAfter).toBeGreaterThan(result.virtualPriceBefore);
  });

  it('Performs withdrawal correctly', () => {
    const withdrawParams: SimulateWithdrawParams = {
      lpAmount: 10000n,
      rates: state.rates,
    };

    const result = simulator.withdraw(withdrawParams);
    expect(result.amountOuts[0]).toBeGreaterThan(0n);
    expect(result.virtualPriceAfter).toBeGreaterThan(0n);
  });

  it('Performs swap exact in correctly', () => {
    const swapParams: SimulateSwapExactInParams = {
      mode: 'ExactIn',
      assetIn: state.decimals[0].asset,
      assetOut: state.decimals[1].asset,
      amountIn: 5n * 10n ** 18n,
      rates: state.rates,
    };

    const virtualPriceBefore = simulator.getVirtualPrice();
    const result = simulator.swap(swapParams);
    if (result.mode === 'ExactOut') {
      throw new Error('This is not swap exact out');
    }
    expect(result.amountOut).toBeGreaterThan(0n);
    expect(result.virtualPriceAfter).not.toEqual(virtualPriceBefore);
  });

  it('Performs swap exact out correctly', () => {
    const amountOut = 1n * 10n ** 18n;
    const swapParams: SimulateSwapExactOutParams = {
      mode: 'ExactOut',
      assetIn: state.decimals[0].asset,
      assetOut: state.decimals[1].asset,
      amountOut,
      rates: state.rates,
    };

    const swapExactOutResult = simulator.swap(swapParams);
    if (swapExactOutResult.mode === 'ExactIn') {
      throw new Error('This is not swap exact in');
    }

    expect(swapExactOutResult.amountIn).toBeGreaterThan(0n);
    expect(swapExactOutResult.virtualPriceAfter).not.toEqual(swapExactOutResult.virtualPriceBefore);

    // Restore init state
    simulator.restoreSnapshot(initState);

    // Use exact out result to swap exact in
    const swapExactInParams: SimulateSwapExactInParams = {
      mode: 'ExactIn',
      assetIn: state.decimals[0].asset,
      assetOut: state.decimals[1].asset,
      amountIn: swapExactOutResult.amountIn,
      rates: state.rates,
    };
    const swapExactInResult = simulator.swap(swapExactInParams);
    if (swapExactInResult.mode === 'ExactOut') {
      throw new Error('This is not swap exact in');
    }

    // Swap exact out's virtual price before and after should be the same as simulate swap's virtual price before and after
    expect(swapExactInResult.virtualPriceBefore).toEqual(swapExactOutResult.virtualPriceBefore);
    expect(swapExactInResult.virtualPriceAfter).toEqual(swapExactOutResult.virtualPriceAfter);

    // Swap exact out's amount in should be the almost same as simulate swap's amount out
    // Swap exact out may have some deviation, but it is very minimal. When decimals are involved, the difference is usually within single digits.
    const difference = Number(amountOut - swapExactInResult.amountOut) / 1e18;
    expect(Math.abs(Number(difference))).toBeLessThan(0.01);
  });

  it('Saves and restores snapshot correctly', () => {
    const snapshot = simulator.saveSnapshot();

    simulator.balances[0] += 1000n * 10n ** 18n;
    simulator.restoreSnapshot(snapshot);

    expect(simulator.balances[0]).toBe(snapshot.reserves[0]);
    expect(simulator.lpTotalSupply).toBe(snapshot.lpTotalSupply);
  });
});
