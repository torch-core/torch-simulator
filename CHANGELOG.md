# @torch-finance/simulator

## 0.3.1

### Patch Changes

- 7aa959a: Add SimulateHop Interface

## 0.3.0

### Minor Changes

- 694c16d: - Add cross-pool simulator
  - Support exact deposit/burn amount

## 0.2.5

### Patch Changes

- f263dce: update @torch-finance/dex-contract-wrapper to version 0.2.1 in package.json and pnpm-lock.yaml

## 0.2.4

### Patch Changes

- 314d2ec: - Update the params and result types of the simulator to be imported from dex-contract-wrapper.
  - Add vpBefore and vpAfter fields in swapExactOut.

## 0.2.3

### Patch Changes

- 32f39db: When claiming the admin fee, specific rates can be provided. If none are specified, the simulator's existing rate will be used for the deposit.

## 0.2.2

### Patch Changes

- bfbea37: When calling `_setRates()`, if no rates are specified and the simulator already has a rate, it will return directly. Otherwise, it will calculate a default set of rates using decimals.

## 0.2.1

### Patch Changes

- 62e66b3: Added a `rates` input parameter to `getVirtualPrice`, allowing users to set a custom rates and view the corresponding virtual price.

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
