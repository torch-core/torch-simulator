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

const data = [
  {
    a: '2000',
    rates: ['1000000000000000000000000000', '1062416590000000000000000000', '1054171400000000000000000000'],
    opFees: ['630483', '293769', '302784'],
    opcode: 2903942574,
    lpAmount: '998693436491280461',
    poolType: 'Base',
    provider: 'EQC2Gx6khi4orb5dUxzLmYPPjvu413pojoajP93ledi7lu1v',
    reserves: ['545864254875', '521355376715', '537354455417'],
    adminFees: ['148789600', '4234488', '126071610'],
    recipient: 'EQC2Gx6khi4orb5dUxzLmYPPjvu413pojoajP93ledi7lu1v',
    feeNumerator: '25000000',
    lpTotalSupply: '1664712074830506966429',
    depositAmounts: ['1000000000', '0', '0'],
    adminFeeNumerator: '5000000000',
  },
  {
    a: '2000',
    rates: ['1000000000000000000000000000', '1062416590000000000000000000', '1054171400000000000000000000'],
    opFees: ['29669606', '673030492', '736312669'],
    opcode: 2903942574,
    lpAmount: '2290730282224668914992',
    poolType: 'Base',
    provider: 'EQDrRQlKRo5J10a-nUb8UQ7f3ueVYBQVZV9X8uAjmS7gH7f9',
    reserves: ['1265849420072', '521018861469', '2062316183083'],
    adminFees: ['163624403', '340749734', '494227944'],
    recipient: 'EQDrRQlKRo5J10a-nUb8UQ7f3ueVYBQVZV9X8uAjmS7gH7f9',
    feeNumerator: '25000000',
    lpTotalSupply: '3955442357055175881421',
    depositAmounts: ['720000000000', '0', '1525329884000'],
    adminFeeNumerator: '5000000000',
  },
  {
    a: '2000',
    rates: ['1000000000000000000000000000', '1062416590000000000000000000', '1054171400000000000000000000'],
    opFees: ['170903254', '455937094', '324255937'],
    opcode: 2903942574,
    lpAmount: '662372030891680268666',
    poolType: 'Base',
    provider: 'EQC2Gx6khi4orb5dUxzLmYPPjvu413pojoajP93ledi7lu1v',
    reserves: ['1295763968445', '1094504360922', '2062154055115'],
    adminFees: ['249076030', '568718281', '656355912'],
    recipient: 'EQC2Gx6khi4orb5dUxzLmYPPjvu413pojoajP93ledi7lu1v',
    feeNumerator: '25000000',
    lpTotalSupply: '4617814387946856150087',
    depositAmounts: ['30000000000', '573713468000', '0'],
    adminFeeNumerator: '5000000000',
  },
  {
    a: '2000',
    rates: ['1000000000000000000000000000', '1062416590000000000000000000', '1054171400000000000000000000'],
    opFees: ['102529062'],
    opcode: 3683488833,
    poolType: 'Base',
    provider: 'EQC2Gx6khi4orb5dUxzLmYPPjvu413pojoajP93ledi7lu1v',
    reserves: ['1295763968445', '1094504360922', '1960408732363'],
    adminFees: ['249076030', '568718281', '707620443'],
    recipient: 'EQC2Gx6khi4orb5dUxzLmYPPjvu413pojoajP93ledi7lu1v',
    burnAmount: '100000000000000000000',
    feeNumerator: '25000000',
    lpTotalSupply: '4517814387946856150087',
    removeAmounts: [],
    withdrawAsset: {
      type: 1,
      jettonMaster: 'EQC98_qAmNEptUtPc7W6xdHh_ZHrBUFpw5Ft_IzNU20QAJav',
    },
    removeOneAmount: '101694058221',
    adminFeeNumerator: '5000000000',
  },
  {
    a: '2000',
    rates: ['1000000000000000000000000000', '1062416590000000000000000000', '1054171400000000000000000000'],
    opFees: ['104483582'],
    opcode: 3683488833,
    poolType: 'Base',
    provider: 'EQC2Gx6khi4orb5dUxzLmYPPjvu413pojoajP93ledi7lu1v',
    reserves: ['1295763968445', '1094504360922', '1858953455826'],
    adminFees: ['249076030', '568718281', '759862234'],
    recipient: 'EQC2Gx6khi4orb5dUxzLmYPPjvu413pojoajP93ledi7lu1v',
    burnAmount: '100000000000000000000',
    feeNumerator: '25000000',
    lpTotalSupply: '4417814387946856150087',
    removeAmounts: [],
    withdrawAsset: {
      type: 1,
      jettonMaster: 'EQC98_qAmNEptUtPc7W6xdHh_ZHrBUFpw5Ft_IzNU20QAJav',
    },
    removeOneAmount: '101403034746',
    adminFeeNumerator: '5000000000',
  },
  {
    a: '2000',
    rates: ['1000000000000000000000000000', '1062416600000000000000000000', '1054171400000000000000000000'],
    opFees: ['631804051'],
    opcode: 3683488833,
    poolType: 'Base',
    provider: 'EQDrRQlKRo5J10a-nUb8UQ7f3ueVYBQVZV9X8uAjmS7gH7f9',
    reserves: ['1295763968445', '1094504360922', '1254647877660'],
    adminFees: ['249076030', '568718281', '1075764259'],
    recipient: 'EQDrRQlKRo5J10a-nUb8UQ7f3ueVYBQVZV9X8uAjmS7gH7f9',
    burnAmount: '600000000000000000000',
    feeNumerator: '25000000',
    lpTotalSupply: '3817814387946856150087',
    removeAmounts: [],
    withdrawAsset: {
      type: 1,
      jettonMaster: 'EQC98_qAmNEptUtPc7W6xdHh_ZHrBUFpw5Ft_IzNU20QAJav',
    },
    removeOneAmount: '603989676141',
    adminFeeNumerator: '5000000000',
  },
  {
    a: '2000',
    rates: ['1000000000000000000000000000', '1062416590000000000000000000', '1054171400000000000000000000'],
    opFees: ['170257366', '324937210', '164854903'],
    opcode: 2903942574,
    lpAmount: '534391125698030329536',
    poolType: 'Base',
    provider: 'EQChc1fIWCxkvP58259wiX9qLjCn0c2ZwCO9cVmL3EkZix7I',
    reserves: ['1295678839762', '1594341892317', '1254565450209'],
    adminFees: ['334204713', '731186886', '1158191710'],
    recipient: 'EQChc1fIWCxkvP58259wiX9qLjCn0c2ZwCO9cVmL3EkZix7I',
    feeNumerator: '25000000',
    lpTotalSupply: '4352205513644886479623',
    depositAmounts: ['0', '500000000000', '0'],
    adminFeeNumerator: '5000000000',
  },
  {
    a: '2000',
    rates: ['1000000000000000000000000000', '1062416590000000000000000000', '1054171400000000000000000000'],
    opFees: ['396386051'],
    opcode: 3683488833,
    poolType: 'Base',
    provider: 'EQChc1fIWCxkvP58259wiX9qLjCn0c2ZwCO9cVmL3EkZix7I',
    reserves: ['1295678839762', '1246339957790', '1254565450209'],
    adminFees: ['334204713', '929379911', '1158191710'],
    recipient: 'EQChc1fIWCxkvP58259wiX9qLjCn0c2ZwCO9cVmL3EkZix7I',
    burnAmount: '350000000000000000000',
    feeNumerator: '25000000',
    lpTotalSupply: '4002205513644886479623',
    removeAmounts: [],
    withdrawAsset: {
      type: 1,
      jettonMaster: 'EQDNhy-nxYFgUqzfUzImBEP67JqsyMIcyk2S5_RwNNEYku0k',
    },
    removeOneAmount: '347803741502',
    adminFeeNumerator: '5000000000',
  },
  {
    a: '2000',
    rates: ['1000000000000000000000000000', '1062510360000000000000000000', '1054247250000000000000000000'],
    opFees: ['131', '67', '57'],
    opcode: 2903942574,
    lpAmount: '30453811874089713',
    poolType: 'Base',
    provider: 'EQCv4bQyZQ5Rh4xa8MmvX3TZTDqoWQR_ec15BWc43kZzeLZk',
    reserves: ['1295688839697', '1246349369429', '1254574935621'],
    adminFees: ['334204778', '929379944', '1158191738'],
    recipient: 'EQCv4bQyZQ5Rh4xa8MmvX3TZTDqoWQR_ec15BWc43kZzeLZk',
    feeNumerator: '25000000',
    lpTotalSupply: '4002235967456760569336',
    depositAmounts: ['10000000', '9411672', '9485440'],
    adminFeeNumerator: '5000000000',
  },
  {
    a: '2000',
    rates: ['1000000000000000000000000000', '1000000000000000000000000000', '1000000000000000000000000000'],
    opFees: ['0', '0', '0'],
    opcode: 3683488833,
    poolType: 'Base',
    provider: 'EQC2Gx6khi4orb5dUxzLmYPPjvu413pojoajP93ledi7lu1v',
    reserves: ['608018991801', '584865797879', '588725752762'],
    adminFees: ['334204778', '929379944', '1158191738'],
    recipient: 'EQC2Gx6khi4orb5dUxzLmYPPjvu413pojoajP93ledi7lu1v',
    burnAmount: '2124134217000000000000',
    feeNumerator: '25000000',
    lpTotalSupply: '1878101750456760569336',
    removeAmounts: ['687669847896', '661483571550', '665849182859'],
    removeOneAmount: '0',
    adminFeeNumerator: '5000000000',
  },
  {
    a: '2000',
    rates: ['1000000000000000000000000000', '1000000000000000000000000000', '1000000000000000000000000000'],
    opFees: ['0', '0', '0'],
    opcode: 3683488833,
    poolType: 'Base',
    provider: 'EQDrRQlKRo5J10a-nUb8UQ7f3ueVYBQVZV9X8uAjmS7gH7f9',
    reserves: ['60659871765', '58349960737', '58735054577'],
    adminFees: ['334204778', '929379944', '1158191738'],
    recipient: 'EQDrRQlKRo5J10a-nUb8UQ7f3ueVYBQVZV9X8uAjmS7gH7f9',
    burnAmount: '1690730282000000000000',
    feeNumerator: '25000000',
    lpTotalSupply: '187371468456760569336',
    removeAmounts: ['547359120036', '526515837142', '529990698185'],
    removeOneAmount: '0',
    adminFeeNumerator: '5000000000',
  },
  {
    a: '2000',
    rates: ['1000000000000000000000000000', '1062680460000000000000000000', '1054404360000000000000000000'],
    opFees: ['9344951', '4786638', '4043456'],
    opcode: 2903942574,
    lpAmount: '2140510649945418838709',
    poolType: 'Base',
    provider: 'EQC2Gx6khi4orb5dUxzLmYPPjvu413pojoajP93ledi7lu1v',
    reserves: ['763600865865', '719831139418', '725408639705'],
    adminFees: ['338877253', '931773263', '1160213466'],
    recipient: 'EQC2Gx6khi4orb5dUxzLmYPPjvu413pojoajP93ledi7lu1v',
    feeNumerator: '25000000',
    lpTotalSupply: '2327882118402179408045',
    depositAmounts: ['702945666575', '661483572000', '666675606856'],
    adminFeeNumerator: '5000000000',
  },
  {
    a: '2000',
    rates: ['1000000000000000000000000000', '1062680450000000000000000000', '1054404360000000000000000000'],
    opFees: ['48834', '24988', '21134'],
    opcode: 2903942574,
    lpAmount: '138703770769387784645',
    poolType: 'Base',
    provider: 'EQCv4bQyZQ5Rh4xa8MmvX3TZTDqoWQR_ec15BWc43kZzeLZk',
    reserves: ['809151109800', '762694687980', '768608629138'],
    adminFees: ['338901670', '931785757', '1160224033'],
    recipient: 'EQCv4bQyZQ5Rh4xa8MmvX3TZTDqoWQR_ec15BWc43kZzeLZk',
    feeNumerator: '25000000',
    lpTotalSupply: '2466585889171567192690',
    depositAmounts: ['45550268352', '42863561056', '43200000000'],
    adminFeeNumerator: '5000000000',
  },
  {
    a: '2000',
    rates: ['1000000000000000000000000000', '1062680460000000000000000000', '1054404370000000000000000000'],
    opFees: ['340743', '174351', '147463'],
    opcode: 2903942574,
    lpAmount: '1025451454565666417545',
    poolType: 'Base',
    provider: 'EQC2Gx6khi4orb5dUxzLmYPPjvu413pojoajP93ledi7lu1v',
    reserves: ['1145908824697', '1079589375805', '1087990658564'],
    adminFees: ['339072041', '931872932', '1160297764'],
    recipient: 'EQC2Gx6khi4orb5dUxzLmYPPjvu413pojoajP93ledi7lu1v',
    feeNumerator: '25000000',
    lpTotalSupply: '3492037343737233610235',
    depositAmounts: ['336757885268', '316894775000', '319382103157'],
    adminFeeNumerator: '5000000000',
  },
];

