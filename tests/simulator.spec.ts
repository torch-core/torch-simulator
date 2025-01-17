// Jest test suite for PoolSimulator
import { PoolSimulator } from '../src/simulator';
import { Allocation, Asset } from '@torch-finance/core';
import { SimulatorState, SimulateDepositParams, SimulateSwapParams, SimulateWithdrawParams } from '../src/types';

// Helper function to create a new SimulatorState
function createSimulatorState(): SimulatorState {
  const tonAsset = Asset.ton();
  const jettonAsset = Asset.jetton('kQDMNIkeVbm1yBuijkIp8ryRHK4OGkBUgqpqVIxtP4-4Zs78');

  return {
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
      { asset: tonAsset, value: 1000000n },
      { asset: jettonAsset, value: 2000000n },
    ]),
    adminFees: Allocation.createAllocations([
      { asset: tonAsset, value: 0n },
      { asset: jettonAsset, value: 0n },
    ]),
    lpTotalSupply: 1000000000n,
    rates: Allocation.createAllocations([
      { asset: tonAsset, value: 1000000000000000000n },
      { asset: jettonAsset, value: 1000000000000000000n },
    ]),
  };
}

describe('PoolSimulator', () => {
  let simulator: PoolSimulator;
  let state: SimulatorState;

  beforeEach(() => {
    state = createSimulatorState();
    simulator = PoolSimulator.create(state);
  });

  it('Initializes correctly from state', () => {
    expect(simulator.initA).toBe(state.initA);
    expect(simulator.futureA).toBe(state.futureA);
    expect(simulator.balances).toEqual(state.reserves.map((r) => r.value));
    expect(simulator.lpTotalSupply).toBe(state.lpTotalSupply);
  });

  it('Performs deposit correctly', () => {
    const depositParams: SimulateDepositParams = {
      depositAmounts: Allocation.createAllocations([
        { asset: state.decimals[0].asset, value: 100n },
        { asset: state.decimals[1].asset, value: 200n },
      ]),
      rates: state.rates,
    };

    const result = simulator.deposit(depositParams);
    expect(result.lpTokenOut).toBeGreaterThan(0n);
    expect(result.virtualPriceAfter).toBeGreaterThan(result.virtualPriceBefore);
  });

  it('Performs withdrawal correctly', () => {
    const withdrawParams: SimulateWithdrawParams = {
      lpAmount: 1000n,
      rates: state.rates,
    };

    const result = simulator.withdraw(withdrawParams);
    expect(result.amountOuts[0]).toBeGreaterThan(0n);
    expect(result.virtualPriceAfter).toBeGreaterThan(0n);
  });

  it('Performs swap correctly', () => {
    const swapParams: SimulateSwapParams = {
      assetIn: state.decimals[0].asset,
      assetOut: state.decimals[1].asset,
      amount: 100n,
      rates: state.rates,
    };

    const virtualPriceBefore = simulator.getVirtualPrice();
    const result = simulator.swap(swapParams);
    expect(result.amountOut).toBeGreaterThan(0n);
    expect(result.virtualPriceAfter).toEqual(virtualPriceBefore);
  });

  it('Saves and restores snapshot correctly', () => {
    const snapshot = simulator.saveSnapshot();

    simulator.balances[0] += 1000n;
    simulator.restoreSnapshot(snapshot);

    expect(simulator.balances[0]).toBe(snapshot.reserves[0]);
    expect(simulator.lpTotalSupply).toBe(snapshot.lpTotalSupply);
  });
});
