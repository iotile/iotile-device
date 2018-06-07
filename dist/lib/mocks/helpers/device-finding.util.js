"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function findByDeviceID(id, devices) {
    var i = 0;
    for (i = 0; i < devices.length; ++i) {
        if (devices[i].deviceID === id) {
            return devices[i];
        }
    }
    if (i == devices.length) {
        return null;
    }
}
exports.findByDeviceID = findByDeviceID;
//# sourceMappingURL=device-finding.util.js.map