# Release Notes for iotile-device

## 0.1.0

- Fix bug in FlexibleDictionaryReport that improperly created msgpack files when the size of
  the file was smaller than 2048 bytes, which would be when there were no POD-1M waveforms.

  The issue was caused by improper truncation of excess 0 padding on the file.

## 0.1.0-rc.2

- Refactor advertisement processing to be more robust and maintainable.  Fix bug processing
  otherConnected flag so that we properly show when other users are connected to a POD and
  don't let the mobile app connect.

## 0.1.0-rc.1

- Refactor UTC reconstruction process be algorithmically faster and based on anchor points directly
  rather than explicit time segments.
- Integrate UTC reconstruction process into waveform processing.
- Add fix for out of order notifications on Android.

## 0.0.28

- Fix UTC assignment for waveforms to properly assign UTC timestamps rather than localtime masquerading as 
  UTC.
- Enhance FlexibleDictionaryReport with a compatible interface to SignedListReport so that RobustReportService
  can deal with both of them.

## 0.0.27

- Refactor POD-1M download process to be more robust and maintainable.
- Ensure that the download process throws an exception if an invalid report is received.
- Add the ability to explicitly reset the streaming interface so that we can deterministically
  recover from corrupted reports received over bluetooth.
- Make `waitReports` robust against reports that are corrupt in the first 20 bytes, causing them
  to be misdecoded as an invalid report type, which breaks the streaming system until an explicit
  reset or device reconnection happens.

## 0.0.26

- Move @iotile/iotile-common to an external peer dependency so that we only have a single
  copy of it in projects that include both @iotile/iotile-device and @iotile/iotile-common

## 0.0.25

- Always fail on upload if Invalid Hash in POD-1M, or waveforms are unable to be assigned   UTC

## 0.0.24

- Use @iotile/iotile-common v0.0.12 and improve logging of unfixable streamer reports.

## 0.0.23

- Refactor POD-1M upload process to only request reports once
- UTC assignment logic fixes: calculating accumulated uptime, using correctly mapped waveform ids
- Update typescript-logging format to not include error message stack trace to avoid
  issues with sentry error grouping.

## 0.0.22

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
