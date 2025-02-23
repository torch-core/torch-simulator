import { Allocation, Asset, AssetType } from '@torch-finance/core';
import { SimulatorState } from '../src/types';
import {
  SimulateDepositParams,
  SimulateSwapExactInParams,
  SimulateSwapExactOutParams,
  SimulateWithdrawParams,
} from '@torch-finance/dex-contract-wrapper';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { PoolSimulatorFuzzer } from './fuzzer/pool-simulator-fuzzer';
import { Operation, OperationType } from './fuzzer/base-fuzzer';
import { ContractFuzzer } from './fuzzer/contract-fuzzer';
import { OperationGenerator } from './fuzzer/operation-generator';

// Add this helper function at the top of the file, after the imports
function getAssetSymbol(asset: Asset): string {
  const symbolMap: { [key: string]: string } = {
    EQC98_qAmNEptUtPc7W6xdHh_ZHrBUFpw5Ft_IzNU20QAJav: 'tsTON',
    'EQDNhy-nxYFgUqzfUzImBEP67JqsyMIcyk2S5_RwNNEYku0k': 'stTON',
  };

  // Special case for native TON
  if (asset.equals(Asset.ton())) {
    return 'TON';
  }

  // For jettons, look up in the map
  if (asset.type === AssetType.JETTON) {
    return symbolMap[asset.jettonMaster!.toString()] || asset.jettonMaster!.toString().slice(0, 6);
  }

  return 'UNKNOWN';
}

// Helper function to create initial pool state
function createInitialState(): SimulatorState {
  const tonAsset = Asset.ton();
  const tsTONAsset = Asset.jetton('EQC98_qAmNEptUtPc7W6xdHh_ZHrBUFpw5Ft_IzNU20QAJav');
  const stTONAsset = Asset.jetton('EQDNhy-nxYFgUqzfUzImBEP67JqsyMIcyk2S5_RwNNEYku0k');

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
    feeNumerator: 25000000,
    adminFeeNumerator: 5000000000,
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
      { asset: tonAsset, value: BigInt('1000000000000000000000000000') },
      { asset: stTONAsset, value: BigInt('1062680460000000000000000000') },
      { asset: tsTONAsset, value: BigInt('1054404370000000000000000000') },
    ]),
  };
}

