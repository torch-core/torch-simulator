import { Allocation, Asset } from '@torch-finance/core';
import {
  SimulatorState,
  SimulateWithdrawResult,
  SimulatorDepositResult,
  SimulatorSwapResult,
  SimulatorSnapshot,
  SimulateDepositParams,
  SimulateSwapParams,
  SimulateWithdrawParams,
} from './types';
import {
  FEE_DENOMINATOR,
  PRECISION,
  A_PRECISION,
  MAX_ITERATIONS,
  MIN_RAMP_TIME,
  MAX_A,
  MAX_A_CHANGE,
} from './constants';
import { IPoolSimulator } from './interfaces';

export class PoolSimulator implements IPoolSimulator {
  assets: Asset[];
  assetIndexes: Map<string, number>;
  initA: number;
  futureA: number;
  initATime: number;
  futureATime: number;
  now: number;
  poolAssetCount: number;
  balances: bigint[];
  feeNumerator: number;
  adminFeeNumerator: number;
  adminFees: bigint[];
  precisionMultipliers: bigint[];
  rates: bigint[];
  lpTotalSupply: bigint;
  decimals: number[];

  constructor(
    initA: number,
    decimals: Allocation[],
    feeNumerator: number,
    adminFeeNumerator: number,
    rates?: Allocation[],
  ) {
    this.poolAssetCount = decimals.length;
    this.initA = initA;
    this.futureA = initA;
    this.initATime = 0;
    this.futureATime = 0;
    this.now = Math.floor(Date.now() / 1000);
    this.feeNumerator = feeNumerator;
    this.adminFeeNumerator = adminFeeNumerator;
    this.decimals = decimals.sort((a, b) => a.compare(b)).map((d) => Number(d.value));
    this.precisionMultipliers = this.decimals.map((d) => 10n ** BigInt(18 - d));
    this.rates = this._setRates(rates);
    this.assets = decimals.map((d) => d.asset);
    this.assetIndexes = new Map(this.assets.map((asset, index) => [asset.ID, index]));
    this.balances = Array(this.poolAssetCount).fill(BigInt(0));
    this.adminFees = Array(this.poolAssetCount).fill(BigInt(0));
    this.lpTotalSupply = 0n;
  }

  static create(state: SimulatorState): PoolSimulator {
    // Create a new pool simulator
    const simulator = new PoolSimulator(state.initA, state.decimals, state.feeNumerator, state.adminFeeNumerator);

    // Set custom parameters
    simulator.futureA = state.futureA;
    simulator.initATime = state.initATime;
    simulator.futureATime = state.futureATime;
    simulator.rates = simulator._setRates(state.rates);
    simulator.balances = state.reserves.sort((a, b) => a.compare(b)).map((b) => b.value);
    simulator.adminFees = state.adminFees.sort((a, b) => a.compare(b)).map((b) => b.value);
    simulator.lpTotalSupply = state.lpTotalSupply;
    simulator.assets = state.decimals.sort((a, b) => a.compare(b)).map((d) => d.asset);
    simulator.assetIndexes = new Map(state.decimals.map((asset, index) => [asset.asset.ID, index]));
    return simulator;
  }

  private _setRates(rates?: Allocation[]): bigint[] {
    if (!rates) {
      return this.rates || this.decimals.map((d) => 10n ** BigInt(36 - d));
    }
    return rates.sort((a, b) => a.compare(b)).map((rate) => rate.value);
  }

  private _xp(rates: bigint[]): bigint[] {
    return this.balances.map((x, index) => (x * rates[index]) / PRECISION);
  }

  private _xpMem(balances: bigint[], rates: bigint[]): bigint[] {
    return balances.map((x, index) => (x * rates[index]) / PRECISION);
  }

