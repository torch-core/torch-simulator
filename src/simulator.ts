import { Decimal as DecimalType } from 'decimal.js';
import { Decimal } from './config';
import { Allocation, Asset } from '@torch-finance/core';
import {
  SimulatorState,
  SimulateWithdraw,
  SimulatorDeposit,
  SimulatorSwap,
  SimulateWithdrawOne,
  SimulatorSnapshot,
} from './types';
import {
  FEE_DENOMINATOR,
  PRECISION,
  A_PRECISION,
  A_PRECISION_D,
  MIN_RAMP_TIME,
  MAX_A_CHANGE,
  MAX_A,
  MAX_ITERATIONS,
} from './constants';
import { IPoolSimulator } from './interfaces';

export class PoolSimulator implements IPoolSimulator {
  a: DecimalType;
  assets: Asset[];
  assetIndexes: Map<string, number>;
  futureA: DecimalType;
  initATime: DecimalType;
  futureATime: DecimalType;
  now: DecimalType;
  n: DecimalType;
  balances: DecimalType[];
  fee: DecimalType;
  adminFee: DecimalType;
  adminFees: DecimalType[];
  precision_mul: DecimalType[];
  rates: DecimalType[];
  totalSupply: DecimalType;
  decimals: DecimalType[];

  constructor(a: bigint, n: bigint, decimals: number[], assets: Asset[], fee: bigint, adminFee: bigint) {
    this.n = new Decimal(n.toString());
    this.a = new Decimal(a.toString());
    this.futureA = new Decimal(a.toString());
    this.initATime = new Decimal(0);
    this.futureATime = new Decimal(0);
    this.now = new Decimal(Math.floor(Date.now() / 1000));

    this.fee = new Decimal(fee.toString());
    this.adminFee = new Decimal(adminFee.toString());
    this.precision_mul = decimals.map((d) => new Decimal(10).pow(18 - d));
    this.rates = decimals.map((d) => new Decimal(10).pow(36 - d));
    this.assets = assets;
    this.assetIndexes = new Map();
    for (let i = 0; i < assets.length; i++) {
      this.assetIndexes.set(assets[i].ID, i);
    }

    this.balances = Array(this.n.toNumber()).fill(new Decimal(0));
    this.adminFees = Array(this.n.toNumber()).fill(new Decimal(0));

    this.totalSupply = new Decimal(0);
    this.decimals = decimals.map((d) => new Decimal(d));
  }

  static create(state: SimulatorState, useRate: boolean): PoolSimulator {
    // Create a new pool simulator
    const simulator = new PoolSimulator(
      BigInt(state.initA),
      BigInt(state.n),
      state.decimals,
      state.assets,
      state.fee,
      state.adminFee,
    );

    // Set custom parameters
    simulator.futureA = new Decimal(state.futureA.toString());
    simulator.initATime = new Decimal(state.initATime.toString());
    simulator.futureATime = new Decimal(state.futureATime.toString());
    simulator.now = new Decimal(state.now.toString());

    if (useRate) {
      simulator.rates = state.rates.map((r) => new Decimal(r.toString()));
    }

    simulator.balances = state.balances.map((b) => new Decimal(b.toString()));
    simulator.adminFees = state.adminFees.map((fee) => new Decimal(fee.toString()));
    simulator.totalSupply = new Decimal(state.totalSupply.toString());
    simulator.assets = state.assets;
    simulator.assetIndexes = new Map();

    for (let i = 0; i < state.assets.length; i++) {
      simulator.assetIndexes.set(state.assets[i].ID, i);
    }
    return simulator;
  }

  getA(): DecimalType {
    let expectedA: DecimalType;

    if (this.now.lt(this.futureATime)) {
      // Ramp is still in progress
      const t0 = new Decimal(this.initATime.toString());
      const t1 = new Decimal(this.futureATime.toString());
      const A0 = this.a;
      const A1 = this.futureA;

      if (A1.gt(A0)) {
        expectedA = A0.plus(A1.minus(A0).times(this.now.minus(t0)).div(t1.minus(t0)).floor());
      } else {
        expectedA = A0.minus(A0.minus(A1).times(this.now.minus(t0)).div(t1.minus(t0)).floor());
      }
    } else {
      // Ramp has already reached future A
      expectedA = this.futureA;
    }

    return expectedA;
  }

  _xp(_rates: DecimalType[]): DecimalType[] {
    return this.balances.map((x, index) => x.times(_rates[index]).div(PRECISION).floor());
  }

