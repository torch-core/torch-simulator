---
'@torch-finance/simulator': patch
---

When calling `_setRates()`, if no rates are specified and the simulator already has a rate, it will return directly. Otherwise, it will calculate a default set of rates using decimals.
