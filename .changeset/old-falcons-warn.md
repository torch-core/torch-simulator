---
'@torch-finance/simulator': patch
---

chore: update @torch-finance/dex-contract-wrapper to version 0.2.2 and enhance withdraw logic

- Updated the @torch-finance/dex-contract-wrapper dependency from version 0.2.1 to 0.2.2 in package.json and pnpm-lock.yaml.
- Added validation for the 'mode' parameter in the Withdraw class to ensure it is either 'Single' or 'Balanced'.
- Refactored the handling of withdrawAsset to use Asset.fromJSON for improved consistency and type safety.