  _xp_mem(_balances: DecimalType[], _rates: DecimalType[]): DecimalType[] {
    return _balances.map((x, index) => x.times(_rates[index]).div(PRECISION).floor());
  }

  _get_index(asset: Asset): number {
    const index = this.assetIndexes.get(asset.ID);
    if (index === undefined) {
      throw new Error('Asset not found');
    }
    return index;
  }

  getD(xp: DecimalType[], amp: DecimalType): DecimalType {
    const s = xp.reduce((acc, val) => acc.plus(val), new Decimal(0));
    if (s.equals(0)) {
      return new Decimal(0);
    }

    let dPrev = new Decimal(0);
    let d = s;
    const ann = amp.times(this.n);
    let iter = 0;

    while (d.minus(dPrev).abs().gt(1) && iter < MAX_ITERATIONS) {
      let dP = d;
      for (const x of xp) {
        dP = dP.times(d).div(this.n.times(x)).floor();
      }
      dPrev = d;
      // D = (Ann * S / A_PRECISION + D_P * N_COINS) * D / ((Ann - A_PRECISION) * D / A_PRECISION + (N_COINS + 1) * D_P)
      d = ann
        .times(s)
        .div(A_PRECISION_D)
        .floor()
        .plus(dP.times(this.n))
        .times(d)
        .div(ann.minus(A_PRECISION_D).times(d).div(A_PRECISION_D).floor().plus(this.n.plus(1).times(dP)))
        .floor();

      iter++;
    }
    if (iter == MAX_ITERATIONS) {
      throw new Error('Max iterations reached');
    }
    return d;
  }

  getD_mem(_balances: DecimalType[], _rates: DecimalType[], amp: DecimalType) {
    return this.getD(this._xp_mem(_balances, _rates), amp);
  }

  getVirtualPrice(): DecimalType {
    const _rates = this.rates;
    const D = this.getD(this._xp(_rates), this.getA());
    const totalSupply = this.totalSupply;
    return D.times(PRECISION).div(totalSupply).floor();
  }

  addLiquidity(alloc: Allocation[]) {
    const amounts: bigint[] = Array(this.n.toNumber()).fill(0n);
    for (let i = 0; i < alloc.length; i++) {
      const index = this._get_index(alloc[i].asset);
      if (index === undefined) {
        throw new Error('Asset not found');
      }
      amounts[index] = alloc[i].amount;
    }

    return this._addLiquidity(amounts);
  }

  claimAdminFee(alloc: Allocation[]) {
    const amounts: bigint[] = Array(this.n.toNumber()).fill(0n);
    for (let i = 0; i < alloc.length; i++) {
      const index = this._get_index(alloc[i].asset);
      if (index === undefined) {
        throw new Error('Asset not found');
      }
      amounts[index] = alloc[i].amount;
    }
    const result = this._addLiquidity(amounts);
    this.adminFees = result.adminFeesDiff;
    return result;
  }

  _addLiquidity(amounts: bigint[]): SimulatorDeposit {
    const _fee = this.fee
      .times(this.n)
      .div(new Decimal(4).times(this.n.minus(1)))
      .floor();
    const _adminFee = this.adminFee;
    const _rates = this.rates;
    const totalSupply = this.totalSupply;
    const vpBefore = this.getVirtualPrice();

    // Initial invariant
    let d0 = new Decimal(0);
    const oldBalances = this.balances.slice();

    if (totalSupply.gt(0)) {
      d0 = this.getD_mem(oldBalances, _rates, this.getA());
    }
    const newBalances = oldBalances.slice();

    for (let i = 0; i < this.n.toNumber(); i++) {
      newBalances[i] = newBalances[i].plus(new Decimal(amounts[i].toString()));
    }
    const d1 = this.getD_mem(newBalances, _rates, this.getA());
    let d2 = d1;
    const adminFeesDiff: DecimalType[] = [];
    if (totalSupply.gt(0)) {
      const fees = Array<DecimalType>(this.n.toNumber()).fill(new Decimal(0));
      for (let i = 0; i < this.n.toNumber(); i++) {
        const idealBalance = d1.times(oldBalances[i]).div(d0).floor();
        const difference = idealBalance.minus(newBalances[i]).abs();
        fees[i] = _fee.times(difference).div(FEE_DENOMINATOR).floor();
        const admin_fee = fees[i].mul(_adminFee).div(FEE_DENOMINATOR).floor();
        this.balances[i] = newBalances[i].minus(admin_fee);
        this.adminFees[i] = this.adminFees[i].plus(admin_fee);
        adminFeesDiff.push(admin_fee);
        newBalances[i] = newBalances[i].minus(fees[i]);
      }
      d2 = this.getD_mem(newBalances, _rates, this.getA());
    } else {
      this.balances = newBalances;
    }
    let lpAmount = d1;
    if (!totalSupply.equals(0)) {
      lpAmount = totalSupply.times(d2.minus(d0)).div(d0).floor();
    }
    this.totalSupply = totalSupply.plus(lpAmount);
    const vpAfter = this.getVirtualPrice();

    return {
      lpAmount: lpAmount,
      adminFeesDiff,
      vpBefore,
      vpAfter,
    };
  }

