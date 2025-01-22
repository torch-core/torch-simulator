export function abs(x: bigint): bigint {
  return x < 0n ? -x : x;
}
