import { AddressSchema, Allocation, AllocationSchema } from '@torch-finance/core';
import { z } from '@hono/zod-openapi';

const DepositBaseSchema = z.object({
  pool: AddressSchema,
  depositAmounts: AllocationSchema.array().transform((v) => Allocation.createAllocations(v)),
});

const DepositNextSchema = z.object({
  pool: AddressSchema,
  depositAmounts: AllocationSchema.optional().transform((v) => (v ? Allocation.createAllocations(v)[0] : undefined)),
});

export const DepositParamsSchema = DepositBaseSchema.extend({
  nextDeposit: DepositNextSchema.optional(),
});

export type DepositParams = z.input<typeof DepositParamsSchema>;
export type ParsedDepositParams = z.infer<typeof DepositParamsSchema>;
