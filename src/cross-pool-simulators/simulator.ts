import { SimulateDepositResult, SimulateSwapResult, SimulateWithdrawResult } from '@torch-finance/dex-contract-wrapper';
import { PoolSimulator } from '../pool-simulator/simulator';
import { ParsedDepositParams } from './dto/deposit';
import { Address } from '@ton/core';
import { Allocation, Asset } from '@torch-finance/core';
import { Withdraw, WithdrawParams } from './dto/withdraw';
import { ParsedSwapParams } from './dto/swap';
import { Hop, HopAction } from './dto/route';
import { abs } from './abs';

export class CrossPoolSimulator {
  simulators: PoolSimulator[];

  constructor(simulators: PoolSimulator[]) {
    this.simulators = simulators;
  }

  private _prepareSecDeposit(
    fisrstPoolAddress: Address,
    firstPoolLpTokenOut: bigint,
    nextDepositAmounts?: Allocation,
  ): Allocation[] {
    const baseAllocation = new Allocation({
      asset: Asset.jetton(fisrstPoolAddress.toString()),
      value: firstPoolLpTokenOut,
    });
    return nextDepositAmounts ? [baseAllocation, nextDepositAmounts] : [baseAllocation];
  }

  async deposit(params: ParsedDepositParams): Promise<SimulateDepositResult[]> {
    // If nextDeposit is not provided, it's a single pool deposit, otherwise it's a deposit and deposit operation
    const poolList = [params.pool];
    if (params.nextDeposit) {
      poolList.push(params.nextDeposit.pool);
    }
    // Validate length of pools should be equal to simulators length
    if (poolList.length !== this.simulators.length) {
      throw new Error('Invalid pools length');
    }

    const simulateResults: SimulateDepositResult[] = [];
    // Simulate deposit for the first pool
    const simulateResultFirst = this.simulators[0].deposit({
      depositAmounts: params.depositAmounts,
    });
    simulateResults.push(simulateResultFirst);

    // Only simulate the second pool if it exists
    if (poolList[1]) {
      // Prepare the second pool deposit amount if nextDeposit depositAmounts is provided
      const nextDepositAmounts = this._prepareSecDeposit(
        poolList[0],
        simulateResultFirst.lpTokenOut,
        params.nextDeposit?.depositAmounts,
      );
      // Simulate adding liquidity to the second pool
      simulateResults.push(
        this.simulators[1].deposit({
          depositAmounts: nextDepositAmounts,
        }),
      );
    }

    return simulateResults;
  }

  async withdraw(params: WithdrawParams): Promise<SimulateWithdrawResult[]> {
    const parsedParams = new Withdraw(params);
    // If nextWithdraw is not provided, it's a single pool withdraw, otherwise it's a withdraw and withdraw operation
    const poolList = [parsedParams.pool];
    if (parsedParams.nextWithdraw) {
      poolList.push(parsedParams.nextWithdraw.pool);
    }

    // Get burn lp amount
    const burnLpAmount = parsedParams.burnLpAmount;

    // Simulate withdraw for the first pool
    const withdrawResults: SimulateWithdrawResult[] = [];
    let simulateResult = this.simulators[0].withdraw({
      lpAmount: burnLpAmount,
      assetOut: parsedParams.withdrawAsset,
    });
    withdrawResults.push(simulateResult);

    // Simulate withdraw for the second pool if nextWithdraw is provided
    if (parsedParams.nextWithdraw) {
      const interAsset = Asset.jetton(poolList[1]);
      // Get first pool lp amount
      let firstPoolLpAmount = 0n;
      if (parsedParams.mode === 'Single' && parsedParams.withdrawAsset) {
        // withdraw asset must be first pool lp asset
        if (!parsedParams.withdrawAsset.equals(interAsset)) {
          throw new Error('Withdraw asset must be first pool lp asset');
        }
        firstPoolLpAmount = simulateResult.amountOuts[0];
      } else {
        // Get base lp index
        const baseLpIndex = this.simulators[0].getIndex(interAsset);
        firstPoolLpAmount = simulateResult.amountOuts[baseLpIndex];
      }

      simulateResult = this.simulators[1].withdraw({
        lpAmount: firstPoolLpAmount,
        assetOut: parsedParams.nextWithdraw.mode === 'Single' ? parsedParams.nextWithdraw.withdrawAsset : undefined,
      });
      withdrawResults.push(simulateResult);
    }
    return withdrawResults;
  }