  getA(): number {
    let expectedA: bigint;

    if (this.now < this.futureATime) {
      // Ramp is still in progress
      const t0 = BigInt(this.initATime);
      const t1 = BigInt(this.futureATime);
      const A0 = BigInt(this.initA);
      const A1 = BigInt(this.futureA);

      if (A1 > A0) {
        expectedA = A0 + ((A1 - A0) * (BigInt(this.now) - t0)) / (t1 - t0);
      } else {
        expectedA = A0 - ((A0 - A1) * (BigInt(this.now) - t0)) / (t1 - t0);
      }
    } else {
      // Ramp has already reached future A
      expectedA = BigInt(this.futureA);
    }

    return Number(expectedA);
  }

  getIndex(asset: Asset): number {
    const index = this.assetIndexes.get(asset.ID);
    if (index === undefined) {
      throw new Error(`Asset ${asset.ID} not found`);
    }
    return index;
  }

  getD(xp: bigint[], amp: number): bigint {
    const s = xp.reduce((acc, val) => acc + val, 0n);
    if (s === 0n) {
      return 0n;
    }

    let dPrev = 0n;
    let d = s;
    const ann = BigInt(amp) * BigInt(this.poolAssetCount);
    let iter = 0;

    while (Math.abs(Number(d - dPrev)) > 1 && iter < MAX_ITERATIONS) {
      let dP = d;
      for (const x of xp) {
        dP = (dP * d) / (BigInt(this.poolAssetCount) * x);
      }
      dPrev = d;
      // D = (Ann * S / A_PRECISION + D_P * N_COINS) * D / ((Ann - A_PRECISION) * D / A_PRECISION + (N_COINS + 1) * D_P)
      d =
        (((ann * s) / A_PRECISION + dP * BigInt(this.poolAssetCount)) * d) /
        (((ann - A_PRECISION) * d) / A_PRECISION + (BigInt(this.poolAssetCount) + 1n) * dP);

      iter++;
    }
    if (iter === MAX_ITERATIONS) {
      throw new Error('Max iterations reached');
    }
    return d;
  }

  getDMem(balances: bigint[], rates: bigint[], amp: number): bigint {
    return this.getD(this._xpMem(balances, rates), amp);
  }

  getVirtualPrice(rates?: Allocation[]): bigint {
    this.rates = this._setRates(rates);
    const D = this.getD(this._xp(this.rates), this.getA());
    const totalSupply = this.lpTotalSupply;
    if (totalSupply === 0n) {
      return 0n;
    }
    return (D * PRECISION) / totalSupply;
  }

  deposit(depositParams: SimulateDepositParams): SimulatorDepositResult {
    const amounts: bigint[] = Array(this.poolAssetCount).fill(0n);
    for (let i = 0; i < depositParams.depositAmounts.length; i++) {
      const index = this.getIndex(depositParams.depositAmounts[i].asset);
      amounts[index] = depositParams.depositAmounts[i].value;
    }

    this.rates = this._setRates(depositParams.rates);
    return this._deposit(amounts);
  }

  claimAdminFees(rates?: Allocation[]): SimulatorDepositResult {
    this.rates = this._setRates(rates);

    // Convert admin fees to deposit
    const depositAmounts = this.adminFees.map((fee) => fee);
    // init adminFees
    this.adminFees = Array(this.poolAssetCount).fill(BigInt(0));
    return this._deposit(depositAmounts);
  }