  getY(i: number, j: number, x: DecimalType, xp_: DecimalType[]): DecimalType {
    const amp = this.getA();
    const d = this.getD(xp_, amp);
    let c = d;
    let s_ = new Decimal(0);
    const ann = this.getA().times(this.n);

    let _x = new Decimal(0);
    for (let k = 0; k < this.n.toNumber(); k++) {
      if (k == i) {
        _x = x;
      } else if (k != j) {
        _x = xp_[k];
      } else continue;

      s_ = s_.plus(_x);
      c = c.times(d).div(_x.times(this.n)).floor();
    }
    // c = c * D * A_PRECISION / (Ann * N_COINS)
    // b: uint256 = S + D * A_PRECISION / Ann  # - D
    c = c.times(d).times(A_PRECISION_D).div(this.n.times(ann)).floor();

    const b = s_.plus(d.times(A_PRECISION_D).div(ann).floor());
    let yPrev = new Decimal(0);
    let y = d;
    let iter = 0;
    while (y.minus(yPrev).abs().greaterThan(1) && iter < 255) {
      yPrev = y;
      y = y.pow(2).plus(c).div(new Decimal(2).times(y).plus(b).minus(d)).floor();
      iter++;
    }
    if (iter == 255) {
      throw new Error('Max iterations reached');
    }
    return y;
  }

  getYD(i: number, xp: DecimalType[], d: DecimalType): DecimalType {
    // const amp = this.getA();
    let c = d;
    let s_ = new Decimal(0);
    const ann = this.getA().times(this.n);

    let _x = new Decimal(0);
    for (let k = 0; k < this.n.toNumber(); k++) {
      if (k != i) {
        _x = xp[k];
      } else {
        continue;
      }

      s_ = s_.plus(_x);
      c = c.times(d).div(_x.times(this.n)).floor();
    }
    // c = c * D * A_PRECISION / (Ann * N_COINS)
    // b: uint256 = S + D * A_PRECISION / Ann
    c = c.times(d).times(A_PRECISION_D).div(this.n.times(ann)).floor();
    const b = s_.plus(d.times(A_PRECISION_D).div(ann).floor());
    let yPrev = new Decimal(0);
    let y = d;
    let iter = 0;
    while (y.minus(yPrev).abs().greaterThan(1) && iter < 255) {
      yPrev = y;
      y = y.pow(2).plus(c).div(new Decimal(2).times(y).plus(b).minus(d)).floor();

      iter++;
    }
    if (iter == 255) {
      throw new Error('Max iterations reached');
    }
    return y;
  }

  dy(i: number, j: number, dx: DecimalType, _rates: DecimalType[]): DecimalType {
    const xp = this._xp(_rates);
    const x = xp[i].plus(dx.times(_rates[i]).div(PRECISION).floor());
    const y = this.getY(i, j, x, xp);
    const dy = xp[j].minus(y).minus(1).times(PRECISION).div(_rates[j]).floor();
    const _fee = this.fee.times(dy).div(FEE_DENOMINATOR).floor();
    return dy.minus(_fee);
  }

  exchange(assetIn: Asset, assetOut: Asset, _dx: bigint) {
    const i = this._get_index(assetIn);
    const j = this._get_index(assetOut);
    if (i === undefined || j === undefined) {
      throw new Error('Asset not found');
    }
    return this._exchange(i, j, _dx);
  }

