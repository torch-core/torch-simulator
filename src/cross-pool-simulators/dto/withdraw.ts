import { Address } from '@ton/core';
import { z } from '@hono/zod-openapi';
import { AddressSchema, Asset, AssetSchema } from '@torch-finance/core';
export type WithdrawMode = 'Single' | 'Balanced';

interface BaseWithdraw {
  pool: z.input<typeof AddressSchema>;
  removeLpAmount: string;
}

// Strictly define NextWithdraw based on mode
interface NextWithdrawSingle {
  pool: z.input<typeof AddressSchema>;
  mode: 'Single';
  withdrawAsset: z.input<typeof AssetSchema>; // Must be defined for Single mode
}

interface NextWithdrawBalanced {
  pool: z.input<typeof AddressSchema>;
  mode: 'Balanced';
  withdrawAsset?: never; // Must be undefined for Balanced mode
}

export type NextWithdraw = NextWithdrawSingle | NextWithdrawBalanced;

interface ParsedNextWithdrawSingle {
  pool: Address;
  mode: 'Single';
  withdrawAsset: Asset;
}

interface ParsedNextWithdrawBalanced {
  pool: Address;
  mode: 'Balanced';
}

type ParsedNextWithdraw = ParsedNextWithdrawSingle | ParsedNextWithdrawBalanced;

// Single mode base type
interface SingleWithdrawBase extends BaseWithdraw {
  mode: 'Single';
}

// Mutual exclusivity between withdrawAsset and nextWithdraw
export type SingleWithdrawWithNext = SingleWithdrawBase & {
  nextWithdraw: NextWithdraw;
  withdrawAsset?: never; // Enforce withdrawAsset is undefined when nextWithdraw is defined
};

export type SingleWithdrawWithAsset = SingleWithdrawBase & {
  withdrawAsset: z.input<typeof AssetSchema>;

  nextWithdraw?: never; // Enforce nextWithdraw is undefined when withdrawAsset is defined
};

type SingleWithdrawParams = SingleWithdrawWithNext | SingleWithdrawWithAsset;

// Balanced mode type
interface BalancedWithdrawParams extends BaseWithdraw {
  mode: 'Balanced';
  nextWithdraw?: NextWithdraw; // No restrictions for nextWithdraw in Balanced mode
}

// Unified WithdrawParams type
export type WithdrawParams = SingleWithdrawParams | BalancedWithdrawParams;

export class Withdraw {
  mode: WithdrawMode;
  pool: Address;
  burnLpAmount: bigint;
  withdrawAsset?: Asset;
  nextWithdraw?: ParsedNextWithdraw;

  constructor(params: WithdrawParams) {
    this.mode = params.mode;
    this.pool = AddressSchema.parse(params.pool);
    this.burnLpAmount = BigInt(params.removeLpAmount);

    // mode can only be Single or Balanced
    if (params.mode !== 'Single' && params.mode !== 'Balanced') {
      throw new Error('Invalid mode');
    }

    if (params.mode === 'Single' && !params.withdrawAsset && !params.nextWithdraw) {
      throw new Error('withdrawAsset must be defined when mode is Single');
    }

    // if mode is Single and nextWithdraw is defined, then withdrawAsset must be undefined
    // if mode is Single and nextWithdraw is undefined, then withdrawAsset must be defined
    // if mode is Balanced, then withdrawAsset must be undefined
    // if mode of nextWithdraw is Single, then nextWithdraw.withdrawAsset must be defined
    // if mode of nextWithdraw is Balanced, then nextWithdraw.withdrawAsset must be undefined

    // Validate parameters based on mode
    if (params.nextWithdraw) {
      const hasNextWithdrawAsset = Boolean(params.nextWithdraw?.withdrawAsset);
      const isNextModeSingle = params.nextWithdraw?.mode === 'Single';
      const isNextModeBalanced = params.nextWithdraw?.mode === 'Balanced';
      if (params.mode === 'Single') {
        if (hasNextWithdrawAsset && isNextModeBalanced) {
          throw new Error('Next withdrawAsset must be undefined when nextWithdraw mode is Balanced');
        }
        if (!hasNextWithdrawAsset && isNextModeSingle) {
          throw new Error('Next withdrawAsset must be defined when nextWithdraw mode is Single');
        }
        this.withdrawAsset = Asset.jetton(AddressSchema.parse(params.nextWithdraw.pool));
        if (params.nextWithdraw.mode === 'Single') {
          this.nextWithdraw = this.buildWithdrawSingleNext(params.nextWithdraw);
        } else if (params.nextWithdraw.mode === 'Balanced') {
          this.nextWithdraw = this.buildWithdrawBalancedNext(params.nextWithdraw);
        }
      } else if (params.mode === 'Balanced') {
        if (isNextModeSingle && !hasNextWithdrawAsset) {
          throw new Error('Next withdrawAsset must be defined when nextWithdraw mode is Single');
        }
        if (isNextModeBalanced && hasNextWithdrawAsset) {
          throw new Error('Next withdrawAsset must be undefined when nextWithdraw mode is Balanced');
        }
        if (params.nextWithdraw.mode === 'Single') {
          this.nextWithdraw = this.buildWithdrawSingleNext(params.nextWithdraw);
        } else if (params.nextWithdraw.mode === 'Balanced') {
          this.nextWithdraw = this.buildWithdrawBalancedNext(params.nextWithdraw);
        }
      }
    }
    if (params.mode === 'Single' && !params.nextWithdraw) {
      this.withdrawAsset = Asset.fromJSON(params.withdrawAsset);
    }
  }

  private buildWithdrawSingleNext(params: NextWithdraw) {
    if (params.mode === 'Single') {
      return {
        pool: AddressSchema.parse(params.pool),
        mode: params.mode,
        withdrawAsset: Asset.fromJSON(params.withdrawAsset),
      };
    }
    throw new Error('Invalid next withdraw');
  }

  private buildWithdrawBalancedNext(params: NextWithdraw) {
    if (params.mode === 'Balanced') {
      return {
        pool: AddressSchema.parse(params.pool),
        mode: params.mode,
      };
    }
    throw new Error('Invalid next withdraw');
  }
}
