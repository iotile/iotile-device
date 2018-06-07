/**
 * @ngdoc object
 * @name Utilities.type:RingBuffer
 *
 * @description
 * A fixed size binary ringbuffer built on top of a Javascript ArrayBuffer
 * The RingBuffer allows pushing, popping and peeking chunks of data as well
 * as popping and peeking typed structures using popAs and peekAs.
 *
 * @property {number} offset The offset to the start of valid data in the ArrayBuffer
 * @property {number} count The count of valid data in the ArrayBuffer
 */
export declare class RingBuffer {
    private ringBuffer;
    private _offset;
    private _count;
    private _initialSize;
    private _autoexpand;
    /**
     * @ndgoc method
     * @name Utilities.type:RingBuffer#constructor
     * @methodOf Utilities.type:RingBuffer
     *
     * @description
     * Constructor for RingBuffer, creates a new RingBuffer
     * with an internal buffer of the given number of bytes.
     * If you try to push more bytes than this internal size, an
     * exception will be thrown.
     *
     * @param ringBufferSize The number of bytes to allocate for the internal ring buffer.
     * @param autoExpand Automatically grow the ring buffer when it reaches its maximum allocated
     *                   size.
     */
    constructor(ringBufferSize: number, autoexpand?: boolean);
    readonly offset: number;
    readonly count: number;
    /**
     * @ngdoc method
     * @name Utilities.type:RingBuffer#push
     * @methodOf Utilities.type:RingBuffer
     *
     * @description
     * Push a chunk of data onto this ring buffer.  If the ring buffer would overflow,
     * raise an exception.
     *
     * ## Exceptions
     * - **{@link type:InsufficientSpaceError InsufficientSpaceError}:** There is an internal max ringbuffer size.  If this is exceeded,
     *   an error is thrown.
     *
     * @param {ArrayBuffer} chunk The next chunk of data that we would like to parse into reports
     *
     * @throws {InsufficientSpaceError} There is an internal max ringbuffer size.  If this is exceeded,
     *                                         an error is thrown.
     */
    push(chunk: ArrayBuffer): void;
    private readonly endPointer;
    /**
     * @ngdoc method
     * @name Utilities.type:RingBuffer#reset
     * @methodOf Utilities.type:RingBuffer
     *
     * @description
     * Reset the internal state of the ring buffer back to a clean slate.
     */
    reset(): void;
    /**
     * @ngdoc method
     * @name Utilities.type:RingBuffer#peek
     * @methodOf Utilities.type:RingBuffer
     *
     * @description
     * Peek at the next length bytes in the ring buffer.  No internal ringbuffer state is updated.
     *
     * ## Exceptions
     * - **{@link type:RingBufferEmptyError RingBufferEmptyError}:** There are fewer than length
     *   bytes stored in the RingBuffer.
     *
     * @param {number} length The numbero of bytes to return
     * @throws {RingBufferEmptyError} If there are fewer than length bytes in the ringbuffer
     * @returns {ArrayBuffer} A copy of the peeked bytes.
     */
    peek(length: number): ArrayBuffer;
    /**
     * @ngdoc method
     * @name Utilities.type:RingBuffer#peekAs
     * @methodOf Utilities.type:RingBuffer
     *
     * @description
     * Peek a formatted structure from the ring buffer according to a format string
     *
     *  ## Exceptions
     * - **{@link type:RingBufferEmptyError RingBufferEmptyError}:** There are fewer than length
     *   bytes stored in the RingBuffer.
     *
     * For example, say we want to pop a uint8_t, uint16_t, uint16_t structure off of
     * the ring buffer.  We could call peekAs("BHH").  This is logically equivalent to
     * val = peek(expectedBufferSize(fmt));
     * return unpackArrayBuffer(fmt, val);
     *
     * @param {string} fmt The format string defining what we want to peek
     * @throws {RingBufferEmptyError} If there are fewer bytes in the ringbuffer than
     * 										 required by fmt
     * @returns {Array} The structure popped off of the buffer as a list of numbers
     */
    peekAs(fmt: string): Array<number>;
    /**
     * @ngdoc method
     * @name Utilities.type:RingBuffer#pop
     * @methodOf Utilities.type:RingBuffer
     *
     * @description
     * Pop length bytes from the ring buffer and return them as an ArrayBuffer.
     *
     * * ## Exceptions
     * - **{@link type:RingBufferEmptyError RingBufferEmptyError}:** There are fewer than length
     *   bytes stored in the RingBuffer.
     *
     * @param {number} length The numbero of bytes to return
     * @throws {RingBufferEmptyError} If there are fewer than length bytes in the ringbuffer
     * @returns {ArrayBuffer} The popped bytes that are removed now from the ring buffer
     */
    pop(length: number): ArrayBuffer;
    /**
     * @ngdoc method
     * @name Utilities.type:RingBuffer#popAs
     * @methodOf Utilities.type:RingBuffer
     *
     * @description
     * Pop a formatted structure from the ring buffer according to a format string
     *
     * * ## Exceptions
     * - **{@link type:RingBufferEmptyError RingBufferEmptyError}:** There are fewer than length
     *   bytes stored in the RingBuffer.
     *
     * For example, say we want to pop a uint8_t, uint16_t, uint16_t structure off of
     * the ring buffer.  We could call popAs("BHH").  This is logically equivalent to
     * val = pop(expectedBufferSize(fmt));
     * return unpackArrayBuffer(fmt, val);
     *
     * @param {string} fmt The format string defining what we want to pop
     * @throws {RingBufferEmptyError} If there are fewer bytes in the ringbuffer than
     * 										 required by fmt
     * @returns {Array} The structure popped off of the buffer as a list of numbers
     */
    popAs(fmt: string): Array<number>;
}
