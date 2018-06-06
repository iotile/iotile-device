import {VirtualTile} from "../../src/mocks/virtual-device";

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

describe("Virtual device system", () => {
    async_it("should find rpcs", async () => {
        let tile = new VirtualTile(10, 'test01', "2.1.1");

        let resp = await tile.rpc(10, 0x0004);
    });
});