  private _deposit(amounts: bigint[]): SimulatorDepositResult {
    const _fee = (BigInt(this.feeNumerator) * BigInt(this.poolAssetCount)) / (4n * (BigInt(this.poolAssetCount) - 1n));
    const _adminFee = BigInt(this.adminFeeNumerator);
    const _rates = this.rates;
    const totalSupply = this.lpTotalSupply;
    const vpBefore = this.getVirtualPrice();

    // Initial invariant
    let d0 = 0n;
    const oldBalances = this.balances.slice();

    if (totalSupply > 0n) {
      d0 = this.getDMem(oldBalances, _rates, this.getA());
    }
    const newBalances = oldBalances.slice();

    for (let i = 0; i < this.poolAssetCount; i++) {
      newBalances[i] += amounts[i];
    }
    const d1 = this.getDMem(newBalances, _rates, this.getA());
    let d2 = d1;
    if (totalSupply > 0n) {
      const fees = Array<bigint>(this.poolAssetCount).fill(0n);
      for (let i = 0; i < this.poolAssetCount; i++) {
        const idealBalance = (d1 * oldBalances[i]) / d0;
        const difference =
          idealBalance > newBalances[i] ? idealBalance - newBalances[i] : newBalances[i] - idealBalance;
        fees[i] = (_fee * difference) / FEE_DENOMINATOR;
        const admin_fee = (fees[i] * _adminFee) / FEE_DENOMINATOR;
        this.balances[i] = newBalances[i] - admin_fee;
        this.adminFees[i] += admin_fee;
        newBalances[i] -= fees[i];
      }
      d2 = this.getDMem(newBalances, _rates, this.getA());
    } else {
      this.balances = newBalances;
    }
    let lpAmount = d1;
    if (totalSupply !== 0n) {
      lpAmount = (totalSupply * (d2 - d0)) / d0;
    }
    this.lpTotalSupply = totalSupply + lpAmount;
    const vpAfter = this.getVirtualPrice();

    return {
      lpTokenOut: lpAmount,
      virtualPriceBefore: vpBefore,
      virtualPriceAfter: vpAfter,
      lpTotalSupply: this.lpTotalSupply,
    };
  }

  getY(i: number, j: number, x: bigint, xp_: bigint[]): bigint {
    const amp = this.getA();
    const d = this.getD(xp_, amp);
    let c = d;
    let s_ = 0n;
    const poolAssetCount = BigInt(this.poolAssetCount);
    const ann = BigInt(amp) * poolAssetCount;

    let _x = 0n;
    for (let k = 0; k < poolAssetCount; k++) {
      if (k === i) {
        _x = x;
      } else if (k !== j) {
        _x = xp_[k];
      } else continue;

      s_ += _x;
      c = (c * d) / (_x * poolAssetCount);
    }
    // c = c * D * A_PRECISION / (Ann * N_COINS)
    // b: uint256 = S + D * A_PRECISION / Ann  # - D
    c = (c * d * A_PRECISION) / (poolAssetCount * ann);

    const b = s_ + (d * A_PRECISION) / ann;
    let yPrev = 0n;
    let y = d;
    let iter = 0;
    while (y !== yPrev && iter < MAX_ITERATIONS) {
      yPrev = y;
      y = (y * y + c) / (2n * y + b - d);
      iter++;
    }
    if (iter === MAX_ITERATIONS) {
      throw new Error('Max iterations reached');
    }
    return y;
  }

  getYD(i: number, xp: bigint[], d: bigint): bigint {
    const amp = BigInt(this.getA());
    let c = d;
    let s_ = 0n;
    const poolAssetCount = BigInt(this.poolAssetCount);
    const ann = amp * poolAssetCount;

    let _x = 0n;
    for (let k = 0; k < poolAssetCount; k++) {
      if (k !== i) {
        _x = xp[k];
      } else {
        continue;
      }

      s_ += _x;
      c = (c * d) / (_x * poolAssetCount);
    }
    // c = c * D * A_PRECISION / (Ann * N_COINS)
    // b: uint256 = S + D * A_PRECISION / Ann
    c = (c * d * A_PRECISION) / (poolAssetCount * ann);
    const b = s_ + (d * A_PRECISION) / ann;
    let yPrev = 0n;
    let y = d;
    let iter = 0;
    while (y !== yPrev && iter < MAX_ITERATIONS) {
      yPrev = y;
      y = (y * y + c) / (2n * y + b - d);
      iter++;
    }
    if (iter === MAX_ITERATIONS) {
      throw new Error('Max iterations reached');
    }
    return y;
  }