  _exchange(i: number, j: number, _dx: bigint): SimulatorSwap {
    const vpBefore = this.getVirtualPrice();
    const oldBalances = this.balances.slice();
    const _rates = this.rates;
    const xp = this._xp_mem(oldBalances, _rates);
    const dx = new Decimal(_dx.toString());
    const x = xp[i].plus(dx.times(_rates[i]).div(PRECISION).floor());
    const y = this.getY(i, j, x, xp);

    let dy = xp[j].minus(y).minus(1);
    const dy_fee = dy.times(this.fee).div(FEE_DENOMINATOR).floor();

    dy = dy.minus(dy_fee).times(PRECISION).div(_rates[j]).floor();

    let dy_admin_fee = dy_fee.times(this.adminFee).div(FEE_DENOMINATOR).floor();
    dy_admin_fee = dy_admin_fee.times(PRECISION).div(_rates[j]).floor();

    this.balances[i] = oldBalances[i].plus(dx);
    this.balances[j] = oldBalances[j].minus(dy).minus(dy_admin_fee);
    this.adminFees[j] = this.adminFees[j].plus(dy_admin_fee);
    const vpAfter = this.getVirtualPrice();

    return {
      amountOut: dy,
      vpBefore,
      vpAfter,
    };
  }

  removeLiquidityBalanced(_amount: bigint): SimulateWithdraw {
    const totalSupply = this.totalSupply;
    const amount = new Decimal(_amount.toString());
    const vpBefore = this.getVirtualPrice();

    const amountOuts: DecimalType[] = Array(this.n.toNumber()).fill(new Decimal(0));
    for (let i = 0; i < this.n.toNumber(); i++) {
      const value = this.balances[i].times(amount).div(totalSupply).floor();
      this.balances[i] = this.balances[i].minus(value);
      amountOuts[i] = value;
    }
    this.totalSupply = this.totalSupply.minus(amount);
    const vpAfter = this.getVirtualPrice();

    return {
      amountOuts,
      vpBefore,
      vpAfter,
    };
  }

  removeLiquidityImbalance(_amounts: bigint[], _rates: DecimalType[]): DecimalType {
    const amounts = _amounts.map((amount) => new Decimal(amount.toString()));
    const totalSupply = this.totalSupply;
    const _fee = this.fee
      .times(this.n)
      .div(new Decimal(4).times(this.n.minus(1)))
      .floor();
    const _adminFee = this.adminFee;
    const amp = this.getA();

    const oldBalances = this.balances.slice();
    const newBalances = this.balances.slice();
    const d0 = this.getD_mem(oldBalances, _rates, amp);

    for (let i = 0; i < this.n.toNumber(); i++) {
      newBalances[i] = newBalances[i].minus(amounts[i]);
    }
    const d1 = this.getD_mem(newBalances, _rates, amp);

    const fees = Array(this.n.toNumber()).fill(new Decimal(0));
    for (let i = 0; i < this.n.toNumber(); i++) {
      const idealBalance = d1.times(oldBalances[i]).div(d0).floor();
      const difference = idealBalance.minus(newBalances[i]).abs();
      fees[i] = _fee.times(difference).div(FEE_DENOMINATOR).floor();
      const admin_fee = fees[i].mul(_adminFee).div(FEE_DENOMINATOR).floor();
      this.balances[i] = newBalances[i].minus(admin_fee);
      this.adminFees[i] = this.adminFees[i].plus(admin_fee);
      newBalances[i] = newBalances[i].minus(fees[i]);
    }
    const d2 = this.getD_mem(newBalances, _rates, amp);

    const tokenAmount = d0.minus(d2).times(totalSupply).div(d0).floor();
    this.totalSupply = totalSupply.minus(tokenAmount);
    return tokenAmount;
  }

  removeLiquidityOne(_amount: bigint, target: Asset) {
    const i = this._get_index(target);
    if (i === undefined) {
      throw new Error('Asset not found');
    }
    return this._removeLiquidityOne(_amount, i);
  }

  _removeLiquidityOne(_amount: bigint, i: number): SimulateWithdrawOne {
    const amount = new Decimal(_amount.toString());
    const _rates = this.rates;
    const vpBefore = this.getVirtualPrice();
    const amp = this.getA();
    const _fee = this.fee
      .times(this.n)
      .div(new Decimal(4).times(this.n.minus(1)))
      .floor();
    const totalSupply = this.totalSupply;

    const xp = this._xp(_rates);

    const d0 = this.getD(xp, amp);
    const d1 = d0.minus(amount.times(d0).div(totalSupply).floor());

    const xpReduced = xp.slice();
    const newY = this.getYD(i, xp, d1);
    const dy_0 = xp[i].minus(newY).div(this.precision_mul[i]).floor();

    for (let j = 0; j < this.n.toNumber(); j++) {
      let dxExpected = new Decimal(0);
      if (j === i) {
        dxExpected = xp[j].times(d1).div(d0).floor().minus(newY);
      } else {
        dxExpected = xp[j].minus(xp[j].times(d1).div(d0).floor());
      }
      xpReduced[j] = xpReduced[j].minus(_fee.times(dxExpected).div(FEE_DENOMINATOR).floor());
    }

    let dy = xpReduced[i].minus(this.getYD(i, xpReduced, d1));
    dy = dy.minus(1).div(this.precision_mul[i]).floor();

    const dy_fee = dy_0.minus(dy);
    const dy_admin_fee = dy_fee.times(this.adminFee).div(FEE_DENOMINATOR).floor();
    this.balances[i] = this.balances[i].minus(dy.plus(dy_admin_fee));
    this.adminFees[i] = this.adminFees[i].plus(dy_admin_fee);
    this.totalSupply = totalSupply.minus(amount);
    const vpAfter = this.getVirtualPrice();

    return {
      amountOut: dy,
      vpBefore,
      vpAfter,
    };
  }

