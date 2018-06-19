import {BasicControllerTile} from "../../src/mocks/tiles/basic-controller";
import { unpackArrayBuffer } from "iotile-common";

function async_it(msg: string, func: () => Promise<void>) {
    it(msg, async (done) => {
        try {
            await func();
            done();
        } catch (err) {
            done.fail(err);
        }
    });
};

describe("BasicControllerTile", () => {
    async_it("should return a correct hardware tag", async () => {
        let tile = new BasicControllerTile(1, {appTag: 2049, appVersion: "1.1", osTag: 1024, osVersion: "1.0"}, "2.11.4");

        let hwTag = await tile.rpc(8, 0x0002);
        expect(unpackArrayBuffer("10s", hwTag)).toEqual(["btc1_v3\0\0\0"]);
    });

    async_it('should return status correctly', async () => {
        let tile = new BasicControllerTile(1, {appTag: 2049, appVersion: "1.1", osTag: 1024, osVersion: "1.0"}, "2.11.4");
        let info = await tile.rpc(8, 0x0004);

        expect(unpackArrayBuffer("H6sBBBB", info)).toEqual([0xFFFF, 'NRF52 ', 1, 0, 0, 0]);
    });
});