  dy(i: number, j: number, dx: bigint, _rates: bigint[]): bigint {
    const xp = this._xp(_rates);
    const x = xp[i] + (dx * _rates[i]) / PRECISION;
    const y = this.getY(i, j, x, xp);
    let dy = xp[j] - y - 1n;
    dy = (dy * PRECISION) / _rates[j];
    const _fee = (dy * BigInt(this.feeNumerator)) / FEE_DENOMINATOR;
    return dy - _fee;
  }

  swap(swapParams: SimulateSwapParams) {
    const i = this.getIndex(swapParams.assetIn);
    const j = this.getIndex(swapParams.assetOut);

    this.rates = this._setRates(swapParams.rates);
    return this._swap(i, j, swapParams.amount);
  }

  private _swap(i: number, j: number, _dx: bigint): SimulatorSwapResult {
    const vpBefore = this.getVirtualPrice();
    const oldBalances = this.balances.slice();
    const _rates = this.rates;
    const xp = this._xpMem(oldBalances, _rates);
    const dx = _dx;
    const x = xp[i] + (dx * _rates[i]) / PRECISION;
    const y = this.getY(i, j, x, xp);

    let dy = xp[j] - y - 1n;
    const dy_fee = (dy * BigInt(this.feeNumerator)) / FEE_DENOMINATOR;

    dy = ((dy - dy_fee) * PRECISION) / _rates[j];

    let dy_admin_fee = (dy_fee * BigInt(this.adminFeeNumerator)) / FEE_DENOMINATOR;

    dy_admin_fee = (dy_admin_fee * PRECISION) / _rates[j];
    this.balances[i] = oldBalances[i] + dx;
    this.balances[j] = oldBalances[j] - dy - dy_admin_fee;
    this.adminFees[j] += dy_admin_fee;
    const vpAfter = this.getVirtualPrice();

    return {
      amountOut: dy,
      virtualPriceBefore: vpBefore,
      virtualPriceAfter: vpAfter,
    };
  }

  withdraw(withdrawParams: SimulateWithdrawParams): SimulateWithdrawResult {
    this.rates = this._setRates(withdrawParams.rates);
    if (!withdrawParams.assetOut) {
      return this._withdrawBalanced(withdrawParams.lpAmount);
    }
    return this._withdrawOne(withdrawParams.lpAmount, withdrawParams.assetOut!);
  }

  private _withdrawBalanced(_amount: bigint): SimulateWithdrawResult {
    const totalSupply = this.lpTotalSupply;
    const amount = _amount;
    const vpBefore = this.getVirtualPrice();

    const amountOuts: bigint[] = Array(this.poolAssetCount).fill(0n);
    for (let i = 0; i < this.poolAssetCount; i++) {
      const value = (this.balances[i] * amount) / totalSupply;
      this.balances[i] -= value;
      amountOuts[i] = value;
    }
    this.lpTotalSupply -= amount;
    const vpAfter = this.getVirtualPrice();

    return {
      amountOuts,
      virtualPriceBefore: vpBefore,
      virtualPriceAfter: vpAfter,
    };
  }

  private _withdrawOne(_amount: bigint, target: Asset): SimulateWithdrawResult {
    const i = this.getIndex(target);

    const amount = _amount;
    const _rates = this.rates;
    const vpBefore = this.getVirtualPrice();
    const amp = this.getA();
    const _fee = (BigInt(this.feeNumerator) * BigInt(this.poolAssetCount)) / (4n * (BigInt(this.poolAssetCount) - 1n));
    const totalSupply = this.lpTotalSupply;

    const xp = this._xp(_rates);

    const d0 = this.getD(xp, amp);
    const d1 = d0 - (amount * d0) / totalSupply;

    const xpReduced = xp.slice();
    const newY = this.getYD(i, xp, d1);
    const dy_0 = (xp[i] - newY) / this.precisionMultipliers[i];

    for (let j = 0; j < this.poolAssetCount; j++) {
      let dxExpected = 0n;
      if (j === i) {
        dxExpected = (xp[j] * d1) / d0 - newY;
      } else {
        dxExpected = xp[j] - (xp[j] * d1) / d0;
      }
      xpReduced[j] -= (_fee * dxExpected) / FEE_DENOMINATOR;
    }

    let dy = xpReduced[i] - this.getYD(i, xpReduced, d1);
    dy = (dy - 1n) / this.precisionMultipliers[i];

    const dy_fee = dy_0 - dy;
    const dy_admin_fee = (dy_fee * BigInt(this.adminFeeNumerator)) / FEE_DENOMINATOR;
    this.balances[i] -= dy + dy_admin_fee;
    this.adminFees[i] += dy_admin_fee;
    this.lpTotalSupply -= amount;
    const vpAfter = this.getVirtualPrice();

    return {
      amountOuts: [dy],
      virtualPriceBefore: vpBefore,
      virtualPriceAfter: vpAfter,
    };
  }

