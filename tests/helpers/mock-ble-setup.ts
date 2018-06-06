export function setupMockBLE(config: {}) {
    config['BLE'] = {
        "MOCK_BLE": true,
        "MOCK_BLE_DEVICE": "Android",
        "STREAMING_BUFFER_SIZE": 196608,
        "ARCH_BLE_COMPANY_ID": 960,
        "MOCK_BLE_DEVICES":
        {
            "3":
            {
            "type": "nfc300",
            "args": {
                "robust": false,
                "osVersion": 0,
                "appVersion": 0,
                "hwVersion": "btc1_v2"
                }
            },

            "4":
            {
            "type": "nfc300",
            "args": {
                "robust": false,
                "osVersion": 1024,
                "appVersion": 1028,
                "hwVersion": "btc1_v2"
                }
            },

            "5":
            {
            "type": "nfc300",
            "args": {
                "robust": true,
                "osVersion": 1024,
                "appVersion": 1027,
                "hwVersion": "btc1_v2"
                }
            },

            "6":
            {
            "type": "nfc300",
            "args": {
                "robust": true,
                "osVersion": 1024,
                "appVersion": 1028,
                "hwVersion": "btc1_v3"
                }
            },

            "7":
            {
            "type": "nfc300",
            "args": {
                "robust": false,
                "osVersion": 1024,
                "appVersion": 1027,
                "hwVersion": "btc1_v3"
                }
            },

            "8":
            {
            "type": "nfc300",
            "args": {
                "robust": true,
                "osVersion": 1024,
                "appVersion": 1027,
                "hwVersion": "btc1_v3",
                "connected": true
                }
            },

            "9":
            {
            "type": "stream_test",
            "args": {
                "osVersion": 1024,
                "appVersion": 1027,
                "hwVersion": "btc1_v3"
                }
            }
        },

        "MOCK_BLE_SCAN_DELAY": 0
    }
}