  getDx(assetIn: Asset, assetOut: Asset, dy: bigint, needRates: boolean = false): DecimalType {
    const i = this._get_index(assetIn);
    const j = this._get_index(assetOut);
    if (i === undefined || j === undefined) {
      throw new Error('Asset not found');
    }

    const _rates = this.rates;
    const ratesp = this.precision_mul;
    const xp = this._xp(_rates);
    for (let k = 0; k < this.n.toNumber(); k++) {
      if (needRates) {
        ratesp[k] = ratesp[k].times(PRECISION);
      } else {
        ratesp[k] = _rates[k];
      }
    }
    const _dy = new Decimal(dy.toString());
    const yAfterTrade = xp[j].minus(
      _dy.times(ratesp[j]).div(PRECISION).floor().times(FEE_DENOMINATOR).div(FEE_DENOMINATOR.minus(this.fee)).floor(),
    );

    const x = this.getY(j, i, yAfterTrade, xp);
    const dx = x.minus(xp[i]).times(PRECISION).div(ratesp[i]).floor();
    return dx;
  }

  // Function to ramp A
  rampA(futureA: bigint, futureATime: bigint, nowBeforeRampA: number): void {
    const now = new Decimal(nowBeforeRampA);
    const futureA_Decimal = new Decimal(futureA.toString());
    const futureATime_Decimal = new Decimal(futureATime.toString());

    // Check ramp time
    if (now.lt(this.initATime.plus(MIN_RAMP_TIME))) {
      throw new Error('Invalid ramp time: too early to start ramp');
    }
    if (futureATime_Decimal.lt(now.plus(MIN_RAMP_TIME))) {
      throw new Error('Invalid ramp time: future A time is too soon');
    }

    const initA = this.getA();
    const futureAPrecision = futureA_Decimal.times(A_PRECISION);

    // Check ramp A
    if (futureA_Decimal.lte(0) || futureA_Decimal.gte(MAX_A)) {
      throw new Error('Invalid ramp A: value out of bounds');
    }

    if (futureA_Decimal.lt(initA)) {
      if (futureAPrecision.times(MAX_A_CHANGE).lt(initA)) {
        throw new Error('Invalid ramp A: decreasing too fast');
      }
    } else if (futureAPrecision.gt(initA.times(MAX_A_CHANGE))) {
      throw new Error('Invalid ramp A: increasing too fast');
    }

    // Update pool A parameters
    this.a = initA;
    this.futureA = futureAPrecision;
    this.initATime = now;
    this.futureATime = futureATime_Decimal;
  }

  // Method to stop ramp A
  stopRampA(now: number): void {
    const nowDecimal = new Decimal(now);
    this.now = nowDecimal;
    const currentA = this.getA();

    // Set current A as both init_A and future_A to stop the ramp
    this.a = currentA;
    this.futureA = currentA;
    this.initATime = nowDecimal;
    this.futureATime = nowDecimal;
  }

  saveSnapshot(): SimulatorSnapshot {
    return {
      A: this.a,
      futureA: this.futureA,
      initATime: this.initATime,
      futureATime: this.futureATime,
      now: this.now,
      balances: this.balances.map((b) => b.toString()),
      adminFees: this.adminFees.map((f) => f.toString()),
      totalSupply: this.totalSupply.toString(),
    };
  }

  restoreSnapshot(state: SimulatorSnapshot): void {
    this.a = new Decimal(state.A);
    this.futureA = new Decimal(state.futureA);
    this.initATime = new Decimal(state.initATime);
    this.futureATime = new Decimal(state.futureATime);
    this.now = new Decimal(state.now);
    this.balances = state.balances.map((b: string) => new Decimal(b));
    this.adminFees = state.adminFees.map((f: string) => new Decimal(f));
    this.totalSupply = new Decimal(state.totalSupply);
  }
}