  async swap(parsedParams: ParsedSwapParams, hops?: Hop[]): Promise<SimulateSwapResult[]> {
    hops = hops ? hops : this.getHops(this.simulators, parsedParams.assetIn, parsedParams.assetOut);
    if (parsedParams.mode === 'ExactIn') {
      const swapExactInResults = this.processHopsExactIn(hops, this.simulators, parsedParams.amountIn);
      return swapExactInResults;
    }
    if (parsedParams.mode != 'ExactOut') {
      throw new Error('Invalid swap mode');
    }
    const swapExactOutResults = this.processHopsExactOut(hops, this.simulators, parsedParams.amountOut);
    return swapExactOutResults;
  }

  private processHopsExactIn(hops: Hop[], simulators: PoolSimulator[], initialAmount: bigint): SimulateSwapResult[] {
    let swapAmount = initialAmount;
    const swapResults: SimulateSwapResult[] = [];

    for (let i = 0; i < hops.length; i++) {
      const currentHop = hops[i];
      const result = this.processHop(currentHop, simulators[i], swapAmount, true);
      swapResults.push(result);
      if (result.mode != 'ExactIn') {
        throw new Error('Swap mode is not ExactIn');
      }
      swapAmount = result.amountOut;
    }
    return swapResults;
  }

  private processHopsExactOut(hops: Hop[], simulators: PoolSimulator[], initialAmount: bigint): SimulateSwapResult[] {
    let swapAmount = initialAmount;
    const swapResults: SimulateSwapResult[] = [];

    for (let i = hops.length - 1; i >= 0; i--) {
      const currentHop = hops[i];
      const result = this.processHop(currentHop, simulators[i], swapAmount, false);
      swapResults.push(result);
      if (result.mode != 'ExactOut') {
        throw new Error('Swap mode is not ExactOut');
      }
      swapAmount = result.amountIn;
    }

    return swapResults;
  }

  private processHop(hop: Hop, simulator: PoolSimulator, amount: bigint, isExactIn: boolean): SimulateSwapResult {
    let result: SimulateSwapResult;
    switch (hop.action) {
      case 'swap':
        if (isExactIn) {
          const simulateResult = simulator.swap({
            mode: 'ExactIn',
            amountIn: amount,
            assetIn: hop.assetIn,
            assetOut: hop.assetOut,
          });

          if (simulateResult.mode != 'ExactIn') {
            throw new Error('Swap mode is not ExactIn');
          }
          result = simulateResult;
        } else {
          const simulateResult = simulator.swap({
            mode: 'ExactOut',
            amountOut: amount,
            assetIn: hop.assetIn,
            assetOut: hop.assetOut,
          });
          if (simulateResult.mode != 'ExactOut') {
            throw new Error('Swap mode is not ExactOut');
          }
          result = simulateResult;
        }
        break;

      case 'deposit':
        if (isExactIn) {
          const simulateResult = simulator.deposit({
            depositAmounts: [
              new Allocation({
                asset: hop.assetIn,
                value: amount,
              }),
            ],
          });
          result = {
            mode: 'ExactIn',
            amountOut: simulateResult.lpTokenOut,
            virtualPriceBefore: simulateResult.virtualPriceBefore,
            virtualPriceAfter: simulateResult.virtualPriceAfter,
          };
        } else {
          result = this.getExactDepositAmount(simulator, amount, hop);
        }
        break;

      case 'withdraw':
        if (isExactIn) {
          const simulateWithdrawResult = simulator.withdraw({
            lpAmount: amount,
            assetOut: hop.assetOut,
          });
          result = {
            mode: 'ExactIn',
            amountOut: simulateWithdrawResult.amountOuts[0],
            virtualPriceBefore: simulateWithdrawResult.virtualPriceBefore,
            virtualPriceAfter: simulateWithdrawResult.virtualPriceAfter,
          };
        } else {
          result = this.getExactBurnAmount(simulator, amount, hop.assetOut);
        }
        break;
      default:
        throw new Error(`Unknown hop action: ${hop.action}`);
    }

    return result;
  }