describe('Pool fuzzing tests', () => {
  let simulatorFuzzer: PoolSimulatorFuzzer;
  let contractFuzzer: ContractFuzzer;
  let operationGenerator: OperationGenerator;

  beforeAll(async () => {
    // Ensure directories exist
    await mkdir('tests/report/failures', { recursive: true });
    await mkdir('tests/report/histories', { recursive: true });
  });

  beforeEach(() => {
    const state = createInitialState();
    simulatorFuzzer = new PoolSimulatorFuzzer(state);
    contractFuzzer = new ContractFuzzer(state);
    operationGenerator = new OperationGenerator(state);

    // Initial deposit to bootstrap the pool
    const initialDeposit: SimulateDepositParams = {
      depositAmounts: Allocation.createAllocations([
        { asset: state.decimals[0].asset, value: 1_000_000_000n * 10n ** state.decimals[0].value },
        { asset: state.decimals[1].asset, value: 1_000_000_000n * 10n ** state.decimals[1].value },
        { asset: state.decimals[2].asset, value: 1_000_000_000n * 10n ** state.decimals[2].value },
      ]),
      rates: state.rates,
    };
    console.log(
      'Initial deposit:',
      initialDeposit.depositAmounts.map((a) => `${Number(a.value) / 10 ** 9} ${getAssetSymbol(a.asset)}`),
    );
    simulatorFuzzer.deposit(initialDeposit);
    contractFuzzer.deposit(initialDeposit);
  });

  it('should maintain positive virtual price after random operations', async () => {
    const numOperations = 10;
    let lastVirtualPrice = simulatorFuzzer.getVirtualPrice();

    try {
      for (let i = 0; i < numOperations; i++) {
        const operationType = Math.floor(Math.random() * OperationType.values.length);

        let operation: Operation | undefined;

        console.log('Operation type:', OperationType.values[operationType]);
        switch (OperationType.values[operationType]) {
          case OperationType.DEPOSIT:
            operation = simulatorFuzzer.performRandomDeposit();
            break;
          case OperationType.WITHDRAW:
            operation = simulatorFuzzer.performRandomWithdraw();
            break;
          case OperationType.SWAP_EXACT_IN:
            operation = simulatorFuzzer.performRandomSwapExactIn();
            break;
          case OperationType.SWAP_EXACT_OUT:
            operation = simulatorFuzzer.performRandomSwapExactOut();
            break;
        }

        if (operation) {
          const newVirtualPrice = simulatorFuzzer.getVirtualPrice();

          if (newVirtualPrice < lastVirtualPrice) {
            const historyJson = JSON.stringify(
              simulatorFuzzer.history,
              (_, value) => (typeof value === 'bigint' ? value.toString() : value),
              2,
            );

            await writeFile(`fuzzing-failure-${Date.now()}.json`, historyJson);

            throw new Error(`Virtual price decreased from ${lastVirtualPrice} to ${newVirtualPrice}`);
          }

          lastVirtualPrice = newVirtualPrice;

          // Updated logging based on operation type
          let operationDetails = '';
          if (operation.type === OperationType.DEPOSIT) {
            const params = operation.params as SimulateDepositParams;
            operationDetails = `Deposited ${params.depositAmounts
              .map((a) => `${Number(a.value) / 10 ** 9} ${getAssetSymbol(a.asset)}`)
              .join(', ')}`;
          } else if (operation.type === OperationType.WITHDRAW) {
            const params = operation.params as SimulateWithdrawParams;
            operationDetails = `Withdrew ${params.lpAmount} LP tokens`;
          } else if (operation.type === OperationType.SWAP_EXACT_IN) {
            const params = operation.params as SimulateSwapExactInParams;
            operationDetails = `Swapped ${Number(params.amountIn) / 10 ** 9} ${getAssetSymbol(params.assetIn)} -> ${getAssetSymbol(params.assetOut)}`;
          } else if (operation.type === OperationType.SWAP_EXACT_OUT) {
            const params = operation.params as SimulateSwapExactOutParams;
            operationDetails = `Swapped ${getAssetSymbol(params.assetIn)} -> ${Number(params.amountOut) / 10 ** 9} ${getAssetSymbol(params.assetOut)}`;
          }

          console.log(`Operation ${i + 1}: ${operationDetails}, Virtual Price: ${Number(newVirtualPrice) / 1e18}`);
        }
      }

      // Save successful operation history
      const historyJson = JSON.stringify(
        simulatorFuzzer.history,
        (_, value) => (typeof value === 'bigint' ? value.toString() : value),
        2,
      );

      const timestamp = Date.now();
      await writeFile(`tests/report/histories/success-${timestamp}.json`, historyJson);
      console.log(`Saved successful operation history to tests/report/histories/success-${timestamp}.json`);
    } catch (error) {
      // Save failed operation history to a different directory
      const historyJson = JSON.stringify(
        simulatorFuzzer.history,
        (_, value) => (typeof value === 'bigint' ? value.toString() : value),
        2,
      );

      const timestamp = Date.now();
      await writeFile(`tests/report/failures/failure-${timestamp}.json`, historyJson);
      console.error(`Saved failed operation history to tests/report/failures/failure-${timestamp}.json`);
      throw error;
    }
  });

  it('should reproduce operations from history file', async () => {
    const historyFile = 'tests/report/failures/failure-1740304774149.json';
    if (!historyFile) {
      console.log('Skipping reproduction test - no HISTORY_FILE specified');
      return;
    }

    const history = JSON.parse(await readFile(historyFile, 'utf-8')) as Operation[];

    // Reset simulator state
    const state = createInitialState();
    simulatorFuzzer = new PoolSimulatorFuzzer(state);

    for (const [index, operation] of history.entries()) {
      try {
        switch (operation.type) {
          case OperationType.DEPOSIT:
            simulatorFuzzer.deposit(operation.params as SimulateDepositParams);
            break;
          case OperationType.WITHDRAW:
            simulatorFuzzer.withdraw(operation.params as SimulateWithdrawParams);
            break;
          case OperationType.SWAP_EXACT_IN:
          case OperationType.SWAP_EXACT_OUT:
            simulatorFuzzer.swap(operation.params as SimulateSwapExactInParams | SimulateSwapExactOutParams);
            break;
        }

        const virtualPrice = simulatorFuzzer.getVirtualPrice().toString();
        console.log(`Operation ${index + 1}: ${operation.type}, Virtual Price: ${virtualPrice}`);

        if (virtualPrice !== operation.virtualPrice) {
          throw new Error(
            `Virtual price mismatch at operation ${index + 1}: ` +
              `expected ${operation.virtualPrice}, got ${virtualPrice}`,
          );
        }
      } catch (error) {
        console.error(`Failed to reproduce operation ${index + 1}:`, error);
        throw error;
      }
    }
  });

  it('should maintain consistent state between simulator and contract', async () => {
    const numOperations = 10;
    let lastVirtualPrice = simulatorFuzzer.getVirtualPrice();

    try {
      for (let i = 0; i < numOperations; i++) {
        const operationType = Math.floor(Math.random() * OperationType.values.length);
        let operation: Operation | undefined;

        switch (OperationType.values[operationType]) {
          case OperationType.DEPOSIT:
            operation = operationGenerator.generateDeposit();
            break;
          case OperationType.WITHDRAW:
            operation = operationGenerator.generateWithdraw(simulatorFuzzer.lpTotalSupply - 1n);
            break;
          case OperationType.SWAP_EXACT_IN:
            operation = operationGenerator.generateSwapExactIn();
            break;
          case OperationType.SWAP_EXACT_OUT:
            operation = operationGenerator.generateSwapExactOut();
            break;
        }

        if (operation) {
          const newVirtualPrice = simulatorFuzzer.getVirtualPrice();

          if (newVirtualPrice < lastVirtualPrice) {
            const historyJson = JSON.stringify(
              simulatorFuzzer.history,
              (_, value) => (typeof value === 'bigint' ? value.toString() : value),
              2,
            );

            await writeFile(`fuzzing-failure-${Date.now()}.json`, historyJson);

            throw new Error(`Virtual price decreased from ${lastVirtualPrice} to ${newVirtualPrice}`);
          }

          lastVirtualPrice = newVirtualPrice;

          // Updated logging based on operation type
          let operationDetails = '';
          if (operation.type === OperationType.DEPOSIT) {
            const params = operation.params as SimulateDepositParams;
            operationDetails = `Deposited ${params.depositAmounts
              .map((a) => `${Number(a.value) / 10 ** 9} ${getAssetSymbol(a.asset)}`)
              .join(', ')}`;
          } else if (operation.type === OperationType.WITHDRAW) {
            const params = operation.params as SimulateWithdrawParams;
            operationDetails = `Withdrew ${params.lpAmount} LP tokens`;
          } else if (operation.type === OperationType.SWAP_EXACT_IN) {
            const params = operation.params as SimulateSwapExactInParams;
            operationDetails = `Swapped ${Number(params.amountIn) / 10 ** 9} ${getAssetSymbol(params.assetIn)} -> ${getAssetSymbol(params.assetOut)}`;
          } else if (operation.type === OperationType.SWAP_EXACT_OUT) {
            const params = operation.params as SimulateSwapExactOutParams;
            operationDetails = `Swapped ${getAssetSymbol(params.assetIn)} -> ${Number(params.amountOut) / 10 ** 9} ${getAssetSymbol(params.assetOut)}`;
          }
          // Perform operation on both fuzzers
          simulatorFuzzer.performOperation(operation);
          contractFuzzer.performOperation(operation);

          expect(simulatorFuzzer.state).toEqual(contractFuzzer.state);
          expect(simulatorFuzzer.getVirtualPrice()).toEqual(contractFuzzer.getVirtualPrice());
          console.log(`Operation ${i + 1}: ${operationDetails}, Virtual Price: ${Number(newVirtualPrice) / 1e18}`);
        }
      }

      // Save successful operation history
      const historyJson = JSON.stringify(
        simulatorFuzzer.history,
        (_, value) => (typeof value === 'bigint' ? value.toString() : value),
        2,
      );

      const timestamp = Date.now();
      await writeFile(`tests/report/histories/success-${timestamp}.json`, historyJson);
      console.log(`Saved successful operation history to tests/report/histories/success-${timestamp}.json`);
    } catch (error) {
      // Save failed operation history
      const historyJson = JSON.stringify(
        simulatorFuzzer.history,
        (_, value) => (typeof value === 'bigint' ? value.toString() : value),
        2,
      );

      const timestamp = Date.now();
      await writeFile(`tests/report/failures/failure-${timestamp}.json`, historyJson);
      console.error(`Saved failed operation history to tests/report/failures/failure-${timestamp}.json`);
      throw error;
    }
  });
});