// Helper function to create a new SimulatorState
function createSimulatorState(): SimulatorState {
  const tonAsset = Asset.ton();
  // const jettonAsset = Asset.jetton('kQDMNIkeVbm1yBuijkIp8ryRHK4OGkBUgqpqVIxtP4-4Zs78');
  const tsTONAsset = Asset.jetton('EQC98_qAmNEptUtPc7W6xdHh_ZHrBUFpw5Ft_IzNU20QAJav');
  const stTONAsset = Asset.jetton('EQDNhy-nxYFgUqzfUzImBEP67JqsyMIcyk2S5_RwNNEYku0k');
  const index = 4;
  console.log('data', data[index]);
  return {
    poolAddress: '0x0000000000000000000000000000000000000000',
    initA: 2000,
    futureA: 2000,
    initATime: Math.floor(Date.now() / 1000),
    futureATime: Math.floor(Date.now() / 1000) + 3600,
    decimals: Allocation.createAllocations([
      { asset: tonAsset, value: 9n },
      { asset: stTONAsset, value: 9n },
      { asset: tsTONAsset, value: 9n },
    ]),
    feeNumerator: Number(data[index].feeNumerator),
    adminFeeNumerator: Number(data[index].adminFeeNumerator),
    reserves: Allocation.createAllocations([
      { asset: tonAsset, value: 0n },
      { asset: stTONAsset, value: 0n },
      { asset: tsTONAsset, value: 0n },
    ]),
    adminFees: Allocation.createAllocations([
      { asset: tonAsset, value: 0n },
      { asset: stTONAsset, value: 0n },
      { asset: tsTONAsset, value: 0n },
    ]),
    lpTotalSupply: BigInt(0),
    rates: Allocation.createAllocations([
      { asset: tonAsset, value: BigInt(data[index].rates[0]) },
      { asset: stTONAsset, value: BigInt(data[index].rates[1]) },
      { asset: tsTONAsset, value: BigInt(data[index].rates[2]) },
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

  it('hello', () => {
    console.log('Before Get VP');
    console.log(Number(simulator.getVirtualPrice()) / 1e18);
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
        { asset: state.decimals[0].asset, value: 5n * 100n * 10n ** 18n },
        { asset: state.decimals[1].asset, value: 5n * 95n * 10n ** 18n },
        { asset: state.decimals[2].asset, value: 5n * 94n * 10n ** 18n },
      ]),
      rates: state.rates,
    };

    const result = simulator.deposit(depositParams);

    const depositParams2: SimulateDepositParams = {
      depositAmounts: Allocation.createAllocations([
        { asset: state.decimals[0].asset, value: 100n * 10n ** 18n },
        { asset: state.decimals[1].asset, value: 96n * 10n ** 18n },
        { asset: state.decimals[2].asset, value: 98n * 10n ** 18n },
      ]),
      rates: state.rates,
    };

    const result2 = simulator.deposit(depositParams2);

    console.log('result', result);
    console.log('result2', result2);

    const withdrawParams: SimulateWithdrawParams = {
      lpAmount: 450n * 10n ** 18n,
      rates: state.rates,
      assetOut: state.decimals[1].asset,
    };

    const withdrawResult = simulator.withdraw(withdrawParams);
    console.log('withdrawResult', withdrawResult);
    // expect(result.lpTokenOut).toBeGreaterThan(0n);
    // expect(result.virtualPriceAfter).toBeGreaterThan(result.virtualPriceBefore);
  });

  it('Performs withdrawal correctly', () => {
    const withdrawParams: SimulateWithdrawParams = {
      lpAmount: 500n * 10n ** 18n,
      rates: state.rates,
      assetOut: state.decimals[1].asset,
    };
    // 1054404360000000000000000000
    // 1054404370000000000000000000

    const result = simulator.withdraw(withdrawParams);
    console.log('result', result);
    console.log('Diff', Number(result.virtualPriceAfter - result.virtualPriceBefore) / 1e18);
    // 985217117543291143n
    // 985217117549838369n
    // expect(result.amountOuts[0]).toBeGreaterThan(0n);
    // expect(result.virtualPriceAfter).toBeGreaterThan(0n);
  });

  it('Performs swap exact in correctly', () => {
    // Swap 10 times
    for (let i = 1; i < 10; i++) {
      const assetIn = i % 2;
      const swapParams: SimulateSwapExactInParams = {
        mode: 'ExactIn',
        assetIn: state.decimals[1 - assetIn].asset,
        assetOut: state.decimals[assetIn].asset,
        amountIn: BigInt(i) * 10n ** 9n,
        rates: state.rates,
      };

      const virtualPriceBefore = simulator.getVirtualPrice();
      const result = simulator.swap(swapParams);
      console.log('result', result);

      // VP after should be greater than VP before
      if (result.virtualPriceAfter <= virtualPriceBefore) {
        throw new Error('VP after should be greater than VP before');
      }

      if (result.mode === 'ExactOut') {
        throw new Error('This is not swap exact out');
      }
      console.log('Difference', Number(result.virtualPriceAfter - virtualPriceBefore) / 1e18);
      expect(result.amountOut).toBeGreaterThan(0n);
      expect(result.virtualPriceAfter).not.toEqual(virtualPriceBefore);
    }
  });

  it('Performs swap exact out correctly', () => {
    const amountOut = 100n * 10n ** 18n;
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
    state = createSimulatorState();
    simulator = PoolSimulator.create(state);

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