  private getExactBurnAmount(
    simulator: PoolSimulator,
    targetAmount: bigint,
    asset: Asset,
    maxIterations: number = 200,
    tolerance: bigint = 1n,
  ): SimulateSwapResult {
    const { reserves, lpTotalSupply } = simulator.saveSnapshot();
    let lowerBound = 1n;
    let upperBound = lpTotalSupply;
    let guessLpAmount = (lowerBound + upperBound) / 2n;
    let lastGuessDepositAmount = -1n;

    let iterations = 0;
    let simulateResult: SimulateWithdrawResult | null = null;
    while (iterations < maxIterations) {
      iterations++;
      if (guessLpAmount === lastGuessDepositAmount) {
        return {
          mode: 'ExactOut',
          amountIn: guessLpAmount,
          virtualPriceBefore: simulateResult!.virtualPriceBefore,
          virtualPriceAfter: simulateResult!.virtualPriceAfter,
        };
      }
      lastGuessDepositAmount = guessLpAmount;

      simulator.balances = [...reserves];
      simulator.lpTotalSupply = lpTotalSupply;

      try {
        simulateResult = simulator.withdraw({
          lpAmount: guessLpAmount,
          assetOut: asset,
        });
        const estimatedAmount = simulateResult!.amountOuts[0];
        if (abs(estimatedAmount - targetAmount) <= tolerance) {
          return {
            mode: 'ExactOut',
            amountIn: guessLpAmount,
            virtualPriceBefore: simulateResult!.virtualPriceBefore,
            virtualPriceAfter: simulateResult!.virtualPriceAfter,
          };
        }

        if (estimatedAmount < targetAmount) {
          lowerBound = guessLpAmount + 1n;
        } else {
          upperBound = guessLpAmount - 1n;
        }
        guessLpAmount = (lowerBound + upperBound) / 2n;
      } catch (e: unknown) {
        console.log('error', e);
        upperBound = guessLpAmount - 1n;
        guessLpAmount = (lowerBound + upperBound) / 2n;
      }
    }
    return {
      mode: 'ExactOut',
      amountIn: guessLpAmount,
      virtualPriceBefore: simulateResult!.virtualPriceBefore,
      virtualPriceAfter: simulateResult!.virtualPriceAfter,
    };
  }

  private getExactDepositAmount(
    simulator: PoolSimulator,
    targetLpAmount: bigint,
    hop: Hop,
    maxIterations: number = 200,
    tolerance: bigint = 1n,
  ): SimulateSwapResult {
    let iterations = 0;
    let lowerBound = 1n;
    const asset = hop.assetIn;
    const assetDecimal = simulator.decimals[simulator.getIndex(asset)];
    let upperBound = (targetLpAmount * 2n * 10n ** BigInt(assetDecimal)) / 10n ** 18n;
    let guessDepositAmount = (lowerBound + upperBound) / 2n;
    let lastGuessDepositAmount = -1n;
    const { reserves, lpTotalSupply } = simulator.saveSnapshot();

    let simulateResult: SimulateDepositResult | null = null;
    while (iterations < maxIterations) {
      iterations++;
      if (guessDepositAmount === lastGuessDepositAmount) {
        return {
          mode: 'ExactOut',
          amountIn: guessDepositAmount,
          virtualPriceBefore: simulateResult?.virtualPriceBefore ?? 0n,
          virtualPriceAfter: simulateResult?.virtualPriceAfter ?? 0n,
        };
      }
      lastGuessDepositAmount = guessDepositAmount;

      const deposits = [
        new Allocation({
          asset,
          value: guessDepositAmount,
        }),
      ];

      simulator.balances = [...reserves];
      simulator.lpTotalSupply = lpTotalSupply;

      simulateResult = simulator.deposit({
        depositAmounts: deposits,
      });

      const estimatedLpAmount = BigInt(simulateResult!.lpTokenOut.toString());
      if (abs(estimatedLpAmount - targetLpAmount) <= tolerance) {
        return {
          mode: 'ExactOut',
          amountIn: guessDepositAmount,
          virtualPriceBefore: simulateResult?.virtualPriceBefore ?? 0n,
          virtualPriceAfter: simulateResult?.virtualPriceAfter ?? 0n,
        };
      }

      if (estimatedLpAmount < targetLpAmount) {
        lowerBound = guessDepositAmount + 1n;
      } else {
        upperBound = guessDepositAmount - 1n;
      }

      guessDepositAmount = (lowerBound + upperBound) / 2n;
    }
    return {
      mode: 'ExactOut',
      amountIn: guessDepositAmount,
      virtualPriceBefore: simulateResult?.virtualPriceBefore ?? 0n,
      virtualPriceAfter: simulateResult?.virtualPriceAfter ?? 0n,
    };
  }

