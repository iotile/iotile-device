# Release Notes for iotile-device

## 0.0.21 (12/13/2018)

- Move POD-1M download functionality into POD1M class so that it can be shared among
  different controllers.
- Fix references to old iotile-common package to uniformly reference @iotile/iotile-common.
- Ensure all unit tests work correctly.

## 0.0.3 (8/2/2018)

- Fix BLE optimizer to properly detect when a connection interval negotiation is
  not possible due to a busy BLE stack and backoff and try again (#3).
