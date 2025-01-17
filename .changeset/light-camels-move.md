---
'@torch-finance/simulator': minor
---

- Updated the Simulator to use `bigint` for calculations instead of `decimal`.
- Aligned the input parameters and output results for `deposit`, `swap`, and `withdraw` with the contract's `simulate` get-method.
- Enhanced the Simulator creation process to directly utilize parameters from `getPoolData`, eliminating the need for any type conversion.