  getHops(poolSimulators: PoolSimulator[], assetIn: Asset, assetOut: Asset): Hop[] {
    if (assetIn.equals(assetOut)) {
      throw new Error('Asset in and asset out cannot be the same');
    }

    let currentAssetIn = assetIn;
    const routes: Hop[] = [];

    for (let i = 0; i < poolSimulators.length; i++) {
      const currentPool = poolSimulators[i];
      const currentPoolAssets = [...currentPool.assets, Asset.jetton(currentPool.poolAddress)];
      const currentPoolLpAsset = Asset.jetton(currentPool.poolAddress);

      if (i < poolSimulators.length - 1) {
        const nextPool = poolSimulators[i + 1];
        const nextPoolAssets = [...nextPool.assets, Asset.jetton(nextPool.poolAddress)];

        const currentPoolPossibleAssets = currentPoolAssets.filter((asset) => !asset.equals(currentAssetIn));

        const intersection = currentPoolPossibleAssets.filter((asset) =>
          nextPoolAssets.some((nextAsset) => nextAsset.equals(asset)),
        );

        if (intersection.length === 0) {
          throw new Error('Cannot find valid action to connect pools');
        }

        const selectedAssetOut = intersection[0];
        const action = this.determineHopAction(currentPool, currentAssetIn, selectedAssetOut, currentPoolLpAsset);

        routes.push({
          action: action,
          pool: Address.parse(currentPool.poolAddress),
          assetIn: currentAssetIn,
          assetOut: selectedAssetOut,
        });

        currentAssetIn = selectedAssetOut;
      } else {
        const action = this.determineHopAction(currentPool, currentAssetIn, assetOut, currentPoolLpAsset);

        routes.push({
          action: action,
          pool: Address.parse(currentPool.poolAddress),
          assetIn: currentAssetIn,
          assetOut: assetOut,
        });
      }
    }

    return routes;
  }

  private determineHopAction(
    currentPool: PoolSimulator,
    currentAssetIn: Asset,
    assetOut: Asset,
    currentPoolLpAsset: Asset,
  ): HopAction {
    if (currentPool.assets.some((asset) => asset.equals(currentAssetIn)) && assetOut.equals(currentPoolLpAsset)) {
      return HopAction.DEPOSIT; // pool asset -> lp asset
    } else if (
      currentPool.assets.some((asset) => asset.equals(currentAssetIn)) &&
      currentPool.assets.some((asset) => asset.equals(assetOut))
    ) {
      return HopAction.SWAP; // pool asset -> pool asset
    } else if (
      currentAssetIn.equals(currentPoolLpAsset) &&
      currentPool.assets.some((asset) => asset.equals(assetOut))
    ) {
      return HopAction.WITHDRAW; // lp asset -> pool asset
    }
    throw new Error('Cannot determine hop action');
  }
}
