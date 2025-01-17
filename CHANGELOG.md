# @torch-finance/simulator

## 0.2.0

### Minor Changes

- 1ea8ebb: - Updated the Simulator to use `bigint` for calculations instead of `decimal`.
  - Aligned the input parameters and output results for `deposit`, `swap`, and `withdraw` with the contract's `simulate` get-method.
  - Enhanced the Simulator creation process to directly utilize parameters from `getPoolData`, eliminating the need for any type conversion.

## 0.1.1

### Patch Changes

- b288400: update @torch-finance/core version

## 0.1.0

### Minor Changes

- 4656254: Run stable swap simulation in Torch Finance with Typescript Only
