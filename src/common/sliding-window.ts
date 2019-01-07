/**
 * A sliding window reordering helper class.
 * 
 * This class takes tuples (value, sequence_number) and a callback that should be
 * called as `callback(value)` but in order of sequence_number.  If a sequence 
 * number is received out of order, it puts it into a holding list to be dispatched
 * at the appropriate time. 
 */

export class SlidingWindowReorderer<T> {
    private nextExpected: number;
    private onHold: {[key: number]: T};
    private callback: (value: T) => void | Promise<void>;

    constructor(callback: (value: T) => void | Promise<void>) {
        this.callback = callback;
        this.onHold = {};
        this.nextExpected = 0;
    }

    public call(value: T, sequence: number | null) {
        /**
         * If there is not a sequence number present, just pass the callback through
         * without reordering it.
         */
        if (sequence == null) {
            this.callback(value);
            return;  
        }

        if (sequence != this.nextExpected) console.warn(`Received out of order: expected ${this.nextExpected} got ${sequence}`);

        this.onHold[sequence] = value;

        this.tryDispatchInOrder();
    }

    private tryDispatchInOrder() {
        while (this.nextExpected in this.onHold) {
            try {
                let value = this.onHold[this.nextExpected];
                delete this.onHold[this.nextExpected];

                this.nextExpected += 1;

                this.callback(value);
            } catch (err) {
                console.error("Error in callback in SlidingWindowReorderer", err);
            }
        }
    }
}