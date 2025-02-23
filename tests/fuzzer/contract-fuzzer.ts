import { PoolSimulator } from '../../src/pool-simulator/simulator';
import { BaseFuzzer } from './base-fuzzer';
import { SimulatorState } from '../../src/types';
import {
  SimulateDepositParams,
  SimulateSwapExactInParams,
  SimulateSwapExactOutParams,
  SimulateWithdrawParams,
} from '@torch-finance/dex-contract-wrapper';
import { Allocation } from '@torch-finance/core';

export class ContractFuzzer extends BaseFuzzer {
  private simulator: PoolSimulator;

  constructor(initialState: SimulatorState) {
    super(initialState);
    this.simulator = PoolSimulator.create(initialState);
  }

  deposit(params: SimulateDepositParams): void {
    this.simulator.deposit(params);
  }

  withdraw(params: SimulateWithdrawParams): void {
    this.simulator.withdraw(params);
  }

  swap(params: SimulateSwapExactInParams | SimulateSwapExactOutParams): void {
    this.simulator.swap(params);
  }

  getVirtualPrice(): bigint {
    return this.simulator.getVirtualPrice();
  }

  get lpTotalSupply(): bigint {
    return this.simulator.lpTotalSupply;
  }

  get state(): SimulatorState {
    return {
      ...this.initialState,
      adminFees: Allocation.createAllocations(
        this.initialState.decimals.map((d, index) => ({
          asset: d.asset,
          value: this.simulator.adminFees[index],
        })),
      ),
      reserves: Allocation.createAllocations(
        this.initialState.decimals.map((d, index) => ({
          asset: d.asset,
          value: this.simulator.balances[index],
        })),
      ),
      lpTotalSupply: this.simulator.lpTotalSupply,
      rates: this.initialState.rates,
    };
  }
}
