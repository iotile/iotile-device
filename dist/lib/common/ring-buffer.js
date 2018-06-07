"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var iotile_common_1 = require("iotile-common");
var error_space_1 = require("./error-space");
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
var RingBuffer = /** @class */ (function () {
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
    function RingBuffer(ringBufferSize, autoexpand) {
        if (autoexpand === void 0) { autoexpand = false; }
        this.ringBuffer = new ArrayBuffer(ringBufferSize);
        this._offset = 0;
        this._count = 0;
        this._initialSize = ringBufferSize;
        this._autoexpand = autoexpand;
    }
    Object.defineProperty(RingBuffer.prototype, "offset", {
        get: function () { return this._offset; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RingBuffer.prototype, "count", {
        get: function () { return this._count; },
        enumerable: true,
        configurable: true
    });
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
    RingBuffer.prototype.push = function (chunk) {
        var chunkLength = chunk.byteLength;
        if ((chunkLength + this._count) > this.ringBuffer.byteLength) {
            if (this._autoexpand) {
                /*
                 * When we expand the buffer, we double its size and then we copy all of
                 * the old data into the beginning of the buffer.  We copy it in two
                 * chunks so that it gets copied in order into the new larger buffer in case
                 * we were wrapping around the old buffer size.
                 */
                var oldBuffer = this.ringBuffer;
                var chunk1Length = oldBuffer.byteLength - this._offset;
                var chunk2Length = this._count - chunk1Length;
                /*
                 * Make sure we allocate enough space to hold all of the new data
                 * in case just doubling the size is not enough.
                 */
                var newSize = 2 * oldBuffer.byteLength;
                while (newSize < (chunkLength + this._count)) {
                    newSize *= 2;
                }
                this.ringBuffer = new ArrayBuffer(newSize);
                if (this._count == 0) {
                    //There is nothing to copy
                }
                else if (this._count <= chunk1Length) {
                    iotile_common_1.copyArrayBuffer(this.ringBuffer, oldBuffer, this._offset, 0, this._count);
                }
                else {
                    iotile_common_1.copyArrayBuffer(this.ringBuffer, oldBuffer, this._offset, 0, chunk1Length);
                    iotile_common_1.copyArrayBuffer(this.ringBuffer, oldBuffer, 0, chunk1Length, chunk2Length);
                }
                this._offset = 0;
            }
            else {
                throw new iotile_common_1.InsufficientSpaceError("Ring buffer would overflow");
            }
        }
        //If this push would wrap, do it in two parts
        if ((this.endPointer + chunkLength) >= this.ringBuffer.byteLength) {
            var chunk1Length = this.ringBuffer.byteLength - this.endPointer;
            var chunk2Length = chunkLength - chunk1Length;
            //If the current end of the buffer is exactly at the end, everything will be
            //placed at the beginning, so chunk1Length may be 0 if we are pushing to a buffer
            //that is completely full but has space at the beginning.
            if (chunk1Length > 0) {
                iotile_common_1.copyArrayBuffer(this.ringBuffer, chunk, 0, this.endPointer, chunk1Length);
            }
            iotile_common_1.copyArrayBuffer(this.ringBuffer, chunk, chunk1Length, 0, chunk2Length);
        }
        else {
            iotile_common_1.copyArrayBuffer(this.ringBuffer, chunk, 0, this.endPointer, chunkLength);
        }
        this._count += chunkLength;
    };
    Object.defineProperty(RingBuffer.prototype, "endPointer", {
        get: function () {
            return (this._offset + this._count) % this.ringBuffer.byteLength;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * @ngdoc method
     * @name Utilities.type:RingBuffer#reset
     * @methodOf Utilities.type:RingBuffer
     *
     * @description
     * Reset the internal state of the ring buffer back to a clean slate.
     */
    RingBuffer.prototype.reset = function () {
        this._offset = 0;
        this._count = 0;
        if (this.ringBuffer.byteLength != this._initialSize) {
            this.ringBuffer = new ArrayBuffer(this._initialSize);
        }
    };
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
    RingBuffer.prototype.peek = function (length) {
        if (this._count < length) {
            throw new error_space_1.RingBufferEmptyError('ring buffer did not have enough data for peek');
        }
        var oldCount = this._count;
        var oldOffset = this._offset;
        var data = this.pop(length);
        this._count = oldCount;
        this._offset = oldOffset;
        return data;
    };
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
    RingBuffer.prototype.peekAs = function (fmt) {
        var length = iotile_common_1.expectedBufferSize(fmt);
        var val = this.peek(length);
        return iotile_common_1.unpackArrayBuffer(fmt, val);
    };
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
    RingBuffer.prototype.pop = function (length) {
        if (this._count < length) {
            throw new error_space_1.RingBufferEmptyError('ring buffer did not have enough data for pop');
        }
        var data = new ArrayBuffer(length);
        //Check if this segment we're popping would wrap around
        //the ringbuffer, in which case we need to pop twice.
        if (this._offset + length > this.ringBuffer.byteLength) {
            var chunk1Length = this.ringBuffer.byteLength - this._offset;
            var chunk2Length = length - chunk1Length;
            iotile_common_1.copyArrayBuffer(data, this.ringBuffer, this._offset, 0, chunk1Length);
            iotile_common_1.copyArrayBuffer(data, this.ringBuffer, 0, chunk1Length, chunk2Length);
        }
        else {
            iotile_common_1.copyArrayBuffer(data, this.ringBuffer, this._offset, 0, length);
        }
        //Now update our count and offset
        this._count -= length;
        this._offset = (this._offset + length) % this.ringBuffer.byteLength;
        return data;
    };
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
    RingBuffer.prototype.popAs = function (fmt) {
        var length = iotile_common_1.expectedBufferSize(fmt);
        var val = this.pop(length);
        return iotile_common_1.unpackArrayBuffer(fmt, val);
    };
    return RingBuffer;
}());
exports.RingBuffer = RingBuffer;
//# sourceMappingURL=ring-buffer.js.map