  swapExactOut(swapExactOutParams: SimulateSwapParams): bigint {
    const i = this.getIndex(swapExactOutParams.assetIn);
    const j = this.getIndex(swapExactOutParams.assetOut);

    this.rates = this._setRates(swapExactOutParams.rates);

    const xp = this._xp(this.rates);
    const _dy = swapExactOutParams.amount;
    const yAfterTrade =
      xp[j] - (((_dy * this.rates[j]) / PRECISION) * FEE_DENOMINATOR) / (FEE_DENOMINATOR - BigInt(this.feeNumerator));

    const x = this.getY(j, i, yAfterTrade, xp);
    const dx = ((x - xp[i]) * PRECISION) / this.rates[i];
    return dx;
  }

  // Function to ramp A
  rampA(futureA: number, futureATime: number, nowBeforeRampA: number): void {
    const now = nowBeforeRampA;

    // Check ramp time
    if (now < this.initATime + MIN_RAMP_TIME) {
      throw new Error('Invalid ramp time: too early to start ramp');
    }
    if (futureATime < now + MIN_RAMP_TIME) {
      throw new Error('Invalid ramp time: future A time is too soon');
    }

    const initA = BigInt(this.getA());
    const futureAPrecision = BigInt(futureA) * A_PRECISION;

    // Check ramp A
    if (futureA <= 0n || futureA >= MAX_A) {
      throw new Error('Invalid ramp A: value out of bounds');
    }
    if (futureA < initA) {
      if (futureAPrecision * MAX_A_CHANGE < BigInt(initA)) {
        throw new Error('Invalid ramp A: decreasing too fast');
      }
    } else if (futureAPrecision > initA * MAX_A_CHANGE) {
      throw new Error('Invalid ramp A: increasing too fast');
    }

    // Update pool A parameters
    this.initA = Number(initA);
    this.futureA = Number(futureAPrecision);
    this.initATime = now;
    this.futureATime = futureATime;
  }

  // Method to stop ramp A
  stopRampA(now: number): void {
    this.now = now;
    const currentA = this.getA();

    // Set current A as both init_A and future_A to stop the ramp
    this.initA = Number(currentA);
    this.futureA = Number(currentA);
    this.initATime = now;
    this.futureATime = now;
  }

  saveSnapshot(): SimulatorSnapshot {
    return {
      initA: this.initA,
      futureA: this.futureA,
      initATime: this.initATime,
      futureATime: this.futureATime,
      now: this.now,
      reserves: this.balances,
      adminFees: this.adminFees,
      lpTotalSupply: this.lpTotalSupply,
      rates: this.rates,
    };
  }

  restoreSnapshot(state: SimulatorSnapshot): void {
    this.initA = state.initA;
    this.futureA = state.futureA;
    this.initATime = state.initATime;
    this.futureATime = state.futureATime;
    this.now = state.now;
    this.balances = state.reserves;
    this.adminFees = state.adminFees;
    this.lpTotalSupply = state.lpTotalSupply;
    this.rates = state.rates;
  }
}
