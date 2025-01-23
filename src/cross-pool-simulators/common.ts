import { z } from '@hono/zod-openapi';
import { Address } from '@ton/core';
import Decimal from 'decimal.js';

export const AddressLike = z.union([z.string().transform((addr) => Address.parse(addr)), z.instanceof(Address)]);

export const DecimalLike = z
  .custom<Decimal.Value>((data) => {
    return data;
  })
  .transform((data) => {
    return new Decimal(data);
  });

// BigInt like: bigint | string | number -> bigint
export const BigIntLike = z.union([z.bigint(), z.string(), z.number(), DecimalLike]).transform((data) => {
  return BigInt(data.toString());
});
