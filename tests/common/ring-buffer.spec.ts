import {RingBuffer} from "../../src/common/ring-buffer";

describe('namespace: Utilities, class: RingBuffer', function () {
  let emptyBuffer: RingBuffer;
  let fullBuffer: RingBuffer;
  let bufferLength: number;

  function numToArray(val: number) {
    let chunk = new ArrayBuffer(1);
    let uint8Array = new Uint8Array(chunk);
    uint8Array[0] = val;

    return chunk;
  }

  function constArray(val: number, count: number) {
    let chunk = new ArrayBuffer(count);
    let arr = new Uint8Array(chunk);

    //Cannot use because it has no support on Phantom JS, arr.fill(val);
    for (let i = 0; i < count; ++i) {
      arr[i] = val;
    }
    
    return chunk;
  }

  function sequentialArray(start: number, count: number) {
    let chunk = new ArrayBuffer(count);
    let arr = new Uint8Array(chunk);

    for (let i = 0; i < count; ++i) {
      arr[i] = start + i;
    }

    return chunk;
  }

  function expectArray(array: ArrayBuffer, val: number, length: number) {
    expect(array.byteLength).toBe(length);

    let arr = new Uint8Array(array);

    for (let i = 0; i < array.byteLength; ++i) {
      expect(arr[i]).toBe(val);
    }
  }

  function arrayToByte(val: ArrayBuffer) {
    let uint8Array = new Uint8Array(val);
    return uint8Array[0];
  }

  beforeEach(function () {
    bufferLength = 20
    emptyBuffer = new RingBuffer(bufferLength);
    fullBuffer = new RingBuffer(bufferLength);

    for (let i = 0; i < bufferLength; ++i) {
      fullBuffer.push(numToArray(i));
    }
  })

  it('should allow pushing/popping exactly length bytes', function() {
  	expect(emptyBuffer.count).toBe(0);
    expect(emptyBuffer.offset).toBe(0);

    for (let i = 0; i < bufferLength; ++i) {
      emptyBuffer.push(numToArray(i));
      expect(emptyBuffer.count).toBe(i+1);
      expect(emptyBuffer.offset).toBe(0);
    }

    for (let i = 0; i < bufferLength; ++i) {
      let val = emptyBuffer.pop(1);
      expect(arrayToByte(val)).toBe(i);
      expect(emptyBuffer.count).toBe(bufferLength - i - 1);
      expect(emptyBuffer.offset).toBe((i + 1) % bufferLength);
    }
  })

  it('should raise if popping too many bytes', function(done) {
    try {
      emptyBuffer.pop(1);
      done.fail('pop did not throw error')
    } catch (err) {
      if (err.name == 'RingBufferEmptyError') {
        done();
      } else {
        done.fail('pop threw wrong error type: ' + err.name);
      }
    }

    fullBuffer.pop(10);

    //Should also raise if offset is not 0
    try {
      fullBuffer.pop(15);
      done.fail('pop did not throw error')
    } catch (err) {
      if (err.name == 'RingBufferEmptyError') {
        done();
      } else {
        done.fail('pop threw wrong error type: ' + err.name);
      }
    }

    fullBuffer.push(constArray(30, 5));

    //Should also raise if popping wraps around
    try {
      fullBuffer.pop(16);
      done.fail('pop did not throw error')
    } catch (err) {
      if (err.name == 'RingBufferEmptyError') {
        done();
      } else {
        done.fail('pop threw wrong error type: ' + err.name);
      }
    }
  })

  it('should raise if peeking too many bytes', function(done) {
    try {
      emptyBuffer.peek(1);
      done.fail('peek did not throw error')
    } catch (err) {
      if (err.name == 'RingBufferEmptyError') {
        done();
      } else {
        done.fail('peek threw wrong error type: ' + err.name);
      }
    }

    fullBuffer.pop(10);

    //Should also raise if offset is not 0
    try {
      fullBuffer.peek(15);
      done.fail('peek did not throw error')
    } catch (err) {
      if (err.name == 'RingBufferEmptyError') {
        done();
      } else {
        done.fail('peek threw wrong error type: ' + err.name);
      }
    }

    fullBuffer.push(constArray(30, 5));

    //Should also raise if peeking wraps around
    try {
      fullBuffer.peek(16);
      done.fail('peek did not throw error')
    } catch (err) {
      if (err.name == 'RingBufferEmptyError') {
        done();
      } else {
        done.fail('peek threw wrong error type: ' + err.name);
      }
    }
  })

  it('should allow pushing and popping around the ringbuffer', function() {
    for (let i = 0; i < 20; ++i) {
      emptyBuffer.push(constArray(i, 11));
      expect(emptyBuffer.count).toBe(11);

      let val = emptyBuffer.peek(11);
      let val2 = emptyBuffer.pop(11);

      expectArray(val, i, 11);
      expectArray(val2, i, 11);
    }
  })

  it('should allow popping around a wrap', function() {
    emptyBuffer.push(constArray(1, 15));
    emptyBuffer.pop(11);

    expect(emptyBuffer.count).toBe(4);
    expect(emptyBuffer.offset).toBe(11);

    emptyBuffer.push(constArray(2, 16));
    expect(emptyBuffer.count).toBe(20);
    expect(emptyBuffer.offset).toBe(11);
    let val = emptyBuffer.pop(19);

    expectArray(val.slice(0, 4), 1, 4);
    expectArray(val.slice(4), 2, 15);
    expect(emptyBuffer.count).toBe(1);
    expect(emptyBuffer.offset).toBe(10);
  })

  it('should return the correct data when wrapping', function () {
    fullBuffer.pop(5);
    
    for (let i = 0; i < 5; ++i) {
      fullBuffer.push(numToArray(i+20));
    }

    //Data should have the contents 5 to 25 sequentially 
    let data = fullBuffer.pop(20);
    let dataArray = new Uint8Array(data);

    for (let i = 0; i < 20; ++i) {
      expect(dataArray[i]).toBe(5 + i);
    }

  })

  it('should work when pushing and popping an exact divisor of ring buffer size', function () {
    for (let i = 0; i < 20; ++i) {
      emptyBuffer.push(constArray(i, 5));
      expect(emptyBuffer.count).toBe(5);

      let val = emptyBuffer.peek(5);
      let val2 = emptyBuffer.pop(5);

      expectArray(val, i, 5);
      expectArray(val2, i, 5);
    }
  })

  it('should allow peeking and popping structures', function () {
    emptyBuffer.push(constArray(0xab, 8));

    let val1 = emptyBuffer.peekAs("HHL");
    expect(val1.length).toBe(3);
    expect(val1[0]).toBe(0xabab);
    expect(val1[1]).toBe(0xabab);
    expect(val1[2]).toBe(0xabababab);
    
    val1 = emptyBuffer.popAs("HHL");
    expect(val1.length).toBe(3);
    expect(val1[0]).toBe(0xabab);
    expect(val1[1]).toBe(0xabab);
    expect(val1[2]).toBe(0xabababab);
  });

  it('should autoexpand correctly', function () {
    let ring = new RingBuffer(5, true);
    ring.push(sequentialArray(0, 10));
    expect(new Uint8Array(ring.pop(10))).toEqual(new Uint8Array(sequentialArray(0, 10)));

    ring.reset();
    ring.push(sequentialArray(0, 5));
    ring.push(sequentialArray(5, 10));
    expect(new Uint8Array(ring.pop(15))).toEqual(new Uint8Array(sequentialArray(0, 15)));

    ring.reset();
    ring.push(sequentialArray(0, 7));
    ring.push(sequentialArray(7, 8));
    expect(new Uint8Array(ring.pop(15))).toEqual(new Uint8Array(sequentialArray(0, 15)));

    ring.reset();
    ring.push(sequentialArray(0, 3));
    ring.pop(3)
    ring.push(sequentialArray(5, 25));
    expect(new Uint8Array(ring.pop(25))).toEqual(new Uint8Array(sequentialArray(5, 25)));
  });
});