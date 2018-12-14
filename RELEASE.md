# Release Notes for iotile-device

## HEAD

- Fixed #29.  Reassembled reports did not have their id range updated causing iotile companion
  to not properly mark them as acknowledged.
- Fixed #32.  When an invalid report is too corrupted to properly reassemble, it incorrectly
  causes the app to also disconnect the user from the device because it thinks there was an
  interruption in the streaming process.
- Fixed #31.  If an invalid report cannot be fixed, it is added as an `undefined` to the list
  of reports returned by reportParser and still triggers a `RobustReportReceived` event.

## 0.0.21 (12/13/2018)

- Move POD-1M download functionality into POD1M class so that it can be shared among
  different controllers.
- Fix references to old iotile-common package to uniformly reference @iotile/iotile-common.
- Ensure all unit tests work correctly.

## 0.0.3 (8/2/2018)

- Fix BLE optimizer to properly detect when a connection interval negotiation is
  not possible due to a busy BLE stack and backoff and try again (#3).
