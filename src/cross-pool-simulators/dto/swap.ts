import { z } from '@hono/zod-openapi';
import { AddressSchema, Asset, AssetSchema } from '@torch-finance/core';

const GeneralSwapParamsSchema = z.object({
  assetIn: AssetSchema,
  assetOut: AssetSchema,
  routes: z.array(AddressSchema).optional(),
});

export const ExactInParamsSchema = GeneralSwapParamsSchema.extend({
  mode: z.literal('ExactIn'),
  amountIn: z.union([z.bigint(), z.string().transform((v) => BigInt(v)), z.number().transform((v) => BigInt(v))]),
});

export const ExactOutParamsSchema = GeneralSwapParamsSchema.extend({
  mode: z.literal('ExactOut'),
  amountOut: z.union([z.bigint(), z.string().transform((v) => BigInt(v)), z.number().transform((v) => BigInt(v))]),
});

export const SwapParamsSchema = z
  .discriminatedUnion('mode', [ExactInParamsSchema, ExactOutParamsSchema], {
    errorMap: (issue, ctx) => {
      if (issue.code === 'invalid_union_discriminator')
        return {
          message: `Invalid discriminator value. Expected 'apple' | 'orange', got '${ctx.data.type}'.`,
        };
      return { message: ctx.defaultError };
    },
  })
  .superRefine((data, ctx) => {
    const assetIn = new Asset(data.assetIn);
    const assetOut = new Asset(data.assetOut);
    if (assetIn.equals(assetOut)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Asset in and out must be different',
      });
    }
    if (data.mode === 'ExactIn' && BigInt(data.amountIn) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Amount in must be greater than 0',
      });
    }
    if (data.mode === 'ExactOut' && BigInt(data.amountOut) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Amount out must be greater than 0',
      });
    }
  })
  .transform((data) => {
    return {
      ...data,
      assetIn: new Asset(data.assetIn),
      assetOut: new Asset(data.assetOut),
    };
  });
export type SwapParams = z.input<typeof SwapParamsSchema>;
export type ParsedSwapParams = z.infer<typeof SwapParamsSchema>;
export type SwapMode = ParsedSwapParams['mode'];
