(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return (b64.length * 3 / 4) - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr((len * 3 / 4) - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0; i < l; i += 4) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (isArrayBuffer(value)) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (isArrayBufferView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (isArrayBufferView(string) || isArrayBuffer(string)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
function isArrayBuffer (obj) {
  return obj instanceof ArrayBuffer ||
    (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
      typeof obj.byteLength === 'number')
}

// Node 0.10 supports `ArrayBuffer` but lacks `ArrayBuffer.isView`
function isArrayBufferView (obj) {
  return (typeof ArrayBuffer.isView === 'function') && ArrayBuffer.isView(obj)
}

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":1,"ieee754":6}],4:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

}).call(this,{"isBuffer":require("../../is-buffer/index.js")})
},{"../../is-buffer/index.js":8}],5:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],6:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],7:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],8:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],9:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],10:[function(require,module,exports){
(function (process){
'use strict';

if (!process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = nextTick;
} else {
  module.exports = process.nextTick;
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}

}).call(this,require('_process'))
},{"_process":11}],11:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],12:[function(require,module,exports){
module.exports = require('./lib/_stream_duplex.js');

},{"./lib/_stream_duplex.js":13}],13:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

var keys = objectKeys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  processNextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

Object.defineProperty(Duplex.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});

Duplex.prototype._destroy = function (err, cb) {
  this.push(null);
  this.end();

  processNextTick(cb, err);
};

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}
},{"./_stream_readable":15,"./_stream_writable":17,"core-util-is":4,"inherits":7,"process-nextick-args":10}],14:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":16,"core-util-is":4,"inherits":7}],15:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var processNextTick = require('process-nextick-args');
/*</replacement>*/

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

// TODO(bmeurer): Change this back to const once hole checks are
// properly optimized away early in Ignition+TurboFan.
/*<replacement>*/
var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/BufferList');
var destroyImpl = require('./internal/streams/destroy');
var StringDecoder;

util.inherits(Readable, Stream);

var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') {
    return emitter.prependListener(event, fn);
  } else {
    // This is a hack to make sure that our error handler is attached before any
    // userland ones.  NEVER DO THIS. This is here only because this code needs
    // to continue to work with older versions of Node.js that do not include
    // the prependListener() method. The goal is to eventually remove this hack.
    if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
  }
}

function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options) {
    if (typeof options.read === 'function') this._read = options.read;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }

  Stream.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});

Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  this.push(null);
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;

  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }

  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      stream.emit('error', er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }

      if (addToFront) {
        if (state.endEmitted) stream.emit('error', new Error('stream.unshift() after end event'));else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        stream.emit('error', new Error('stream.push() after EOF'));
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
    }
  }

  return needMoreData(state);
}

function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    stream.emit('data', chunk);
    stream.read(0);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;

  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  } else {
    state.length -= n;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) processNextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    processNextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('_read() is not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) processNextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  // If the user pushes more data while we're writing to dest then we'll end up
  // in ondata again. However, we only want to increase awaitDrain once because
  // dest will only emit one 'drain' event for the multiple writes.
  // => Introduce a guard on increasing awaitDrain.
  var increasedAwaitDrain = false;
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    increasedAwaitDrain = false;
    var ret = dest.write(chunk);
    if (false === ret && !increasedAwaitDrain) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
        increasedAwaitDrain = true;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = { hasUnpiped: false };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this, unpipeInfo);
    }return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;

  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this, unpipeInfo);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data') {
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    var state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        processNextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    processNextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  state.awaitDrain = 0;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null) {}
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], self.emit.bind(self, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;

  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = fromListPartial(n, state.buffer, state.decoder);
  }

  return ret;
}

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBufferString(n, list) {
  var p = list.head;
  var c = 1;
  var ret = p.data;
  n -= ret.length;
  while (p = p.next) {
    var str = p.data;
    var nb = n > str.length ? str.length : n;
    if (nb === str.length) ret += str;else ret += str.slice(0, n);
    n -= nb;
    if (n === 0) {
      if (nb === str.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = str.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBuffer(n, list) {
  var ret = Buffer.allocUnsafe(n);
  var p = list.head;
  var c = 1;
  p.data.copy(ret);
  n -= p.data.length;
  while (p = p.next) {
    var buf = p.data;
    var nb = n > buf.length ? buf.length : n;
    buf.copy(ret, ret.length - n, 0, nb);
    n -= nb;
    if (n === 0) {
      if (nb === buf.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = buf.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    processNextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_stream_duplex":13,"./internal/streams/BufferList":18,"./internal/streams/destroy":19,"./internal/streams/stream":20,"_process":11,"core-util-is":4,"events":5,"inherits":7,"isarray":9,"process-nextick-args":10,"safe-buffer":25,"string_decoder/":27,"util":2}],16:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function TransformState(stream) {
  this.afterTransform = function (er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
  this.writeencoding = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) {
    return stream.emit('error', new Error('write callback called multiple times'));
  }

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined) stream.push(data);

  cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(this);

  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.once('prefinish', function () {
    if (typeof this._flush === 'function') this._flush(function (er, data) {
      done(stream, er, data);
    });else done(stream);
  });
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('_transform() is not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

Transform.prototype._destroy = function (err, cb) {
  var _this = this;

  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
    _this.emit('close');
  });
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);

  if (data !== null && data !== undefined) stream.push(data);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length) throw new Error('Calling transform done when ws.length != 0');

  if (ts.transforming) throw new Error('Calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":13,"core-util-is":4,"inherits":7}],17:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

/*<replacement>*/

var processNextTick = require('process-nextick-args');
/*</replacement>*/

module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : processNextTick;
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/
var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
/*</replacement>*/

var destroyImpl = require('./internal/streams/destroy');

util.inherits(Writable, Stream);

function nop() {}

function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function (object) {
      if (realHasInstance.call(this, object)) return true;

      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function (object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
    return new Writable(options);
  }

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;

    if (typeof options.final === 'function') this._final = options.final;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  processNextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  var er = false;

  if (chunk === null) {
    er = new TypeError('May not write null values to stream');
  } else if (typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  if (er) {
    stream.emit('error', er);
    processNextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = _isUint8Array(chunk) && !state.objectMode;

  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;

  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    processNextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    processNextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequestCount = 0;
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('_write() is not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      stream.emit('error', err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function') {
      state.pendingcb++;
      state.finalCalled = true;
      processNextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) processNextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }
  if (state.corkedRequestsFree) {
    state.corkedRequestsFree.next = corkReq;
  } else {
    state.corkedRequestsFree = corkReq;
  }
}

Object.defineProperty(Writable.prototype, 'destroyed', {
  get: function () {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});

Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  this.end();
  cb(err);
};
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_stream_duplex":13,"./internal/streams/destroy":19,"./internal/streams/stream":20,"_process":11,"core-util-is":4,"inherits":7,"process-nextick-args":10,"safe-buffer":25,"util-deprecate":28}],18:[function(require,module,exports){
'use strict';

/*<replacement>*/

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Buffer = require('safe-buffer').Buffer;
/*</replacement>*/

function copyBuffer(src, target, offset) {
  src.copy(target, offset);
}

module.exports = function () {
  function BufferList() {
    _classCallCheck(this, BufferList);

    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  BufferList.prototype.push = function push(v) {
    var entry = { data: v, next: null };
    if (this.length > 0) this.tail.next = entry;else this.head = entry;
    this.tail = entry;
    ++this.length;
  };

  BufferList.prototype.unshift = function unshift(v) {
    var entry = { data: v, next: this.head };
    if (this.length === 0) this.tail = entry;
    this.head = entry;
    ++this.length;
  };

  BufferList.prototype.shift = function shift() {
    if (this.length === 0) return;
    var ret = this.head.data;
    if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
    --this.length;
    return ret;
  };

  BufferList.prototype.clear = function clear() {
    this.head = this.tail = null;
    this.length = 0;
  };

  BufferList.prototype.join = function join(s) {
    if (this.length === 0) return '';
    var p = this.head;
    var ret = '' + p.data;
    while (p = p.next) {
      ret += s + p.data;
    }return ret;
  };

  BufferList.prototype.concat = function concat(n) {
    if (this.length === 0) return Buffer.alloc(0);
    if (this.length === 1) return this.head.data;
    var ret = Buffer.allocUnsafe(n >>> 0);
    var p = this.head;
    var i = 0;
    while (p) {
      copyBuffer(p.data, ret, i);
      i += p.data.length;
      p = p.next;
    }
    return ret;
  };

  return BufferList;
}();
},{"safe-buffer":25}],19:[function(require,module,exports){
'use strict';

/*<replacement>*/

var processNextTick = require('process-nextick-args');
/*</replacement>*/

// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;

  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;

  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err && (!this._writableState || !this._writableState.errorEmitted)) {
      processNextTick(emitErrorNT, this, err);
    }
    return;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }

  this._destroy(err || null, function (err) {
    if (!cb && err) {
      processNextTick(emitErrorNT, _this, err);
      if (_this._writableState) {
        _this._writableState.errorEmitted = true;
      }
    } else if (cb) {
      cb(err);
    }
  });
}

function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }

  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}

function emitErrorNT(self, err) {
  self.emit('error', err);
}

module.exports = {
  destroy: destroy,
  undestroy: undestroy
};
},{"process-nextick-args":10}],20:[function(require,module,exports){
module.exports = require('events').EventEmitter;

},{"events":5}],21:[function(require,module,exports){
module.exports = require('./readable').PassThrough

},{"./readable":22}],22:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":13,"./lib/_stream_passthrough.js":14,"./lib/_stream_readable.js":15,"./lib/_stream_transform.js":16,"./lib/_stream_writable.js":17}],23:[function(require,module,exports){
module.exports = require('./readable').Transform

},{"./readable":22}],24:[function(require,module,exports){
module.exports = require('./lib/_stream_writable.js');

},{"./lib/_stream_writable.js":17}],25:[function(require,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":3}],26:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":5,"inherits":7,"readable-stream/duplex.js":12,"readable-stream/passthrough.js":21,"readable-stream/readable.js":22,"readable-stream/transform.js":23,"readable-stream/writable.js":24}],27:[function(require,module,exports){
'use strict';

var Buffer = require('safe-buffer').Buffer;

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return -1;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// UTF-8 replacement characters ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd'.repeat(p);
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd'.repeat(p + 1);
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd'.repeat(p + 2);
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character for each buffered byte of a (partial)
// character needs to be added to the output.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd'.repeat(this.lastTotal - this.lastNeed);
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":25}],28:[function(require,module,exports){
(function (global){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./index.d");
var ifsconstants_1 = require("./ifsconstants");
var CommonClass = (function () {
    function CommonClass() {
    }
    CommonClass.prototype.init = function () {
        var _this = this;
        this.$body = $('body');
        this.$master = $('#master');
        this.$page = $('#page');
        this.$content = $('#content');
        this.$main = $('#main');
        this.initPageStates();
        this.formStyles();
        this.initGotoTop();
        this.initExternalLinks();
        $(window).on('load debouncedresize', function (e) {
            var top = _this.$content.offset().top;
            _this.$content.css({ 'height': 'calc(100vh - ' + top + 'px)' });
        });
    };
    CommonClass.prototype.initPageStates = function () {
        var _this = this;
        this.$body.on('loading.start', function (e) {
            _this.$body.addClass('loading');
        });
        this.$body.on('loading.end', function (e) {
            _this.$body.removeClass('loading');
        });
    };
    CommonClass.prototype.formStyles = function () {
        var containers = $('.checkbox, .radio');
        var inputs = containers.find('input');
        var customControl = $('<span />').addClass('custom-form-control');
        inputs.after(customControl);
    };
    CommonClass.prototype.initGotoTop = function () {
        var _this = this;
        var $btn = $('#btn-goto-top');
        $btn.on('click', function (e) {
            e.preventDefault();
            var block = (window.matchMedia("(min-width:" + ifsconstants_1.breakpoints.md + ")").matches) ? _this.$main : _this.$page;
            block.scrollTo(0, {
                duration: 400,
                interrupt: true
            });
        });
    };
    CommonClass.prototype.initExternalLinks = function () {
        this.$master.on('click', 'a[target="_blank"]', function (e) {
            return confirm(window.jsTexts.leaveWebsiteConfirm);
        });
    };
    return CommonClass;
}());
exports.default = new CommonClass();

},{"./ifsconstants":34,"./index.d":35}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var CookiesClass = (function () {
    function CookiesClass() {
        this.hasCookie = false;
        this.cookieName = 'IFSCookiePolicyAccepted';
    }
    CookiesClass.prototype.init = function () {
        var _this = this;
        this.$cookiesMsgBlock = $('#cookies-msg');
        this.$btnAcceptCookies = this.$cookiesMsgBlock.find('.btn');
        this.hasCookie = !!cookie.get(this.cookieName);
        if (!this.hasCookie) {
            this.$cookiesMsgBlock.addClass('opened');
        }
        this.$btnAcceptCookies.on('click', function (e) {
            e.preventDefault();
            _this.setCookie();
        });
    };
    CookiesClass.prototype.setCookie = function () {
        cookie.set(this.cookieName, 'ok', { expires: 365 });
        this.hasCookie = true;
        this.$cookiesMsgBlock.removeClass('opened');
    };
    return CookiesClass;
}());
exports.default = new CookiesClass();

},{}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var IFSConstants = require("./ifsconstants");
var DisclaimerClass = (function () {
    function DisclaimerClass() {
        this.selectedCountry = '';
        this.selectedProfile = '';
    }
    DisclaimerClass.prototype.init = function () {
        this.$disclaimerWrapper = $('.disclaimer-wrapper');
        this.$disclaimerContainer = $('#disclaimer-container');
        this.$disclaimerConditions = $('#disclaimer-conditions');
        this.$disclaimerText = $('#disclaimer-text');
        this.$disclaimerFooter = $('#disclaimer-footer');
        this.$disclaimerCountrySelector = $('#disclaimer-country-selector');
        this.$disclaimerProfileSelector = $('#disclaimer-profile-selector');
        this.$btnReset = $('#btn-reset-disclaimer');
        this.$btnSubmit = $('#btn-submit-disclaimer');
        this.$btnChangeProfile = $('#btn-change-profile');
        if (this.$disclaimerWrapper.length > 0) {
            var $hidLang = $('#hidLang');
            if ($hidLang && $hidLang.length > 0) {
                this.lang = $hidLang.val();
            }
            var $hidMarket = $('#hidMarket');
            if ($hidMarket && $hidMarket.length > 0) {
                this.selectedCountry = $hidMarket.val();
            }
            var $hidProfile = $('#hidProfile');
            if ($hidProfile && $hidProfile.length > 0) {
                this.selectedProfile = $hidProfile.val();
            }
            var $hidSite = $('#hidSite');
            if ($hidSite && $hidSite.length > 0) {
                this.site = $hidSite.val();
            }
            this.initMarketList();
            this.initDisclaimerActions();
        }
    };
    DisclaimerClass.prototype.initMarketList = function () {
        var _this = this;
        return $.ajax({
            type: 'GET',
            data: {
                lang: this.lang,
                site: this.site
            },
            dataType: 'json',
            cache: false,
            url: IFSConstants.getAvailableDisclaimerMarkets,
            success: function (markets) {
                if (!!markets && markets.length > 0) {
                    _this.disclaimerMarkets = markets;
                    _this.initDisclaimerSelectors();
                }
                else {
                    console.log('no-data');
                }
            },
            error: function (err) {
                console.log(JSON.stringify(err));
            }
        });
    };
    DisclaimerClass.prototype.initDisclaimerActions = function () {
        var _this = this;
        this.$btnReset.on('click', function (e) {
            e.preventDefault();
            _this.resetDisclaimer();
        });
        this.$btnSubmit.on('click', function (e) {
            e.preventDefault();
            _this.submitDisclaimer();
        });
        this.$btnChangeProfile.on('click', function (e) {
            e.preventDefault();
            _this.$disclaimerWrapper.removeClass('disclaimer-hidden');
        });
    };
    DisclaimerClass.prototype.initDisclaimerSelectors = function () {
        var _this = this;
        var $countriesBtn = this.$disclaimerCountrySelector.find('.btn');
        var $countriesMenu = this.$disclaimerCountrySelector.find('.dropdown-menu');
        var $profilesBtn = this.$disclaimerProfileSelector.find('.btn');
        var $profilesMenu = this.$disclaimerProfileSelector.find('.dropdown-menu');
        var countriesTpl = $.templates('#disclaimer-countries-list-tpl');
        var countriesHtml = countriesTpl.render({
            markets: this.disclaimerMarkets
        });
        $countriesMenu.html(countriesHtml);
        var $countriesMenuItems = $countriesMenu.find('li');
        var profilesTpl = $.templates('#disclaimer-profiles-list-tpl');
        var profilesHtml = profilesTpl.render({
            markets: this.disclaimerMarkets
        });
        $profilesMenu.html(profilesHtml);
        var $profilesMenuItems = $profilesMenu.find('li');
        this.$disclaimerCountrySelector.on('reset', function (e) {
            _this.selectedCountry = '';
            _this.$disclaimerContainer.addClass('country-not-selected');
            $countriesBtn.text($countriesBtn.data('text-default'));
        });
        this.$disclaimerProfileSelector.on('reset', function (e) {
            _this.selectedProfile = '';
            $profilesMenuItems.removeClass('hidden');
            $profilesBtn.text($profilesBtn.data('text-default'));
        });
        $countriesMenuItems.each(function (i, li) {
            var $li = $(li);
            var $a = $li.children();
            var country = $li.data('country');
            var label = $li.data('label');
            $a.on('click', function (e) {
                e.preventDefault();
                $countriesBtn.text(label);
                $profilesBtn.text($profilesBtn.data('text-default'));
                _this.selectedCountry = country;
                _this.$disclaimerContainer.removeClass('country-not-selected');
                _this.$disclaimerConditions.removeClass('text-loaded');
                $profilesMenuItems.trigger('filter');
            });
        });
        $profilesMenuItems.each(function (i, li) {
            var $li = $(li);
            var $a = $li.children();
            var country = $li.data('country');
            var profile = $li.data('profile');
            var label = $li.data('label');
            $li.on('filter', function (e) {
                if (_this.selectedCountry === country) {
                    $li.removeClass('hidden');
                }
                else {
                    $li.addClass('hidden');
                }
            });
            $a.on('click', function (e) {
                e.preventDefault();
                $profilesBtn.text(label);
                _this.selectedProfile = profile;
                _this.setDisclaimerText();
            });
        });
        if (this.selectedCountry !== '') {
            $countriesMenuItems.filter('[data-country=' + this.selectedCountry + ']').children().trigger('click');
        }
        if (this.selectedProfile !== '') {
            $profilesMenuItems.filter('[data-profile=' + this.selectedProfile + ']:not(.hidden)').children().trigger('click');
        }
    };
    DisclaimerClass.prototype.setDisclaimerText = function () {
        var _this = this;
        return $.ajax({
            type: 'GET',
            data: {
                lang: this.lang,
                market: this.selectedCountry,
                profile: this.selectedProfile,
                site: this.site
            },
            dataType: 'json',
            cache: false,
            url: IFSConstants.getDisclaimerText,
            success: function (disclaimer) {
                if (!!disclaimer) {
                    _this.$disclaimerText.html(disclaimer.Disclaimer1);
                    _this.$disclaimerFooter.html(disclaimer.Disclaimer2);
                    _this.$disclaimerConditions.addClass('text-loaded');
                }
                else {
                    console.log('no-data');
                }
            },
            error: function (err) {
                console.log(JSON.stringify(err));
            }
        });
    };
    DisclaimerClass.prototype.resetDisclaimer = function () {
        this.$disclaimerText.html('');
        this.$disclaimerFooter.html('');
        this.$disclaimerConditions.removeClass('text-loaded');
        this.$disclaimerCountrySelector.trigger('reset');
        this.$disclaimerProfileSelector.trigger('reset');
    };
    DisclaimerClass.prototype.submitDisclaimer = function () {
        if (this.selectedCountry === '' || this.selectedProfile === '') {
            return;
        }
        return $.ajax({
            type: 'GET',
            data: {
                market: this.selectedCountry,
                profile: this.selectedProfile,
            },
            cache: false,
            url: IFSConstants.validDisclaimer,
            success: function (response) {
                window.location.reload();
            },
            error: function (err) {
                console.log(JSON.stringify(err));
            }
        });
    };
    return DisclaimerClass;
}());
exports.default = new DisclaimerClass();

},{"./ifsconstants":34}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Highstock = require("highcharts/highstock");
var IFSConstants = require("./ifsconstants");
var JSZip = require("jszip");
var utils_1 = require("./utils");
var FundDetailsClass = (function () {
    function FundDetailsClass() {
    }
    FundDetailsClass.prototype.init = function () {
        this.$fundDetailsContainer = $('#fund-details');
        if (this.$fundDetailsContainer.length > 0) {
            var hidISIN = $('#hidISIN');
            if (hidISIN && hidISIN.length > 0) {
                this.isin = hidISIN.val();
            }
            var hidLang = $('#hidLang');
            if (hidLang && hidLang.length > 0) {
                this.lang = hidLang.val();
            }
            this.getEvolVLChart();
            this.getEvolVLExport();
            this.getPerfAnnualChart();
            this.getDocuments();
            this.getDetails();
            this.initAnchors();
        }
    };
    FundDetailsClass.prototype.getEvolVLChart = function (isin, lang) {
        var _this = this;
        if (isin === void 0) { isin = this.isin; }
        if (lang === void 0) { lang = this.lang; }
        return $.ajax({
            type: 'GET',
            data: {
                isin: isin,
                lang: lang,
                type: 'evolvl'
            },
            dataType: 'json',
            cache: false,
            url: IFSConstants.getChartDataServiceUrl,
            success: function (fundsData) {
                if (!!fundsData && !!fundsData.series && (fundsData.series[0].data.length > 0 || fundsData.series[1].data.length > 0)) {
                    _this.initHighCharts('evol-VL-chart', true, fundsData);
                }
                else {
                    $('#vl-chart-block').hide();
                    $('#vl-chart-tab').hide();
                }
            },
            error: function (err) {
                console.log(JSON.stringify(err));
            }
        });
    };
    FundDetailsClass.prototype.getEvolVLExport = function () {
        var _this = this;
        var btn = $('#btn-export-vl-confirm');
        btn.on('click', function (e) {
            e.preventDefault();
            btn.attr('disabled', 'disabled');
            $.ajax({
                type: 'GET',
                data: {
                    isin: _this.isin,
                    lang: _this.lang
                },
                cache: false,
                url: IFSConstants.getChartExportUrl,
                success: function (file) {
                    if (!!file) {
                        var fileBlob = utils_1.base64ToBlob(file, 'text/csv');
                        var fileName = "export_" + _this.isin + "_" + utils_1.Utils.DateToyyyyMMdd(new Date()) + ".csv";
                        if (fileBlob) {
                            utils_1.fileDownload(fileBlob, fileName);
                        }
                    }
                },
                error: function (err) {
                    console.log(JSON.stringify(err));
                }
            }).always(function () {
                btn.removeAttr('disabled');
            });
        });
    };
    FundDetailsClass.prototype.getPerfAnnualChart = function (isin, lang) {
        var _this = this;
        if (isin === void 0) { isin = this.isin; }
        if (lang === void 0) { lang = this.lang; }
        return $.ajax({
            type: 'GET',
            data: {
                isin: isin,
                lang: lang,
                type: 'perffund'
            },
            dataType: 'json',
            cache: false,
            url: IFSConstants.getChartDataServiceUrl,
            success: function (fundsData) {
                if (!!fundsData && !!fundsData.series && (fundsData.series[0].data.length > 0 || fundsData.series[1].data.length > 0)) {
                    _this.initHighCharts('perf-fund-chart', false, fundsData);
                }
                else {
                    $('#performance-chart-block').hide();
                    $('#performance-chart-tab').hide();
                }
            },
            error: function (err) {
                console.log(JSON.stringify(err));
            }
        });
    };
    FundDetailsClass.prototype.getDocuments = function (isin, lang) {
        var _this = this;
        if (isin === void 0) { isin = this.isin; }
        if (lang === void 0) { lang = this.lang; }
        return $.ajax({
            type: 'GET',
            data: {
                isin: isin,
                lang: lang
            },
            dataType: 'json',
            cache: false,
            url: IFSConstants.getDocumentsServiceUrl,
            success: function (documents) {
                if (!!documents && documents.length > 0) {
                    _this.setFundBlockTpl('fund-documents', {
                        documents: documents
                    });
                    _this.initDocuments();
                }
                else {
                    $('#documents-block').hide();
                    $('#documents-tab').hide();
                }
            },
            error: function (err) {
                console.log(JSON.stringify(err));
            }
        });
    };
    FundDetailsClass.prototype.getDetails = function (isin, lang) {
        var _this = this;
        if (isin === void 0) { isin = this.isin; }
        if (lang === void 0) { lang = this.lang; }
        return $.ajax({
            type: 'GET',
            data: {
                isin: isin,
                lang: lang
            },
            dataType: 'json',
            cache: false,
            url: IFSConstants.getDetailsServiceUrl,
            success: function (details) {
                if (details) {
                    _this.setFundBlockTpl('fund-performance', details);
                    _this.setFundBlockTpl('fund-characteristics', details);
                }
                else { }
            },
            error: function (err) {
                console.log(JSON.stringify(err));
            }
        });
    };
    FundDetailsClass.prototype.getCharacteristics = function (isin, lang) {
        var _this = this;
        if (isin === void 0) { isin = this.isin; }
        if (lang === void 0) { lang = this.lang; }
        return $.ajax({
            type: 'GET',
            data: {
                isin: isin,
                lang: lang
            },
            dataType: 'json',
            cache: false,
            url: IFSConstants.getDetailsServiceUrl,
            success: function (details) {
                if (details) {
                    _this.setFundBlockTpl('fund-characteristics', details);
                }
                else { }
            },
            error: function (err) {
                console.log(JSON.stringify(err));
            }
        });
    };
    FundDetailsClass.prototype.getPerformance = function (isin, lang) {
        var _this = this;
        if (isin === void 0) { isin = this.isin; }
        if (lang === void 0) { lang = this.lang; }
        return $.ajax({
            type: 'GET',
            data: {
                isin: isin,
                lang: lang
            },
            dataType: 'json',
            cache: false,
            url: IFSConstants.getDetailsServiceUrl,
            success: function (details) {
                if (details) {
                    _this.setFundBlockTpl('fund-performance', details);
                }
                else { }
            },
            error: function (err) {
                console.log(JSON.stringify(err));
            }
        });
    };
    FundDetailsClass.prototype.setFundBlockTpl = function (block, data) {
        var tpl = $.templates('#' + block + '-tpl');
        var html = tpl.render(data);
        $('#' + block).html(html);
    };
    FundDetailsClass.prototype.initHighCharts = function (idElement, enableNavigator, data) {
        var $chartBlock = $('#' + idElement);
        var $container = $('#fund-' + idElement);
        var chartOptions = {
            chart: {
                renderTo: idElement,
                margin: [50, 0, 50, 0]
            },
            navigator: {
                enabled: enableNavigator
            },
            rangeSelector: {
                enabled: false
            },
            tooltip: {
                enabled: true,
                useHTML: true,
                split: false,
                shared: true,
                backgroundColor: '#262626',
                formatter: function () {
                    var dataDate = new Date(parseInt(this.x));
                    var s = '<p style="color:#fff;">' + utils_1.Utils.DateToddMMyyyy(dataDate) + '</p>';
                    $.each(this.points, function () {
                        s += '<p style="color:' + this.series.color + '">' + this.y + '%</p>';
                    });
                    return s;
                }
            },
            legend: {
                enabled: true,
                layout: 'vertical',
                align: 'right',
                x: 0,
                verticalAlign: 'top',
                floating: true
            },
            yAxis: {
                gridLineWidth: 0,
                minorGridLineWidth: 0,
            },
            plotOptions: {
                line: {
                    dataLabels: {
                        enabled: false
                    },
                    enableMouseTracking: false
                },
                series: {
                    dataLabels: {
                        enabled: false,
                        allowOverlap: true
                    }
                }
            },
            lang: data.lang,
            series: data.series
        };
        var chart = new Highstock.StockChart(chartOptions);
    };
    FundDetailsClass.prototype.initDocuments = function () {
        var $documentsBlock = $('#fund-documents');
        var $inputs = $documentsBlock.find(':checkbox:not(#input-select-all-documents)');
        var $inputSelectAll = $('#input-select-all-documents');
        var $btn = $('#btn-fund-documents-download');
        var urlBase = $btn.data('url-base');
        var documentsUrls = [];
        $inputs.each(function (i, input) {
            var $input = $(input);
            var val = $input.val();
            $input.on('change', function (e) {
                if ($input.is(':checked')) {
                    documentsUrls.push(val);
                }
                else {
                    documentsUrls = documentsUrls.filter(function (e) { return e !== val; });
                    $inputSelectAll.prop('checked', false);
                }
            });
        });
        $inputSelectAll.on('change', function (e) {
            if ($inputSelectAll.is(':checked')) {
                $inputs.prop('checked', true);
            }
            else {
                $inputs.prop('checked', false);
            }
        });
        $btn.on('click', function (e) {
            e.stopPropagation();
            if (!!documentsUrls && documentsUrls.length > 0) {
                $btn.attr('disabled', 'disabled');
                $.ajax({
                    type: 'POST',
                    data: {
                        dl: JSON.stringify(documentsUrls)
                    },
                    cache: false,
                    url: IFSConstants.downloadDocsServiceUrl,
                    success: function (file) {
                        if (!!file && file.length > 0) {
                            var zipFilename_1 = "documents_" + utils_1.Utils.DateToyyyyMMdd(new Date()) + ".zip";
                            var zip = new JSZip();
                            zip.loadAsync(file, {
                                base64: true,
                                checkCRC32: true
                            })
                                .then(function (zip) {
                                zip.generateAsync({
                                    type: "blob"
                                }).then(function (blob) {
                                    utils_1.fileDownload(blob, zipFilename_1);
                                }, function (err) {
                                    console.log(err);
                                });
                            }, function (e) {
                                console.log(e);
                            });
                        }
                        else {
                            console.log('no data');
                        }
                    },
                    error: function (err) {
                        console.log(JSON.stringify(err));
                    }
                }).always(function () {
                    $btn.removeAttr('disabled');
                });
            }
        });
    };
    FundDetailsClass.prototype.initAnchors = function () {
        var mainBlock = $('#main');
        var anchors = $('.fund-details-tabs a');
        anchors.each(function (i, anchor) {
            var $anchor = $(anchor);
            var hash = $anchor.attr('href');
            var $block = $($anchor.attr('href'));
            $anchor.on('click', function (e) {
                e.preventDefault();
                mainBlock.scrollTo(hash, {
                    duration: 1000,
                    interrupt: true
                });
            });
        });
    };
    return FundDetailsClass;
}());
exports.FundDetailsClass = FundDetailsClass;
exports.default = new FundDetailsClass();

},{"./ifsconstants":34,"./utils":37,"highcharts/highstock":39,"jszip":50}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fund_details_1 = require("./fund_details");
var FundsListClass = (function () {
    function FundsListClass() {
        this.fundsListGroupsID = [];
        this.activeFilters = { currencies: [], categories: [] };
    }
    FundsListClass.prototype.init = function () {
        var _this = this;
        this.$body = $('body');
        this.$page = $('#page');
        this.$main = $('#main');
        this.$content = $('#content');
        this.$fundsListTable = $('#funds-list-table');
        if (this.$fundsListTable.length > 0) {
            this.$fundsListRows = this.$fundsListTable.find('tbody tr');
            this.$btnResetFilters = $('#btn-reset-filters');
            this.$filtersInputs = $('.filters-group input[data-filters-group]');
            this.$nbFilteredFunds = $('.nb-filtered-funds');
            this.$nbActiveFilters = $('.nb-active-filters');
            this.$searchInput = $('#funds-list-search');
            this.$modal = $('#modal');
            this.currentLang = $('#hidLang').val();
            this.initFilters();
            this.initSearch();
            this.initFundsList();
            this.initSmartAccess();
            this.initHeaderActions();
            this.$btnResetFilters.on('click', function (e) {
                e.preventDefault();
                _this.resetFilters(false);
                _this.resetSearch();
            });
        }
    };
    FundsListClass.prototype.initFundsList = function () {
        var _this = this;
        var currentGroupID = '';
        this.$fundsListRows.each(function (i, row) {
            var $row = $(row);
            var isTitle = $row.hasClass('fund-title');
            var groupID = $row.data('group-id');
            var category = $row.data('filter-category');
            var currency = $row.data('filter-currency');
            var isin = $row.data('isin');
            var name = $row.data('name');
            if (currentGroupID !== groupID) {
                currentGroupID = groupID;
                _this.fundsListGroupsID.push(groupID);
            }
            $row.on('filter', function (e) {
                $row.removeClass('row-hidden');
                if (_this.activeFilters.currencies.length > 0 && !_this.activeFilters.currencies.includes(currency)) {
                    if (!isTitle) {
                        $row.addClass('row-hidden');
                    }
                }
                if (_this.activeFilters.categories.length > 0 && !_this.activeFilters.categories.includes(category)) {
                    $row.addClass('row-hidden');
                }
                if (_this.searchTerm !== '') {
                    if (!isin.includes(_this.searchTerm) && !name.includes(_this.searchTerm)) {
                        $row.addClass('row-hidden');
                    }
                }
            });
            $row.on('toggleGroup', function (e) {
                _this.toggleFundsListGroup(groupID);
            });
            $row.on('click', '.col-access a', function (e) {
                _this.currentFundName = name;
                _this.currentIsin = isin;
                _this.currentTab = $(e.target).data('tabid') + '-tab';
                $row.find('.col-access a[data-enabled=False]').each(function (index, elem) {
                    var $tab = $('#' + $(elem).data('tabid') + '-tab');
                    if ($tab && $tab.length > 0) {
                        $tab.hide();
                    }
                });
            });
        });
        this.$fundsListTable.on('click', '.expandable-group td:not(.col-access):not(.col-details)', function (e) {
            var $row = $(e.target).closest('tr');
            $row.trigger('toggleGroup');
        });
        this.resetSearch();
    };
    FundsListClass.prototype.initSmartAccess = function () {
        var _this = this;
        var $modalTitle = this.$modal.find('.modal-title');
        var $disabledSmartAcessBtn = this.$fundsListRows.find('a[data-toggle="modal"][data-enabled="False"]');
        var $tabs = this.$modal.find('a[data-toggle="tab"]');
        var $tabsBodies = this.$modal.find('.tab-pane');
        $disabledSmartAcessBtn.on('click', function (e) {
            return false;
        });
        this.$modal.on('show.bs.modal', function (e) {
            $tabs.filter('#' + _this.currentTab).tab('show');
            $modalTitle.text(_this.currentFundName);
        });
        this.$modal.on('hide.bs.modal', function (e) {
            $tabs.removeClass('loaded');
            $tabsBodies.removeClass('active');
            $tabs.parent().removeClass('active');
            $tabsBodies.empty();
            $tabs.show();
        });
        $tabs.each(function (i, tab) {
            var $tab = $(tab);
            var id = $tab.attr('id');
            var $content = $('#' + id + '-body');
            $tab.on('show.bs.tab', function (e) {
                _this.currentTab = id;
                if (!$tab.hasClass('loaded')) {
                    switch (_this.currentTab) {
                        case 'vl-tab':
                            $content.append('<div id="evol-VL-chart"><div class="loader"></div></div>');
                            fund_details_1.default.getEvolVLChart(_this.currentIsin, _this.currentLang).then(function (response) {
                                $tab.addClass('loaded');
                                $content.addClass('loaded');
                            });
                            break;
                        case 'perf-tab':
                            $content.append('<div id="fund-performance"><div class="loader"></div></div>');
                            $content.append('<div id="perf-fund-chart"><div class="loader"></div></div>');
                            fund_details_1.default.getPerformance(_this.currentIsin, _this.currentLang).then(function (response) {
                                fund_details_1.default.getPerfAnnualChart(_this.currentIsin, _this.currentLang).then(function (response) {
                                    $tab.addClass('loaded');
                                    $content.addClass('loaded');
                                });
                            });
                            break;
                        case 'car-tab':
                            $content.append('<div id="fund-characteristics"><div class="loader"></div></div>');
                            fund_details_1.default.getCharacteristics(_this.currentIsin, _this.currentLang).then(function () {
                                $tab.addClass('loaded');
                                $content.addClass('loaded');
                            });
                            break;
                        case 'doc-tab':
                            $content.append('<div id="fund-documents"><div class="loader"></div></div>');
                            fund_details_1.default.getDocuments(_this.currentIsin, _this.currentLang).then(function () {
                                $tab.addClass('loaded');
                                $content.addClass('loaded');
                            });
                            break;
                        default:
                            console.log('invalid tabid');
                            break;
                    }
                }
            });
        });
    };
    FundsListClass.prototype.toggleFundsListGroup = function (groupID) {
        var $rows = this.$fundsListRows.filter("[data-group-id=" + groupID + "]");
        this.$fundsListRows.addClass('row-collapsed').removeClass('group-opened');
        if (this.$fundsListOpenedGroupID === groupID) {
            this.$fundsListOpenedGroupID = '';
        }
        else {
            this.$fundsListOpenedGroupID = groupID;
            this.$fundsListOpenedGroup = $rows;
            this.$fundsListOpenedGroup.removeClass('row-collapsed').addClass('group-opened');
        }
    };
    FundsListClass.prototype.updateFundsListClasses = function () {
        var _this = this;
        var currentGroupID = '';
        this.$fundsListRows.removeClass('fund-main-part row-collapsed group-opened expandable-group');
        var $visibleRows = this.$fundsListRows.not('.fund-title').not('.row-hidden');
        this.$fundsListOpenedGroupID = '';
        var deffered = $.Deferred();
        $.each(this.fundsListGroupsID, function (i, groupID) {
            var $fundTitle = _this.$fundsListRows.filter(".fund-title[data-group-id=" + groupID + "]");
            var $groupedFundsParts = $visibleRows.filter("[data-group-id=" + groupID + "]");
            var $mainFundPart = $groupedFundsParts.first();
            $groupedFundsParts.addClass('row-collapsed');
            $mainFundPart.addClass('fund-main-part').removeClass('row-collapsed');
            if ($groupedFundsParts.length > 0) {
                $fundTitle.removeClass('row-hidden');
                if ($groupedFundsParts.length > 1) {
                    $fundTitle.addClass('expandable-group');
                    $groupedFundsParts.addClass('expandable-group');
                }
            }
            else {
                $fundTitle.addClass('row-hidden');
            }
            if (i === _this.fundsListGroupsID.length - 1) {
                deffered.resolve();
            }
        });
        deffered.done(function () { return _this.updateFundsListInfos(); });
    };
    FundsListClass.prototype.updateFundsListInfos = function () {
        var nbActiveFilters = this.activeFilters.currencies.length + this.activeFilters.categories.length;
        var nbFilteredFunds = this.$fundsListRows.not('.fund-title').not('.row-hidden').length;
        this.$nbActiveFilters.text(nbActiveFilters);
        this.$nbFilteredFunds.text(nbFilteredFunds);
        this.$body.trigger('loading.end');
    };
    FundsListClass.prototype.updateFundsList = function () {
        var _this = this;
        this.$body.trigger('loading.start');
        this.$fundsListRows.trigger('filter').promise().done(function () { return _this.updateFundsListClasses(); });
    };
    FundsListClass.prototype.initFilters = function () {
        var _this = this;
        this.$filtersInputs.each(function (i, input) {
            var $input = $(input);
            var filtersGroup = $input.data('filters-group');
            var val = $input.val();
            $input.on('change', function (e) {
                if ($input.is(':checked')) {
                    _this.activeFilters[filtersGroup].push(val);
                    _this.$searchInput.val();
                }
                else {
                    _this.activeFilters[filtersGroup] = _this.activeFilters[filtersGroup].filter(function (e) { return e !== val; });
                }
                _this.updateFundsList();
            });
        });
    };
    FundsListClass.prototype.resetFilters = function (update) {
        if (update === void 0) { update = true; }
        this.activeFilters = {
            currencies: [],
            categories: []
        };
        this.$filtersInputs.prop('checked', false);
        if (update)
            this.updateFundsList();
    };
    FundsListClass.prototype.initSearch = function () {
        var _this = this;
        var btnReset = $('#btn-reset-search');
        var bloodhound = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.whitespace,
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: window.fundsListSearchData
        });
        this.$searchInput.typeahead({
            minLength: 4,
            highlight: true,
            hint: false
        }, {
            name: 'funds-list-search',
            source: bloodhound
        });
        this.$searchInput.on('typeahead:select', function (e) {
            _this.searchTerm = _this.$searchInput.typeahead('val');
            if (_this.searchTerm === '') {
                btnReset.removeClass('active');
            }
            else {
                btnReset.addClass('active');
            }
            _this.updateFundsList();
        });
        btnReset.on('click', function (e) {
            e.preventDefault();
            if (_this.searchTerm !== '') {
                _this.resetSearch();
            }
        });
        this.$searchInput.on('keydown', function (e) {
            if (e.keyCode === 13) {
                e.preventDefault;
                var val = _this.$searchInput.val();
                if (val !== _this.searchTerm) {
                    _this.$searchInput.trigger('typeahead:select');
                    _this.$searchInput.typeahead('close');
                }
                return false;
            }
        });
    };
    FundsListClass.prototype.resetSearch = function () {
        this.$searchInput.typeahead('val', '');
        this.$searchInput.trigger('typeahead:select');
    };
    FundsListClass.prototype.initHeaderActions = function () {
        var _this = this;
        var $headerActions = $('#header-actions');
        var $btnFilters = $headerActions.find('.btn-filters');
        var $btnFiltersClose = $('.btn-filters-close');
        var $btnSearch = $headerActions.find('.btn-search');
        var $filtersBlock = $('#sidebar');
        var $searchBlock = $('#header-search');
        var filtersOpened = false;
        var searchOpened = false;
        $btnFilters.on('click', function (e) {
            e.preventDefault();
            if (searchOpened) {
                $searchBlock.trigger('close');
            }
            $filtersBlock.trigger('toggle');
        });
        $btnSearch.on('click', function (e) {
            e.preventDefault();
            if (filtersOpened) {
                $filtersBlock.trigger('close');
            }
            $searchBlock.trigger('toggle');
        });
        $btnFiltersClose.on('click', function (e) {
            e.preventDefault();
            $filtersBlock.trigger('close');
        });
        $filtersBlock.on('open', function (e) {
            _this.$body.addClass('filters-opened');
            $btnFilters.addClass('opened');
            filtersOpened = true;
        });
        $filtersBlock.on('close', function (e) {
            _this.$body.removeClass('filters-opened');
            $btnFilters.removeClass('opened');
            filtersOpened = false;
        });
        $filtersBlock.on('toggle', function (e) {
            if (filtersOpened) {
                $filtersBlock.trigger('close');
            }
            else {
                $filtersBlock.trigger('open');
            }
        });
        $searchBlock.on('open', function (e) {
            _this.$body.addClass('search-opened');
            $btnSearch.addClass('opened');
            searchOpened = true;
        });
        $searchBlock.on('close', function (e) {
            _this.$body.removeClass('search-opened');
            $btnSearch.removeClass('opened');
            searchOpened = false;
        });
        $searchBlock.on('toggle', function (e) {
            if (searchOpened) {
                $searchBlock.trigger('close');
            }
            else {
                $searchBlock.trigger('open');
            }
        });
    };
    return FundsListClass;
}());
exports.default = new FundsListClass();

},{"./fund_details":32}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChartDataServiceUrl = '/_layouts/15/IFS/GetChartData.ashx';
exports.getChartExportUrl = '/_layouts/15/IFS/ExportVLCSV.ashx';
exports.getDocumentsServiceUrl = '/_layouts/15/IFS/GetDocuments.ashx';
exports.getDetailsServiceUrl = '/_layouts/15/IFS/GetDetails.ashx';
exports.getAvailableDisclaimerMarkets = '/_layouts/15/IFS/GetAvailableDisclaimerMarkets.ashx';
exports.getDisclaimerText = '/_layouts/15/IFS/GetDisclaimerText.ashx';
exports.validDisclaimer = '/_layouts/15/IFS/ValidDisclaimer.ashx';
exports.downloadDocsServiceUrl = '/_layouts/15/IFS/DownloadDocs.ashx';
exports.breakpoints = { xs: '480px', sm: '768px', md: '992px', lg: '1200px' };
window.fundsListSearchData = window.fundsListSearchData || [];
window.jsTexts = window.jsTexts || {};

},{}],35:[function(require,module,exports){
arguments[4][2][0].apply(exports,arguments)
},{"dup":2}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("./common");
var funds_list_1 = require("./funds_list");
var fund_details_1 = require("./fund_details");
var disclaimer_1 = require("./disclaimer");
var cookies_1 = require("./cookies");
(function ($) {
    $(document).ready(function () {
        common_1.default.init();
        funds_list_1.default.init();
        fund_details_1.default.init();
        disclaimer_1.default.init();
        cookies_1.default.init();
    });
})(jQuery);

},{"./common":29,"./cookies":30,"./disclaimer":31,"./fund_details":32,"./funds_list":33}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var file_saver_1 = require("file-saver");
var Utils = (function () {
    function Utils() {
    }
    Utils.DateToyyyyMMdd = function (date) {
        if (date) {
            var mm = date.getMonth() + 1;
            var dd = date.getDate();
            return [date.getFullYear(),
                (mm > 9 ? '' : '0') + mm,
                (dd > 9 ? '' : '0') + dd].join('');
        }
        return '';
    };
    Utils.DateToddMMyyyy = function (date) {
        if (date) {
            var mm = date.getMonth() + 1;
            var dd = date.getDate();
            return [(dd > 9 ? '' : '0') + dd + '/',
                (mm > 9 ? '' : '0') + mm + '/',
                date.getFullYear(),
            ].join('');
        }
        return '';
    };
    return Utils;
}());
exports.Utils = Utils;
function base64ToBlob(stream, contentType, sliceSize) {
    if (sliceSize === void 0) { sliceSize = 512; }
    if (!stream) {
        return;
    }
    var byteCharacters = atob(stream);
    var byteArrays = [];
    var blob;
    var charset = contentType === 'text/csv' ? 'iso-8859-1' : 'utf-8';
    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);
        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        var byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    blob = new Blob(byteArrays, { type: contentType + ';charset=' + charset });
    return blob;
}
exports.base64ToBlob = base64ToBlob;
function fileDownload(blob, name) {
    var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    var isSafari = !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/);
    if (iOS && isSafari) {
        var reader_1 = new FileReader();
        reader_1.onload = function (e) {
            window.location.href = reader_1.result;
        };
        reader_1.readAsDataURL(blob);
    }
    else {
        try {
            if (!!new Blob) {
                file_saver_1.saveAs(blob, name);
            }
        }
        catch (e) {
            console.log(e);
        }
    }
}
exports.fileDownload = fileDownload;

},{"file-saver":38}],38:[function(require,module,exports){
/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 1.3.2
 * 2016-06-16 18:25:19
 *
 * By Eli Grey, http://eligrey.com
 * License: MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs || (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var
		  doc = view.document
		  // only get URL when necessary in case Blob.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = new MouseEvent("click");
			node.dispatchEvent(event);
		}
		, is_safari = /constructor/i.test(view.HTMLElement) || view.safari
		, is_chrome_ios =/CriOS\/[\d]+/.test(navigator.userAgent)
		, throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		// the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
		, arbitrary_revoke_timeout = 1000 * 40 // in ms
		, revoke = function(file) {
			var revoker = function() {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			setTimeout(revoker, arbitrary_revoke_timeout);
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, auto_bom = function(blob) {
			// prepend BOM for UTF-8 XML and text/* types (including HTML)
			// note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
			if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				return new Blob([String.fromCharCode(0xFEFF), blob], {type: blob.type});
			}
			return blob;
		}
		, FileSaver = function(blob, name, no_auto_bom) {
			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, force = type === force_saveable_type
				, object_url
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					if ((is_chrome_ios || (force && is_safari)) && view.FileReader) {
						// Safari doesn't allow downloading of blob urls
						var reader = new FileReader();
						reader.onloadend = function() {
							var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
							var popup = view.open(url, '_blank');
							if(!popup) view.location.href = url;
							url=undefined; // release reference before dispatching
							filesaver.readyState = filesaver.DONE;
							dispatch_all();
						};
						reader.readAsDataURL(blob);
						filesaver.readyState = filesaver.INIT;
						return;
					}
					// don't create more object URLs than needed
					if (!object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if (force) {
						view.location.href = object_url;
					} else {
						var opened = view.open(object_url, "_blank");
						if (!opened) {
							// Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
							view.location.href = object_url;
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				}
			;
			filesaver.readyState = filesaver.INIT;

			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				setTimeout(function() {
					save_link.href = object_url;
					save_link.download = name;
					click(save_link);
					dispatch_all();
					revoke(object_url);
					filesaver.readyState = filesaver.DONE;
				});
				return;
			}

			fs_error();
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name, no_auto_bom) {
			return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
		}
	;
	// IE 10+ (native saveAs)
	if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
		return function(blob, name, no_auto_bom) {
			name = name || blob.name || "download";

			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			return navigator.msSaveOrOpenBlob(blob, name);
		};
	}

	FS_proto.abort = function(){};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	return saveAs;
}(
	   typeof self !== "undefined" && self
	|| typeof window !== "undefined" && window
	|| this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
  module.exports.saveAs = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd !== null)) {
  define("FileSaver.js", function() {
    return saveAs;
  });
}

},{}],39:[function(require,module,exports){
/*
 Highstock JS v6.0.3 (2017-11-14)

 (c) 2009-2016 Torstein Honsi

 License: www.highcharts.com/license
*/
(function(Q,L){"object"===typeof module&&module.exports?module.exports=Q.document?L(Q):L:Q.Highcharts=L(Q)})("undefined"!==typeof window?window:this,function(Q){var L=function(){var a="undefined"===typeof Q?window:Q,F=a.document,E=a.navigator&&a.navigator.userAgent||"",G=F&&F.createElementNS&&!!F.createElementNS("http://www.w3.org/2000/svg","svg").createSVGRect,r=/(edge|msie|trident)/i.test(E)&&!a.opera,h=/Firefox/.test(E),p=h&&4>parseInt(E.split("Firefox/")[1],10);return a.Highcharts?a.Highcharts.error(16,
!0):{product:"Highstock",version:"6.0.3",deg2rad:2*Math.PI/360,doc:F,hasBidiBug:p,hasTouch:F&&void 0!==F.documentElement.ontouchstart,isMS:r,isWebKit:/AppleWebKit/.test(E),isFirefox:h,isTouchDevice:/(Mobile|Android|Windows Phone)/.test(E),SVG_NS:"http://www.w3.org/2000/svg",chartCount:0,seriesTypes:{},symbolSizes:{},svg:G,win:a,marginNames:["plotTop","marginRight","marginBottom","plotLeft"],noop:function(){},charts:[]}}();(function(a){a.timers=[];var F=a.charts,E=a.doc,G=a.win;a.error=function(r,
h){r=a.isNumber(r)?"Highcharts error #"+r+": www.highcharts.com/errors/"+r:r;if(h)throw Error(r);G.console&&console.log(r)};a.Fx=function(a,h,p){this.options=h;this.elem=a;this.prop=p};a.Fx.prototype={dSetter:function(){var a=this.paths[0],h=this.paths[1],p=[],x=this.now,t=a.length,q;if(1===x)p=this.toD;else if(t===h.length&&1>x)for(;t--;)q=parseFloat(a[t]),p[t]=isNaN(q)?h[t]:x*parseFloat(h[t]-q)+q;else p=h;this.elem.attr("d",p,null,!0)},update:function(){var a=this.elem,h=this.prop,p=this.now,x=
this.options.step;if(this[h+"Setter"])this[h+"Setter"]();else a.attr?a.element&&a.attr(h,p,null,!0):a.style[h]=p+this.unit;x&&x.call(a,p,this)},run:function(r,h,p){var x=this,t=x.options,q=function(a){return q.stopped?!1:x.step(a)},z=G.requestAnimationFrame||function(a){setTimeout(a,13)},k=function(){a.timers=a.grep(a.timers,function(a){return a()});a.timers.length&&z(k)};r===h?(delete t.curAnim[this.prop],t.complete&&0===a.keys(t.curAnim).length&&t.complete()):(this.startTime=+new Date,this.start=
r,this.end=h,this.unit=p,this.now=this.start,this.pos=0,q.elem=this.elem,q.prop=this.prop,q()&&1===a.timers.push(q)&&z(k))},step:function(r){var h=+new Date,p,x=this.options,t=this.elem,q=x.complete,z=x.duration,k=x.curAnim;t.attr&&!t.element?r=!1:r||h>=z+this.startTime?(this.now=this.end,this.pos=1,this.update(),p=k[this.prop]=!0,a.objectEach(k,function(a){!0!==a&&(p=!1)}),p&&q&&q.call(t),r=!1):(this.pos=x.easing((h-this.startTime)/z),this.now=this.start+(this.end-this.start)*this.pos,this.update(),
r=!0);return r},initPath:function(r,h,p){function x(a){var b,c;for(w=a.length;w--;)b="M"===a[w]||"L"===a[w],c=/[a-zA-Z]/.test(a[w+3]),b&&c&&a.splice(w+1,0,a[w+1],a[w+2],a[w+1],a[w+2])}function t(a,b){for(;a.length<c;){a[0]=b[c-a.length];var g=a.slice(0,e);[].splice.apply(a,[0,0].concat(g));l&&(g=a.slice(a.length-e),[].splice.apply(a,[a.length,0].concat(g)),w--)}a[0]="M"}function q(a,w){for(var g=(c-a.length)/e;0<g&&g--;)b=a.slice().splice(a.length/D-e,e*D),b[0]=w[c-e-g*e],f&&(b[e-6]=b[e-2],b[e-5]=
b[e-1]),[].splice.apply(a,[a.length/D,0].concat(b)),l&&g--}h=h||"";var z,k=r.startX,m=r.endX,f=-1<h.indexOf("C"),e=f?7:3,c,b,w;h=h.split(" ");p=p.slice();var l=r.isArea,D=l?2:1,H;f&&(x(h),x(p));if(k&&m){for(w=0;w<k.length;w++)if(k[w]===m[0]){z=w;break}else if(k[0]===m[m.length-k.length+w]){z=w;H=!0;break}void 0===z&&(h=[])}h.length&&a.isNumber(z)&&(c=p.length+z*D*e,H?(t(h,p),q(p,h)):(t(p,h),q(h,p)));return[h,p]}};a.Fx.prototype.fillSetter=a.Fx.prototype.strokeSetter=function(){this.elem.attr(this.prop,
a.color(this.start).tweenTo(a.color(this.end),this.pos),null,!0)};a.extend=function(a,h){var p;a||(a={});for(p in h)a[p]=h[p];return a};a.merge=function(){var r,h=arguments,p,x={},t=function(q,p){"object"!==typeof q&&(q={});a.objectEach(p,function(k,m){!a.isObject(k,!0)||a.isClass(k)||a.isDOMElement(k)?q[m]=p[m]:q[m]=t(q[m]||{},k)});return q};!0===h[0]&&(x=h[1],h=Array.prototype.slice.call(h,2));p=h.length;for(r=0;r<p;r++)x=t(x,h[r]);return x};a.pInt=function(a,h){return parseInt(a,h||10)};a.isString=
function(a){return"string"===typeof a};a.isArray=function(a){a=Object.prototype.toString.call(a);return"[object Array]"===a||"[object Array Iterator]"===a};a.isObject=function(r,h){return!!r&&"object"===typeof r&&(!h||!a.isArray(r))};a.isDOMElement=function(r){return a.isObject(r)&&"number"===typeof r.nodeType};a.isClass=function(r){var h=r&&r.constructor;return!(!a.isObject(r,!0)||a.isDOMElement(r)||!h||!h.name||"Object"===h.name)};a.isNumber=function(a){return"number"===typeof a&&!isNaN(a)};a.erase=
function(a,h){for(var p=a.length;p--;)if(a[p]===h){a.splice(p,1);break}};a.defined=function(a){return void 0!==a&&null!==a};a.attr=function(r,h,p){var x;a.isString(h)?a.defined(p)?r.setAttribute(h,p):r&&r.getAttribute&&(x=r.getAttribute(h)):a.defined(h)&&a.isObject(h)&&a.objectEach(h,function(a,q){r.setAttribute(q,a)});return x};a.splat=function(r){return a.isArray(r)?r:[r]};a.syncTimeout=function(a,h,p){if(h)return setTimeout(a,h,p);a.call(0,p)};a.pick=function(){var a=arguments,h,p,x=a.length;for(h=
0;h<x;h++)if(p=a[h],void 0!==p&&null!==p)return p};a.css=function(r,h){a.isMS&&!a.svg&&h&&void 0!==h.opacity&&(h.filter="alpha(opacity\x3d"+100*h.opacity+")");a.extend(r.style,h)};a.createElement=function(r,h,p,x,t){r=E.createElement(r);var q=a.css;h&&a.extend(r,h);t&&q(r,{padding:0,border:"none",margin:0});p&&q(r,p);x&&x.appendChild(r);return r};a.extendClass=function(r,h){var p=function(){};p.prototype=new r;a.extend(p.prototype,h);return p};a.pad=function(a,h,p){return Array((h||2)+1-String(a).length).join(p||
0)+a};a.relativeLength=function(a,h,p){return/%$/.test(a)?h*parseFloat(a)/100+(p||0):parseFloat(a)};a.wrap=function(a,h,p){var x=a[h];a[h]=function(){var a=Array.prototype.slice.call(arguments),q=arguments,z=this;z.proceed=function(){x.apply(z,arguments.length?arguments:q)};a.unshift(x);a=p.apply(this,a);z.proceed=null;return a}};a.getTZOffset=function(r){var h=a.Date;return 6E4*(h.hcGetTimezoneOffset&&h.hcGetTimezoneOffset(r)||h.hcTimezoneOffset||0)};a.dateFormat=function(r,h,p){if(!a.defined(h)||
isNaN(h))return a.defaultOptions.lang.invalidDate||"";r=a.pick(r,"%Y-%m-%d %H:%M:%S");var x=a.Date,t=new x(h-a.getTZOffset(h)),q=t[x.hcGetHours](),z=t[x.hcGetDay](),k=t[x.hcGetDate](),m=t[x.hcGetMonth](),f=t[x.hcGetFullYear](),e=a.defaultOptions.lang,c=e.weekdays,b=e.shortWeekdays,w=a.pad,x=a.extend({a:b?b[z]:c[z].substr(0,3),A:c[z],d:w(k),e:w(k,2," "),w:z,b:e.shortMonths[m],B:e.months[m],m:w(m+1),y:f.toString().substr(2,2),Y:f,H:w(q),k:q,I:w(q%12||12),l:q%12||12,M:w(t[x.hcGetMinutes]()),p:12>q?"AM":
"PM",P:12>q?"am":"pm",S:w(t.getSeconds()),L:w(Math.round(h%1E3),3)},a.dateFormats);a.objectEach(x,function(a,b){for(;-1!==r.indexOf("%"+b);)r=r.replace("%"+b,"function"===typeof a?a(h):a)});return p?r.substr(0,1).toUpperCase()+r.substr(1):r};a.formatSingle=function(r,h){var p=/\.([0-9])/,x=a.defaultOptions.lang;/f$/.test(r)?(p=(p=r.match(p))?p[1]:-1,null!==h&&(h=a.numberFormat(h,p,x.decimalPoint,-1<r.indexOf(",")?x.thousandsSep:""))):h=a.dateFormat(r,h);return h};a.format=function(r,h){for(var p=
"{",x=!1,t,q,z,k,m=[],f;r;){p=r.indexOf(p);if(-1===p)break;t=r.slice(0,p);if(x){t=t.split(":");q=t.shift().split(".");k=q.length;f=h;for(z=0;z<k;z++)f&&(f=f[q[z]]);t.length&&(f=a.formatSingle(t.join(":"),f));m.push(f)}else m.push(t);r=r.slice(p+1);p=(x=!x)?"}":"{"}m.push(r);return m.join("")};a.getMagnitude=function(a){return Math.pow(10,Math.floor(Math.log(a)/Math.LN10))};a.normalizeTickInterval=function(r,h,p,x,t){var q,z=r;p=a.pick(p,1);q=r/p;h||(h=t?[1,1.2,1.5,2,2.5,3,4,5,6,8,10]:[1,2,2.5,5,10],
!1===x&&(1===p?h=a.grep(h,function(a){return 0===a%1}):.1>=p&&(h=[1/p])));for(x=0;x<h.length&&!(z=h[x],t&&z*p>=r||!t&&q<=(h[x]+(h[x+1]||h[x]))/2);x++);return z=a.correctFloat(z*p,-Math.round(Math.log(.001)/Math.LN10))};a.stableSort=function(a,h){var p=a.length,x,t;for(t=0;t<p;t++)a[t].safeI=t;a.sort(function(a,t){x=h(a,t);return 0===x?a.safeI-t.safeI:x});for(t=0;t<p;t++)delete a[t].safeI};a.arrayMin=function(a){for(var h=a.length,p=a[0];h--;)a[h]<p&&(p=a[h]);return p};a.arrayMax=function(a){for(var h=
a.length,p=a[0];h--;)a[h]>p&&(p=a[h]);return p};a.destroyObjectProperties=function(r,h){a.objectEach(r,function(a,x){a&&a!==h&&a.destroy&&a.destroy();delete r[x]})};a.discardElement=function(r){var h=a.garbageBin;h||(h=a.createElement("div"));r&&h.appendChild(r);h.innerHTML=""};a.correctFloat=function(a,h){return parseFloat(a.toPrecision(h||14))};a.setAnimation=function(r,h){h.renderer.globalAnimation=a.pick(r,h.options.chart.animation,!0)};a.animObject=function(r){return a.isObject(r)?a.merge(r):
{duration:r?500:0}};a.timeUnits={millisecond:1,second:1E3,minute:6E4,hour:36E5,day:864E5,week:6048E5,month:24192E5,year:314496E5};a.numberFormat=function(r,h,p,x){r=+r||0;h=+h;var t=a.defaultOptions.lang,q=(r.toString().split(".")[1]||"").split("e")[0].length,z,k,m=r.toString().split("e");-1===h?h=Math.min(q,20):a.isNumber(h)||(h=2);k=(Math.abs(m[1]?m[0]:r)+Math.pow(10,-Math.max(h,q)-1)).toFixed(h);q=String(a.pInt(k));z=3<q.length?q.length%3:0;p=a.pick(p,t.decimalPoint);x=a.pick(x,t.thousandsSep);
r=(0>r?"-":"")+(z?q.substr(0,z)+x:"");r+=q.substr(z).replace(/(\d{3})(?=\d)/g,"$1"+x);h&&(r+=p+k.slice(-h));m[1]&&(r+="e"+m[1]);return r};Math.easeInOutSine=function(a){return-.5*(Math.cos(Math.PI*a)-1)};a.getStyle=function(r,h,p){if("width"===h)return Math.min(r.offsetWidth,r.scrollWidth)-a.getStyle(r,"padding-left")-a.getStyle(r,"padding-right");if("height"===h)return Math.min(r.offsetHeight,r.scrollHeight)-a.getStyle(r,"padding-top")-a.getStyle(r,"padding-bottom");G.getComputedStyle||a.error(27,
!0);if(r=G.getComputedStyle(r,void 0))r=r.getPropertyValue(h),a.pick(p,"opacity"!==h)&&(r=a.pInt(r));return r};a.inArray=function(r,h){return(a.indexOfPolyfill||Array.prototype.indexOf).call(h,r)};a.grep=function(r,h){return(a.filterPolyfill||Array.prototype.filter).call(r,h)};a.find=Array.prototype.find?function(a,h){return a.find(h)}:function(a,h){var p,x=a.length;for(p=0;p<x;p++)if(h(a[p],p))return a[p]};a.map=function(a,h){for(var p=[],x=0,t=a.length;x<t;x++)p[x]=h.call(a[x],a[x],x,a);return p};
a.keys=function(r){return(a.keysPolyfill||Object.keys).call(void 0,r)};a.reduce=function(r,h,p){return(a.reducePolyfill||Array.prototype.reduce).call(r,h,p)};a.offset=function(a){var h=E.documentElement;a=a.parentElement?a.getBoundingClientRect():{top:0,left:0};return{top:a.top+(G.pageYOffset||h.scrollTop)-(h.clientTop||0),left:a.left+(G.pageXOffset||h.scrollLeft)-(h.clientLeft||0)}};a.stop=function(r,h){for(var p=a.timers.length;p--;)a.timers[p].elem!==r||h&&h!==a.timers[p].prop||(a.timers[p].stopped=
!0)};a.each=function(r,h,p){return(a.forEachPolyfill||Array.prototype.forEach).call(r,h,p)};a.objectEach=function(a,h,p){for(var x in a)a.hasOwnProperty(x)&&h.call(p,a[x],x,a)};a.addEvent=function(r,h,p){var x,t,q=r.addEventListener||a.addEventListenerPolyfill;r.hcEvents&&!r.hasOwnProperty("hcEvents")&&(t={},a.objectEach(r.hcEvents,function(a,k){t[k]=a.slice(0)}),r.hcEvents=t);x=r.hcEvents=r.hcEvents||{};q&&q.call(r,h,p,!1);x[h]||(x[h]=[]);x[h].push(p);return function(){a.removeEvent(r,h,p)}};a.removeEvent=
function(r,h,p){function x(k,f){var e=r.removeEventListener||a.removeEventListenerPolyfill;e&&e.call(r,k,f,!1)}function t(){var k,f;r.nodeName&&(h?(k={},k[h]=!0):k=z,a.objectEach(k,function(a,c){if(z[c])for(f=z[c].length;f--;)x(c,z[c][f])}))}var q,z=r.hcEvents,k;z&&(h?(q=z[h]||[],p?(k=a.inArray(p,q),-1<k&&(q.splice(k,1),z[h]=q),x(h,p)):(t(),z[h]=[])):(t(),r.hcEvents={}))};a.fireEvent=function(r,h,p,x){var t;t=r.hcEvents;var q,z;p=p||{};if(E.createEvent&&(r.dispatchEvent||r.fireEvent))t=E.createEvent("Events"),
t.initEvent(h,!0,!0),a.extend(t,p),r.dispatchEvent?r.dispatchEvent(t):r.fireEvent(h,t);else if(t)for(t=t[h]||[],q=t.length,p.target||a.extend(p,{preventDefault:function(){p.defaultPrevented=!0},target:r,type:h}),h=0;h<q;h++)(z=t[h])&&!1===z.call(r,p)&&p.preventDefault();x&&!p.defaultPrevented&&x(p)};a.animate=function(r,h,p){var x,t="",q,z,k;a.isObject(p)||(k=arguments,p={duration:k[2],easing:k[3],complete:k[4]});a.isNumber(p.duration)||(p.duration=400);p.easing="function"===typeof p.easing?p.easing:
Math[p.easing]||Math.easeInOutSine;p.curAnim=a.merge(h);a.objectEach(h,function(k,f){a.stop(r,f);z=new a.Fx(r,p,f);q=null;"d"===f?(z.paths=z.initPath(r,r.d,h.d),z.toD=h.d,x=0,q=1):r.attr?x=r.attr(f):(x=parseFloat(a.getStyle(r,f))||0,"opacity"!==f&&(t="px"));q||(q=k);q&&q.match&&q.match("px")&&(q=q.replace(/px/g,""));z.run(x,q,t)})};a.seriesType=function(r,h,p,x,t){var q=a.getOptions(),z=a.seriesTypes;q.plotOptions[r]=a.merge(q.plotOptions[h],p);z[r]=a.extendClass(z[h]||function(){},x);z[r].prototype.type=
r;t&&(z[r].prototype.pointClass=a.extendClass(a.Point,t));return z[r]};a.uniqueKey=function(){var a=Math.random().toString(36).substring(2,9),h=0;return function(){return"highcharts-"+a+"-"+h++}}();G.jQuery&&(G.jQuery.fn.highcharts=function(){var r=[].slice.call(arguments);if(this[0])return r[0]?(new (a[a.isString(r[0])?r.shift():"Chart"])(this[0],r[0],r[1]),this):F[a.attr(this[0],"data-highcharts-chart")]})})(L);(function(a){var F=a.each,E=a.isNumber,G=a.map,r=a.merge,h=a.pInt;a.Color=function(p){if(!(this instanceof
a.Color))return new a.Color(p);this.init(p)};a.Color.prototype={parsers:[{regex:/rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]?(?:\.[0-9]+)?)\s*\)/,parse:function(a){return[h(a[1]),h(a[2]),h(a[3]),parseFloat(a[4],10)]}},{regex:/rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/,parse:function(a){return[h(a[1]),h(a[2]),h(a[3]),1]}}],names:{none:"rgba(255,255,255,0)",white:"#ffffff",black:"#000000"},init:function(p){var h,t,q,z;if((this.input=p=this.names[p&&
p.toLowerCase?p.toLowerCase():""]||p)&&p.stops)this.stops=G(p.stops,function(k){return new a.Color(k[1])});else if(p&&p.charAt&&"#"===p.charAt()&&(h=p.length,p=parseInt(p.substr(1),16),7===h?t=[(p&16711680)>>16,(p&65280)>>8,p&255,1]:4===h&&(t=[(p&3840)>>4|(p&3840)>>8,(p&240)>>4|p&240,(p&15)<<4|p&15,1])),!t)for(q=this.parsers.length;q--&&!t;)z=this.parsers[q],(h=z.regex.exec(p))&&(t=z.parse(h));this.rgba=t||[]},get:function(a){var p=this.input,t=this.rgba,q;this.stops?(q=r(p),q.stops=[].concat(q.stops),
F(this.stops,function(t,k){q.stops[k]=[q.stops[k][0],t.get(a)]})):q=t&&E(t[0])?"rgb"===a||!a&&1===t[3]?"rgb("+t[0]+","+t[1]+","+t[2]+")":"a"===a?t[3]:"rgba("+t.join(",")+")":p;return q},brighten:function(a){var p,t=this.rgba;if(this.stops)F(this.stops,function(t){t.brighten(a)});else if(E(a)&&0!==a)for(p=0;3>p;p++)t[p]+=h(255*a),0>t[p]&&(t[p]=0),255<t[p]&&(t[p]=255);return this},setOpacity:function(a){this.rgba[3]=a;return this},tweenTo:function(a,h){var t=this.rgba,q=a.rgba;q.length&&t&&t.length?
(a=1!==q[3]||1!==t[3],h=(a?"rgba(":"rgb(")+Math.round(q[0]+(t[0]-q[0])*(1-h))+","+Math.round(q[1]+(t[1]-q[1])*(1-h))+","+Math.round(q[2]+(t[2]-q[2])*(1-h))+(a?","+(q[3]+(t[3]-q[3])*(1-h)):"")+")"):h=a.input||"none";return h}};a.color=function(h){return new a.Color(h)}})(L);(function(a){var F,E,G=a.addEvent,r=a.animate,h=a.attr,p=a.charts,x=a.color,t=a.css,q=a.createElement,z=a.defined,k=a.deg2rad,m=a.destroyObjectProperties,f=a.doc,e=a.each,c=a.extend,b=a.erase,w=a.grep,l=a.hasTouch,D=a.inArray,H=
a.isArray,C=a.isFirefox,K=a.isMS,g=a.isObject,y=a.isString,J=a.isWebKit,A=a.merge,d=a.noop,v=a.objectEach,B=a.pick,u=a.pInt,n=a.removeEvent,P=a.stop,M=a.svg,O=a.SVG_NS,N=a.symbolSizes,R=a.win;F=a.SVGElement=function(){return this};c(F.prototype,{opacity:1,SVG_NS:O,textProps:"direction fontSize fontWeight fontFamily fontStyle color lineHeight width textAlign textDecoration textOverflow textOutline".split(" "),init:function(a,d){this.element="span"===d?q(d):f.createElementNS(this.SVG_NS,d);this.renderer=
a},animate:function(I,d,u){d=a.animObject(B(d,this.renderer.globalAnimation,!0));0!==d.duration?(u&&(d.complete=u),r(this,I,d)):(this.attr(I,null,u),d.step&&d.step.call(this));return this},colorGradient:function(I,d,u){var n=this.renderer,b,c,g,l,w,M,S,f,D,y,B=[],k;I.radialGradient?c="radialGradient":I.linearGradient&&(c="linearGradient");c&&(g=I[c],w=n.gradients,S=I.stops,y=u.radialReference,H(g)&&(I[c]=g={x1:g[0],y1:g[1],x2:g[2],y2:g[3],gradientUnits:"userSpaceOnUse"}),"radialGradient"===c&&y&&
!z(g.gradientUnits)&&(l=g,g=A(g,n.getRadialAttr(y,l),{gradientUnits:"userSpaceOnUse"})),v(g,function(a,I){"id"!==I&&B.push(I,a)}),v(S,function(a){B.push(a)}),B=B.join(","),w[B]?y=w[B].attr("id"):(g.id=y=a.uniqueKey(),w[B]=M=n.createElement(c).attr(g).add(n.defs),M.radAttr=l,M.stops=[],e(S,function(I){0===I[1].indexOf("rgba")?(b=a.color(I[1]),f=b.get("rgb"),D=b.get("a")):(f=I[1],D=1);I=n.createElement("stop").attr({offset:I[0],"stop-color":f,"stop-opacity":D}).add(M);M.stops.push(I)})),k="url("+n.url+
"#"+y+")",u.setAttribute(d,k),u.gradient=B,I.toString=function(){return k})},applyTextOutline:function(I){var d=this.element,u,n,c,g,v;-1!==I.indexOf("contrast")&&(I=I.replace(/contrast/g,this.renderer.getContrast(d.style.fill)));I=I.split(" ");n=I[I.length-1];if((c=I[0])&&"none"!==c&&a.svg){this.fakeTS=!0;I=[].slice.call(d.getElementsByTagName("tspan"));this.ySetter=this.xSetter;c=c.replace(/(^[\d\.]+)(.*?)$/g,function(a,I,d){return 2*I+d});for(v=I.length;v--;)u=I[v],"highcharts-text-outline"===
u.getAttribute("class")&&b(I,d.removeChild(u));g=d.firstChild;e(I,function(a,I){0===I&&(a.setAttribute("x",d.getAttribute("x")),I=d.getAttribute("y"),a.setAttribute("y",I||0),null===I&&d.setAttribute("y",0));a=a.cloneNode(1);h(a,{"class":"highcharts-text-outline",fill:n,stroke:n,"stroke-width":c,"stroke-linejoin":"round"});d.insertBefore(a,g)})}},attr:function(a,d,u,n){var I,b=this.element,c,g=this,e,l;"string"===typeof a&&void 0!==d&&(I=a,a={},a[I]=d);"string"===typeof a?g=(this[a+"Getter"]||this._defaultGetter).call(this,
a,b):(v(a,function(I,d){e=!1;n||P(this,d);this.symbolName&&/^(x|y|width|height|r|start|end|innerR|anchorX|anchorY)$/.test(d)&&(c||(this.symbolAttr(a),c=!0),e=!0);!this.rotation||"x"!==d&&"y"!==d||(this.doTransform=!0);e||(l=this[d+"Setter"]||this._defaultSetter,l.call(this,I,d,b),this.shadows&&/^(width|height|visibility|x|y|d|transform|cx|cy|r)$/.test(d)&&this.updateShadows(d,I,l))},this),this.afterSetters());u&&u();return g},afterSetters:function(){this.doTransform&&(this.updateTransform(),this.doTransform=
!1)},updateShadows:function(a,d,u){for(var I=this.shadows,n=I.length;n--;)u.call(I[n],"height"===a?Math.max(d-(I[n].cutHeight||0),0):"d"===a?this.d:d,a,I[n])},addClass:function(a,d){var I=this.attr("class")||"";-1===I.indexOf(a)&&(d||(a=(I+(I?" ":"")+a).replace("  "," ")),this.attr("class",a));return this},hasClass:function(a){return-1!==D(a,(this.attr("class")||"").split(" "))},removeClass:function(a){return this.attr("class",(this.attr("class")||"").replace(a,""))},symbolAttr:function(a){var d=
this;e("x y r start end width height innerR anchorX anchorY".split(" "),function(I){d[I]=B(a[I],d[I])});d.attr({d:d.renderer.symbols[d.symbolName](d.x,d.y,d.width,d.height,d)})},clip:function(a){return this.attr("clip-path",a?"url("+this.renderer.url+"#"+a.id+")":"none")},crisp:function(a,d){var I=this,u={},n;d=d||a.strokeWidth||0;n=Math.round(d)%2/2;a.x=Math.floor(a.x||I.x||0)+n;a.y=Math.floor(a.y||I.y||0)+n;a.width=Math.floor((a.width||I.width||0)-2*n);a.height=Math.floor((a.height||I.height||0)-
2*n);z(a.strokeWidth)&&(a.strokeWidth=d);v(a,function(a,d){I[d]!==a&&(I[d]=u[d]=a)});return u},css:function(a){var d=this.styles,n={},I=this.element,b,g="",e,l=!d,A=["textOutline","textOverflow","width"];a&&a.color&&(a.fill=a.color);d&&v(a,function(a,u){a!==d[u]&&(n[u]=a,l=!0)});l&&(d&&(a=c(d,n)),b=this.textWidth=a&&a.width&&"auto"!==a.width&&"text"===I.nodeName.toLowerCase()&&u(a.width),this.styles=a,b&&!M&&this.renderer.forExport&&delete a.width,K&&!M?t(this.element,a):(e=function(a,d){return"-"+
d.toLowerCase()},v(a,function(a,d){-1===D(d,A)&&(g+=d.replace(/([A-Z])/g,e)+":"+a+";")}),g&&h(I,"style",g)),this.added&&("text"===this.element.nodeName&&this.renderer.buildText(this),a&&a.textOutline&&this.applyTextOutline(a.textOutline)));return this},strokeWidth:function(){return this["stroke-width"]||0},on:function(a,d){var u=this,n=u.element;l&&"click"===a?(n.ontouchstart=function(a){u.touchEventFired=Date.now();a.preventDefault();d.call(n,a)},n.onclick=function(a){(-1===R.navigator.userAgent.indexOf("Android")||
1100<Date.now()-(u.touchEventFired||0))&&d.call(n,a)}):n["on"+a]=d;return this},setRadialReference:function(a){var d=this.renderer.gradients[this.element.gradient];this.element.radialReference=a;d&&d.radAttr&&d.animate(this.renderer.getRadialAttr(a,d.radAttr));return this},translate:function(a,d){return this.attr({translateX:a,translateY:d})},invert:function(a){this.inverted=a;this.updateTransform();return this},updateTransform:function(){var a=this.translateX||0,d=this.translateY||0,u=this.scaleX,
n=this.scaleY,b=this.inverted,c=this.rotation,g=this.matrix,v=this.element;b&&(a+=this.width,d+=this.height);a=["translate("+a+","+d+")"];z(g)&&a.push("matrix("+g.join(",")+")");b?a.push("rotate(90) scale(-1,1)"):c&&a.push("rotate("+c+" "+B(this.rotationOriginX,v.getAttribute("x"),0)+" "+B(this.rotationOriginY,v.getAttribute("y")||0)+")");(z(u)||z(n))&&a.push("scale("+B(u,1)+" "+B(n,1)+")");a.length&&v.setAttribute("transform",a.join(" "))},toFront:function(){var a=this.element;a.parentNode.appendChild(a);
return this},align:function(a,d,u){var n,I,c,g,v={};I=this.renderer;c=I.alignedObjects;var e,l;if(a){if(this.alignOptions=a,this.alignByTranslate=d,!u||y(u))this.alignTo=n=u||"renderer",b(c,this),c.push(this),u=null}else a=this.alignOptions,d=this.alignByTranslate,n=this.alignTo;u=B(u,I[n],I);n=a.align;I=a.verticalAlign;c=(u.x||0)+(a.x||0);g=(u.y||0)+(a.y||0);"right"===n?e=1:"center"===n&&(e=2);e&&(c+=(u.width-(a.width||0))/e);v[d?"translateX":"x"]=Math.round(c);"bottom"===I?l=1:"middle"===I&&(l=
2);l&&(g+=(u.height-(a.height||0))/l);v[d?"translateY":"y"]=Math.round(g);this[this.placed?"animate":"attr"](v);this.placed=!0;this.alignAttr=v;return this},getBBox:function(a,d){var u,n=this.renderer,b,I=this.element,g=this.styles,v,l=this.textStr,A,w=n.cache,M=n.cacheKeys,f;d=B(d,this.rotation);b=d*k;v=g&&g.fontSize;z(l)&&(f=l.toString(),-1===f.indexOf("\x3c")&&(f=f.replace(/[0-9]/g,"0")),f+=["",d||0,v,g&&g.width,g&&g.textOverflow].join());f&&!a&&(u=w[f]);if(!u){if(I.namespaceURI===this.SVG_NS||
n.forExport){try{(A=this.fakeTS&&function(a){e(I.querySelectorAll(".highcharts-text-outline"),function(d){d.style.display=a})})&&A("none"),u=I.getBBox?c({},I.getBBox()):{width:I.offsetWidth,height:I.offsetHeight},A&&A("")}catch(T){}if(!u||0>u.width)u={width:0,height:0}}else u=this.htmlGetBBox();n.isSVG&&(a=u.width,n=u.height,g&&"11px"===g.fontSize&&17===Math.round(n)&&(u.height=n=14),d&&(u.width=Math.abs(n*Math.sin(b))+Math.abs(a*Math.cos(b)),u.height=Math.abs(n*Math.cos(b))+Math.abs(a*Math.sin(b))));
if(f&&0<u.height){for(;250<M.length;)delete w[M.shift()];w[f]||M.push(f);w[f]=u}}return u},show:function(a){return this.attr({visibility:a?"inherit":"visible"})},hide:function(){return this.attr({visibility:"hidden"})},fadeOut:function(a){var d=this;d.animate({opacity:0},{duration:a||150,complete:function(){d.attr({y:-9999})}})},add:function(a){var d=this.renderer,u=this.element,n;a&&(this.parentGroup=a);this.parentInverted=a&&a.inverted;void 0!==this.textStr&&d.buildText(this);this.added=!0;if(!a||
a.handleZ||this.zIndex)n=this.zIndexSetter();n||(a?a.element:d.box).appendChild(u);if(this.onAdd)this.onAdd();return this},safeRemoveChild:function(a){var d=a.parentNode;d&&d.removeChild(a)},destroy:function(){var a=this,d=a.element||{},u=a.renderer.isSVG&&"SPAN"===d.nodeName&&a.parentGroup,n=d.ownerSVGElement;d.onclick=d.onmouseout=d.onmouseover=d.onmousemove=d.point=null;P(a);a.clipPath&&n&&(e(n.querySelectorAll("[clip-path],[CLIP-PATH]"),function(d){d.getAttribute("clip-path").match(RegExp('[("]#'+
a.clipPath.element.id+'[)"]'))&&d.removeAttribute("clip-path")}),a.clipPath=a.clipPath.destroy());if(a.stops){for(n=0;n<a.stops.length;n++)a.stops[n]=a.stops[n].destroy();a.stops=null}a.safeRemoveChild(d);for(a.destroyShadows();u&&u.div&&0===u.div.childNodes.length;)d=u.parentGroup,a.safeRemoveChild(u.div),delete u.div,u=d;a.alignTo&&b(a.renderer.alignedObjects,a);v(a,function(d,u){delete a[u]});return null},shadow:function(a,d,u){var n=[],b,c,g=this.element,v,I,e,l;if(!a)this.destroyShadows();else if(!this.shadows){I=
B(a.width,3);e=(a.opacity||.15)/I;l=this.parentInverted?"(-1,-1)":"("+B(a.offsetX,1)+", "+B(a.offsetY,1)+")";for(b=1;b<=I;b++)c=g.cloneNode(0),v=2*I+1-2*b,h(c,{isShadow:"true",stroke:a.color||"#000000","stroke-opacity":e*b,"stroke-width":v,transform:"translate"+l,fill:"none"}),u&&(h(c,"height",Math.max(h(c,"height")-v,0)),c.cutHeight=v),d?d.element.appendChild(c):g.parentNode&&g.parentNode.insertBefore(c,g),n.push(c);this.shadows=n}return this},destroyShadows:function(){e(this.shadows||[],function(a){this.safeRemoveChild(a)},
this);this.shadows=void 0},xGetter:function(a){"circle"===this.element.nodeName&&("x"===a?a="cx":"y"===a&&(a="cy"));return this._defaultGetter(a)},_defaultGetter:function(a){a=B(this[a],this.element?this.element.getAttribute(a):null,0);/^[\-0-9\.]+$/.test(a)&&(a=parseFloat(a));return a},dSetter:function(a,d,u){a&&a.join&&(a=a.join(" "));/(NaN| {2}|^$)/.test(a)&&(a="M 0 0");this[d]!==a&&(u.setAttribute(d,a),this[d]=a)},dashstyleSetter:function(a){var d,n=this["stroke-width"];"inherit"===n&&(n=1);if(a=
a&&a.toLowerCase()){a=a.replace("shortdashdotdot","3,1,1,1,1,1,").replace("shortdashdot","3,1,1,1").replace("shortdot","1,1,").replace("shortdash","3,1,").replace("longdash","8,3,").replace(/dot/g,"1,3,").replace("dash","4,3,").replace(/,$/,"").split(",");for(d=a.length;d--;)a[d]=u(a[d])*n;a=a.join(",").replace(/NaN/g,"none");this.element.setAttribute("stroke-dasharray",a)}},alignSetter:function(a){this.element.setAttribute("text-anchor",{left:"start",center:"middle",right:"end"}[a])},opacitySetter:function(a,
d,u){this[d]=a;u.setAttribute(d,a)},titleSetter:function(a){var d=this.element.getElementsByTagName("title")[0];d||(d=f.createElementNS(this.SVG_NS,"title"),this.element.appendChild(d));d.firstChild&&d.removeChild(d.firstChild);d.appendChild(f.createTextNode(String(B(a),"").replace(/<[^>]*>/g,"")))},textSetter:function(a){a!==this.textStr&&(delete this.bBox,this.textStr=a,this.added&&this.renderer.buildText(this))},fillSetter:function(a,d,u){"string"===typeof a?u.setAttribute(d,a):a&&this.colorGradient(a,
d,u)},visibilitySetter:function(a,d,u){"inherit"===a?u.removeAttribute(d):this[d]!==a&&u.setAttribute(d,a);this[d]=a},zIndexSetter:function(a,d){var n=this.renderer,b=this.parentGroup,c=(b||n).element||n.box,g,v=this.element,e,l,n=c===n.box;g=this.added;var A;z(a)&&(v.zIndex=a,a=+a,this[d]===a&&(g=!1),this[d]=a);if(g){(a=this.zIndex)&&b&&(b.handleZ=!0);d=c.childNodes;for(A=d.length-1;0<=A&&!e;A--)if(b=d[A],g=b.zIndex,l=!z(g),b!==v)if(0>a&&l&&!n&&!A)c.insertBefore(v,d[A]),e=!0;else if(u(g)<=a||l&&
(!z(a)||0<=a))c.insertBefore(v,d[A+1]||null),e=!0;e||(c.insertBefore(v,d[n?3:0]||null),e=!0)}return e},_defaultSetter:function(a,d,u){u.setAttribute(d,a)}});F.prototype.yGetter=F.prototype.xGetter;F.prototype.translateXSetter=F.prototype.translateYSetter=F.prototype.rotationSetter=F.prototype.verticalAlignSetter=F.prototype.rotationOriginXSetter=F.prototype.rotationOriginYSetter=F.prototype.scaleXSetter=F.prototype.scaleYSetter=F.prototype.matrixSetter=function(a,d){this[d]=a;this.doTransform=!0};
F.prototype["stroke-widthSetter"]=F.prototype.strokeSetter=function(a,d,u){this[d]=a;this.stroke&&this["stroke-width"]?(F.prototype.fillSetter.call(this,this.stroke,"stroke",u),u.setAttribute("stroke-width",this["stroke-width"]),this.hasStroke=!0):"stroke-width"===d&&0===a&&this.hasStroke&&(u.removeAttribute("stroke"),this.hasStroke=!1)};E=a.SVGRenderer=function(){this.init.apply(this,arguments)};c(E.prototype,{Element:F,SVG_NS:O,init:function(a,d,u,n,b,c){var g;n=this.createElement("svg").attr({version:"1.1",
"class":"highcharts-root"}).css(this.getStyle(n));g=n.element;a.appendChild(g);h(a,"dir","ltr");-1===a.innerHTML.indexOf("xmlns")&&h(g,"xmlns",this.SVG_NS);this.isSVG=!0;this.box=g;this.boxWrapper=n;this.alignedObjects=[];this.url=(C||J)&&f.getElementsByTagName("base").length?R.location.href.replace(/#.*?$/,"").replace(/<[^>]*>/g,"").replace(/([\('\)])/g,"\\$1").replace(/ /g,"%20"):"";this.createElement("desc").add().element.appendChild(f.createTextNode("Created with Highstock 6.0.3"));this.defs=
this.createElement("defs").add();this.allowHTML=c;this.forExport=b;this.gradients={};this.cache={};this.cacheKeys=[];this.imgCount=0;this.setSize(d,u,!1);var v;C&&a.getBoundingClientRect&&(d=function(){t(a,{left:0,top:0});v=a.getBoundingClientRect();t(a,{left:Math.ceil(v.left)-v.left+"px",top:Math.ceil(v.top)-v.top+"px"})},d(),this.unSubPixelFix=G(R,"resize",d))},getStyle:function(a){return this.style=c({fontFamily:'"Lucida Grande", "Lucida Sans Unicode", Arial, Helvetica, sans-serif',fontSize:"12px"},
a)},setStyle:function(a){this.boxWrapper.css(this.getStyle(a))},isHidden:function(){return!this.boxWrapper.getBBox().width},destroy:function(){var a=this.defs;this.box=null;this.boxWrapper=this.boxWrapper.destroy();m(this.gradients||{});this.gradients=null;a&&(this.defs=a.destroy());this.unSubPixelFix&&this.unSubPixelFix();return this.alignedObjects=null},createElement:function(a){var d=new this.Element;d.init(this,a);return d},draw:d,getRadialAttr:function(a,d){return{cx:a[0]-a[2]/2+d.cx*a[2],cy:a[1]-
a[2]/2+d.cy*a[2],r:d.r*a[2]}},getSpanWidth:function(a,d){var u=a.getBBox(!0).width;!M&&this.forExport&&(u=this.measureSpanWidth(d.firstChild.data,a.styles));return u},applyEllipsis:function(a,d,u,n){var b=a.rotation,c=u,g,v=0,e=u.length,l=function(a){d.removeChild(d.firstChild);a&&d.appendChild(f.createTextNode(a))},A;a.rotation=0;c=this.getSpanWidth(a,d);if(A=c>n){for(;v<=e;)g=Math.ceil((v+e)/2),c=u.substring(0,g)+"\u2026",l(c),c=this.getSpanWidth(a,d),v===e?v=e+1:c>n?e=g-1:v=g;0===e&&l("")}a.rotation=
b;return A},escapes:{"\x26":"\x26amp;","\x3c":"\x26lt;","\x3e":"\x26gt;","'":"\x26#39;",'"':"\x26quot"},buildText:function(a){var d=a.element,n=this,b=n.forExport,c=B(a.textStr,"").toString(),g=-1!==c.indexOf("\x3c"),l=d.childNodes,A,I,y,D,k=h(d,"x"),m=a.styles,C=a.textWidth,N=m&&m.lineHeight,P=m&&m.textOutline,H=m&&"ellipsis"===m.textOverflow,J=m&&"nowrap"===m.whiteSpace,q=m&&m.fontSize,R,p,z=l.length,m=C&&!a.added&&this.box,K=function(a){var b;b=/(px|em)$/.test(a&&a.style.fontSize)?a.style.fontSize:
q||n.style.fontSize||12;return N?u(N):n.fontMetrics(b,a.getAttribute("style")?a:d).h},x=function(a){v(n.escapes,function(d,u){a=a.replace(new RegExp(d,"g"),u)});return a};R=[c,H,J,N,P,q,C].join();if(R!==a.textCache){for(a.textCache=R;z--;)d.removeChild(l[z]);g||P||H||C||-1!==c.indexOf(" ")?(A=/<.*class="([^"]+)".*>/,I=/<.*style="([^"]+)".*>/,y=/<.*href="([^"]+)".*>/,m&&m.appendChild(d),c=g?c.replace(/<(b|strong)>/g,'\x3cspan style\x3d"font-weight:bold"\x3e').replace(/<(i|em)>/g,'\x3cspan style\x3d"font-style:italic"\x3e').replace(/<a/g,
"\x3cspan").replace(/<\/(b|strong|i|em|a)>/g,"\x3c/span\x3e").split(/<br.*?>/g):[c],c=w(c,function(a){return""!==a}),e(c,function(u,c){var g,v=0;u=u.replace(/^\s+|\s+$/g,"").replace(/<span/g,"|||\x3cspan").replace(/<\/span>/g,"\x3c/span\x3e|||");g=u.split("|||");e(g,function(u){if(""!==u||1===g.length){var e={},l=f.createElementNS(n.SVG_NS,"tspan"),w,B;A.test(u)&&(w=u.match(A)[1],h(l,"class",w));I.test(u)&&(B=u.match(I)[1].replace(/(;| |^)color([ :])/,"$1fill$2"),h(l,"style",B));y.test(u)&&!b&&(h(l,
"onclick",'location.href\x3d"'+u.match(y)[1]+'"'),h(l,"class","highcharts-anchor"),t(l,{cursor:"pointer"}));u=x(u.replace(/<[a-zA-Z\/](.|\n)*?>/g,"")||" ");if(" "!==u){l.appendChild(f.createTextNode(u));v?e.dx=0:c&&null!==k&&(e.x=k);h(l,e);d.appendChild(l);!v&&p&&(!M&&b&&t(l,{display:"block"}),h(l,"dy",K(l)));if(C){e=u.replace(/([^\^])-/g,"$1- ").split(" ");w=1<g.length||c||1<e.length&&!J;var m=[],N,P=K(l),S=a.rotation;for(H&&(D=n.applyEllipsis(a,l,u,C));!H&&w&&(e.length||m.length);)a.rotation=0,
N=n.getSpanWidth(a,l),u=N>C,void 0===D&&(D=u),u&&1!==e.length?(l.removeChild(l.firstChild),m.unshift(e.pop())):(e=m,m=[],e.length&&!J&&(l=f.createElementNS(O,"tspan"),h(l,{dy:P,x:k}),B&&h(l,"style",B),d.appendChild(l)),N>C&&(C=N)),e.length&&l.appendChild(f.createTextNode(e.join(" ").replace(/- /g,"-")));a.rotation=S}v++}}});p=p||d.childNodes.length}),D&&a.attr("title",a.textStr),m&&m.removeChild(d),P&&a.applyTextOutline&&a.applyTextOutline(P)):d.appendChild(f.createTextNode(x(c)))}},getContrast:function(a){a=
x(a).rgba;return 510<a[0]+a[1]+a[2]?"#000000":"#FFFFFF"},button:function(a,d,u,n,b,g,v,e,l){var w=this.label(a,d,u,l,null,null,null,null,"button"),M=0;w.attr(A({padding:8,r:2},b));var f,I,B,D;b=A({fill:"#f7f7f7",stroke:"#cccccc","stroke-width":1,style:{color:"#333333",cursor:"pointer",fontWeight:"normal"}},b);f=b.style;delete b.style;g=A(b,{fill:"#e6e6e6"},g);I=g.style;delete g.style;v=A(b,{fill:"#e6ebf5",style:{color:"#000000",fontWeight:"bold"}},v);B=v.style;delete v.style;e=A(b,{style:{color:"#cccccc"}},
e);D=e.style;delete e.style;G(w.element,K?"mouseover":"mouseenter",function(){3!==M&&w.setState(1)});G(w.element,K?"mouseout":"mouseleave",function(){3!==M&&w.setState(M)});w.setState=function(a){1!==a&&(w.state=M=a);w.removeClass(/highcharts-button-(normal|hover|pressed|disabled)/).addClass("highcharts-button-"+["normal","hover","pressed","disabled"][a||0]);w.attr([b,g,v,e][a||0]).css([f,I,B,D][a||0])};w.attr(b).css(c({cursor:"default"},f));return w.on("click",function(a){3!==M&&n.call(w,a)})},crispLine:function(a,
d){a[1]===a[4]&&(a[1]=a[4]=Math.round(a[1])-d%2/2);a[2]===a[5]&&(a[2]=a[5]=Math.round(a[2])+d%2/2);return a},path:function(a){var d={fill:"none"};H(a)?d.d=a:g(a)&&c(d,a);return this.createElement("path").attr(d)},circle:function(a,d,u){a=g(a)?a:{x:a,y:d,r:u};d=this.createElement("circle");d.xSetter=d.ySetter=function(a,d,u){u.setAttribute("c"+d,a)};return d.attr(a)},arc:function(a,d,u,n,b,c){g(a)?(n=a,d=n.y,u=n.r,a=n.x):n={innerR:n,start:b,end:c};a=this.symbol("arc",a,d,u,u,n);a.r=u;return a},rect:function(a,
d,u,n,b,c){b=g(a)?a.r:b;var v=this.createElement("rect");a=g(a)?a:void 0===a?{}:{x:a,y:d,width:Math.max(u,0),height:Math.max(n,0)};void 0!==c&&(a.strokeWidth=c,a=v.crisp(a));a.fill="none";b&&(a.r=b);v.rSetter=function(a,d,u){h(u,{rx:a,ry:a})};return v.attr(a)},setSize:function(a,d,u){var n=this.alignedObjects,b=n.length;this.width=a;this.height=d;for(this.boxWrapper.animate({width:a,height:d},{step:function(){this.attr({viewBox:"0 0 "+this.attr("width")+" "+this.attr("height")})},duration:B(u,!0)?
void 0:0});b--;)n[b].align()},g:function(a){var d=this.createElement("g");return a?d.attr({"class":"highcharts-"+a}):d},image:function(a,d,u,n,b){var g={preserveAspectRatio:"none"};1<arguments.length&&c(g,{x:d,y:u,width:n,height:b});g=this.createElement("image").attr(g);g.element.setAttributeNS?g.element.setAttributeNS("http://www.w3.org/1999/xlink","href",a):g.element.setAttribute("hc-svg-href",a);return g},symbol:function(a,d,u,n,b,g){var v=this,l,A=/^url\((.*?)\)$/,w=A.test(a),M=!w&&(this.symbols[a]?
a:"circle"),D=M&&this.symbols[M],y=z(d)&&D&&D.call(this.symbols,Math.round(d),Math.round(u),n,b,g),k,m;D?(l=this.path(y),l.attr("fill","none"),c(l,{symbolName:M,x:d,y:u,width:n,height:b}),g&&c(l,g)):w&&(k=a.match(A)[1],l=this.image(k),l.imgwidth=B(N[k]&&N[k].width,g&&g.width),l.imgheight=B(N[k]&&N[k].height,g&&g.height),m=function(){l.attr({width:l.width,height:l.height})},e(["width","height"],function(a){l[a+"Setter"]=function(a,d){var u={},n=this["img"+d],b="width"===d?"translateX":"translateY";
this[d]=a;z(n)&&(this.element&&this.element.setAttribute(d,n),this.alignByTranslate||(u[b]=((this[d]||0)-n)/2,this.attr(u)))}}),z(d)&&l.attr({x:d,y:u}),l.isImg=!0,z(l.imgwidth)&&z(l.imgheight)?m():(l.attr({width:0,height:0}),q("img",{onload:function(){var a=p[v.chartIndex];0===this.width&&(t(this,{position:"absolute",top:"-999em"}),f.body.appendChild(this));N[k]={width:this.width,height:this.height};l.imgwidth=this.width;l.imgheight=this.height;l.element&&m();this.parentNode&&this.parentNode.removeChild(this);
v.imgCount--;if(!v.imgCount&&a&&a.onload)a.onload()},src:k}),this.imgCount++));return l},symbols:{circle:function(a,d,u,n){return this.arc(a+u/2,d+n/2,u/2,n/2,{start:0,end:2*Math.PI,open:!1})},square:function(a,d,u,n){return["M",a,d,"L",a+u,d,a+u,d+n,a,d+n,"Z"]},triangle:function(a,d,u,n){return["M",a+u/2,d,"L",a+u,d+n,a,d+n,"Z"]},"triangle-down":function(a,d,u,n){return["M",a,d,"L",a+u,d,a+u/2,d+n,"Z"]},diamond:function(a,d,u,n){return["M",a+u/2,d,"L",a+u,d+n/2,a+u/2,d+n,a,d+n/2,"Z"]},arc:function(a,
d,u,n,b){var g=b.start,c=b.r||u,v=b.r||n||u,l=b.end-.001;u=b.innerR;n=B(b.open,.001>Math.abs(b.end-b.start-2*Math.PI));var e=Math.cos(g),A=Math.sin(g),w=Math.cos(l),l=Math.sin(l);b=.001>b.end-g-Math.PI?0:1;c=["M",a+c*e,d+v*A,"A",c,v,0,b,1,a+c*w,d+v*l];z(u)&&c.push(n?"M":"L",a+u*w,d+u*l,"A",u,u,0,b,0,a+u*e,d+u*A);c.push(n?"":"Z");return c},callout:function(a,d,u,n,b){var g=Math.min(b&&b.r||0,u,n),c=g+6,v=b&&b.anchorX;b=b&&b.anchorY;var l;l=["M",a+g,d,"L",a+u-g,d,"C",a+u,d,a+u,d,a+u,d+g,"L",a+u,d+n-
g,"C",a+u,d+n,a+u,d+n,a+u-g,d+n,"L",a+g,d+n,"C",a,d+n,a,d+n,a,d+n-g,"L",a,d+g,"C",a,d,a,d,a+g,d];v&&v>u?b>d+c&&b<d+n-c?l.splice(13,3,"L",a+u,b-6,a+u+6,b,a+u,b+6,a+u,d+n-g):l.splice(13,3,"L",a+u,n/2,v,b,a+u,n/2,a+u,d+n-g):v&&0>v?b>d+c&&b<d+n-c?l.splice(33,3,"L",a,b+6,a-6,b,a,b-6,a,d+g):l.splice(33,3,"L",a,n/2,v,b,a,n/2,a,d+g):b&&b>n&&v>a+c&&v<a+u-c?l.splice(23,3,"L",v+6,d+n,v,d+n+6,v-6,d+n,a+g,d+n):b&&0>b&&v>a+c&&v<a+u-c&&l.splice(3,3,"L",v-6,d,v,d-6,v+6,d,u-g,d);return l}},clipRect:function(d,u,n,
b){var g=a.uniqueKey(),c=this.createElement("clipPath").attr({id:g}).add(this.defs);d=this.rect(d,u,n,b,0).add(c);d.id=g;d.clipPath=c;d.count=0;return d},text:function(a,d,u,n){var b={};if(n&&(this.allowHTML||!this.forExport))return this.html(a,d,u);b.x=Math.round(d||0);u&&(b.y=Math.round(u));if(a||0===a)b.text=a;a=this.createElement("text").attr(b);n||(a.xSetter=function(a,d,u){var n=u.getElementsByTagName("tspan"),b,g=u.getAttribute(d),c;for(c=0;c<n.length;c++)b=n[c],b.getAttribute(d)===g&&b.setAttribute(d,
a);u.setAttribute(d,a)});return a},fontMetrics:function(a,d){a=a||d&&d.style&&d.style.fontSize||this.style&&this.style.fontSize;a=/px/.test(a)?u(a):/em/.test(a)?parseFloat(a)*(d?this.fontMetrics(null,d.parentNode).f:16):12;d=24>a?a+3:Math.round(1.2*a);return{h:d,b:Math.round(.8*d),f:a}},rotCorr:function(a,d,u){var n=a;d&&u&&(n=Math.max(n*Math.cos(d*k),4));return{x:-a/3*Math.sin(d*k),y:n}},label:function(d,u,b,g,v,l,w,M,f){var D=this,B=D.g("button"!==f&&"label"),k=B.text=D.text("",0,0,w).attr({zIndex:1}),
y,m,C=0,N=3,P=0,H,t,I,J,O,q={},R,h,p=/^url\((.*?)\)$/.test(g),K=p,x,S,r,W;f&&B.addClass("highcharts-"+f);K=p;x=function(){return(R||0)%2/2};S=function(){var a=k.element.style,d={};m=(void 0===H||void 0===t||O)&&z(k.textStr)&&k.getBBox();B.width=(H||m.width||0)+2*N+P;B.height=(t||m.height||0)+2*N;h=N+D.fontMetrics(a&&a.fontSize,k).b;K&&(y||(B.box=y=D.symbols[g]||p?D.symbol(g):D.rect(),y.addClass(("button"===f?"":"highcharts-label-box")+(f?" highcharts-"+f+"-box":"")),y.add(B),a=x(),d.x=a,d.y=(M?-h:
0)+a),d.width=Math.round(B.width),d.height=Math.round(B.height),y.attr(c(d,q)),q={})};r=function(){var a=P+N,d;d=M?0:h;z(H)&&m&&("center"===O||"right"===O)&&(a+={center:.5,right:1}[O]*(H-m.width));if(a!==k.x||d!==k.y)k.attr("x",a),void 0!==d&&k.attr("y",d);k.x=a;k.y=d};W=function(a,d){y?y.attr(a,d):q[a]=d};B.onAdd=function(){k.add(B);B.attr({text:d||0===d?d:"",x:u,y:b});y&&z(v)&&B.attr({anchorX:v,anchorY:l})};B.widthSetter=function(d){H=a.isNumber(d)?d:null};B.heightSetter=function(a){t=a};B["text-alignSetter"]=
function(a){O=a};B.paddingSetter=function(a){z(a)&&a!==N&&(N=B.padding=a,r())};B.paddingLeftSetter=function(a){z(a)&&a!==P&&(P=a,r())};B.alignSetter=function(a){a={left:0,center:.5,right:1}[a];a!==C&&(C=a,m&&B.attr({x:I}))};B.textSetter=function(a){void 0!==a&&k.textSetter(a);S();r()};B["stroke-widthSetter"]=function(a,d){a&&(K=!0);R=this["stroke-width"]=a;W(d,a)};B.strokeSetter=B.fillSetter=B.rSetter=function(a,d){"r"!==d&&("fill"===d&&a&&(K=!0),B[d]=a);W(d,a)};B.anchorXSetter=function(a,d){v=B.anchorX=
a;W(d,Math.round(a)-x()-I)};B.anchorYSetter=function(a,d){l=B.anchorY=a;W(d,a-J)};B.xSetter=function(a){B.x=a;C&&(a-=C*((H||m.width)+2*N));I=Math.round(a);B.attr("translateX",I)};B.ySetter=function(a){J=B.y=Math.round(a);B.attr("translateY",J)};var aa=B.css;return c(B,{css:function(a){if(a){var d={};a=A(a);e(B.textProps,function(u){void 0!==a[u]&&(d[u]=a[u],delete a[u])});k.css(d)}return aa.call(B,a)},getBBox:function(){return{width:m.width+2*N,height:m.height+2*N,x:m.x-N,y:m.y-N}},shadow:function(a){a&&
(S(),y&&y.shadow(a));return B},destroy:function(){n(B.element,"mouseenter");n(B.element,"mouseleave");k&&(k=k.destroy());y&&(y=y.destroy());F.prototype.destroy.call(B);B=D=S=r=W=null}})}});a.Renderer=E})(L);(function(a){var F=a.attr,E=a.createElement,G=a.css,r=a.defined,h=a.each,p=a.extend,x=a.isFirefox,t=a.isMS,q=a.isWebKit,z=a.pick,k=a.pInt,m=a.SVGRenderer,f=a.win,e=a.wrap;p(a.SVGElement.prototype,{htmlCss:function(a){var b=this.element;if(b=a&&"SPAN"===b.tagName&&a.width)delete a.width,this.textWidth=
b,this.updateTransform();a&&"ellipsis"===a.textOverflow&&(a.whiteSpace="nowrap",a.overflow="hidden");this.styles=p(this.styles,a);G(this.element,a);return this},htmlGetBBox:function(){var a=this.element;return{x:a.offsetLeft,y:a.offsetTop,width:a.offsetWidth,height:a.offsetHeight}},htmlUpdateTransform:function(){if(this.added){var a=this.renderer,b=this.element,e=this.translateX||0,l=this.translateY||0,f=this.x||0,m=this.y||0,C=this.textAlign||"left",t={left:0,center:.5,right:1}[C],g=this.styles;
G(b,{marginLeft:e,marginTop:l});this.shadows&&h(this.shadows,function(a){G(a,{marginLeft:e+1,marginTop:l+1})});this.inverted&&h(b.childNodes,function(d){a.invertChild(d,b)});if("SPAN"===b.tagName){var y=this.rotation,J=k(this.textWidth),A=g&&g.whiteSpace,d=[y,C,b.innerHTML,this.textWidth,this.textAlign].join();d!==this.cTT&&(g=a.fontMetrics(b.style.fontSize).b,r(y)&&this.setSpanRotation(y,t,g),G(b,{width:"",whiteSpace:A||"nowrap"}),b.offsetWidth>J&&/[ \-]/.test(b.textContent||b.innerText)&&G(b,{width:J+
"px",display:"block",whiteSpace:A||"normal"}),this.getSpanCorrection(b.offsetWidth,g,t,y,C));G(b,{left:f+(this.xCorr||0)+"px",top:m+(this.yCorr||0)+"px"});q&&(g=b.offsetHeight);this.cTT=d}}else this.alignOnAdd=!0},setSpanRotation:function(a,b,e){var c={},w=this.renderer.getTransformKey();c[w]=c.transform="rotate("+a+"deg)";c[w+(x?"Origin":"-origin")]=c.transformOrigin=100*b+"% "+e+"px";G(this.element,c)},getSpanCorrection:function(a,b,e){this.xCorr=-a*e;this.yCorr=-b}});p(m.prototype,{getTransformKey:function(){return t&&
!/Edge/.test(f.navigator.userAgent)?"-ms-transform":q?"-webkit-transform":x?"MozTransform":f.opera?"-o-transform":""},html:function(a,b,w){var c=this.createElement("span"),f=c.element,k=c.renderer,m=k.isSVG,q=function(a,b){h(["opacity","visibility"],function(g){e(a,g+"Setter",function(a,d,g,c){a.call(this,d,g,c);b[g]=d})})};c.textSetter=function(a){a!==f.innerHTML&&delete this.bBox;this.textStr=a;f.innerHTML=z(a,"");c.htmlUpdateTransform()};m&&q(c,c.element.style);c.xSetter=c.ySetter=c.alignSetter=
c.rotationSetter=function(a,b){"align"===b&&(b="textAlign");c[b]=a;c.htmlUpdateTransform()};c.attr({text:a,x:Math.round(b),y:Math.round(w)}).css({fontFamily:this.style.fontFamily,fontSize:this.style.fontSize,position:"absolute"});f.style.whiteSpace="nowrap";c.css=c.htmlCss;m&&(c.add=function(a){var b,g=k.box.parentNode,e=[];if(this.parentGroup=a){if(b=a.div,!b){for(;a;)e.push(a),a=a.parentGroup;h(e.reverse(),function(a){function d(d,u){a[u]=d;t?l[k.getTransformKey()]="translate("+(a.x||a.translateX)+
"px,"+(a.y||a.translateY)+"px)":"translateX"===u?l.left=d+"px":l.top=d+"px";a.doTransform=!0}var l,u=F(a.element,"class");u&&(u={className:u});b=a.div=a.div||E("div",u,{position:"absolute",left:(a.translateX||0)+"px",top:(a.translateY||0)+"px",display:a.display,opacity:a.opacity,pointerEvents:a.styles&&a.styles.pointerEvents},b||g);l=b.style;p(a,{classSetter:function(a){this.element.setAttribute("class",a);b.className=a},on:function(){e[0].div&&c.on.apply({element:e[0].div},arguments);return a},translateXSetter:d,
translateYSetter:d});q(a,l)})}}else b=g;b.appendChild(f);c.added=!0;c.alignOnAdd&&c.htmlUpdateTransform();return c});return c}})})(L);(function(a){function F(){var t=a.defaultOptions.global,q=x.moment;if(t.timezone){if(q)return function(a){return-q.tz(a,t.timezone).utcOffset()};a.error(25)}return t.useUTC&&t.getTimezoneOffset}function E(){var t=a.defaultOptions.global,q,h=t.useUTC,k=h?"getUTC":"get",m=h?"setUTC":"set",f="Minutes Hours Day Date Month FullYear".split(" "),e=f.concat(["Milliseconds",
"Seconds"]);a.Date=q=t.Date||x.Date;q.hcTimezoneOffset=h&&t.timezoneOffset;q.hcGetTimezoneOffset=F();q.hcMakeTime=function(a,b,e,l,f,k){var c;h?(c=q.UTC.apply(0,arguments),c+=r(c)):c=(new q(a,b,p(e,1),p(l,0),p(f,0),p(k,0))).getTime();return c};for(t=0;t<f.length;t++)q["hcGet"+f[t]]=k+f[t];for(t=0;t<e.length;t++)q["hcSet"+e[t]]=m+e[t]}var G=a.color,r=a.getTZOffset,h=a.merge,p=a.pick,x=a.win;a.defaultOptions={colors:"#7cb5ec #434348 #90ed7d #f7a35c #8085e9 #f15c80 #e4d354 #2b908f #f45b5b #91e8e1".split(" "),
symbols:["circle","diamond","square","triangle","triangle-down"],lang:{loading:"Loading...",months:"January February March April May June July August September October November December".split(" "),shortMonths:"Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" "),weekdays:"Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),decimalPoint:".",numericSymbols:"kMGTPE".split(""),resetZoom:"Reset zoom",resetZoomTitle:"Reset zoom level 1:1",thousandsSep:" "},global:{useUTC:!0},chart:{borderRadius:0,
defaultSeriesType:"line",ignoreHiddenSeries:!0,spacing:[10,10,15,10],resetZoomButton:{theme:{zIndex:20},position:{align:"right",x:-10,y:10}},width:null,height:null,borderColor:"#335cad",backgroundColor:"#ffffff",plotBorderColor:"#cccccc"},title:{text:"Chart title",align:"center",margin:15,widthAdjust:-44},subtitle:{text:"",align:"center",widthAdjust:-44},plotOptions:{},labels:{style:{position:"absolute",color:"#333333"}},legend:{enabled:!0,align:"center",layout:"horizontal",labelFormatter:function(){return this.name},
borderColor:"#999999",borderRadius:0,navigation:{activeColor:"#003399",inactiveColor:"#cccccc"},itemStyle:{color:"#333333",fontSize:"12px",fontWeight:"bold",textOverflow:"ellipsis"},itemHoverStyle:{color:"#000000"},itemHiddenStyle:{color:"#cccccc"},shadow:!1,itemCheckboxStyle:{position:"absolute",width:"13px",height:"13px"},squareSymbol:!0,symbolPadding:5,verticalAlign:"bottom",x:0,y:0,title:{style:{fontWeight:"bold"}}},loading:{labelStyle:{fontWeight:"bold",position:"relative",top:"45%"},style:{position:"absolute",
backgroundColor:"#ffffff",opacity:.5,textAlign:"center"}},tooltip:{enabled:!0,animation:a.svg,borderRadius:3,dateTimeLabelFormats:{millisecond:"%A, %b %e, %H:%M:%S.%L",second:"%A, %b %e, %H:%M:%S",minute:"%A, %b %e, %H:%M",hour:"%A, %b %e, %H:%M",day:"%A, %b %e, %Y",week:"Week from %A, %b %e, %Y",month:"%B %Y",year:"%Y"},footerFormat:"",padding:8,snap:a.isTouchDevice?25:10,backgroundColor:G("#f7f7f7").setOpacity(.85).get(),borderWidth:1,headerFormat:'\x3cspan style\x3d"font-size: 10px"\x3e{point.key}\x3c/span\x3e\x3cbr/\x3e',
pointFormat:'\x3cspan style\x3d"color:{point.color}"\x3e\u25cf\x3c/span\x3e {series.name}: \x3cb\x3e{point.y}\x3c/b\x3e\x3cbr/\x3e',shadow:!0,style:{color:"#333333",cursor:"default",fontSize:"12px",pointerEvents:"none",whiteSpace:"nowrap"}},credits:{enabled:!0,href:"http://www.highcharts.com",position:{align:"right",x:-10,verticalAlign:"bottom",y:-5},style:{cursor:"pointer",color:"#999999",fontSize:"9px"},text:"Highcharts.com"}};a.setOptions=function(t){a.defaultOptions=h(!0,a.defaultOptions,t);E();
return a.defaultOptions};a.getOptions=function(){return a.defaultOptions};a.defaultPlotOptions=a.defaultOptions.plotOptions;E()})(L);(function(a){var F=a.correctFloat,E=a.defined,G=a.destroyObjectProperties,r=a.isNumber,h=a.merge,p=a.pick,x=a.deg2rad;a.Tick=function(a,q,h,k){this.axis=a;this.pos=q;this.type=h||"";this.isNewLabel=this.isNew=!0;h||k||this.addLabel()};a.Tick.prototype={addLabel:function(){var a=this.axis,q=a.options,z=a.chart,k=a.categories,m=a.names,f=this.pos,e=q.labels,c=a.tickPositions,
b=f===c[0],w=f===c[c.length-1],m=k?p(k[f],m[f],f):f,k=this.label,c=c.info,l;a.isDatetimeAxis&&c&&(l=q.dateTimeLabelFormats[c.higherRanks[f]||c.unitName]);this.isFirst=b;this.isLast=w;q=a.labelFormatter.call({axis:a,chart:z,isFirst:b,isLast:w,dateTimeLabelFormat:l,value:a.isLog?F(a.lin2log(m)):m,pos:f});E(k)?k&&k.attr({text:q}):(this.labelLength=(this.label=k=E(q)&&e.enabled?z.renderer.text(q,0,0,e.useHTML).css(h(e.style)).add(a.labelGroup):null)&&k.getBBox().width,this.rotation=0)},getLabelSize:function(){return this.label?
this.label.getBBox()[this.axis.horiz?"height":"width"]:0},handleOverflow:function(a){var t=this.axis,h=a.x,k=t.chart.chartWidth,m=t.chart.spacing,f=p(t.labelLeft,Math.min(t.pos,m[3])),m=p(t.labelRight,Math.max(t.pos+t.len,k-m[1])),e=this.label,c=this.rotation,b={left:0,center:.5,right:1}[t.labelAlign],w=e.getBBox().width,l=t.getSlotWidth(),D=l,H=1,C,K={};if(c)0>c&&h-b*w<f?C=Math.round(h/Math.cos(c*x)-f):0<c&&h+b*w>m&&(C=Math.round((k-h)/Math.cos(c*x)));else if(k=h+(1-b)*w,h-b*w<f?D=a.x+D*(1-b)-f:
k>m&&(D=m-a.x+D*b,H=-1),D=Math.min(l,D),D<l&&"center"===t.labelAlign&&(a.x+=H*(l-D-b*(l-Math.min(w,D)))),w>D||t.autoRotation&&(e.styles||{}).width)C=D;C&&(K.width=C,(t.options.labels.style||{}).textOverflow||(K.textOverflow="ellipsis"),e.css(K))},getPosition:function(a,h,p,k){var m=this.axis,f=m.chart,e=k&&f.oldChartHeight||f.chartHeight;return{x:a?m.translate(h+p,null,null,k)+m.transB:m.left+m.offset+(m.opposite?(k&&f.oldChartWidth||f.chartWidth)-m.right-m.left:0),y:a?e-m.bottom+m.offset-(m.opposite?
m.height:0):e-m.translate(h+p,null,null,k)-m.transB}},getLabelPosition:function(a,h,p,k,m,f,e,c){var b=this.axis,w=b.transA,l=b.reversed,D=b.staggerLines,H=b.tickRotCorr||{x:0,y:0},C=m.y;E(C)||(C=0===b.side?p.rotation?-8:-p.getBBox().height:2===b.side?H.y+8:Math.cos(p.rotation*x)*(H.y-p.getBBox(!1,0).height/2));a=a+m.x+H.x-(f&&k?f*w*(l?-1:1):0);h=h+C-(f&&!k?f*w*(l?1:-1):0);D&&(p=e/(c||1)%D,b.opposite&&(p=D-p-1),h+=b.labelOffset/D*p);return{x:a,y:Math.round(h)}},getMarkPath:function(a,h,p,k,m,f){return f.crispLine(["M",
a,h,"L",a+(m?0:-p),h+(m?p:0)],k)},renderGridLine:function(a,h,p){var k=this.axis,m=k.options,f=this.gridLine,e={},c=this.pos,b=this.type,w=k.tickmarkOffset,l=k.chart.renderer,D=b?b+"Grid":"grid",H=m[D+"LineWidth"],C=m[D+"LineColor"],m=m[D+"LineDashStyle"];f||(e.stroke=C,e["stroke-width"]=H,m&&(e.dashstyle=m),b||(e.zIndex=1),a&&(e.opacity=0),this.gridLine=f=l.path().attr(e).addClass("highcharts-"+(b?b+"-":"")+"grid-line").add(k.gridGroup));if(!a&&f&&(a=k.getPlotLinePath(c+w,f.strokeWidth()*p,a,!0)))f[this.isNew?
"attr":"animate"]({d:a,opacity:h})},renderMark:function(a,h,z){var k=this.axis,m=k.options,f=k.chart.renderer,e=this.type,c=e?e+"Tick":"tick",b=k.tickSize(c),w=this.mark,l=!w,D=a.x;a=a.y;var H=p(m[c+"Width"],!e&&k.isXAxis?1:0),m=m[c+"Color"];b&&(k.opposite&&(b[0]=-b[0]),l&&(this.mark=w=f.path().addClass("highcharts-"+(e?e+"-":"")+"tick").add(k.axisGroup),w.attr({stroke:m,"stroke-width":H})),w[l?"attr":"animate"]({d:this.getMarkPath(D,a,b[0],w.strokeWidth()*z,k.horiz,f),opacity:h}))},renderLabel:function(a,
h,z,k){var m=this.axis,f=m.horiz,e=m.options,c=this.label,b=e.labels,w=b.step,l=m.tickmarkOffset,D=!0,H=a.x;a=a.y;c&&r(H)&&(c.xy=a=this.getLabelPosition(H,a,c,f,b,l,k,w),this.isFirst&&!this.isLast&&!p(e.showFirstLabel,1)||this.isLast&&!this.isFirst&&!p(e.showLastLabel,1)?D=!1:!f||m.isRadial||b.step||b.rotation||h||0===z||this.handleOverflow(a),w&&k%w&&(D=!1),D&&r(a.y)?(a.opacity=z,c[this.isNewLabel?"attr":"animate"](a),this.isNewLabel=!1):(c.attr("y",-9999),this.isNewLabel=!0))},render:function(a,
h,z){var k=this.axis,m=k.horiz,f=this.getPosition(m,this.pos,k.tickmarkOffset,h),e=f.x,c=f.y,k=m&&e===k.pos+k.len||!m&&c===k.pos?-1:1;z=p(z,1);this.isActive=!0;this.renderGridLine(h,z,k);this.renderMark(f,z,k);this.renderLabel(f,h,z,a);this.isNew=!1},destroy:function(){G(this,this.axis)}}})(L);var Z=function(a){var F=a.addEvent,E=a.animObject,G=a.arrayMax,r=a.arrayMin,h=a.color,p=a.correctFloat,x=a.defaultOptions,t=a.defined,q=a.deg2rad,z=a.destroyObjectProperties,k=a.each,m=a.extend,f=a.fireEvent,
e=a.format,c=a.getMagnitude,b=a.grep,w=a.inArray,l=a.isArray,D=a.isNumber,H=a.isString,C=a.merge,K=a.normalizeTickInterval,g=a.objectEach,y=a.pick,J=a.removeEvent,A=a.splat,d=a.syncTimeout,v=a.Tick,B=function(){this.init.apply(this,arguments)};a.extend(B.prototype,{defaultOptions:{dateTimeLabelFormats:{millisecond:"%H:%M:%S.%L",second:"%H:%M:%S",minute:"%H:%M",hour:"%H:%M",day:"%e. %b",week:"%e. %b",month:"%b '%y",year:"%Y"},endOnTick:!1,labels:{enabled:!0,style:{color:"#666666",cursor:"default",
fontSize:"11px"},x:0},maxPadding:.01,minorTickLength:2,minorTickPosition:"outside",minPadding:.01,startOfWeek:1,startOnTick:!1,tickLength:10,tickmarkPlacement:"between",tickPixelInterval:100,tickPosition:"outside",title:{align:"middle",style:{color:"#666666"}},type:"linear",minorGridLineColor:"#f2f2f2",minorGridLineWidth:1,minorTickColor:"#999999",lineColor:"#ccd6eb",lineWidth:1,gridLineColor:"#e6e6e6",tickColor:"#ccd6eb"},defaultYAxisOptions:{endOnTick:!0,tickPixelInterval:72,showLastLabel:!0,labels:{x:-8},
maxPadding:.05,minPadding:.05,startOnTick:!0,title:{rotation:270,text:"Values"},stackLabels:{allowOverlap:!1,enabled:!1,formatter:function(){return a.numberFormat(this.total,-1)},style:{fontSize:"11px",fontWeight:"bold",color:"#000000",textOutline:"1px contrast"}},gridLineWidth:1,lineWidth:0},defaultLeftAxisOptions:{labels:{x:-15},title:{rotation:270}},defaultRightAxisOptions:{labels:{x:15},title:{rotation:90}},defaultBottomAxisOptions:{labels:{autoRotation:[-45],x:0},title:{rotation:0}},defaultTopAxisOptions:{labels:{autoRotation:[-45],
x:0},title:{rotation:0}},init:function(a,d){var u=d.isX,n=this;n.chart=a;n.horiz=a.inverted&&!n.isZAxis?!u:u;n.isXAxis=u;n.coll=n.coll||(u?"xAxis":"yAxis");n.opposite=d.opposite;n.side=d.side||(n.horiz?n.opposite?0:2:n.opposite?1:3);n.setOptions(d);var b=this.options,c=b.type;n.labelFormatter=b.labels.formatter||n.defaultLabelFormatter;n.userOptions=d;n.minPixelPadding=0;n.reversed=b.reversed;n.visible=!1!==b.visible;n.zoomEnabled=!1!==b.zoomEnabled;n.hasNames="category"===c||!0===b.categories;n.categories=
b.categories||n.hasNames;n.names=n.names||[];n.plotLinesAndBandsGroups={};n.isLog="logarithmic"===c;n.isDatetimeAxis="datetime"===c;n.positiveValuesOnly=n.isLog&&!n.allowNegativeLog;n.isLinked=t(b.linkedTo);n.ticks={};n.labelEdge=[];n.minorTicks={};n.plotLinesAndBands=[];n.alternateBands={};n.len=0;n.minRange=n.userMinRange=b.minRange||b.maxZoom;n.range=b.range;n.offset=b.offset||0;n.stacks={};n.oldStacks={};n.stacksTouched=0;n.max=null;n.min=null;n.crosshair=y(b.crosshair,A(a.options.tooltip.crosshairs)[u?
0:1],!1);d=n.options.events;-1===w(n,a.axes)&&(u?a.axes.splice(a.xAxis.length,0,n):a.axes.push(n),a[n.coll].push(n));n.series=n.series||[];a.inverted&&!n.isZAxis&&u&&void 0===n.reversed&&(n.reversed=!0);g(d,function(a,d){F(n,d,a)});n.lin2log=b.linearToLogConverter||n.lin2log;n.isLog&&(n.val2lin=n.log2lin,n.lin2val=n.lin2log)},setOptions:function(a){this.options=C(this.defaultOptions,"yAxis"===this.coll&&this.defaultYAxisOptions,[this.defaultTopAxisOptions,this.defaultRightAxisOptions,this.defaultBottomAxisOptions,
this.defaultLeftAxisOptions][this.side],C(x[this.coll],a))},defaultLabelFormatter:function(){var d=this.axis,n=this.value,b=d.categories,c=this.dateTimeLabelFormat,g=x.lang,v=g.numericSymbols,g=g.numericSymbolMagnitude||1E3,l=v&&v.length,A,w=d.options.labels.format,d=d.isLog?Math.abs(n):d.tickInterval;if(w)A=e(w,this);else if(b)A=n;else if(c)A=a.dateFormat(c,n);else if(l&&1E3<=d)for(;l--&&void 0===A;)b=Math.pow(g,l+1),d>=b&&0===10*n%b&&null!==v[l]&&0!==n&&(A=a.numberFormat(n/b,-1)+v[l]);void 0===
A&&(A=1E4<=Math.abs(n)?a.numberFormat(n,-1):a.numberFormat(n,-1,void 0,""));return A},getSeriesExtremes:function(){var a=this,d=a.chart;a.hasVisibleSeries=!1;a.dataMin=a.dataMax=a.threshold=null;a.softThreshold=!a.isXAxis;a.buildStacks&&a.buildStacks();k(a.series,function(n){if(n.visible||!d.options.chart.ignoreHiddenSeries){var u=n.options,c=u.threshold,g;a.hasVisibleSeries=!0;a.positiveValuesOnly&&0>=c&&(c=null);if(a.isXAxis)u=n.xData,u.length&&(n=r(u),g=G(u),D(n)||n instanceof Date||(u=b(u,D),
n=r(u)),a.dataMin=Math.min(y(a.dataMin,u[0],n),n),a.dataMax=Math.max(y(a.dataMax,u[0],g),g));else if(n.getExtremes(),g=n.dataMax,n=n.dataMin,t(n)&&t(g)&&(a.dataMin=Math.min(y(a.dataMin,n),n),a.dataMax=Math.max(y(a.dataMax,g),g)),t(c)&&(a.threshold=c),!u.softThreshold||a.positiveValuesOnly)a.softThreshold=!1}})},translate:function(a,d,b,c,g,v){var n=this.linkedParent||this,u=1,e=0,l=c?n.oldTransA:n.transA;c=c?n.oldMin:n.min;var A=n.minPixelPadding;g=(n.isOrdinal||n.isBroken||n.isLog&&g)&&n.lin2val;
l||(l=n.transA);b&&(u*=-1,e=n.len);n.reversed&&(u*=-1,e-=u*(n.sector||n.len));d?(a=(a*u+e-A)/l+c,g&&(a=n.lin2val(a))):(g&&(a=n.val2lin(a)),a=D(c)?u*(a-c)*l+e+u*A+(D(v)?l*v:0):void 0);return a},toPixels:function(a,d){return this.translate(a,!1,!this.horiz,null,!0)+(d?0:this.pos)},toValue:function(a,d){return this.translate(a-(d?0:this.pos),!0,!this.horiz,null,!0)},getPlotLinePath:function(a,d,b,c,g){var n=this.chart,u=this.left,v=this.top,e,l,A=b&&n.oldChartHeight||n.chartHeight,w=b&&n.oldChartWidth||
n.chartWidth,f;e=this.transB;var B=function(a,d,n){if(a<d||a>n)c?a=Math.min(Math.max(d,a),n):f=!0;return a};g=y(g,this.translate(a,null,null,b));a=b=Math.round(g+e);e=l=Math.round(A-g-e);D(g)?this.horiz?(e=v,l=A-this.bottom,a=b=B(a,u,u+this.width)):(a=u,b=w-this.right,e=l=B(e,v,v+this.height)):(f=!0,c=!1);return f&&!c?null:n.renderer.crispLine(["M",a,e,"L",b,l],d||1)},getLinearTickPositions:function(a,d,b){var n,u=p(Math.floor(d/a)*a);b=p(Math.ceil(b/a)*a);var c=[],g;p(u+a)===u&&(g=20);if(this.single)return[d];
for(d=u;d<=b;){c.push(d);d=p(d+a,g);if(d===n)break;n=d}return c},getMinorTickInterval:function(){var a=this.options;return!0===a.minorTicks?y(a.minorTickInterval,"auto"):!1===a.minorTicks?null:a.minorTickInterval},getMinorTickPositions:function(){var a=this,d=a.options,b=a.tickPositions,c=a.minorTickInterval,g=[],v=a.pointRangePadding||0,e=a.min-v,v=a.max+v,l=v-e;if(l&&l/c<a.len/3)if(a.isLog)k(this.paddedTicks,function(d,n,u){n&&g.push.apply(g,a.getLogTickPositions(c,u[n-1],u[n],!0))});else if(a.isDatetimeAxis&&
"auto"===this.getMinorTickInterval())g=g.concat(a.getTimeTicks(a.normalizeTimeTickInterval(c),e,v,d.startOfWeek));else for(d=e+(b[0]-e)%c;d<=v&&d!==g[0];d+=c)g.push(d);0!==g.length&&a.trimTicks(g);return g},adjustForMinRange:function(){var a=this.options,d=this.min,b=this.max,c,g,v,e,l,A,w,f;this.isXAxis&&void 0===this.minRange&&!this.isLog&&(t(a.min)||t(a.max)?this.minRange=null:(k(this.series,function(a){A=a.xData;for(e=w=a.xIncrement?1:A.length-1;0<e;e--)if(l=A[e]-A[e-1],void 0===v||l<v)v=l}),
this.minRange=Math.min(5*v,this.dataMax-this.dataMin)));b-d<this.minRange&&(g=this.dataMax-this.dataMin>=this.minRange,f=this.minRange,c=(f-b+d)/2,c=[d-c,y(a.min,d-c)],g&&(c[2]=this.isLog?this.log2lin(this.dataMin):this.dataMin),d=G(c),b=[d+f,y(a.max,d+f)],g&&(b[2]=this.isLog?this.log2lin(this.dataMax):this.dataMax),b=r(b),b-d<f&&(c[0]=b-f,c[1]=y(a.min,b-f),d=G(c)));this.min=d;this.max=b},getClosest:function(){var a;this.categories?a=1:k(this.series,function(d){var n=d.closestPointRange,b=d.visible||
!d.chart.options.chart.ignoreHiddenSeries;!d.noSharedTooltip&&t(n)&&b&&(a=t(a)?Math.min(a,n):n)});return a},nameToX:function(a){var d=l(this.categories),b=d?this.categories:this.names,u=a.options.x,c;a.series.requireSorting=!1;t(u)||(u=!1===this.options.uniqueNames?a.series.autoIncrement():w(a.name,b));-1===u?d||(c=b.length):c=u;void 0!==c&&(this.names[c]=a.name);return c},updateNames:function(){var a=this;0<this.names.length&&(this.names.length=0,this.minRange=this.userMinRange,k(this.series||[],
function(d){d.xIncrement=null;if(!d.points||d.isDirtyData)d.processData(),d.generatePoints();k(d.points,function(n,b){var u;n.options&&(u=a.nameToX(n),void 0!==u&&u!==n.x&&(n.x=u,d.xData[b]=u))})}))},setAxisTranslation:function(a){var d=this,b=d.max-d.min,u=d.axisPointRange||0,c,g=0,v=0,e=d.linkedParent,l=!!d.categories,A=d.transA,w=d.isXAxis;if(w||l||u)c=d.getClosest(),e?(g=e.minPointOffset,v=e.pointRangePadding):k(d.series,function(a){var n=l?1:w?y(a.options.pointRange,c,0):d.axisPointRange||0;
a=a.options.pointPlacement;u=Math.max(u,n);d.single||(g=Math.max(g,H(a)?0:n/2),v=Math.max(v,"on"===a?0:n))}),e=d.ordinalSlope&&c?d.ordinalSlope/c:1,d.minPointOffset=g*=e,d.pointRangePadding=v*=e,d.pointRange=Math.min(u,b),w&&(d.closestPointRange=c);a&&(d.oldTransA=A);d.translationSlope=d.transA=A=d.options.staticScale||d.len/(b+v||1);d.transB=d.horiz?d.left:d.bottom;d.minPixelPadding=A*g},minFromRange:function(){return this.max-this.range},setTickInterval:function(d){var n=this,b=n.chart,u=n.options,
g=n.isLog,v=n.log2lin,e=n.isDatetimeAxis,l=n.isXAxis,A=n.isLinked,w=u.maxPadding,B=u.minPadding,m=u.tickInterval,C=u.tickPixelInterval,H=n.categories,h=n.threshold,J=n.softThreshold,q,z,x,r;e||H||A||this.getTickAmount();x=y(n.userMin,u.min);r=y(n.userMax,u.max);A?(n.linkedParent=b[n.coll][u.linkedTo],b=n.linkedParent.getExtremes(),n.min=y(b.min,b.dataMin),n.max=y(b.max,b.dataMax),u.type!==n.linkedParent.options.type&&a.error(11,1)):(!J&&t(h)&&(n.dataMin>=h?(q=h,B=0):n.dataMax<=h&&(z=h,w=0)),n.min=
y(x,q,n.dataMin),n.max=y(r,z,n.dataMax));g&&(n.positiveValuesOnly&&!d&&0>=Math.min(n.min,y(n.dataMin,n.min))&&a.error(10,1),n.min=p(v(n.min),15),n.max=p(v(n.max),15));n.range&&t(n.max)&&(n.userMin=n.min=x=Math.max(n.dataMin,n.minFromRange()),n.userMax=r=n.max,n.range=null);f(n,"foundExtremes");n.beforePadding&&n.beforePadding();n.adjustForMinRange();!(H||n.axisPointRange||n.usePercentage||A)&&t(n.min)&&t(n.max)&&(v=n.max-n.min)&&(!t(x)&&B&&(n.min-=v*B),!t(r)&&w&&(n.max+=v*w));D(u.softMin)&&(n.min=
Math.min(n.min,u.softMin));D(u.softMax)&&(n.max=Math.max(n.max,u.softMax));D(u.floor)&&(n.min=Math.max(n.min,u.floor));D(u.ceiling)&&(n.max=Math.min(n.max,u.ceiling));J&&t(n.dataMin)&&(h=h||0,!t(x)&&n.min<h&&n.dataMin>=h?n.min=h:!t(r)&&n.max>h&&n.dataMax<=h&&(n.max=h));n.tickInterval=n.min===n.max||void 0===n.min||void 0===n.max?1:A&&!m&&C===n.linkedParent.options.tickPixelInterval?m=n.linkedParent.tickInterval:y(m,this.tickAmount?(n.max-n.min)/Math.max(this.tickAmount-1,1):void 0,H?1:(n.max-n.min)*
C/Math.max(n.len,C));l&&!d&&k(n.series,function(a){a.processData(n.min!==n.oldMin||n.max!==n.oldMax)});n.setAxisTranslation(!0);n.beforeSetTickPositions&&n.beforeSetTickPositions();n.postProcessTickInterval&&(n.tickInterval=n.postProcessTickInterval(n.tickInterval));n.pointRange&&!m&&(n.tickInterval=Math.max(n.pointRange,n.tickInterval));d=y(u.minTickInterval,n.isDatetimeAxis&&n.closestPointRange);!m&&n.tickInterval<d&&(n.tickInterval=d);e||g||m||(n.tickInterval=K(n.tickInterval,null,c(n.tickInterval),
y(u.allowDecimals,!(.5<n.tickInterval&&5>n.tickInterval&&1E3<n.max&&9999>n.max)),!!this.tickAmount));this.tickAmount||(n.tickInterval=n.unsquish());this.setTickPositions()},setTickPositions:function(){var a=this.options,d,b=a.tickPositions;d=this.getMinorTickInterval();var c=a.tickPositioner,g=a.startOnTick,v=a.endOnTick;this.tickmarkOffset=this.categories&&"between"===a.tickmarkPlacement&&1===this.tickInterval?.5:0;this.minorTickInterval="auto"===d&&this.tickInterval?this.tickInterval/5:d;this.single=
this.min===this.max&&t(this.min)&&!this.tickAmount&&(parseInt(this.min,10)===this.min||!1!==a.allowDecimals);this.tickPositions=d=b&&b.slice();!d&&(d=this.isDatetimeAxis?this.getTimeTicks(this.normalizeTimeTickInterval(this.tickInterval,a.units),this.min,this.max,a.startOfWeek,this.ordinalPositions,this.closestPointRange,!0):this.isLog?this.getLogTickPositions(this.tickInterval,this.min,this.max):this.getLinearTickPositions(this.tickInterval,this.min,this.max),d.length>this.len&&(d=[d[0],d.pop()],
d[0]===d[1]&&(d.length=1)),this.tickPositions=d,c&&(c=c.apply(this,[this.min,this.max])))&&(this.tickPositions=d=c);this.paddedTicks=d.slice(0);this.trimTicks(d,g,v);this.isLinked||(this.single&&2>d.length&&(this.min-=.5,this.max+=.5),b||c||this.adjustTickAmount())},trimTicks:function(a,d,b){var n=a[0],u=a[a.length-1],c=this.minPointOffset||0;if(!this.isLinked){if(d&&-Infinity!==n)this.min=n;else for(;this.min-c>a[0];)a.shift();if(b)this.max=u;else for(;this.max+c<a[a.length-1];)a.pop();0===a.length&&
t(n)&&a.push((u+n)/2)}},alignToOthers:function(){var a={},d,b=this.options;!1===this.chart.options.chart.alignTicks||!1===b.alignTicks||this.isLog||k(this.chart[this.coll],function(b){var n=b.options,n=[b.horiz?n.left:n.top,n.width,n.height,n.pane].join();b.series.length&&(a[n]?d=!0:a[n]=1)});return d},getTickAmount:function(){var a=this.options,d=a.tickAmount,b=a.tickPixelInterval;!t(a.tickInterval)&&this.len<b&&!this.isRadial&&!this.isLog&&a.startOnTick&&a.endOnTick&&(d=2);!d&&this.alignToOthers()&&
(d=Math.ceil(this.len/b)+1);4>d&&(this.finalTickAmt=d,d=5);this.tickAmount=d},adjustTickAmount:function(){var a=this.tickInterval,d=this.tickPositions,b=this.tickAmount,c=this.finalTickAmt,g=d&&d.length;if(g<b){for(;d.length<b;)d.push(p(d[d.length-1]+a));this.transA*=(g-1)/(b-1);this.max=d[d.length-1]}else g>b&&(this.tickInterval*=2,this.setTickPositions());if(t(c)){for(a=b=d.length;a--;)(3===c&&1===a%2||2>=c&&0<a&&a<b-1)&&d.splice(a,1);this.finalTickAmt=void 0}},setScale:function(){var a,d;this.oldMin=
this.min;this.oldMax=this.max;this.oldAxisLength=this.len;this.setAxisSize();d=this.len!==this.oldAxisLength;k(this.series,function(d){if(d.isDirtyData||d.isDirty||d.xAxis.isDirty)a=!0});d||a||this.isLinked||this.forceRedraw||this.userMin!==this.oldUserMin||this.userMax!==this.oldUserMax||this.alignToOthers()?(this.resetStacks&&this.resetStacks(),this.forceRedraw=!1,this.getSeriesExtremes(),this.setTickInterval(),this.oldUserMin=this.userMin,this.oldUserMax=this.userMax,this.isDirty||(this.isDirty=
d||this.min!==this.oldMin||this.max!==this.oldMax)):this.cleanStacks&&this.cleanStacks()},setExtremes:function(a,d,b,c,g){var n=this,u=n.chart;b=y(b,!0);k(n.series,function(a){delete a.kdTree});g=m(g,{min:a,max:d});f(n,"setExtremes",g,function(){n.userMin=a;n.userMax=d;n.eventArgs=g;b&&u.redraw(c)})},zoom:function(a,d){var b=this.dataMin,n=this.dataMax,u=this.options,c=Math.min(b,y(u.min,b)),u=Math.max(n,y(u.max,n));if(a!==this.min||d!==this.max)this.allowZoomOutside||(t(b)&&(a<c&&(a=c),a>u&&(a=u)),
t(n)&&(d<c&&(d=c),d>u&&(d=u))),this.displayBtn=void 0!==a||void 0!==d,this.setExtremes(a,d,!1,void 0,{trigger:"zoom"});return!0},setAxisSize:function(){var d=this.chart,b=this.options,c=b.offsets||[0,0,0,0],g=this.horiz,v=this.width=Math.round(a.relativeLength(y(b.width,d.plotWidth-c[3]+c[1]),d.plotWidth)),e=this.height=Math.round(a.relativeLength(y(b.height,d.plotHeight-c[0]+c[2]),d.plotHeight)),l=this.top=Math.round(a.relativeLength(y(b.top,d.plotTop+c[0]),d.plotHeight,d.plotTop)),b=this.left=Math.round(a.relativeLength(y(b.left,
d.plotLeft+c[3]),d.plotWidth,d.plotLeft));this.bottom=d.chartHeight-e-l;this.right=d.chartWidth-v-b;this.len=Math.max(g?v:e,0);this.pos=g?b:l},getExtremes:function(){var a=this.isLog,d=this.lin2log;return{min:a?p(d(this.min)):this.min,max:a?p(d(this.max)):this.max,dataMin:this.dataMin,dataMax:this.dataMax,userMin:this.userMin,userMax:this.userMax}},getThreshold:function(a){var d=this.isLog,b=this.lin2log,c=d?b(this.min):this.min,d=d?b(this.max):this.max;null===a?a=c:c>a?a=c:d<a&&(a=d);return this.translate(a,
0,1,0,1)},autoLabelAlign:function(a){a=(y(a,0)-90*this.side+720)%360;return 15<a&&165>a?"right":195<a&&345>a?"left":"center"},tickSize:function(a){var d=this.options,b=d[a+"Length"],c=y(d[a+"Width"],"tick"===a&&this.isXAxis?1:0);if(c&&b)return"inside"===d[a+"Position"]&&(b=-b),[b,c]},labelMetrics:function(){var a=this.tickPositions&&this.tickPositions[0]||0;return this.chart.renderer.fontMetrics(this.options.labels.style&&this.options.labels.style.fontSize,this.ticks[a]&&this.ticks[a].label)},unsquish:function(){var a=
this.options.labels,d=this.horiz,b=this.tickInterval,c=b,g=this.len/(((this.categories?1:0)+this.max-this.min)/b),v,e=a.rotation,l=this.labelMetrics(),A,w=Number.MAX_VALUE,f,B=function(a){a/=g||1;a=1<a?Math.ceil(a):1;return a*b};d?(f=!a.staggerLines&&!a.step&&(t(e)?[e]:g<y(a.autoRotationLimit,80)&&a.autoRotation))&&k(f,function(a){var d;if(a===e||a&&-90<=a&&90>=a)A=B(Math.abs(l.h/Math.sin(q*a))),d=A+Math.abs(a/360),d<w&&(w=d,v=a,c=A)}):a.step||(c=B(l.h));this.autoRotation=f;this.labelRotation=y(v,
e);return c},getSlotWidth:function(){var a=this.chart,d=this.horiz,b=this.options.labels,c=Math.max(this.tickPositions.length-(this.categories?0:1),1),g=a.margin[3];return d&&2>(b.step||0)&&!b.rotation&&(this.staggerLines||1)*this.len/c||!d&&(b.style&&parseInt(b.style.width,10)||g&&g-a.spacing[3]||.33*a.chartWidth)},renderUnsquish:function(){var a=this.chart,d=a.renderer,b=this.tickPositions,c=this.ticks,g=this.options.labels,v=this.horiz,e=this.getSlotWidth(),l=Math.max(1,Math.round(e-2*(g.padding||
5))),A={},w=this.labelMetrics(),f=g.style&&g.style.textOverflow,B,m=0,D,y;H(g.rotation)||(A.rotation=g.rotation||0);k(b,function(a){(a=c[a])&&a.labelLength>m&&(m=a.labelLength)});this.maxLabelLength=m;if(this.autoRotation)m>l&&m>w.h?A.rotation=this.labelRotation:this.labelRotation=0;else if(e&&(B={width:l+"px"},!f))for(B.textOverflow="clip",D=b.length;!v&&D--;)if(y=b[D],l=c[y].label)l.styles&&"ellipsis"===l.styles.textOverflow?l.css({textOverflow:"clip"}):c[y].labelLength>e&&l.css({width:e+"px"}),
l.getBBox().height>this.len/b.length-(w.h-w.f)&&(l.specCss={textOverflow:"ellipsis"});A.rotation&&(B={width:(m>.5*a.chartHeight?.33*a.chartHeight:a.chartHeight)+"px"},f||(B.textOverflow="ellipsis"));if(this.labelAlign=g.align||this.autoLabelAlign(this.labelRotation))A.align=this.labelAlign;k(b,function(a){var d=(a=c[a])&&a.label;d&&(d.attr(A),B&&d.css(C(B,d.specCss)),delete d.specCss,a.rotation=A.rotation)});this.tickRotCorr=d.rotCorr(w.b,this.labelRotation||0,0!==this.side)},hasData:function(){return this.hasVisibleSeries||
t(this.min)&&t(this.max)&&this.tickPositions&&0<this.tickPositions.length},addTitle:function(a){var d=this.chart.renderer,b=this.horiz,c=this.opposite,g=this.options.title,u;this.axisTitle||((u=g.textAlign)||(u=(b?{low:"left",middle:"center",high:"right"}:{low:c?"right":"left",middle:"center",high:c?"left":"right"})[g.align]),this.axisTitle=d.text(g.text,0,0,g.useHTML).attr({zIndex:7,rotation:g.rotation||0,align:u}).addClass("highcharts-axis-title").css(g.style).add(this.axisGroup),this.axisTitle.isNew=
!0);g.style.width||this.isRadial||this.axisTitle.css({width:this.len});this.axisTitle[a?"show":"hide"](!0)},generateTick:function(a){var d=this.ticks;d[a]?d[a].addLabel():d[a]=new v(this,a)},getOffset:function(){var a=this,d=a.chart,b=d.renderer,c=a.options,v=a.tickPositions,e=a.ticks,l=a.horiz,A=a.side,w=d.inverted&&!a.isZAxis?[1,0,3,2][A]:A,f,B,m=0,D,C=0,H=c.title,h=c.labels,J=0,p=d.axisOffset,d=d.clipOffset,q=[-1,1,1,-1][A],K=c.className,z=a.axisParent,x=this.tickSize("tick");f=a.hasData();a.showAxis=
B=f||y(c.showEmpty,!0);a.staggerLines=a.horiz&&h.staggerLines;a.axisGroup||(a.gridGroup=b.g("grid").attr({zIndex:c.gridZIndex||1}).addClass("highcharts-"+this.coll.toLowerCase()+"-grid "+(K||"")).add(z),a.axisGroup=b.g("axis").attr({zIndex:c.zIndex||2}).addClass("highcharts-"+this.coll.toLowerCase()+" "+(K||"")).add(z),a.labelGroup=b.g("axis-labels").attr({zIndex:h.zIndex||7}).addClass("highcharts-"+a.coll.toLowerCase()+"-labels "+(K||"")).add(z));f||a.isLinked?(k(v,function(d,b){a.generateTick(d,
b)}),a.renderUnsquish(),!1===h.reserveSpace||0!==A&&2!==A&&{1:"left",3:"right"}[A]!==a.labelAlign&&"center"!==a.labelAlign||k(v,function(a){J=Math.max(e[a].getLabelSize(),J)}),a.staggerLines&&(J*=a.staggerLines,a.labelOffset=J*(a.opposite?-1:1))):g(e,function(a,d){a.destroy();delete e[d]});H&&H.text&&!1!==H.enabled&&(a.addTitle(B),B&&!1!==H.reserveSpace&&(a.titleOffset=m=a.axisTitle.getBBox()[l?"height":"width"],D=H.offset,C=t(D)?0:y(H.margin,l?5:10)));a.renderLine();a.offset=q*y(c.offset,p[A]);a.tickRotCorr=
a.tickRotCorr||{x:0,y:0};b=0===A?-a.labelMetrics().h:2===A?a.tickRotCorr.y:0;C=Math.abs(J)+C;J&&(C=C-b+q*(l?y(h.y,a.tickRotCorr.y+8*q):h.x));a.axisTitleMargin=y(D,C);p[A]=Math.max(p[A],a.axisTitleMargin+m+q*a.offset,C,f&&v.length&&x?x[0]+q*a.offset:0);c=c.offset?0:2*Math.floor(a.axisLine.strokeWidth()/2);d[w]=Math.max(d[w],c)},getLinePath:function(a){var d=this.chart,b=this.opposite,c=this.offset,g=this.horiz,v=this.left+(b?this.width:0)+c,c=d.chartHeight-this.bottom-(b?this.height:0)+c;b&&(a*=-1);
return d.renderer.crispLine(["M",g?this.left:v,g?c:this.top,"L",g?d.chartWidth-this.right:v,g?c:d.chartHeight-this.bottom],a)},renderLine:function(){this.axisLine||(this.axisLine=this.chart.renderer.path().addClass("highcharts-axis-line").add(this.axisGroup),this.axisLine.attr({stroke:this.options.lineColor,"stroke-width":this.options.lineWidth,zIndex:7}))},getTitlePosition:function(){var a=this.horiz,d=this.left,b=this.top,c=this.len,g=this.options.title,v=a?d:b,e=this.opposite,l=this.offset,A=g.x||
0,w=g.y||0,f=this.axisTitle,B=this.chart.renderer.fontMetrics(g.style&&g.style.fontSize,f),f=Math.max(f.getBBox(null,0).height-B.h-1,0),c={low:v+(a?0:c),middle:v+c/2,high:v+(a?c:0)}[g.align],d=(a?b+this.height:d)+(a?1:-1)*(e?-1:1)*this.axisTitleMargin+[-f,f,B.f,-f][this.side];return{x:a?c+A:d+(e?this.width:0)+l+A,y:a?d+w-(e?this.height:0)+l:c+w}},renderMinorTick:function(a){var d=this.chart.hasRendered&&D(this.oldMin),b=this.minorTicks;b[a]||(b[a]=new v(this,a,"minor"));d&&b[a].isNew&&b[a].render(null,
!0);b[a].render(null,!1,1)},renderTick:function(a,d){var b=this.isLinked,c=this.ticks,g=this.chart.hasRendered&&D(this.oldMin);if(!b||a>=this.min&&a<=this.max)c[a]||(c[a]=new v(this,a)),g&&c[a].isNew&&c[a].render(d,!0,.1),c[a].render(d)},render:function(){var b=this,c=b.chart,e=b.options,l=b.isLog,A=b.lin2log,w=b.isLinked,f=b.tickPositions,B=b.axisTitle,m=b.ticks,y=b.minorTicks,C=b.alternateBands,H=e.stackLabels,h=e.alternateGridColor,J=b.tickmarkOffset,p=b.axisLine,t=b.showAxis,q=E(c.renderer.globalAnimation),
K,z;b.labelEdge.length=0;b.overlap=!1;k([m,y,C],function(a){g(a,function(a){a.isActive=!1})});if(b.hasData()||w)b.minorTickInterval&&!b.categories&&k(b.getMinorTickPositions(),function(a){b.renderMinorTick(a)}),f.length&&(k(f,function(a,d){b.renderTick(a,d)}),J&&(0===b.min||b.single)&&(m[-1]||(m[-1]=new v(b,-1,null,!0)),m[-1].render(-1))),h&&k(f,function(d,g){z=void 0!==f[g+1]?f[g+1]+J:b.max-J;0===g%2&&d<b.max&&z<=b.max+(c.polar?-J:J)&&(C[d]||(C[d]=new a.PlotLineOrBand(b)),K=d+J,C[d].options={from:l?
A(K):K,to:l?A(z):z,color:h},C[d].render(),C[d].isActive=!0)}),b._addedPlotLB||(k((e.plotLines||[]).concat(e.plotBands||[]),function(a){b.addPlotBandOrLine(a)}),b._addedPlotLB=!0);k([m,y,C],function(a){var b,n=[],v=q.duration;g(a,function(a,d){a.isActive||(a.render(d,!1,0),a.isActive=!1,n.push(d))});d(function(){for(b=n.length;b--;)a[n[b]]&&!a[n[b]].isActive&&(a[n[b]].destroy(),delete a[n[b]])},a!==C&&c.hasRendered&&v?v:0)});p&&(p[p.isPlaced?"animate":"attr"]({d:this.getLinePath(p.strokeWidth())}),
p.isPlaced=!0,p[t?"show":"hide"](!0));B&&t&&(e=b.getTitlePosition(),D(e.y)?(B[B.isNew?"attr":"animate"](e),B.isNew=!1):(B.attr("y",-9999),B.isNew=!0));H&&H.enabled&&b.renderStackTotals();b.isDirty=!1},redraw:function(){this.visible&&(this.render(),k(this.plotLinesAndBands,function(a){a.render()}));k(this.series,function(a){a.isDirty=!0})},keepProps:"extKey hcEvents names series userMax userMin".split(" "),destroy:function(a){var d=this,b=d.stacks,c=d.plotLinesAndBands,v;a||J(d);g(b,function(a,d){z(a);
b[d]=null});k([d.ticks,d.minorTicks,d.alternateBands],function(a){z(a)});if(c)for(a=c.length;a--;)c[a].destroy();k("stackTotalGroup axisLine axisTitle axisGroup gridGroup labelGroup cross".split(" "),function(a){d[a]&&(d[a]=d[a].destroy())});for(v in d.plotLinesAndBandsGroups)d.plotLinesAndBandsGroups[v]=d.plotLinesAndBandsGroups[v].destroy();g(d,function(a,b){-1===w(b,d.keepProps)&&delete d[b]})},drawCrosshair:function(a,d){var b,c=this.crosshair,g=y(c.snap,!0),n,v=this.cross;a||(a=this.cross&&this.cross.e);
this.crosshair&&!1!==(t(d)||!g)?(g?t(d)&&(n=this.isXAxis?d.plotX:this.len-d.plotY):n=a&&(this.horiz?a.chartX-this.pos:this.len-a.chartY+this.pos),t(n)&&(b=this.getPlotLinePath(d&&(this.isXAxis?d.x:y(d.stackY,d.y)),null,null,null,n)||null),t(b)?(d=this.categories&&!this.isRadial,v||(this.cross=v=this.chart.renderer.path().addClass("highcharts-crosshair highcharts-crosshair-"+(d?"category ":"thin ")+c.className).attr({zIndex:y(c.zIndex,2)}).add(),v.attr({stroke:c.color||(d?h("#ccd6eb").setOpacity(.25).get():
"#cccccc"),"stroke-width":y(c.width,1)}).css({"pointer-events":"none"}),c.dashStyle&&v.attr({dashstyle:c.dashStyle})),v.show().attr({d:b}),d&&!c.width&&v.attr({"stroke-width":this.transA}),this.cross.e=a):this.hideCrosshair()):this.hideCrosshair()},hideCrosshair:function(){this.cross&&this.cross.hide()}});return a.Axis=B}(L);(function(a){var F=a.Axis,E=a.Date,G=a.dateFormat,r=a.defaultOptions,h=a.defined,p=a.each,x=a.extend,t=a.getMagnitude,q=a.getTZOffset,z=a.normalizeTickInterval,k=a.pick,m=a.timeUnits;
F.prototype.getTimeTicks=function(a,e,c,b){var w=[],l={},f=r.global.useUTC,H,C=new E(e-Math.max(q(e),q(c))),t=E.hcMakeTime,g=a.unitRange,y=a.count,J,A;if(h(e)){C[E.hcSetMilliseconds](g>=m.second?0:y*Math.floor(C.getMilliseconds()/y));if(g>=m.second)C[E.hcSetSeconds](g>=m.minute?0:y*Math.floor(C.getSeconds()/y));if(g>=m.minute)C[E.hcSetMinutes](g>=m.hour?0:y*Math.floor(C[E.hcGetMinutes]()/y));if(g>=m.hour)C[E.hcSetHours](g>=m.day?0:y*Math.floor(C[E.hcGetHours]()/y));if(g>=m.day)C[E.hcSetDate](g>=m.month?
1:y*Math.floor(C[E.hcGetDate]()/y));g>=m.month&&(C[E.hcSetMonth](g>=m.year?0:y*Math.floor(C[E.hcGetMonth]()/y)),H=C[E.hcGetFullYear]());if(g>=m.year)C[E.hcSetFullYear](H-H%y);if(g===m.week)C[E.hcSetDate](C[E.hcGetDate]()-C[E.hcGetDay]()+k(b,1));H=C[E.hcGetFullYear]();b=C[E.hcGetMonth]();var d=C[E.hcGetDate](),v=C[E.hcGetHours]();if(E.hcTimezoneOffset||E.hcGetTimezoneOffset)A=(!f||!!E.hcGetTimezoneOffset)&&(c-e>4*m.month||q(e)!==q(c)),C=C.getTime(),J=q(C),C=new E(C+J);f=C.getTime();for(e=1;f<c;)w.push(f),
f=g===m.year?t(H+e*y,0):g===m.month?t(H,b+e*y):!A||g!==m.day&&g!==m.week?A&&g===m.hour?t(H,b,d,v+e*y,0,0,J)-J:f+g*y:t(H,b,d+e*y*(g===m.day?1:7)),e++;w.push(f);g<=m.hour&&1E4>w.length&&p(w,function(a){0===a%18E5&&"000000000"===G("%H%M%S%L",a)&&(l[a]="day")})}w.info=x(a,{higherRanks:l,totalRange:g*y});return w};F.prototype.normalizeTimeTickInterval=function(a,e){var c=e||[["millisecond",[1,2,5,10,20,25,50,100,200,500]],["second",[1,2,5,10,15,30]],["minute",[1,2,5,10,15,30]],["hour",[1,2,3,4,6,8,12]],
["day",[1,2]],["week",[1,2]],["month",[1,2,3,4,6]],["year",null]];e=c[c.length-1];var b=m[e[0]],w=e[1],l;for(l=0;l<c.length&&!(e=c[l],b=m[e[0]],w=e[1],c[l+1]&&a<=(b*w[w.length-1]+m[c[l+1][0]])/2);l++);b===m.year&&a<5*b&&(w=[1,2,5]);a=z(a/b,w,"year"===e[0]?Math.max(t(a/b),1):1);return{unitRange:b,count:a,unitName:e[0]}}})(L);(function(a){var F=a.Axis,E=a.getMagnitude,G=a.map,r=a.normalizeTickInterval,h=a.pick;F.prototype.getLogTickPositions=function(a,x,t,q){var p=this.options,k=this.len,m=this.lin2log,
f=this.log2lin,e=[];q||(this._minorAutoInterval=null);if(.5<=a)a=Math.round(a),e=this.getLinearTickPositions(a,x,t);else if(.08<=a)for(var k=Math.floor(x),c,b,w,l,D,p=.3<a?[1,2,4]:.15<a?[1,2,4,6,8]:[1,2,3,4,5,6,7,8,9];k<t+1&&!D;k++)for(b=p.length,c=0;c<b&&!D;c++)w=f(m(k)*p[c]),w>x&&(!q||l<=t)&&void 0!==l&&e.push(l),l>t&&(D=!0),l=w;else x=m(x),t=m(t),a=q?this.getMinorTickInterval():p.tickInterval,a=h("auto"===a?null:a,this._minorAutoInterval,p.tickPixelInterval/(q?5:1)*(t-x)/((q?k/this.tickPositions.length:
k)||1)),a=r(a,null,E(a)),e=G(this.getLinearTickPositions(a,x,t),f),q||(this._minorAutoInterval=a/5);q||(this.tickInterval=a);return e};F.prototype.log2lin=function(a){return Math.log(a)/Math.LN10};F.prototype.lin2log=function(a){return Math.pow(10,a)}})(L);(function(a,F){var E=a.arrayMax,G=a.arrayMin,r=a.defined,h=a.destroyObjectProperties,p=a.each,x=a.erase,t=a.merge,q=a.pick;a.PlotLineOrBand=function(a,k){this.axis=a;k&&(this.options=k,this.id=k.id)};a.PlotLineOrBand.prototype={render:function(){var h=
this,k=h.axis,m=k.horiz,f=h.options,e=f.label,c=h.label,b=f.to,w=f.from,l=f.value,D=r(w)&&r(b),H=r(l),C=h.svgElem,p=!C,g=[],y=f.color,J=q(f.zIndex,0),A=f.events,g={"class":"highcharts-plot-"+(D?"band ":"line ")+(f.className||"")},d={},v=k.chart.renderer,B=D?"bands":"lines",u=k.log2lin;k.isLog&&(w=u(w),b=u(b),l=u(l));H?(g={stroke:y,"stroke-width":f.width},f.dashStyle&&(g.dashstyle=f.dashStyle)):D&&(y&&(g.fill=y),f.borderWidth&&(g.stroke=f.borderColor,g["stroke-width"]=f.borderWidth));d.zIndex=J;B+=
"-"+J;(y=k.plotLinesAndBandsGroups[B])||(k.plotLinesAndBandsGroups[B]=y=v.g("plot-"+B).attr(d).add());p&&(h.svgElem=C=v.path().attr(g).add(y));if(H)g=k.getPlotLinePath(l,C.strokeWidth());else if(D)g=k.getPlotBandPath(w,b,f);else return;p&&g&&g.length?(C.attr({d:g}),A&&a.objectEach(A,function(a,d){C.on(d,function(a){A[d].apply(h,[a])})})):C&&(g?(C.show(),C.animate({d:g})):(C.hide(),c&&(h.label=c=c.destroy())));e&&r(e.text)&&g&&g.length&&0<k.width&&0<k.height&&!g.flat?(e=t({align:m&&D&&"center",x:m?
!D&&4:10,verticalAlign:!m&&D&&"middle",y:m?D?16:10:D?6:-4,rotation:m&&!D&&90},e),this.renderLabel(e,g,D,J)):c&&c.hide();return h},renderLabel:function(a,k,m,f){var e=this.label,c=this.axis.chart.renderer;e||(e={align:a.textAlign||a.align,rotation:a.rotation,"class":"highcharts-plot-"+(m?"band":"line")+"-label "+(a.className||"")},e.zIndex=f,this.label=e=c.text(a.text,0,0,a.useHTML).attr(e).add(),e.css(a.style));f=k.xBounds||[k[1],k[4],m?k[6]:k[1]];k=k.yBounds||[k[2],k[5],m?k[7]:k[2]];m=G(f);c=G(k);
e.align(a,!1,{x:m,y:c,width:E(f)-m,height:E(k)-c});e.show()},destroy:function(){x(this.axis.plotLinesAndBands,this);delete this.axis;h(this)}};a.extend(F.prototype,{getPlotBandPath:function(a,k){var m=this.getPlotLinePath(k,null,null,!0),f=this.getPlotLinePath(a,null,null,!0),e=[],c=this.horiz,b=1,w;a=a<this.min&&k<this.min||a>this.max&&k>this.max;if(f&&m)for(a&&(w=f.toString()===m.toString(),b=0),a=0;a<f.length;a+=6)c&&m[a+1]===f[a+1]?(m[a+1]+=b,m[a+4]+=b):c||m[a+2]!==f[a+2]||(m[a+2]+=b,m[a+5]+=
b),e.push("M",f[a+1],f[a+2],"L",f[a+4],f[a+5],m[a+4],m[a+5],m[a+1],m[a+2],"z"),e.flat=w;return e},addPlotBand:function(a){return this.addPlotBandOrLine(a,"plotBands")},addPlotLine:function(a){return this.addPlotBandOrLine(a,"plotLines")},addPlotBandOrLine:function(h,k){var m=(new a.PlotLineOrBand(this,h)).render(),f=this.userOptions;m&&(k&&(f[k]=f[k]||[],f[k].push(h)),this.plotLinesAndBands.push(m));return m},removePlotBandOrLine:function(a){for(var k=this.plotLinesAndBands,m=this.options,f=this.userOptions,
e=k.length;e--;)k[e].id===a&&k[e].destroy();p([m.plotLines||[],f.plotLines||[],m.plotBands||[],f.plotBands||[]],function(c){for(e=c.length;e--;)c[e].id===a&&x(c,c[e])})},removePlotBand:function(a){this.removePlotBandOrLine(a)},removePlotLine:function(a){this.removePlotBandOrLine(a)}})})(L,Z);(function(a){var F=a.dateFormat,E=a.each,G=a.extend,r=a.format,h=a.isNumber,p=a.map,x=a.merge,t=a.pick,q=a.splat,z=a.syncTimeout,k=a.timeUnits;a.Tooltip=function(){this.init.apply(this,arguments)};a.Tooltip.prototype=
{init:function(a,f){this.chart=a;this.options=f;this.crosshairs=[];this.now={x:0,y:0};this.isHidden=!0;this.split=f.split&&!a.inverted;this.shared=f.shared||this.split},cleanSplit:function(a){E(this.chart.series,function(f){var e=f&&f.tt;e&&(!e.isActive||a?f.tt=e.destroy():e.isActive=!1)})},getLabel:function(){var a=this.chart.renderer,f=this.options;this.label||(this.split?this.label=a.g("tooltip"):(this.label=a.label("",0,0,f.shape||"callout",null,null,f.useHTML,null,"tooltip").attr({padding:f.padding,
r:f.borderRadius}),this.label.attr({fill:f.backgroundColor,"stroke-width":f.borderWidth}).css(f.style).shadow(f.shadow)),this.label.attr({zIndex:8}).add());return this.label},update:function(a){this.destroy();x(!0,this.chart.options.tooltip.userOptions,a);this.init(this.chart,x(!0,this.options,a))},destroy:function(){this.label&&(this.label=this.label.destroy());this.split&&this.tt&&(this.cleanSplit(this.chart,!0),this.tt=this.tt.destroy());clearTimeout(this.hideTimer);clearTimeout(this.tooltipTimeout)},
move:function(a,f,e,c){var b=this,w=b.now,l=!1!==b.options.animation&&!b.isHidden&&(1<Math.abs(a-w.x)||1<Math.abs(f-w.y)),k=b.followPointer||1<b.len;G(w,{x:l?(2*w.x+a)/3:a,y:l?(w.y+f)/2:f,anchorX:k?void 0:l?(2*w.anchorX+e)/3:e,anchorY:k?void 0:l?(w.anchorY+c)/2:c});b.getLabel().attr(w);l&&(clearTimeout(this.tooltipTimeout),this.tooltipTimeout=setTimeout(function(){b&&b.move(a,f,e,c)},32))},hide:function(a){var f=this;clearTimeout(this.hideTimer);a=t(a,this.options.hideDelay,500);this.isHidden||(this.hideTimer=
z(function(){f.getLabel()[a?"fadeOut":"hide"]();f.isHidden=!0},a))},getAnchor:function(a,f){var e,c=this.chart,b=c.inverted,w=c.plotTop,l=c.plotLeft,k=0,m=0,C,h;a=q(a);e=a[0].tooltipPos;this.followPointer&&f&&(void 0===f.chartX&&(f=c.pointer.normalize(f)),e=[f.chartX-c.plotLeft,f.chartY-w]);e||(E(a,function(a){C=a.series.yAxis;h=a.series.xAxis;k+=a.plotX+(!b&&h?h.left-l:0);m+=(a.plotLow?(a.plotLow+a.plotHigh)/2:a.plotY)+(!b&&C?C.top-w:0)}),k/=a.length,m/=a.length,e=[b?c.plotWidth-m:k,this.shared&&
!b&&1<a.length&&f?f.chartY-w:b?c.plotHeight-k:m]);return p(e,Math.round)},getPosition:function(a,f,e){var c=this.chart,b=this.distance,w={},l=c.inverted&&e.h||0,k,m=["y",c.chartHeight,f,e.plotY+c.plotTop,c.plotTop,c.plotTop+c.plotHeight],C=["x",c.chartWidth,a,e.plotX+c.plotLeft,c.plotLeft,c.plotLeft+c.plotWidth],h=!this.followPointer&&t(e.ttBelow,!c.inverted===!!e.negative),g=function(a,c,g,e,n,A){var d=g<e-b,v=e+b+g<c,u=e-b-g;e+=b;if(h&&v)w[a]=e;else if(!h&&d)w[a]=u;else if(d)w[a]=Math.min(A-g,0>
u-l?u:u-l);else if(v)w[a]=Math.max(n,e+l+g>c?e:e+l);else return!1},y=function(a,c,g,e){var d;e<b||e>c-b?d=!1:w[a]=e<g/2?1:e>c-g/2?c-g-2:e-g/2;return d},J=function(a){var d=m;m=C;C=d;k=a},A=function(){!1!==g.apply(0,m)?!1!==y.apply(0,C)||k||(J(!0),A()):k?w.x=w.y=0:(J(!0),A())};(c.inverted||1<this.len)&&J();A();return w},defaultFormatter:function(a){var f=this.points||q(this),e;e=[a.tooltipFooterHeaderFormatter(f[0])];e=e.concat(a.bodyFormatter(f));e.push(a.tooltipFooterHeaderFormatter(f[0],!0));return e},
refresh:function(a,f){var e,c=this.options,b,w=a,l,k={},m=[];e=c.formatter||this.defaultFormatter;var k=this.shared,C;c.enabled&&(clearTimeout(this.hideTimer),this.followPointer=q(w)[0].series.tooltipOptions.followPointer,l=this.getAnchor(w,f),f=l[0],b=l[1],!k||w.series&&w.series.noSharedTooltip?k=w.getLabelConfig():(E(w,function(a){a.setState("hover");m.push(a.getLabelConfig())}),k={x:w[0].category,y:w[0].y},k.points=m,w=w[0]),this.len=m.length,k=e.call(k,this),C=w.series,this.distance=t(C.tooltipOptions.distance,
16),!1===k?this.hide():(e=this.getLabel(),this.isHidden&&e.attr({opacity:1}).show(),this.split?this.renderSplit(k,q(a)):(c.style.width||e.css({width:this.chart.spacingBox.width}),e.attr({text:k&&k.join?k.join(""):k}),e.removeClass(/highcharts-color-[\d]+/g).addClass("highcharts-color-"+t(w.colorIndex,C.colorIndex)),e.attr({stroke:c.borderColor||w.color||C.color||"#666666"}),this.updatePosition({plotX:f,plotY:b,negative:w.negative,ttBelow:w.ttBelow,h:l[2]||0})),this.isHidden=!1))},renderSplit:function(k,
f){var e=this,c=[],b=this.chart,w=b.renderer,l=!0,m=this.options,h=0,C=this.getLabel();a.isString(k)&&(k=[!1,k]);E(k.slice(0,f.length+1),function(a,g){if(!1!==a){g=f[g-1]||{isHeader:!0,plotX:f[0].plotX};var k=g.series||e,D=k.tt,A=g.series||{},d="highcharts-color-"+t(g.colorIndex,A.colorIndex,"none");D||(k.tt=D=w.label(null,null,null,"callout",null,null,m.useHTML).addClass("highcharts-tooltip-box "+d).attr({padding:m.padding,r:m.borderRadius,fill:m.backgroundColor,stroke:m.borderColor||g.color||A.color||
"#333333","stroke-width":m.borderWidth}).add(C));D.isActive=!0;D.attr({text:a});D.css(m.style).shadow(m.shadow);a=D.getBBox();A=a.width+D.strokeWidth();g.isHeader?(h=a.height,A=Math.max(0,Math.min(g.plotX+b.plotLeft-A/2,b.chartWidth-A))):A=g.plotX+b.plotLeft-t(m.distance,16)-A;0>A&&(l=!1);a=(g.series&&g.series.yAxis&&g.series.yAxis.pos)+(g.plotY||0);a-=b.plotTop;c.push({target:g.isHeader?b.plotHeight+h:a,rank:g.isHeader?1:0,size:k.tt.getBBox().height+1,point:g,x:A,tt:D})}});this.cleanSplit();a.distribute(c,
b.plotHeight+h);E(c,function(a){var c=a.point,e=c.series;a.tt.attr({visibility:void 0===a.pos?"hidden":"inherit",x:l||c.isHeader?a.x:c.plotX+b.plotLeft+t(m.distance,16),y:a.pos+b.plotTop,anchorX:c.isHeader?c.plotX+b.plotLeft:c.plotX+e.xAxis.pos,anchorY:c.isHeader?a.pos+b.plotTop-15:c.plotY+e.yAxis.pos})})},updatePosition:function(a){var f=this.chart,e=this.getLabel(),e=(this.options.positioner||this.getPosition).call(this,e.width,e.height,a);this.move(Math.round(e.x),Math.round(e.y||0),a.plotX+f.plotLeft,
a.plotY+f.plotTop)},getDateFormat:function(a,f,e,c){var b=F("%m-%d %H:%M:%S.%L",f),w,l,m={millisecond:15,second:12,minute:9,hour:6,day:3},h="millisecond";for(l in k){if(a===k.week&&+F("%w",f)===e&&"00:00:00.000"===b.substr(6)){l="week";break}if(k[l]>a){l=h;break}if(m[l]&&b.substr(m[l])!=="01-01 00:00:00.000".substr(m[l]))break;"week"!==l&&(h=l)}l&&(w=c[l]);return w},getXDateFormat:function(a,f,e){f=f.dateTimeLabelFormats;var c=e&&e.closestPointRange;return(c?this.getDateFormat(c,a.x,e.options.startOfWeek,
f):f.day)||f.year},tooltipFooterHeaderFormatter:function(a,f){f=f?"footer":"header";var e=a.series,c=e.tooltipOptions,b=c.xDateFormat,w=e.xAxis,l=w&&"datetime"===w.options.type&&h(a.key),k=c[f+"Format"];l&&!b&&(b=this.getXDateFormat(a,c,w));l&&b&&E(a.point&&a.point.tooltipDateKeys||["key"],function(a){k=k.replace("{point."+a+"}","{point."+a+":"+b+"}")});return r(k,{point:a,series:e})},bodyFormatter:function(a){return p(a,function(a){var e=a.series.tooltipOptions;return(e[(a.point.formatPrefix||"point")+
"Formatter"]||a.point.tooltipFormatter).call(a.point,e[(a.point.formatPrefix||"point")+"Format"])})}}})(L);(function(a){var F=a.addEvent,E=a.attr,G=a.charts,r=a.color,h=a.css,p=a.defined,x=a.each,t=a.extend,q=a.find,z=a.fireEvent,k=a.isObject,m=a.offset,f=a.pick,e=a.splat,c=a.Tooltip;a.Pointer=function(a,c){this.init(a,c)};a.Pointer.prototype={init:function(a,e){this.options=e;this.chart=a;this.runChartClick=e.chart.events&&!!e.chart.events.click;this.pinchDown=[];this.lastValidTouch={};c&&(a.tooltip=
new c(a,e.tooltip),this.followTouchMove=f(e.tooltip.followTouchMove,!0));this.setDOMEvents()},zoomOption:function(a){var b=this.chart,c=b.options.chart,e=c.zoomType||"",b=b.inverted;/touch/.test(a.type)&&(e=f(c.pinchType,e));this.zoomX=a=/x/.test(e);this.zoomY=e=/y/.test(e);this.zoomHor=a&&!b||e&&b;this.zoomVert=e&&!b||a&&b;this.hasZoom=a||e},normalize:function(a,c){var b;b=a.touches?a.touches.length?a.touches.item(0):a.changedTouches[0]:a;c||(this.chartPosition=c=m(this.chart.container));return t(a,
{chartX:Math.round(b.pageX-c.left),chartY:Math.round(b.pageY-c.top)})},getCoordinates:function(a){var b={xAxis:[],yAxis:[]};x(this.chart.axes,function(c){b[c.isXAxis?"xAxis":"yAxis"].push({axis:c,value:c.toValue(a[c.horiz?"chartX":"chartY"])})});return b},findNearestKDPoint:function(a,c,e){var b;x(a,function(a){var l=!(a.noSharedTooltip&&c)&&0>a.options.findNearestPointBy.indexOf("y");a=a.searchPoint(e,l);if((l=k(a,!0))&&!(l=!k(b,!0)))var l=b.distX-a.distX,f=b.dist-a.dist,g=(a.series.group&&a.series.group.zIndex)-
(b.series.group&&b.series.group.zIndex),l=0<(0!==l&&c?l:0!==f?f:0!==g?g:b.series.index>a.series.index?-1:1);l&&(b=a)});return b},getPointFromEvent:function(a){a=a.target;for(var b;a&&!b;)b=a.point,a=a.parentNode;return b},getChartCoordinatesFromPoint:function(a,c){var b=a.series,e=b.xAxis,b=b.yAxis,k=f(a.clientX,a.plotX);if(e&&b)return c?{chartX:e.len+e.pos-k,chartY:b.len+b.pos-a.plotY}:{chartX:k+e.pos,chartY:a.plotY+b.pos}},getHoverData:function(b,c,e,m,h,C,t){var g,l=[],w=t&&t.isBoosting;m=!(!m||
!b);t=c&&!c.stickyTracking?[c]:a.grep(e,function(a){return a.visible&&!(!h&&a.directTouch)&&f(a.options.enableMouseTracking,!0)&&a.stickyTracking});c=(g=m?b:this.findNearestKDPoint(t,h,C))&&g.series;g&&(h&&!c.noSharedTooltip?(t=a.grep(e,function(a){return a.visible&&!(!h&&a.directTouch)&&f(a.options.enableMouseTracking,!0)&&!a.noSharedTooltip}),x(t,function(a){var d=q(a.points,function(a){return a.x===g.x&&!a.isNull});k(d)&&(w&&(d=a.getPoint(d)),l.push(d))})):l.push(g));return{hoverPoint:g,hoverSeries:c,
hoverPoints:l}},runPointActions:function(b,c){var e=this.chart,k=e.tooltip&&e.tooltip.options.enabled?e.tooltip:void 0,w=k?k.shared:!1,m=c||e.hoverPoint,h=m&&m.series||e.hoverSeries,h=this.getHoverData(m,h,e.series,!!c||h&&h.directTouch&&this.isDirectTouch,w,b,{isBoosting:e.isBoosting}),g,m=h.hoverPoint;g=h.hoverPoints;c=(h=h.hoverSeries)&&h.tooltipOptions.followPointer;w=w&&h&&!h.noSharedTooltip;if(m&&(m!==e.hoverPoint||k&&k.isHidden)){x(e.hoverPoints||[],function(b){-1===a.inArray(b,g)&&b.setState()});
x(g||[],function(a){a.setState("hover")});if(e.hoverSeries!==h)h.onMouseOver();e.hoverPoint&&e.hoverPoint.firePointEvent("mouseOut");if(!m.series)return;m.firePointEvent("mouseOver");e.hoverPoints=g;e.hoverPoint=m;k&&k.refresh(w?g:m,b)}else c&&k&&!k.isHidden&&(m=k.getAnchor([{}],b),k.updatePosition({plotX:m[0],plotY:m[1]}));this.unDocMouseMove||(this.unDocMouseMove=F(e.container.ownerDocument,"mousemove",function(b){var c=G[a.hoverChartIndex];if(c)c.pointer.onDocumentMouseMove(b)}));x(e.axes,function(c){var e=
f(c.crosshair.snap,!0),l=e?a.find(g,function(a){return a.series[c.coll]===c}):void 0;l||!e?c.drawCrosshair(b,l):c.hideCrosshair()})},reset:function(a,c){var b=this.chart,f=b.hoverSeries,k=b.hoverPoint,w=b.hoverPoints,m=b.tooltip,g=m&&m.shared?w:k;a&&g&&x(e(g),function(b){b.series.isCartesian&&void 0===b.plotX&&(a=!1)});if(a)m&&g&&(m.refresh(g),k&&(k.setState(k.state,!0),x(b.axes,function(a){a.crosshair&&a.drawCrosshair(null,k)})));else{if(k)k.onMouseOut();w&&x(w,function(a){a.setState()});if(f)f.onMouseOut();
m&&m.hide(c);this.unDocMouseMove&&(this.unDocMouseMove=this.unDocMouseMove());x(b.axes,function(a){a.hideCrosshair()});this.hoverX=b.hoverPoints=b.hoverPoint=null}},scaleGroups:function(a,c){var b=this.chart,e;x(b.series,function(l){e=a||l.getPlotBox();l.xAxis&&l.xAxis.zoomEnabled&&l.group&&(l.group.attr(e),l.markerGroup&&(l.markerGroup.attr(e),l.markerGroup.clip(c?b.clipRect:null)),l.dataLabelsGroup&&l.dataLabelsGroup.attr(e))});b.clipRect.attr(c||b.clipBox)},dragStart:function(a){var b=this.chart;
b.mouseIsDown=a.type;b.cancelClick=!1;b.mouseDownX=this.mouseDownX=a.chartX;b.mouseDownY=this.mouseDownY=a.chartY},drag:function(a){var b=this.chart,c=b.options.chart,e=a.chartX,k=a.chartY,f=this.zoomHor,m=this.zoomVert,g=b.plotLeft,y=b.plotTop,h=b.plotWidth,A=b.plotHeight,d,v=this.selectionMarker,B=this.mouseDownX,u=this.mouseDownY,n=c.panKey&&a[c.panKey+"Key"];v&&v.touch||(e<g?e=g:e>g+h&&(e=g+h),k<y?k=y:k>y+A&&(k=y+A),this.hasDragged=Math.sqrt(Math.pow(B-e,2)+Math.pow(u-k,2)),10<this.hasDragged&&
(d=b.isInsidePlot(B-g,u-y),b.hasCartesianSeries&&(this.zoomX||this.zoomY)&&d&&!n&&!v&&(this.selectionMarker=v=b.renderer.rect(g,y,f?1:h,m?1:A,0).attr({fill:c.selectionMarkerFill||r("#335cad").setOpacity(.25).get(),"class":"highcharts-selection-marker",zIndex:7}).add()),v&&f&&(e-=B,v.attr({width:Math.abs(e),x:(0<e?0:e)+B})),v&&m&&(e=k-u,v.attr({height:Math.abs(e),y:(0<e?0:e)+u})),d&&!v&&c.panning&&b.pan(a,c.panning)))},drop:function(a){var b=this,c=this.chart,e=this.hasPinched;if(this.selectionMarker){var k=
{originalEvent:a,xAxis:[],yAxis:[]},f=this.selectionMarker,m=f.attr?f.attr("x"):f.x,g=f.attr?f.attr("y"):f.y,y=f.attr?f.attr("width"):f.width,J=f.attr?f.attr("height"):f.height,A;if(this.hasDragged||e)x(c.axes,function(d){if(d.zoomEnabled&&p(d.min)&&(e||b[{xAxis:"zoomX",yAxis:"zoomY"}[d.coll]])){var c=d.horiz,l="touchend"===a.type?d.minPixelPadding:0,u=d.toValue((c?m:g)+l),c=d.toValue((c?m+y:g+J)-l);k[d.coll].push({axis:d,min:Math.min(u,c),max:Math.max(u,c)});A=!0}}),A&&z(c,"selection",k,function(a){c.zoom(t(a,
e?{animation:!1}:null))});this.selectionMarker=this.selectionMarker.destroy();e&&this.scaleGroups()}c&&(h(c.container,{cursor:c._cursor}),c.cancelClick=10<this.hasDragged,c.mouseIsDown=this.hasDragged=this.hasPinched=!1,this.pinchDown=[])},onContainerMouseDown:function(a){a=this.normalize(a);this.zoomOption(a);a.preventDefault&&a.preventDefault();this.dragStart(a)},onDocumentMouseUp:function(b){G[a.hoverChartIndex]&&G[a.hoverChartIndex].pointer.drop(b)},onDocumentMouseMove:function(a){var b=this.chart,
c=this.chartPosition;a=this.normalize(a,c);!c||this.inClass(a.target,"highcharts-tracker")||b.isInsidePlot(a.chartX-b.plotLeft,a.chartY-b.plotTop)||this.reset()},onContainerMouseLeave:function(b){var c=G[a.hoverChartIndex];c&&(b.relatedTarget||b.toElement)&&(c.pointer.reset(),c.pointer.chartPosition=null)},onContainerMouseMove:function(b){var c=this.chart;p(a.hoverChartIndex)&&G[a.hoverChartIndex]&&G[a.hoverChartIndex].mouseIsDown||(a.hoverChartIndex=c.index);b=this.normalize(b);b.returnValue=!1;
"mousedown"===c.mouseIsDown&&this.drag(b);!this.inClass(b.target,"highcharts-tracker")&&!c.isInsidePlot(b.chartX-c.plotLeft,b.chartY-c.plotTop)||c.openMenu||this.runPointActions(b)},inClass:function(a,c){for(var b;a;){if(b=E(a,"class")){if(-1!==b.indexOf(c))return!0;if(-1!==b.indexOf("highcharts-container"))return!1}a=a.parentNode}},onTrackerMouseOut:function(a){var b=this.chart.hoverSeries;a=a.relatedTarget||a.toElement;this.isDirectTouch=!1;if(!(!b||!a||b.stickyTracking||this.inClass(a,"highcharts-tooltip")||
this.inClass(a,"highcharts-series-"+b.index)&&this.inClass(a,"highcharts-tracker")))b.onMouseOut()},onContainerClick:function(a){var b=this.chart,c=b.hoverPoint,e=b.plotLeft,f=b.plotTop;a=this.normalize(a);b.cancelClick||(c&&this.inClass(a.target,"highcharts-tracker")?(z(c.series,"click",t(a,{point:c})),b.hoverPoint&&c.firePointEvent("click",a)):(t(a,this.getCoordinates(a)),b.isInsidePlot(a.chartX-e,a.chartY-f)&&z(b,"click",a)))},setDOMEvents:function(){var b=this,c=b.chart.container,e=c.ownerDocument;
c.onmousedown=function(a){b.onContainerMouseDown(a)};c.onmousemove=function(a){b.onContainerMouseMove(a)};c.onclick=function(a){b.onContainerClick(a)};this.unbindContainerMouseLeave=F(c,"mouseleave",b.onContainerMouseLeave);a.unbindDocumentMouseUp||(a.unbindDocumentMouseUp=F(e,"mouseup",b.onDocumentMouseUp));a.hasTouch&&(c.ontouchstart=function(a){b.onContainerTouchStart(a)},c.ontouchmove=function(a){b.onContainerTouchMove(a)},a.unbindDocumentTouchEnd||(a.unbindDocumentTouchEnd=F(e,"touchend",b.onDocumentTouchEnd)))},
destroy:function(){var b=this;b.unDocMouseMove&&b.unDocMouseMove();this.unbindContainerMouseLeave();a.chartCount||(a.unbindDocumentMouseUp&&(a.unbindDocumentMouseUp=a.unbindDocumentMouseUp()),a.unbindDocumentTouchEnd&&(a.unbindDocumentTouchEnd=a.unbindDocumentTouchEnd()));clearInterval(b.tooltipTimeout);a.objectEach(b,function(a,c){b[c]=null})}}})(L);(function(a){var F=a.charts,E=a.each,G=a.extend,r=a.map,h=a.noop,p=a.pick;G(a.Pointer.prototype,{pinchTranslate:function(a,h,p,r,k,m){this.zoomHor&&
this.pinchTranslateDirection(!0,a,h,p,r,k,m);this.zoomVert&&this.pinchTranslateDirection(!1,a,h,p,r,k,m)},pinchTranslateDirection:function(a,h,p,r,k,m,f,e){var c=this.chart,b=a?"x":"y",w=a?"X":"Y",l="chart"+w,D=a?"width":"height",t=c["plot"+(a?"Left":"Top")],C,q,g=e||1,y=c.inverted,J=c.bounds[a?"h":"v"],A=1===h.length,d=h[0][l],v=p[0][l],B=!A&&h[1][l],u=!A&&p[1][l],n;p=function(){!A&&20<Math.abs(d-B)&&(g=e||Math.abs(v-u)/Math.abs(d-B));q=(t-v)/g+d;C=c["plot"+(a?"Width":"Height")]/g};p();h=q;h<J.min?
(h=J.min,n=!0):h+C>J.max&&(h=J.max-C,n=!0);n?(v-=.8*(v-f[b][0]),A||(u-=.8*(u-f[b][1])),p()):f[b]=[v,u];y||(m[b]=q-t,m[D]=C);m=y?1/g:g;k[D]=C;k[b]=h;r[y?a?"scaleY":"scaleX":"scale"+w]=g;r["translate"+w]=m*t+(v-m*d)},pinch:function(a){var t=this,q=t.chart,x=t.pinchDown,k=a.touches,m=k.length,f=t.lastValidTouch,e=t.hasZoom,c=t.selectionMarker,b={},w=1===m&&(t.inClass(a.target,"highcharts-tracker")&&q.runTrackerClick||t.runChartClick),l={};1<m&&(t.initiated=!0);e&&t.initiated&&!w&&a.preventDefault();
r(k,function(a){return t.normalize(a)});"touchstart"===a.type?(E(k,function(a,b){x[b]={chartX:a.chartX,chartY:a.chartY}}),f.x=[x[0].chartX,x[1]&&x[1].chartX],f.y=[x[0].chartY,x[1]&&x[1].chartY],E(q.axes,function(a){if(a.zoomEnabled){var b=q.bounds[a.horiz?"h":"v"],c=a.minPixelPadding,e=a.toPixels(p(a.options.min,a.dataMin)),g=a.toPixels(p(a.options.max,a.dataMax)),l=Math.max(e,g);b.min=Math.min(a.pos,Math.min(e,g)-c);b.max=Math.max(a.pos+a.len,l+c)}}),t.res=!0):t.followTouchMove&&1===m?this.runPointActions(t.normalize(a)):
x.length&&(c||(t.selectionMarker=c=G({destroy:h,touch:!0},q.plotBox)),t.pinchTranslate(x,k,b,c,l,f),t.hasPinched=e,t.scaleGroups(b,l),t.res&&(t.res=!1,this.reset(!1,0)))},touch:function(h,t){var q=this.chart,r,k;if(q.index!==a.hoverChartIndex)this.onContainerMouseLeave({relatedTarget:!0});a.hoverChartIndex=q.index;1===h.touches.length?(h=this.normalize(h),(k=q.isInsidePlot(h.chartX-q.plotLeft,h.chartY-q.plotTop))&&!q.openMenu?(t&&this.runPointActions(h),"touchmove"===h.type&&(t=this.pinchDown,r=t[0]?
4<=Math.sqrt(Math.pow(t[0].chartX-h.chartX,2)+Math.pow(t[0].chartY-h.chartY,2)):!1),p(r,!0)&&this.pinch(h)):t&&this.reset()):2===h.touches.length&&this.pinch(h)},onContainerTouchStart:function(a){this.zoomOption(a);this.touch(a,!0)},onContainerTouchMove:function(a){this.touch(a)},onDocumentTouchEnd:function(h){F[a.hoverChartIndex]&&F[a.hoverChartIndex].pointer.drop(h)}})})(L);(function(a){var F=a.addEvent,E=a.charts,G=a.css,r=a.doc,h=a.extend,p=a.noop,x=a.Pointer,t=a.removeEvent,q=a.win,z=a.wrap;
if(!a.hasTouch&&(q.PointerEvent||q.MSPointerEvent)){var k={},m=!!q.PointerEvent,f=function(){var c=[];c.item=function(a){return this[a]};a.objectEach(k,function(a){c.push({pageX:a.pageX,pageY:a.pageY,target:a.target})});return c},e=function(c,b,e,l){"touch"!==c.pointerType&&c.pointerType!==c.MSPOINTER_TYPE_TOUCH||!E[a.hoverChartIndex]||(l(c),l=E[a.hoverChartIndex].pointer,l[b]({type:e,target:c.currentTarget,preventDefault:p,touches:f()}))};h(x.prototype,{onContainerPointerDown:function(a){e(a,"onContainerTouchStart",
"touchstart",function(a){k[a.pointerId]={pageX:a.pageX,pageY:a.pageY,target:a.currentTarget}})},onContainerPointerMove:function(a){e(a,"onContainerTouchMove","touchmove",function(a){k[a.pointerId]={pageX:a.pageX,pageY:a.pageY};k[a.pointerId].target||(k[a.pointerId].target=a.currentTarget)})},onDocumentPointerUp:function(a){e(a,"onDocumentTouchEnd","touchend",function(a){delete k[a.pointerId]})},batchMSEvents:function(a){a(this.chart.container,m?"pointerdown":"MSPointerDown",this.onContainerPointerDown);
a(this.chart.container,m?"pointermove":"MSPointerMove",this.onContainerPointerMove);a(r,m?"pointerup":"MSPointerUp",this.onDocumentPointerUp)}});z(x.prototype,"init",function(a,b,e){a.call(this,b,e);this.hasZoom&&G(b.container,{"-ms-touch-action":"none","touch-action":"none"})});z(x.prototype,"setDOMEvents",function(a){a.apply(this);(this.hasZoom||this.followTouchMove)&&this.batchMSEvents(F)});z(x.prototype,"destroy",function(a){this.batchMSEvents(t);a.call(this)})}})(L);(function(a){var F=a.addEvent,
E=a.css,G=a.discardElement,r=a.defined,h=a.each,p=a.isFirefox,x=a.marginNames,t=a.merge,q=a.pick,z=a.setAnimation,k=a.stableSort,m=a.win,f=a.wrap;a.Legend=function(a,c){this.init(a,c)};a.Legend.prototype={init:function(a,c){this.chart=a;this.setOptions(c);c.enabled&&(this.render(),F(this.chart,"endResize",function(){this.legend.positionCheckboxes()}))},setOptions:function(a){var c=q(a.padding,8);this.options=a;this.itemStyle=a.itemStyle;this.itemHiddenStyle=t(this.itemStyle,a.itemHiddenStyle);this.itemMarginTop=
a.itemMarginTop||0;this.padding=c;this.initialItemY=c-5;this.itemHeight=this.maxItemWidth=0;this.symbolWidth=q(a.symbolWidth,16);this.pages=[]},update:function(a,c){var b=this.chart;this.setOptions(t(!0,this.options,a));this.destroy();b.isDirtyLegend=b.isDirtyBox=!0;q(c,!0)&&b.redraw()},colorizeItem:function(a,c){a.legendGroup[c?"removeClass":"addClass"]("highcharts-legend-item-hidden");var b=this.options,e=a.legendItem,l=a.legendLine,f=a.legendSymbol,k=this.itemHiddenStyle.color,b=c?b.itemStyle.color:
k,m=c?a.color||k:k,h=a.options&&a.options.marker,g={fill:m};e&&e.css({fill:b,color:b});l&&l.attr({stroke:m});f&&(h&&f.isMarker&&(g=a.pointAttribs(),c||(g.stroke=g.fill=k)),f.attr(g))},positionItem:function(a){var c=this.options,b=c.symbolPadding,c=!c.rtl,e=a._legendItemPos,l=e[0],e=e[1],f=a.checkbox;(a=a.legendGroup)&&a.element&&a.translate(c?l:this.legendWidth-l-2*b-4,e);f&&(f.x=l,f.y=e)},destroyItem:function(a){var c=a.checkbox;h(["legendItem","legendLine","legendSymbol","legendGroup"],function(b){a[b]&&
(a[b]=a[b].destroy())});c&&G(a.checkbox)},destroy:function(){function a(a){this[a]&&(this[a]=this[a].destroy())}h(this.getAllItems(),function(c){h(["legendItem","legendGroup"],a,c)});h("clipRect up down pager nav box title group".split(" "),a,this);this.display=null},positionCheckboxes:function(){var a=this.group&&this.group.alignAttr,c,b=this.clipHeight||this.legendHeight,f=this.titleHeight;a&&(c=a.translateY,h(this.allItems,function(e){var l=e.checkbox,k;l&&(k=c+f+l.y+(this.scrollOffset||0)+3,E(l,
{left:a.translateX+e.checkboxOffset+l.x-20+"px",top:k+"px",display:k>c-6&&k<c+b-6?"":"none"}))},this))},renderTitle:function(){var a=this.options,c=this.padding,b=a.title,f=0;b.text&&(this.title||(this.title=this.chart.renderer.label(b.text,c-3,c-4,null,null,null,a.useHTML,null,"legend-title").attr({zIndex:1}).css(b.style).add(this.group)),a=this.title.getBBox(),f=a.height,this.offsetWidth=a.width,this.contentGroup.attr({translateY:f}));this.titleHeight=f},setText:function(e){var c=this.options;e.legendItem.attr({text:c.labelFormat?
a.format(c.labelFormat,e):c.labelFormatter.call(e)})},renderItem:function(a){var c=this.chart,b=c.renderer,e=this.options,l="horizontal"===e.layout,f=this.symbolWidth,k=e.symbolPadding,m=this.itemStyle,h=this.itemHiddenStyle,g=this.padding,y=l?q(e.itemDistance,20):0,p=!e.rtl,A=e.width,d=e.itemMarginBottom||0,v=this.itemMarginTop,B=a.legendItem,u=!a.series,n=!u&&a.series.drawLegendSymbol?a.series:a,r=n.options,M=this.createCheckboxForItem&&r&&r.showCheckbox,r=f+k+y+(M?20:0),x=e.useHTML,N=a.options.className;
B||(a.legendGroup=b.g("legend-item").addClass("highcharts-"+n.type+"-series highcharts-color-"+a.colorIndex+(N?" "+N:"")+(u?" highcharts-series-"+a.index:"")).attr({zIndex:1}).add(this.scrollGroup),a.legendItem=B=b.text("",p?f+k:-k,this.baseline||0,x).css(t(a.visible?m:h)).attr({align:p?"left":"right",zIndex:2}).add(a.legendGroup),this.baseline||(f=m.fontSize,this.fontMetrics=b.fontMetrics(f,B),this.baseline=this.fontMetrics.f+3+v,B.attr("y",this.baseline)),this.symbolHeight=e.symbolHeight||this.fontMetrics.f,
n.drawLegendSymbol(this,a),this.setItemEvents&&this.setItemEvents(a,B,x),M&&this.createCheckboxForItem(a));this.colorizeItem(a,a.visible);m.width||B.css({width:(e.itemWidth||e.width||c.spacingBox.width)-r});this.setText(a);b=B.getBBox();m=a.checkboxOffset=e.itemWidth||a.legendItemWidth||b.width+r;this.itemHeight=b=Math.round(a.legendItemHeight||b.height||this.symbolHeight);l&&this.itemX-g+m>(A||c.spacingBox.width-2*g-e.x)&&(this.itemX=g,this.itemY+=v+this.lastLineHeight+d,this.lastLineHeight=0);this.maxItemWidth=
Math.max(this.maxItemWidth,m);this.lastItemY=v+this.itemY+d;this.lastLineHeight=Math.max(b,this.lastLineHeight);a._legendItemPos=[this.itemX,this.itemY];l?this.itemX+=m:(this.itemY+=v+b+d,this.lastLineHeight=b);this.offsetWidth=A||Math.max((l?this.itemX-g-(a.checkbox?0:y):m)+g,this.offsetWidth)},getAllItems:function(){var a=[];h(this.chart.series,function(c){var b=c&&c.options;c&&q(b.showInLegend,r(b.linkedTo)?!1:void 0,!0)&&(a=a.concat(c.legendItems||("point"===b.legendType?c.data:c)))});return a},
adjustMargins:function(a,c){var b=this.chart,e=this.options,l=e.align.charAt(0)+e.verticalAlign.charAt(0)+e.layout.charAt(0);e.floating||h([/(lth|ct|rth)/,/(rtv|rm|rbv)/,/(rbh|cb|lbh)/,/(lbv|lm|ltv)/],function(f,k){f.test(l)&&!r(a[k])&&(b[x[k]]=Math.max(b[x[k]],b.legend[(k+1)%2?"legendHeight":"legendWidth"]+[1,-1,-1,1][k]*e[k%2?"x":"y"]+q(e.margin,12)+c[k]))})},render:function(){var a=this,c=a.chart,b=c.renderer,f=a.group,l,m,p,C,q=a.box,g=a.options,y=a.padding;a.itemX=y;a.itemY=a.initialItemY;a.offsetWidth=
0;a.lastItemY=0;f||(a.group=f=b.g("legend").attr({zIndex:7}).add(),a.contentGroup=b.g().attr({zIndex:1}).add(f),a.scrollGroup=b.g().add(a.contentGroup));a.renderTitle();l=a.getAllItems();k(l,function(a,b){return(a.options&&a.options.legendIndex||0)-(b.options&&b.options.legendIndex||0)});g.reversed&&l.reverse();a.allItems=l;a.display=m=!!l.length;a.lastLineHeight=0;h(l,function(b){a.renderItem(b)});p=(g.width||a.offsetWidth)+y;C=a.lastItemY+a.lastLineHeight+a.titleHeight;C=a.handleOverflow(C);C+=
y;q||(a.box=q=b.rect().addClass("highcharts-legend-box").attr({r:g.borderRadius}).add(f),q.isNew=!0);q.attr({stroke:g.borderColor,"stroke-width":g.borderWidth||0,fill:g.backgroundColor||"none"}).shadow(g.shadow);0<p&&0<C&&(q[q.isNew?"attr":"animate"](q.crisp.call({},{x:0,y:0,width:p,height:C},q.strokeWidth())),q.isNew=!1);q[m?"show":"hide"]();a.legendWidth=p;a.legendHeight=C;h(l,function(b){a.positionItem(b)});m&&f.align(t(g,{width:p,height:C}),!0,"spacingBox");c.isResizing||this.positionCheckboxes()},
handleOverflow:function(a){var c=this,b=this.chart,e=b.renderer,l=this.options,f=l.y,k=this.padding,b=b.spacingBox.height+("top"===l.verticalAlign?-f:f)-k,f=l.maxHeight,m,p=this.clipRect,g=l.navigation,y=q(g.animation,!0),t=g.arrowSize||12,A=this.nav,d=this.pages,v,B=this.allItems,u=function(a){"number"===typeof a?p.attr({height:a}):p&&(c.clipRect=p.destroy(),c.contentGroup.clip());c.contentGroup.div&&(c.contentGroup.div.style.clip=a?"rect("+k+"px,9999px,"+(k+a)+"px,0)":"auto")};"horizontal"!==l.layout||
"middle"===l.verticalAlign||l.floating||(b/=2);f&&(b=Math.min(b,f));d.length=0;a>b&&!1!==g.enabled?(this.clipHeight=m=Math.max(b-20-this.titleHeight-k,0),this.currentPage=q(this.currentPage,1),this.fullHeight=a,h(B,function(a,b){var c=a._legendItemPos[1];a=Math.round(a.legendItem.getBBox().height);var g=d.length;if(!g||c-d[g-1]>m&&(v||c)!==d[g-1])d.push(v||c),g++;b===B.length-1&&c+a-d[g-1]>m&&d.push(c);c!==v&&(v=c)}),p||(p=c.clipRect=e.clipRect(0,k,9999,0),c.contentGroup.clip(p)),u(m),A||(this.nav=
A=e.g().attr({zIndex:1}).add(this.group),this.up=e.symbol("triangle",0,0,t,t).on("click",function(){c.scroll(-1,y)}).add(A),this.pager=e.text("",15,10).addClass("highcharts-legend-navigation").css(g.style).add(A),this.down=e.symbol("triangle-down",0,0,t,t).on("click",function(){c.scroll(1,y)}).add(A)),c.scroll(0),a=b):A&&(u(),this.nav=A.destroy(),this.scrollGroup.attr({translateY:1}),this.clipHeight=0);return a},scroll:function(a,c){var b=this.pages,e=b.length;a=this.currentPage+a;var l=this.clipHeight,
f=this.options.navigation,k=this.pager,m=this.padding;a>e&&(a=e);0<a&&(void 0!==c&&z(c,this.chart),this.nav.attr({translateX:m,translateY:l+this.padding+7+this.titleHeight,visibility:"visible"}),this.up.attr({"class":1===a?"highcharts-legend-nav-inactive":"highcharts-legend-nav-active"}),k.attr({text:a+"/"+e}),this.down.attr({x:18+this.pager.getBBox().width,"class":a===e?"highcharts-legend-nav-inactive":"highcharts-legend-nav-active"}),this.up.attr({fill:1===a?f.inactiveColor:f.activeColor}).css({cursor:1===
a?"default":"pointer"}),this.down.attr({fill:a===e?f.inactiveColor:f.activeColor}).css({cursor:a===e?"default":"pointer"}),this.scrollOffset=-b[a-1]+this.initialItemY,this.scrollGroup.animate({translateY:this.scrollOffset}),this.currentPage=a,this.positionCheckboxes())}};a.LegendSymbolMixin={drawRectangle:function(a,c){var b=a.symbolHeight,e=a.options.squareSymbol;c.legendSymbol=this.chart.renderer.rect(e?(a.symbolWidth-b)/2:0,a.baseline-b+1,e?b:a.symbolWidth,b,q(a.options.symbolRadius,b/2)).addClass("highcharts-point").attr({zIndex:3}).add(c.legendGroup)},
drawLineMarker:function(a){var c=this.options,b=c.marker,e=a.symbolWidth,l=a.symbolHeight,f=l/2,k=this.chart.renderer,m=this.legendGroup;a=a.baseline-Math.round(.3*a.fontMetrics.b);var h;h={"stroke-width":c.lineWidth||0};c.dashStyle&&(h.dashstyle=c.dashStyle);this.legendLine=k.path(["M",0,a,"L",e,a]).addClass("highcharts-graph").attr(h).add(m);b&&!1!==b.enabled&&(c=Math.min(q(b.radius,f),f),0===this.symbol.indexOf("url")&&(b=t(b,{width:l,height:l}),c=0),this.legendSymbol=b=k.symbol(this.symbol,e/
2-c,a-c,2*c,2*c,b).addClass("highcharts-point").add(m),b.isMarker=!0)}};(/Trident\/7\.0/.test(m.navigator.userAgent)||p)&&f(a.Legend.prototype,"positionItem",function(a,c){var b=this,e=function(){c._legendItemPos&&a.call(b,c)};e();setTimeout(e)})})(L);(function(a){var F=a.addEvent,E=a.animate,G=a.animObject,r=a.attr,h=a.doc,p=a.Axis,x=a.createElement,t=a.defaultOptions,q=a.discardElement,z=a.charts,k=a.css,m=a.defined,f=a.each,e=a.extend,c=a.find,b=a.fireEvent,w=a.grep,l=a.isNumber,D=a.isObject,H=
a.isString,C=a.Legend,K=a.marginNames,g=a.merge,y=a.objectEach,J=a.Pointer,A=a.pick,d=a.pInt,v=a.removeEvent,B=a.seriesTypes,u=a.splat,n=a.svg,P=a.syncTimeout,M=a.win,O=a.Chart=function(){this.getArgs.apply(this,arguments)};a.chart=function(a,d,b){return new O(a,d,b)};e(O.prototype,{callbacks:[],getArgs:function(){var a=[].slice.call(arguments);if(H(a[0])||a[0].nodeName)this.renderTo=a.shift();this.init(a[0],a[1])},init:function(d,b){var c,n,v=d.series,e=d.plotOptions||{};d.series=null;c=g(t,d);for(n in c.plotOptions)c.plotOptions[n].tooltip=
e[n]&&g(e[n].tooltip)||void 0;c.tooltip.userOptions=d.chart&&d.chart.forExport&&d.tooltip.userOptions||d.tooltip;c.series=d.series=v;this.userOptions=d;d=c.chart;n=d.events;this.margin=[];this.spacing=[];this.bounds={h:{},v:{}};this.labelCollectors=[];this.callback=b;this.isResizing=0;this.options=c;this.axes=[];this.series=[];this.hasCartesianSeries=d.showAxes;var l=this;l.index=z.length;z.push(l);a.chartCount++;n&&y(n,function(a,d){F(l,d,a)});l.xAxis=[];l.yAxis=[];l.pointCount=l.colorCounter=l.symbolCounter=
0;l.firstRender()},initSeries:function(d){var b=this.options.chart;(b=B[d.type||b.type||b.defaultSeriesType])||a.error(17,!0);b=new b;b.init(this,d);return b},orderSeries:function(a){var d=this.series;for(a=a||0;a<d.length;a++)d[a]&&(d[a].index=a,d[a].name=d[a].name||"Series "+(d[a].index+1))},isInsidePlot:function(a,d,b){var c=b?d:a;a=b?a:d;return 0<=c&&c<=this.plotWidth&&0<=a&&a<=this.plotHeight},redraw:function(d){var c=this.axes,g=this.series,n=this.pointer,v=this.legend,l=this.isDirtyLegend,
A,u,k=this.hasCartesianSeries,B=this.isDirtyBox,m,h=this.renderer,y=h.isHidden(),w=[];this.setResponsive&&this.setResponsive(!1);a.setAnimation(d,this);y&&this.temporaryDisplay();this.layOutTitles();for(d=g.length;d--;)if(m=g[d],m.options.stacking&&(A=!0,m.isDirty)){u=!0;break}if(u)for(d=g.length;d--;)m=g[d],m.options.stacking&&(m.isDirty=!0);f(g,function(a){a.isDirty&&"point"===a.options.legendType&&(a.updateTotals&&a.updateTotals(),l=!0);a.isDirtyData&&b(a,"updatedData")});l&&v.options.enabled&&
(v.render(),this.isDirtyLegend=!1);A&&this.getStacks();k&&f(c,function(a){a.updateNames();a.setScale()});this.getMargins();k&&(f(c,function(a){a.isDirty&&(B=!0)}),f(c,function(a){var d=a.min+","+a.max;a.extKey!==d&&(a.extKey=d,w.push(function(){b(a,"afterSetExtremes",e(a.eventArgs,a.getExtremes()));delete a.eventArgs}));(B||A)&&a.redraw()}));B&&this.drawChartBox();b(this,"predraw");f(g,function(a){(B||a.isDirty)&&a.visible&&a.redraw();a.isDirtyData=!1});n&&n.reset(!0);h.draw();b(this,"redraw");b(this,
"render");y&&this.temporaryDisplay(!0);f(w,function(a){a.call()})},get:function(a){function d(d){return d.id===a||d.options&&d.options.id===a}var b,g=this.series,n;b=c(this.axes,d)||c(this.series,d);for(n=0;!b&&n<g.length;n++)b=c(g[n].points||[],d);return b},getAxes:function(){var a=this,d=this.options,b=d.xAxis=u(d.xAxis||{}),d=d.yAxis=u(d.yAxis||{});f(b,function(a,d){a.index=d;a.isX=!0});f(d,function(a,d){a.index=d});b=b.concat(d);f(b,function(d){new p(a,d)})},getSelectedPoints:function(){var a=
[];f(this.series,function(d){a=a.concat(w(d.data||[],function(a){return a.selected}))});return a},getSelectedSeries:function(){return w(this.series,function(a){return a.selected})},setTitle:function(a,d,b){var c=this,n=c.options,v;v=n.title=g({style:{color:"#333333",fontSize:n.isStock?"16px":"18px"}},n.title,a);n=n.subtitle=g({style:{color:"#666666"}},n.subtitle,d);f([["title",a,v],["subtitle",d,n]],function(a,d){var b=a[0],g=c[b],n=a[1];a=a[2];g&&n&&(c[b]=g=g.destroy());a&&!g&&(c[b]=c.renderer.text(a.text,
0,0,a.useHTML).attr({align:a.align,"class":"highcharts-"+b,zIndex:a.zIndex||4}).add(),c[b].update=function(a){c.setTitle(!d&&a,d&&a)},c[b].css(a.style))});c.layOutTitles(b)},layOutTitles:function(a){var d=0,b,c=this.renderer,g=this.spacingBox;f(["title","subtitle"],function(a){var b=this[a],n=this.options[a];a="title"===a?-3:n.verticalAlign?0:d+2;var v;b&&(v=n.style.fontSize,v=c.fontMetrics(v,b).b,b.css({width:(n.width||g.width+n.widthAdjust)+"px"}).align(e({y:a+v},n),!1,"spacingBox"),n.floating||
n.verticalAlign||(d=Math.ceil(d+b.getBBox(n.useHTML).height)))},this);b=this.titleOffset!==d;this.titleOffset=d;!this.isDirtyBox&&b&&(this.isDirtyBox=b,this.hasRendered&&A(a,!0)&&this.isDirtyBox&&this.redraw())},getChartSize:function(){var d=this.options.chart,b=d.width,d=d.height,c=this.renderTo;m(b)||(this.containerWidth=a.getStyle(c,"width"));m(d)||(this.containerHeight=a.getStyle(c,"height"));this.chartWidth=Math.max(0,b||this.containerWidth||600);this.chartHeight=Math.max(0,a.relativeLength(d,
this.chartWidth)||(1<this.containerHeight?this.containerHeight:400))},temporaryDisplay:function(d){var b=this.renderTo;if(d)for(;b&&b.style;)b.hcOrigStyle&&(a.css(b,b.hcOrigStyle),delete b.hcOrigStyle),b.hcOrigDetached&&(h.body.removeChild(b),b.hcOrigDetached=!1),b=b.parentNode;else for(;b&&b.style;){h.body.contains(b)||b.parentNode||(b.hcOrigDetached=!0,h.body.appendChild(b));if("none"===a.getStyle(b,"display",!1)||b.hcOricDetached)b.hcOrigStyle={display:b.style.display,height:b.style.height,overflow:b.style.overflow},
d={display:"block",overflow:"hidden"},b!==this.renderTo&&(d.height=0),a.css(b,d),b.offsetWidth||b.style.setProperty("display","block","important");b=b.parentNode;if(b===h.body)break}},setClassName:function(a){this.container.className="highcharts-container "+(a||"")},getContainer:function(){var b,c=this.options,g=c.chart,n,v;b=this.renderTo;var A=a.uniqueKey(),u;b||(this.renderTo=b=g.renderTo);H(b)&&(this.renderTo=b=h.getElementById(b));b||a.error(13,!0);n=d(r(b,"data-highcharts-chart"));l(n)&&z[n]&&
z[n].hasRendered&&z[n].destroy();r(b,"data-highcharts-chart",this.index);b.innerHTML="";g.skipClone||b.offsetWidth||this.temporaryDisplay();this.getChartSize();n=this.chartWidth;v=this.chartHeight;u=e({position:"relative",overflow:"hidden",width:n+"px",height:v+"px",textAlign:"left",lineHeight:"normal",zIndex:0,"-webkit-tap-highlight-color":"rgba(0,0,0,0)"},g.style);this.container=b=x("div",{id:A},u,b);this._cursor=b.style.cursor;this.renderer=new (a[g.renderer]||a.Renderer)(b,n,v,null,g.forExport,
c.exporting&&c.exporting.allowHTML);this.setClassName(g.className);this.renderer.setStyle(g.style);this.renderer.chartIndex=this.index},getMargins:function(a){var d=this.spacing,b=this.margin,c=this.titleOffset;this.resetMargins();c&&!m(b[0])&&(this.plotTop=Math.max(this.plotTop,c+this.options.title.margin+d[0]));this.legend&&this.legend.display&&this.legend.adjustMargins(b,d);this.extraMargin&&(this[this.extraMargin.type]=(this[this.extraMargin.type]||0)+this.extraMargin.value);this.adjustPlotArea&&
this.adjustPlotArea();a||this.getAxisMargins()},getAxisMargins:function(){var a=this,d=a.axisOffset=[0,0,0,0],b=a.margin;a.hasCartesianSeries&&f(a.axes,function(a){a.visible&&a.getOffset()});f(K,function(c,g){m(b[g])||(a[c]+=d[g])});a.setChartSize()},reflow:function(d){var b=this,c=b.options.chart,g=b.renderTo,n=m(c.width)&&m(c.height),v=c.width||a.getStyle(g,"width"),c=c.height||a.getStyle(g,"height"),g=d?d.target:M;if(!n&&!b.isPrinting&&v&&c&&(g===M||g===h)){if(v!==b.containerWidth||c!==b.containerHeight)clearTimeout(b.reflowTimeout),
b.reflowTimeout=P(function(){b.container&&b.setSize(void 0,void 0,!1)},d?100:0);b.containerWidth=v;b.containerHeight=c}},initReflow:function(){var a=this,d;d=F(M,"resize",function(d){a.reflow(d)});F(a,"destroy",d)},setSize:function(d,c,g){var n=this,v=n.renderer;n.isResizing+=1;a.setAnimation(g,n);n.oldChartHeight=n.chartHeight;n.oldChartWidth=n.chartWidth;void 0!==d&&(n.options.chart.width=d);void 0!==c&&(n.options.chart.height=c);n.getChartSize();d=v.globalAnimation;(d?E:k)(n.container,{width:n.chartWidth+
"px",height:n.chartHeight+"px"},d);n.setChartSize(!0);v.setSize(n.chartWidth,n.chartHeight,g);f(n.axes,function(a){a.isDirty=!0;a.setScale()});n.isDirtyLegend=!0;n.isDirtyBox=!0;n.layOutTitles();n.getMargins();n.redraw(g);n.oldChartHeight=null;b(n,"resize");P(function(){n&&b(n,"endResize",null,function(){--n.isResizing})},G(d).duration)},setChartSize:function(a){var d=this.inverted,b=this.renderer,c=this.chartWidth,g=this.chartHeight,n=this.options.chart,v=this.spacing,e=this.clipOffset,l,A,u,k;this.plotLeft=
l=Math.round(this.plotLeft);this.plotTop=A=Math.round(this.plotTop);this.plotWidth=u=Math.max(0,Math.round(c-l-this.marginRight));this.plotHeight=k=Math.max(0,Math.round(g-A-this.marginBottom));this.plotSizeX=d?k:u;this.plotSizeY=d?u:k;this.plotBorderWidth=n.plotBorderWidth||0;this.spacingBox=b.spacingBox={x:v[3],y:v[0],width:c-v[3]-v[1],height:g-v[0]-v[2]};this.plotBox=b.plotBox={x:l,y:A,width:u,height:k};c=2*Math.floor(this.plotBorderWidth/2);d=Math.ceil(Math.max(c,e[3])/2);b=Math.ceil(Math.max(c,
e[0])/2);this.clipBox={x:d,y:b,width:Math.floor(this.plotSizeX-Math.max(c,e[1])/2-d),height:Math.max(0,Math.floor(this.plotSizeY-Math.max(c,e[2])/2-b))};a||f(this.axes,function(a){a.setAxisSize();a.setAxisTranslation()})},resetMargins:function(){var a=this,d=a.options.chart;f(["margin","spacing"],function(b){var c=d[b],g=D(c)?c:[c,c,c,c];f(["Top","Right","Bottom","Left"],function(c,n){a[b][n]=A(d[b+c],g[n])})});f(K,function(d,b){a[d]=A(a.margin[b],a.spacing[b])});a.axisOffset=[0,0,0,0];a.clipOffset=
[0,0,0,0]},drawChartBox:function(){var a=this.options.chart,d=this.renderer,b=this.chartWidth,c=this.chartHeight,g=this.chartBackground,n=this.plotBackground,v=this.plotBorder,e,l=this.plotBGImage,A=a.backgroundColor,u=a.plotBackgroundColor,f=a.plotBackgroundImage,k,B=this.plotLeft,m=this.plotTop,h=this.plotWidth,y=this.plotHeight,w=this.plotBox,C=this.clipRect,p=this.clipBox,t="animate";g||(this.chartBackground=g=d.rect().addClass("highcharts-background").add(),t="attr");e=a.borderWidth||0;k=e+(a.shadow?
8:0);A={fill:A||"none"};if(e||g["stroke-width"])A.stroke=a.borderColor,A["stroke-width"]=e;g.attr(A).shadow(a.shadow);g[t]({x:k/2,y:k/2,width:b-k-e%2,height:c-k-e%2,r:a.borderRadius});t="animate";n||(t="attr",this.plotBackground=n=d.rect().addClass("highcharts-plot-background").add());n[t](w);n.attr({fill:u||"none"}).shadow(a.plotShadow);f&&(l?l.animate(w):this.plotBGImage=d.image(f,B,m,h,y).add());C?C.animate({width:p.width,height:p.height}):this.clipRect=d.clipRect(p);t="animate";v||(t="attr",this.plotBorder=
v=d.rect().addClass("highcharts-plot-border").attr({zIndex:1}).add());v.attr({stroke:a.plotBorderColor,"stroke-width":a.plotBorderWidth||0,fill:"none"});v[t](v.crisp({x:B,y:m,width:h,height:y},-v.strokeWidth()));this.isDirtyBox=!1},propFromSeries:function(){var a=this,d=a.options.chart,b,c=a.options.series,g,n;f(["inverted","angular","polar"],function(v){b=B[d.type||d.defaultSeriesType];n=d[v]||b&&b.prototype[v];for(g=c&&c.length;!n&&g--;)(b=B[c[g].type])&&b.prototype[v]&&(n=!0);a[v]=n})},linkSeries:function(){var a=
this,d=a.series;f(d,function(a){a.linkedSeries.length=0});f(d,function(d){var b=d.options.linkedTo;H(b)&&(b=":previous"===b?a.series[d.index-1]:a.get(b))&&b.linkedParent!==d&&(b.linkedSeries.push(d),d.linkedParent=b,d.visible=A(d.options.visible,b.options.visible,d.visible))})},renderSeries:function(){f(this.series,function(a){a.translate();a.render()})},renderLabels:function(){var a=this,b=a.options.labels;b.items&&f(b.items,function(c){var g=e(b.style,c.style),n=d(g.left)+a.plotLeft,v=d(g.top)+
a.plotTop+12;delete g.left;delete g.top;a.renderer.text(c.html,n,v).attr({zIndex:2}).css(g).add()})},render:function(){var a=this.axes,d=this.renderer,b=this.options,c,g,n;this.setTitle();this.legend=new C(this,b.legend);this.getStacks&&this.getStacks();this.getMargins(!0);this.setChartSize();b=this.plotWidth;c=this.plotHeight=Math.max(this.plotHeight-21,0);f(a,function(a){a.setScale()});this.getAxisMargins();g=1.1<b/this.plotWidth;n=1.05<c/this.plotHeight;if(g||n)f(a,function(a){(a.horiz&&g||!a.horiz&&
n)&&a.setTickInterval(!0)}),this.getMargins();this.drawChartBox();this.hasCartesianSeries&&f(a,function(a){a.visible&&a.render()});this.seriesGroup||(this.seriesGroup=d.g("series-group").attr({zIndex:3}).add());this.renderSeries();this.renderLabels();this.addCredits();this.setResponsive&&this.setResponsive();this.hasRendered=!0},addCredits:function(a){var d=this;a=g(!0,this.options.credits,a);a.enabled&&!this.credits&&(this.credits=this.renderer.text(a.text+(this.mapCredits||""),0,0).addClass("highcharts-credits").on("click",
function(){a.href&&(M.location.href=a.href)}).attr({align:a.position.align,zIndex:8}).css(a.style).add().align(a.position),this.credits.update=function(a){d.credits=d.credits.destroy();d.addCredits(a)})},destroy:function(){var d=this,c=d.axes,g=d.series,n=d.container,e,l=n&&n.parentNode;b(d,"destroy");d.renderer.forExport?a.erase(z,d):z[d.index]=void 0;a.chartCount--;d.renderTo.removeAttribute("data-highcharts-chart");v(d);for(e=c.length;e--;)c[e]=c[e].destroy();this.scroller&&this.scroller.destroy&&
this.scroller.destroy();for(e=g.length;e--;)g[e]=g[e].destroy();f("title subtitle chartBackground plotBackground plotBGImage plotBorder seriesGroup clipRect credits pointer rangeSelector legend resetZoomButton tooltip renderer".split(" "),function(a){var b=d[a];b&&b.destroy&&(d[a]=b.destroy())});n&&(n.innerHTML="",v(n),l&&q(n));y(d,function(a,b){delete d[b]})},isReadyToRender:function(){var a=this;return n||M!=M.top||"complete"===h.readyState?!0:(h.attachEvent("onreadystatechange",function(){h.detachEvent("onreadystatechange",
a.firstRender);"complete"===h.readyState&&a.firstRender()}),!1)},firstRender:function(){var a=this,d=a.options;if(a.isReadyToRender()){a.getContainer();b(a,"init");a.resetMargins();a.setChartSize();a.propFromSeries();a.getAxes();f(d.series||[],function(d){a.initSeries(d)});a.linkSeries();b(a,"beforeRender");J&&(a.pointer=new J(a,d));a.render();if(!a.renderer.imgCount&&a.onload)a.onload();a.temporaryDisplay(!0)}},onload:function(){f([this.callback].concat(this.callbacks),function(a){a&&void 0!==this.index&&
a.apply(this,[this])},this);b(this,"load");b(this,"render");m(this.index)&&!1!==this.options.chart.reflow&&this.initReflow();this.onload=null}})})(L);(function(a){var F,E=a.each,G=a.extend,r=a.erase,h=a.fireEvent,p=a.format,x=a.isArray,t=a.isNumber,q=a.pick,z=a.removeEvent;a.Point=F=function(){};a.Point.prototype={init:function(a,m,f){this.series=a;this.color=a.color;this.applyOptions(m,f);a.options.colorByPoint?(m=a.options.colors||a.chart.options.colors,this.color=this.color||m[a.colorCounter],
m=m.length,f=a.colorCounter,a.colorCounter++,a.colorCounter===m&&(a.colorCounter=0)):f=a.colorIndex;this.colorIndex=q(this.colorIndex,f);a.chart.pointCount++;return this},applyOptions:function(a,m){var f=this.series,e=f.options.pointValKey||f.pointValKey;a=F.prototype.optionsToObject.call(this,a);G(this,a);this.options=this.options?G(this.options,a):a;a.group&&delete this.group;e&&(this.y=this[e]);this.isNull=q(this.isValid&&!this.isValid(),null===this.x||!t(this.y,!0));this.selected&&(this.state=
"select");"name"in this&&void 0===m&&f.xAxis&&f.xAxis.hasNames&&(this.x=f.xAxis.nameToX(this));void 0===this.x&&f&&(this.x=void 0===m?f.autoIncrement(this):m);return this},optionsToObject:function(a){var k={},f=this.series,e=f.options.keys,c=e||f.pointArrayMap||["y"],b=c.length,h=0,l=0;if(t(a)||null===a)k[c[0]]=a;else if(x(a))for(!e&&a.length>b&&(f=typeof a[0],"string"===f?k.name=a[0]:"number"===f&&(k.x=a[0]),h++);l<b;)e&&void 0===a[h]||(k[c[l]]=a[h]),h++,l++;else"object"===typeof a&&(k=a,a.dataLabels&&
(f._hasPointLabels=!0),a.marker&&(f._hasPointMarkers=!0));return k},getClassName:function(){return"highcharts-point"+(this.selected?" highcharts-point-select":"")+(this.negative?" highcharts-negative":"")+(this.isNull?" highcharts-null-point":"")+(void 0!==this.colorIndex?" highcharts-color-"+this.colorIndex:"")+(this.options.className?" "+this.options.className:"")+(this.zone&&this.zone.className?" "+this.zone.className.replace("highcharts-negative",""):"")},getZone:function(){var a=this.series,
m=a.zones,a=a.zoneAxis||"y",f=0,e;for(e=m[f];this[a]>=e.value;)e=m[++f];e&&e.color&&!this.options.color&&(this.color=e.color);return e},destroy:function(){var a=this.series.chart,m=a.hoverPoints,f;a.pointCount--;m&&(this.setState(),r(m,this),m.length||(a.hoverPoints=null));if(this===a.hoverPoint)this.onMouseOut();if(this.graphic||this.dataLabel)z(this),this.destroyElements();this.legendItem&&a.legend.destroyItem(this);for(f in this)this[f]=null},destroyElements:function(){for(var a=["graphic","dataLabel",
"dataLabelUpper","connector","shadowGroup"],m,f=6;f--;)m=a[f],this[m]&&(this[m]=this[m].destroy())},getLabelConfig:function(){return{x:this.category,y:this.y,color:this.color,colorIndex:this.colorIndex,key:this.name||this.category,series:this.series,point:this,percentage:this.percentage,total:this.total||this.stackTotal}},tooltipFormatter:function(a){var k=this.series,f=k.tooltipOptions,e=q(f.valueDecimals,""),c=f.valuePrefix||"",b=f.valueSuffix||"";E(k.pointArrayMap||["y"],function(f){f="{point."+
f;if(c||b)a=a.replace(f+"}",c+f+"}"+b);a=a.replace(f+"}",f+":,."+e+"f}")});return p(a,{point:this,series:this.series})},firePointEvent:function(a,m,f){var e=this,c=this.series.options;(c.point.events[a]||e.options&&e.options.events&&e.options.events[a])&&this.importEvents();"click"===a&&c.allowPointSelect&&(f=function(a){e.select&&e.select(null,a.ctrlKey||a.metaKey||a.shiftKey)});h(this,a,m,f)},visible:!0}})(L);(function(a){var F=a.addEvent,E=a.animObject,G=a.arrayMax,r=a.arrayMin,h=a.correctFloat,
p=a.Date,x=a.defaultOptions,t=a.defaultPlotOptions,q=a.defined,z=a.each,k=a.erase,m=a.extend,f=a.fireEvent,e=a.grep,c=a.isArray,b=a.isNumber,w=a.isString,l=a.merge,D=a.objectEach,H=a.pick,C=a.removeEvent,K=a.splat,g=a.SVGElement,y=a.syncTimeout,J=a.win;a.Series=a.seriesType("line",null,{lineWidth:2,allowPointSelect:!1,showCheckbox:!1,animation:{duration:1E3},events:{},marker:{lineWidth:0,lineColor:"#ffffff",radius:4,states:{hover:{animation:{duration:50},enabled:!0,radiusPlus:2,lineWidthPlus:1},select:{fillColor:"#cccccc",
lineColor:"#000000",lineWidth:2}}},point:{events:{}},dataLabels:{align:"center",formatter:function(){return null===this.y?"":a.numberFormat(this.y,-1)},style:{fontSize:"11px",fontWeight:"bold",color:"contrast",textOutline:"1px contrast"},verticalAlign:"bottom",x:0,y:0,padding:5},cropThreshold:300,pointRange:0,softThreshold:!0,states:{hover:{animation:{duration:50},lineWidthPlus:1,marker:{},halo:{size:10,opacity:.25}},select:{marker:{}}},stickyTracking:!0,turboThreshold:1E3,findNearestPointBy:"x"},
{isCartesian:!0,pointClass:a.Point,sorted:!0,requireSorting:!0,directTouch:!1,axisTypes:["xAxis","yAxis"],colorCounter:0,parallelArrays:["x","y"],coll:"series",init:function(a,d){var b=this,c,g=a.series,n;b.chart=a;b.options=d=b.setOptions(d);b.linkedSeries=[];b.bindAxes();m(b,{name:d.name,state:"",visible:!1!==d.visible,selected:!0===d.selected});c=d.events;D(c,function(a,d){F(b,d,a)});if(c&&c.click||d.point&&d.point.events&&d.point.events.click||d.allowPointSelect)a.runTrackerClick=!0;b.getColor();
b.getSymbol();z(b.parallelArrays,function(a){b[a+"Data"]=[]});b.setData(d.data,!1);b.isCartesian&&(a.hasCartesianSeries=!0);g.length&&(n=g[g.length-1]);b._i=H(n&&n._i,-1)+1;a.orderSeries(this.insert(g))},insert:function(a){var d=this.options.index,c;if(b(d)){for(c=a.length;c--;)if(d>=H(a[c].options.index,a[c]._i)){a.splice(c+1,0,this);break}-1===c&&a.unshift(this);c+=1}else a.push(this);return H(c,a.length-1)},bindAxes:function(){var b=this,d=b.options,c=b.chart,g;z(b.axisTypes||[],function(v){z(c[v],
function(a){g=a.options;if(d[v]===g.index||void 0!==d[v]&&d[v]===g.id||void 0===d[v]&&0===g.index)b.insert(a.series),b[v]=a,a.isDirty=!0});b[v]||b.optionalAxis===v||a.error(18,!0)})},updateParallelArrays:function(a,d){var c=a.series,g=arguments,e=b(d)?function(b){var g="y"===b&&c.toYData?c.toYData(a):a[b];c[b+"Data"][d]=g}:function(a){Array.prototype[d].apply(c[a+"Data"],Array.prototype.slice.call(g,2))};z(c.parallelArrays,e)},autoIncrement:function(){var a=this.options,d=this.xIncrement,b,c=a.pointIntervalUnit,
d=H(d,a.pointStart,0);this.pointInterval=b=H(this.pointInterval,a.pointInterval,1);c&&(a=new p(d),"day"===c?a=+a[p.hcSetDate](a[p.hcGetDate]()+b):"month"===c?a=+a[p.hcSetMonth](a[p.hcGetMonth]()+b):"year"===c&&(a=+a[p.hcSetFullYear](a[p.hcGetFullYear]()+b)),b=a-d);this.xIncrement=d+b;return d},setOptions:function(a){var d=this.chart,b=d.options,c=b.plotOptions,g=(d.userOptions||{}).plotOptions||{},n=c[this.type];this.userOptions=a;d=l(n,c.series,a);this.tooltipOptions=l(x.tooltip,x.plotOptions.series&&
x.plotOptions.series.tooltip,x.plotOptions[this.type].tooltip,b.tooltip.userOptions,c.series&&c.series.tooltip,c[this.type].tooltip,a.tooltip);this.stickyTracking=H(a.stickyTracking,g[this.type]&&g[this.type].stickyTracking,g.series&&g.series.stickyTracking,this.tooltipOptions.shared&&!this.noSharedTooltip?!0:d.stickyTracking);null===n.marker&&delete d.marker;this.zoneAxis=d.zoneAxis;a=this.zones=(d.zones||[]).slice();!d.negativeColor&&!d.negativeFillColor||d.zones||a.push({value:d[this.zoneAxis+
"Threshold"]||d.threshold||0,className:"highcharts-negative",color:d.negativeColor,fillColor:d.negativeFillColor});a.length&&q(a[a.length-1].value)&&a.push({color:this.color,fillColor:this.fillColor});return d},getCyclic:function(a,d,b){var c,g=this.chart,n=this.userOptions,e=a+"Index",v=a+"Counter",l=b?b.length:H(g.options.chart[a+"Count"],g[a+"Count"]);d||(c=H(n[e],n["_"+e]),q(c)||(g.series.length||(g[v]=0),n["_"+e]=c=g[v]%l,g[v]+=1),b&&(d=b[c]));void 0!==c&&(this[e]=c);this[a]=d},getColor:function(){this.options.colorByPoint?
this.options.color=null:this.getCyclic("color",this.options.color||t[this.type].color,this.chart.options.colors)},getSymbol:function(){this.getCyclic("symbol",this.options.marker.symbol,this.chart.options.symbols)},drawLegendSymbol:a.LegendSymbolMixin.drawLineMarker,setData:function(g,d,e,l){var v=this,n=v.points,f=n&&n.length||0,A,k=v.options,m=v.chart,B=null,h=v.xAxis,y=k.turboThreshold,C=this.xData,p=this.yData,t=(A=v.pointArrayMap)&&A.length;g=g||[];A=g.length;d=H(d,!0);if(!1!==l&&A&&f===A&&!v.cropped&&
!v.hasGroupedData&&v.visible)z(g,function(a,d){n[d].update&&a!==k.data[d]&&n[d].update(a,!1,null,!1)});else{v.xIncrement=null;v.colorCounter=0;z(this.parallelArrays,function(a){v[a+"Data"].length=0});if(y&&A>y){for(e=0;null===B&&e<A;)B=g[e],e++;if(b(B))for(e=0;e<A;e++)C[e]=this.autoIncrement(),p[e]=g[e];else if(c(B))if(t)for(e=0;e<A;e++)B=g[e],C[e]=B[0],p[e]=B.slice(1,t+1);else for(e=0;e<A;e++)B=g[e],C[e]=B[0],p[e]=B[1];else a.error(12)}else for(e=0;e<A;e++)void 0!==g[e]&&(B={series:v},v.pointClass.prototype.applyOptions.apply(B,
[g[e]]),v.updateParallelArrays(B,e));p&&w(p[0])&&a.error(14,!0);v.data=[];v.options.data=v.userOptions.data=g;for(e=f;e--;)n[e]&&n[e].destroy&&n[e].destroy();h&&(h.minRange=h.userMinRange);v.isDirty=m.isDirtyBox=!0;v.isDirtyData=!!n;e=!1}"point"===k.legendType&&(this.processData(),this.generatePoints());d&&m.redraw(e)},processData:function(b){var d=this.xData,c=this.yData,g=d.length,e;e=0;var n,l,f=this.xAxis,A,k=this.options;A=k.cropThreshold;var m=this.getExtremesFromAll||k.getExtremesFromAll,h=
this.isCartesian,k=f&&f.val2lin,y=f&&f.isLog,w=this.requireSorting,C,p;if(h&&!this.isDirty&&!f.isDirty&&!this.yAxis.isDirty&&!b)return!1;f&&(b=f.getExtremes(),C=b.min,p=b.max);if(h&&this.sorted&&!m&&(!A||g>A||this.forceCrop))if(d[g-1]<C||d[0]>p)d=[],c=[];else if(d[0]<C||d[g-1]>p)e=this.cropData(this.xData,this.yData,C,p),d=e.xData,c=e.yData,e=e.start,n=!0;for(A=d.length||1;--A;)g=y?k(d[A])-k(d[A-1]):d[A]-d[A-1],0<g&&(void 0===l||g<l)?l=g:0>g&&w&&(a.error(15),w=!1);this.cropped=n;this.cropStart=e;
this.processedXData=d;this.processedYData=c;this.closestPointRange=l},cropData:function(a,d,b,c){var g=a.length,n=0,e=g,v=H(this.cropShoulder,1),l;for(l=0;l<g;l++)if(a[l]>=b){n=Math.max(0,l-v);break}for(b=l;b<g;b++)if(a[b]>c){e=b+v;break}return{xData:a.slice(n,e),yData:d.slice(n,e),start:n,end:e}},generatePoints:function(){var a=this.options,d=a.data,b=this.data,c,g=this.processedXData,n=this.processedYData,e=this.pointClass,l=g.length,f=this.cropStart||0,k,m=this.hasGroupedData,a=a.keys,h,y=[],w;
b||m||(b=[],b.length=d.length,b=this.data=b);a&&m&&(this.options.keys=!1);for(w=0;w<l;w++)k=f+w,m?(h=(new e).init(this,[g[w]].concat(K(n[w]))),h.dataGroup=this.groupMap[w]):(h=b[k])||void 0===d[k]||(b[k]=h=(new e).init(this,d[k],g[w])),h&&(h.index=k,y[w]=h);this.options.keys=a;if(b&&(l!==(c=b.length)||m))for(w=0;w<c;w++)w!==f||m||(w+=l),b[w]&&(b[w].destroyElements(),b[w].plotX=void 0);this.data=b;this.points=y},getExtremes:function(a){var d=this.yAxis,g=this.processedXData,e,l=[],n=0;e=this.xAxis.getExtremes();
var f=e.min,k=e.max,A,m,h,y;a=a||this.stackedYData||this.processedYData||[];e=a.length;for(y=0;y<e;y++)if(m=g[y],h=a[y],A=(b(h,!0)||c(h))&&(!d.positiveValuesOnly||h.length||0<h),m=this.getExtremesFromAll||this.options.getExtremesFromAll||this.cropped||(g[y+1]||m)>=f&&(g[y-1]||m)<=k,A&&m)if(A=h.length)for(;A--;)null!==h[A]&&(l[n++]=h[A]);else l[n++]=h;this.dataMin=r(l);this.dataMax=G(l)},translate:function(){this.processedXData||this.processData();this.generatePoints();var a=this.options,d=a.stacking,
c=this.xAxis,g=c.categories,e=this.yAxis,n=this.points,l=n.length,f=!!this.modifyValue,k=a.pointPlacement,m="between"===k||b(k),y=a.threshold,w=a.startFromThreshold?y:0,C,p,t,D,J=Number.MAX_VALUE;"between"===k&&(k=.5);b(k)&&(k*=H(a.pointRange||c.pointRange));for(a=0;a<l;a++){var r=n[a],x=r.x,K=r.y;p=r.low;var z=d&&e.stacks[(this.negStacks&&K<(w?0:y)?"-":"")+this.stackKey],E;e.positiveValuesOnly&&null!==K&&0>=K&&(r.isNull=!0);r.plotX=C=h(Math.min(Math.max(-1E5,c.translate(x,0,0,0,1,k,"flags"===this.type)),
1E5));d&&this.visible&&!r.isNull&&z&&z[x]&&(D=this.getStackIndicator(D,x,this.index),E=z[x],K=E.points[D.key],p=K[0],K=K[1],p===w&&D.key===z[x].base&&(p=H(y,e.min)),e.positiveValuesOnly&&0>=p&&(p=null),r.total=r.stackTotal=E.total,r.percentage=E.total&&r.y/E.total*100,r.stackY=K,E.setOffset(this.pointXOffset||0,this.barW||0));r.yBottom=q(p)?e.translate(p,0,1,0,1):null;f&&(K=this.modifyValue(K,r));r.plotY=p="number"===typeof K&&Infinity!==K?Math.min(Math.max(-1E5,e.translate(K,0,1,0,1)),1E5):void 0;
r.isInside=void 0!==p&&0<=p&&p<=e.len&&0<=C&&C<=c.len;r.clientX=m?h(c.translate(x,0,0,0,1,k)):C;r.negative=r.y<(y||0);r.category=g&&void 0!==g[r.x]?g[r.x]:r.x;r.isNull||(void 0!==t&&(J=Math.min(J,Math.abs(C-t))),t=C);r.zone=this.zones.length&&r.getZone()}this.closestPointRangePx=J},getValidPoints:function(a,d){var b=this.chart;return e(a||this.points||[],function(a){return d&&!b.isInsidePlot(a.plotX,a.plotY,b.inverted)?!1:!a.isNull})},setClip:function(a){var d=this.chart,b=this.options,c=d.renderer,
g=d.inverted,n=this.clipBox,e=n||d.clipBox,l=this.sharedClipKey||["_sharedClip",a&&a.duration,a&&a.easing,e.height,b.xAxis,b.yAxis].join(),f=d[l],k=d[l+"m"];f||(a&&(e.width=0,g&&(e.x=d.plotSizeX),d[l+"m"]=k=c.clipRect(g?d.plotSizeX+99:-99,g?-d.plotLeft:-d.plotTop,99,g?d.chartWidth:d.chartHeight)),d[l]=f=c.clipRect(e),f.count={length:0});a&&!f.count[this.index]&&(f.count[this.index]=!0,f.count.length+=1);!1!==b.clip&&(this.group.clip(a||n?f:d.clipRect),this.markerGroup.clip(k),this.sharedClipKey=l);
a||(f.count[this.index]&&(delete f.count[this.index],--f.count.length),0===f.count.length&&l&&d[l]&&(n||(d[l]=d[l].destroy()),d[l+"m"]&&(d[l+"m"]=d[l+"m"].destroy())))},animate:function(a){var d=this.chart,b=E(this.options.animation),c;a?this.setClip(b):(c=this.sharedClipKey,(a=d[c])&&a.animate({width:d.plotSizeX,x:0},b),d[c+"m"]&&d[c+"m"].animate({width:d.plotSizeX+99,x:0},b),this.animate=null)},afterAnimate:function(){this.setClip();f(this,"afterAnimate");this.finishedAnimating=!0},drawPoints:function(){var a=
this.points,d=this.chart,b,c,g,n,e=this.options.marker,l,f,k,m=this[this.specialGroup]||this.markerGroup,h,y=H(e.enabled,this.xAxis.isRadial?!0:null,this.closestPointRangePx>=2*e.radius);if(!1!==e.enabled||this._hasPointMarkers)for(b=0;b<a.length;b++)c=a[b],n=c.graphic,l=c.marker||{},f=!!c.marker,g=y&&void 0===l.enabled||l.enabled,k=c.isInside,g&&!c.isNull?(g=H(l.symbol,this.symbol),c.hasImage=0===g.indexOf("url"),h=this.markerAttribs(c,c.selected&&"select"),n?n[k?"show":"hide"](!0).animate(h):k&&
(0<h.width||c.hasImage)&&(c.graphic=n=d.renderer.symbol(g,h.x,h.y,h.width,h.height,f?l:e).add(m)),n&&n.attr(this.pointAttribs(c,c.selected&&"select")),n&&n.addClass(c.getClassName(),!0)):n&&(c.graphic=n.destroy())},markerAttribs:function(a,d){var b=this.options.marker,c=a.marker||{},g=H(c.radius,b.radius);d&&(b=b.states[d],d=c.states&&c.states[d],g=H(d&&d.radius,b&&b.radius,g+(b&&b.radiusPlus||0)));a.hasImage&&(g=0);a={x:Math.floor(a.plotX)-g,y:a.plotY-g};g&&(a.width=a.height=2*g);return a},pointAttribs:function(a,
d){var b=this.options.marker,c=a&&a.options,g=c&&c.marker||{},n=this.color,e=c&&c.color,l=a&&a.color,c=H(g.lineWidth,b.lineWidth);a=a&&a.zone&&a.zone.color;n=e||a||l||n;a=g.fillColor||b.fillColor||n;n=g.lineColor||b.lineColor||n;d&&(b=b.states[d],d=g.states&&g.states[d]||{},c=H(d.lineWidth,b.lineWidth,c+H(d.lineWidthPlus,b.lineWidthPlus,0)),a=d.fillColor||b.fillColor||a,n=d.lineColor||b.lineColor||n);return{stroke:n,"stroke-width":c,fill:a}},destroy:function(){var a=this,d=a.chart,b=/AppleWebKit\/533/.test(J.navigator.userAgent),
c,e,n=a.data||[],l,m;f(a,"destroy");C(a);z(a.axisTypes||[],function(d){(m=a[d])&&m.series&&(k(m.series,a),m.isDirty=m.forceRedraw=!0)});a.legendItem&&a.chart.legend.destroyItem(a);for(e=n.length;e--;)(l=n[e])&&l.destroy&&l.destroy();a.points=null;clearTimeout(a.animationTimeout);D(a,function(a,d){a instanceof g&&!a.survive&&(c=b&&"group"===d?"hide":"destroy",a[c]())});d.hoverSeries===a&&(d.hoverSeries=null);k(d.series,a);d.orderSeries();D(a,function(d,b){delete a[b]})},getGraphPath:function(a,d,b){var c=
this,g=c.options,e=g.step,l,v=[],f=[],k;a=a||c.points;(l=a.reversed)&&a.reverse();(e={right:1,center:2}[e]||e&&3)&&l&&(e=4-e);!g.connectNulls||d||b||(a=this.getValidPoints(a));z(a,function(n,l){var m=n.plotX,u=n.plotY,A=a[l-1];(n.leftCliff||A&&A.rightCliff)&&!b&&(k=!0);n.isNull&&!q(d)&&0<l?k=!g.connectNulls:n.isNull&&!d?k=!0:(0===l||k?l=["M",n.plotX,n.plotY]:c.getPointSpline?l=c.getPointSpline(a,n,l):e?(l=1===e?["L",A.plotX,u]:2===e?["L",(A.plotX+m)/2,A.plotY,"L",(A.plotX+m)/2,u]:["L",m,A.plotY],
l.push("L",m,u)):l=["L",m,u],f.push(n.x),e&&f.push(n.x),v.push.apply(v,l),k=!1)});v.xMap=f;return c.graphPath=v},drawGraph:function(){var a=this,d=this.options,b=(this.gappedPath||this.getGraphPath).call(this),c=[["graph","highcharts-graph",d.lineColor||this.color,d.dashStyle]];z(this.zones,function(b,g){c.push(["zone-graph-"+g,"highcharts-graph highcharts-zone-graph-"+g+" "+(b.className||""),b.color||a.color,b.dashStyle||d.dashStyle])});z(c,function(c,g){var e=c[0],n=a[e];n?(n.endX=a.preventGraphAnimation?
null:b.xMap,n.animate({d:b})):b.length&&(a[e]=a.chart.renderer.path(b).addClass(c[1]).attr({zIndex:1}).add(a.group),n={stroke:c[2],"stroke-width":d.lineWidth,fill:a.fillGraph&&a.color||"none"},c[3]?n.dashstyle=c[3]:"square"!==d.linecap&&(n["stroke-linecap"]=n["stroke-linejoin"]="round"),n=a[e].attr(n).shadow(2>g&&d.shadow));n&&(n.startX=b.xMap,n.isArea=b.isArea)})},applyZones:function(){var a=this,d=this.chart,b=d.renderer,c=this.zones,g,e,l=this.clips||[],f,k=this.graph,m=this.area,h=Math.max(d.chartWidth,
d.chartHeight),y=this[(this.zoneAxis||"y")+"Axis"],w,C,p=d.inverted,t,D,q,J,r=!1;c.length&&(k||m)&&y&&void 0!==y.min&&(C=y.reversed,t=y.horiz,k&&k.hide(),m&&m.hide(),w=y.getExtremes(),z(c,function(c,n){g=C?t?d.plotWidth:0:t?0:y.toPixels(w.min);g=Math.min(Math.max(H(e,g),0),h);e=Math.min(Math.max(Math.round(y.toPixels(H(c.value,w.max),!0)),0),h);r&&(g=e=y.toPixels(w.max));D=Math.abs(g-e);q=Math.min(g,e);J=Math.max(g,e);y.isXAxis?(f={x:p?J:q,y:0,width:D,height:h},t||(f.x=d.plotHeight-f.x)):(f={x:0,
y:p?J:q,width:h,height:D},t&&(f.y=d.plotWidth-f.y));p&&b.isVML&&(f=y.isXAxis?{x:0,y:C?q:J,height:f.width,width:d.chartWidth}:{x:f.y-d.plotLeft-d.spacingBox.x,y:0,width:f.height,height:d.chartHeight});l[n]?l[n].animate(f):(l[n]=b.clipRect(f),k&&a["zone-graph-"+n].clip(l[n]),m&&a["zone-area-"+n].clip(l[n]));r=c.value>w.max}),this.clips=l)},invertGroups:function(a){function d(){z(["group","markerGroup"],function(d){b[d]&&(c.renderer.isVML&&b[d].attr({width:b.yAxis.len,height:b.xAxis.len}),b[d].width=
b.yAxis.len,b[d].height=b.xAxis.len,b[d].invert(a))})}var b=this,c=b.chart,g;b.xAxis&&(g=F(c,"resize",d),F(b,"destroy",g),d(a),b.invertGroups=d)},plotGroup:function(a,d,b,c,g){var e=this[a],l=!e;l&&(this[a]=e=this.chart.renderer.g().attr({zIndex:c||.1}).add(g));e.addClass("highcharts-"+d+" highcharts-series-"+this.index+" highcharts-"+this.type+"-series "+(q(this.colorIndex)?"highcharts-color-"+this.colorIndex+" ":"")+(this.options.className||"")+(e.hasClass("highcharts-tracker")?" highcharts-tracker":
""),!0);e.attr({visibility:b})[l?"attr":"animate"](this.getPlotBox());return e},getPlotBox:function(){var a=this.chart,d=this.xAxis,b=this.yAxis;a.inverted&&(d=b,b=this.xAxis);return{translateX:d?d.left:a.plotLeft,translateY:b?b.top:a.plotTop,scaleX:1,scaleY:1}},render:function(){var a=this,d=a.chart,b,c=a.options,g=!!a.animate&&d.renderer.isSVG&&E(c.animation).duration,e=a.visible?"inherit":"hidden",l=c.zIndex,f=a.hasRendered,k=d.seriesGroup,m=d.inverted;b=a.plotGroup("group","series",e,l,k);a.markerGroup=
a.plotGroup("markerGroup","markers",e,l,k);g&&a.animate(!0);b.inverted=a.isCartesian?m:!1;a.drawGraph&&(a.drawGraph(),a.applyZones());a.drawDataLabels&&a.drawDataLabels();a.visible&&a.drawPoints();a.drawTracker&&!1!==a.options.enableMouseTracking&&a.drawTracker();a.invertGroups(m);!1===c.clip||a.sharedClipKey||f||b.clip(d.clipRect);g&&a.animate();f||(a.animationTimeout=y(function(){a.afterAnimate()},g));a.isDirty=!1;a.hasRendered=!0},redraw:function(){var a=this.chart,d=this.isDirty||this.isDirtyData,
b=this.group,c=this.xAxis,g=this.yAxis;b&&(a.inverted&&b.attr({width:a.plotWidth,height:a.plotHeight}),b.animate({translateX:H(c&&c.left,a.plotLeft),translateY:H(g&&g.top,a.plotTop)}));this.translate();this.render();d&&delete this.kdTree},kdAxisArray:["clientX","plotY"],searchPoint:function(a,d){var b=this.xAxis,c=this.yAxis,g=this.chart.inverted;return this.searchKDTree({clientX:g?b.len-a.chartY+b.pos:a.chartX-b.pos,plotY:g?c.len-a.chartX+c.pos:a.chartY-c.pos},d)},buildKDTree:function(){function a(b,
c,g){var e,n;if(n=b&&b.length)return e=d.kdAxisArray[c%g],b.sort(function(a,d){return a[e]-d[e]}),n=Math.floor(n/2),{point:b[n],left:a(b.slice(0,n),c+1,g),right:a(b.slice(n+1),c+1,g)}}this.buildingKdTree=!0;var d=this,b=-1<d.options.findNearestPointBy.indexOf("y")?2:1;delete d.kdTree;y(function(){d.kdTree=a(d.getValidPoints(null,!d.directTouch),b,b);d.buildingKdTree=!1},d.options.kdNow?0:1)},searchKDTree:function(a,d){function b(a,d,n,f){var v=d.point,k=c.kdAxisArray[n%f],m,h,y=v;h=q(a[g])&&q(v[g])?
Math.pow(a[g]-v[g],2):null;m=q(a[e])&&q(v[e])?Math.pow(a[e]-v[e],2):null;m=(h||0)+(m||0);v.dist=q(m)?Math.sqrt(m):Number.MAX_VALUE;v.distX=q(h)?Math.sqrt(h):Number.MAX_VALUE;k=a[k]-v[k];m=0>k?"left":"right";h=0>k?"right":"left";d[m]&&(m=b(a,d[m],n+1,f),y=m[l]<y[l]?m:v);d[h]&&Math.sqrt(k*k)<y[l]&&(a=b(a,d[h],n+1,f),y=a[l]<y[l]?a:y);return y}var c=this,g=this.kdAxisArray[0],e=this.kdAxisArray[1],l=d?"distX":"dist";d=-1<c.options.findNearestPointBy.indexOf("y")?2:1;this.kdTree||this.buildingKdTree||
this.buildKDTree();if(this.kdTree)return b(a,this.kdTree,d,d)}})})(L);(function(a){var F=a.Axis,E=a.Chart,G=a.correctFloat,r=a.defined,h=a.destroyObjectProperties,p=a.each,x=a.format,t=a.objectEach,q=a.pick,z=a.Series;a.StackItem=function(a,m,f,e,c){var b=a.chart.inverted;this.axis=a;this.isNegative=f;this.options=m;this.x=e;this.total=null;this.points={};this.stack=c;this.rightCliff=this.leftCliff=0;this.alignOptions={align:m.align||(b?f?"left":"right":"center"),verticalAlign:m.verticalAlign||(b?
"middle":f?"bottom":"top"),y:q(m.y,b?4:f?14:-6),x:q(m.x,b?f?-6:6:0)};this.textAlign=m.textAlign||(b?f?"right":"left":"center")};a.StackItem.prototype={destroy:function(){h(this,this.axis)},render:function(a){var k=this.options,f=k.format,f=f?x(f,this):k.formatter.call(this);this.label?this.label.attr({text:f,visibility:"hidden"}):this.label=this.axis.chart.renderer.text(f,null,null,k.useHTML).css(k.style).attr({align:this.textAlign,rotation:k.rotation,visibility:"hidden"}).add(a)},setOffset:function(a,
m){var f=this.axis,e=f.chart,c=f.translate(f.usePercentage?100:this.total,0,0,0,1),f=f.translate(0),f=Math.abs(c-f);a=e.xAxis[0].translate(this.x)+a;c=this.getStackBox(e,this,a,c,m,f);if(m=this.label)m.align(this.alignOptions,null,c),c=m.alignAttr,m[!1===this.options.crop||e.isInsidePlot(c.x,c.y)?"show":"hide"](!0)},getStackBox:function(a,m,f,e,c,b){var k=m.axis.reversed,l=a.inverted;a=a.plotHeight;m=m.isNegative&&!k||!m.isNegative&&k;return{x:l?m?e:e-b:f,y:l?a-f-c:m?a-e-b:a-e,width:l?b:c,height:l?
c:b}}};E.prototype.getStacks=function(){var a=this;p(a.yAxis,function(a){a.stacks&&a.hasVisibleSeries&&(a.oldStacks=a.stacks)});p(a.series,function(k){!k.options.stacking||!0!==k.visible&&!1!==a.options.chart.ignoreHiddenSeries||(k.stackKey=k.type+q(k.options.stack,""))})};F.prototype.buildStacks=function(){var a=this.series,m=q(this.options.reversedStacks,!0),f=a.length,e;if(!this.isXAxis){this.usePercentage=!1;for(e=f;e--;)a[m?e:f-e-1].setStackedPoints();for(e=0;e<f;e++)a[e].modifyStacks()}};F.prototype.renderStackTotals=
function(){var a=this.chart,m=a.renderer,f=this.stacks,e=this.stackTotalGroup;e||(this.stackTotalGroup=e=m.g("stack-labels").attr({visibility:"visible",zIndex:6}).add());e.translate(a.plotLeft,a.plotTop);t(f,function(a){t(a,function(a){a.render(e)})})};F.prototype.resetStacks=function(){var a=this,m=a.stacks;a.isXAxis||t(m,function(f){t(f,function(e,c){e.touched<a.stacksTouched?(e.destroy(),delete f[c]):(e.total=null,e.cum=null)})})};F.prototype.cleanStacks=function(){var a;this.isXAxis||(this.oldStacks&&
(a=this.stacks=this.oldStacks),t(a,function(a){t(a,function(a){a.cum=a.total})}))};z.prototype.setStackedPoints=function(){if(this.options.stacking&&(!0===this.visible||!1===this.chart.options.chart.ignoreHiddenSeries)){var k=this.processedXData,m=this.processedYData,f=[],e=m.length,c=this.options,b=c.threshold,h=c.startFromThreshold?b:0,l=c.stack,c=c.stacking,p=this.stackKey,t="-"+p,C=this.negStacks,x=this.yAxis,g=x.stacks,y=x.oldStacks,J,A,d,v,B,u,n;x.stacksTouched+=1;for(B=0;B<e;B++)u=k[B],n=m[B],
J=this.getStackIndicator(J,u,this.index),v=J.key,d=(A=C&&n<(h?0:b))?t:p,g[d]||(g[d]={}),g[d][u]||(y[d]&&y[d][u]?(g[d][u]=y[d][u],g[d][u].total=null):g[d][u]=new a.StackItem(x,x.options.stackLabels,A,u,l)),d=g[d][u],null!==n&&(d.points[v]=d.points[this.index]=[q(d.cum,h)],r(d.cum)||(d.base=v),d.touched=x.stacksTouched,0<J.index&&!1===this.singleStacks&&(d.points[v][0]=d.points[this.index+","+u+",0"][0])),"percent"===c?(A=A?p:t,C&&g[A]&&g[A][u]?(A=g[A][u],d.total=A.total=Math.max(A.total,d.total)+Math.abs(n)||
0):d.total=G(d.total+(Math.abs(n)||0))):d.total=G(d.total+(n||0)),d.cum=q(d.cum,h)+(n||0),null!==n&&(d.points[v].push(d.cum),f[B]=d.cum);"percent"===c&&(x.usePercentage=!0);this.stackedYData=f;x.oldStacks={}}};z.prototype.modifyStacks=function(){var a=this,m=a.stackKey,f=a.yAxis.stacks,e=a.processedXData,c,b=a.options.stacking;a[b+"Stacker"]&&p([m,"-"+m],function(k){for(var l=e.length,m,h;l--;)if(m=e[l],c=a.getStackIndicator(c,m,a.index,k),h=(m=f[k]&&f[k][m])&&m.points[c.key])a[b+"Stacker"](h,m,l)})};
z.prototype.percentStacker=function(a,m,f){m=m.total?100/m.total:0;a[0]=G(a[0]*m);a[1]=G(a[1]*m);this.stackedYData[f]=a[1]};z.prototype.getStackIndicator=function(a,m,f,e){!r(a)||a.x!==m||e&&a.key!==e?a={x:m,index:0,key:e}:a.index++;a.key=[f,m,a.index].join();return a}})(L);(function(a){var F=a.addEvent,E=a.animate,G=a.Axis,r=a.createElement,h=a.css,p=a.defined,x=a.each,t=a.erase,q=a.extend,z=a.fireEvent,k=a.inArray,m=a.isNumber,f=a.isObject,e=a.isArray,c=a.merge,b=a.objectEach,w=a.pick,l=a.Point,
D=a.Series,H=a.seriesTypes,C=a.setAnimation,K=a.splat;q(a.Chart.prototype,{addSeries:function(a,b,c){var g,d=this;a&&(b=w(b,!0),z(d,"addSeries",{options:a},function(){g=d.initSeries(a);d.isDirtyLegend=!0;d.linkSeries();b&&d.redraw(c)}));return g},addAxis:function(a,b,e,l){var d=b?"xAxis":"yAxis",g=this.options;a=c(a,{index:this[d].length,isX:b});b=new G(this,a);g[d]=K(g[d]||{});g[d].push(a);w(e,!0)&&this.redraw(l);return b},showLoading:function(a){var b=this,c=b.options,g=b.loadingDiv,d=c.loading,
e=function(){g&&h(g,{left:b.plotLeft+"px",top:b.plotTop+"px",width:b.plotWidth+"px",height:b.plotHeight+"px"})};g||(b.loadingDiv=g=r("div",{className:"highcharts-loading highcharts-loading-hidden"},null,b.container),b.loadingSpan=r("span",{className:"highcharts-loading-inner"},null,g),F(b,"redraw",e));g.className="highcharts-loading";b.loadingSpan.innerHTML=a||c.lang.loading;h(g,q(d.style,{zIndex:10}));h(b.loadingSpan,d.labelStyle);b.loadingShown||(h(g,{opacity:0,display:""}),E(g,{opacity:d.style.opacity||
.5},{duration:d.showDuration||0}));b.loadingShown=!0;e()},hideLoading:function(){var a=this.options,b=this.loadingDiv;b&&(b.className="highcharts-loading highcharts-loading-hidden",E(b,{opacity:0},{duration:a.loading.hideDuration||100,complete:function(){h(b,{display:"none"})}}));this.loadingShown=!1},propsRequireDirtyBox:"backgroundColor borderColor borderWidth margin marginTop marginRight marginBottom marginLeft spacing spacingTop spacingRight spacingBottom spacingLeft borderRadius plotBackgroundColor plotBackgroundImage plotBorderColor plotBorderWidth plotShadow shadow".split(" "),
propsRequireUpdateSeries:"chart.inverted chart.polar chart.ignoreHiddenSeries chart.type colors plotOptions tooltip".split(" "),update:function(a,e,l){var g=this,d={credits:"addCredits",title:"setTitle",subtitle:"setSubtitle"},f=a.chart,h,u,n=[];if(f){c(!0,g.options.chart,f);"className"in f&&g.setClassName(f.className);if("inverted"in f||"polar"in f)g.propFromSeries(),h=!0;"alignTicks"in f&&(h=!0);b(f,function(a,d){-1!==k("chart."+d,g.propsRequireUpdateSeries)&&(u=!0);-1!==k(d,g.propsRequireDirtyBox)&&
(g.isDirtyBox=!0)});"style"in f&&g.renderer.setStyle(f.style)}a.colors&&(this.options.colors=a.colors);a.plotOptions&&c(!0,this.options.plotOptions,a.plotOptions);b(a,function(a,b){if(g[b]&&"function"===typeof g[b].update)g[b].update(a,!1);else if("function"===typeof g[d[b]])g[d[b]](a);"chart"!==b&&-1!==k(b,g.propsRequireUpdateSeries)&&(u=!0)});x("xAxis yAxis zAxis series colorAxis pane".split(" "),function(d){a[d]&&(x(K(a[d]),function(a,b){(b=p(a.id)&&g.get(a.id)||g[d][b])&&b.coll===d&&(b.update(a,
!1),l&&(b.touched=!0));if(!b&&l)if("series"===d)g.addSeries(a,!1).touched=!0;else if("xAxis"===d||"yAxis"===d)g.addAxis(a,"xAxis"===d,!1).touched=!0}),l&&x(g[d],function(a){a.touched?delete a.touched:n.push(a)}))});x(n,function(a){a.remove(!1)});h&&x(g.axes,function(a){a.update({},!1)});u&&x(g.series,function(a){a.update({},!1)});a.loading&&c(!0,g.options.loading,a.loading);h=f&&f.width;f=f&&f.height;m(h)&&h!==g.chartWidth||m(f)&&f!==g.chartHeight?g.setSize(h,f):w(e,!0)&&g.redraw()},setSubtitle:function(a){this.setTitle(void 0,
a)}});q(l.prototype,{update:function(a,b,c,e){function d(){g.applyOptions(a);null===g.y&&k&&(g.graphic=k.destroy());f(a,!0)&&(k&&k.element&&a&&a.marker&&void 0!==a.marker.symbol&&(g.graphic=k.destroy()),a&&a.dataLabels&&g.dataLabel&&(g.dataLabel=g.dataLabel.destroy()),g.connector&&(g.connector=g.connector.destroy()));n=g.index;l.updateParallelArrays(g,n);h.data[n]=f(h.data[n],!0)||f(a,!0)?g.options:a;l.isDirty=l.isDirtyData=!0;!l.fixedBox&&l.hasCartesianSeries&&(m.isDirtyBox=!0);"point"===h.legendType&&
(m.isDirtyLegend=!0);b&&m.redraw(c)}var g=this,l=g.series,k=g.graphic,n,m=l.chart,h=l.options;b=w(b,!0);!1===e?d():g.firePointEvent("update",{options:a},d)},remove:function(a,b){this.series.removePoint(k(this,this.series.data),a,b)}});q(D.prototype,{addPoint:function(a,b,c,e){var d=this.options,g=this.data,l=this.chart,f=this.xAxis,f=f&&f.hasNames&&f.names,n=d.data,k,m,h=this.xData,y,A;b=w(b,!0);k={series:this};this.pointClass.prototype.applyOptions.apply(k,[a]);A=k.x;y=h.length;if(this.requireSorting&&
A<h[y-1])for(m=!0;y&&h[y-1]>A;)y--;this.updateParallelArrays(k,"splice",y,0,0);this.updateParallelArrays(k,y);f&&k.name&&(f[A]=k.name);n.splice(y,0,a);m&&(this.data.splice(y,0,null),this.processData());"point"===d.legendType&&this.generatePoints();c&&(g[0]&&g[0].remove?g[0].remove(!1):(g.shift(),this.updateParallelArrays(k,"shift"),n.shift()));this.isDirtyData=this.isDirty=!0;b&&l.redraw(e)},removePoint:function(a,b,c){var g=this,d=g.data,e=d[a],l=g.points,f=g.chart,n=function(){l&&l.length===d.length&&
l.splice(a,1);d.splice(a,1);g.options.data.splice(a,1);g.updateParallelArrays(e||{series:g},"splice",a,1);e&&e.destroy();g.isDirty=!0;g.isDirtyData=!0;b&&f.redraw()};C(c,f);b=w(b,!0);e?e.firePointEvent("remove",null,n):n()},remove:function(a,b,c){function g(){d.destroy();e.isDirtyLegend=e.isDirtyBox=!0;e.linkSeries();w(a,!0)&&e.redraw(b)}var d=this,e=d.chart;!1!==c?z(d,"remove",null,g):g()},update:function(a,b){var g=this,e=g.chart,d=g.userOptions,l=g.oldType||g.type,f=a.type||d.type||e.options.chart.type,
k=H[l].prototype,n,m=["group","markerGroup","dataLabelsGroup"],h=["navigatorSeries","baseSeries"],y=g.finishedAnimating&&{animation:!1};if(Object.keys&&"data"===Object.keys(a).toString())return this.setData(a.data,b);if(f&&f!==l||void 0!==a.zIndex)m.length=0;h=m.concat(h);x(h,function(a){h[a]=g[a];delete g[a]});a=c(d,y,{index:g.index,pointStart:g.xData[0]},{data:g.options.data},a);g.remove(!1,null,!1);for(n in k)g[n]=void 0;q(g,H[f||l].prototype);x(h,function(a){g[a]=h[a]});g.init(e,a);g.oldType=
l;e.linkSeries();w(b,!0)&&e.redraw(!1)}});q(G.prototype,{update:function(a,b){var g=this.chart;a=g.options[this.coll][this.options.index]=c(this.userOptions,a);this.destroy(!0);this.init(g,q(a,{events:void 0}));g.isDirtyBox=!0;w(b,!0)&&g.redraw()},remove:function(a){for(var b=this.chart,c=this.coll,g=this.series,d=g.length;d--;)g[d]&&g[d].remove(!1);t(b.axes,this);t(b[c],this);e(b.options[c])?b.options[c].splice(this.options.index,1):delete b.options[c];x(b[c],function(a,d){a.options.index=d});this.destroy();
b.isDirtyBox=!0;w(a,!0)&&b.redraw()},setTitle:function(a,b){this.update({title:a},b)},setCategories:function(a,b){this.update({categories:a},b)}})})(L);(function(a){var F=a.color,E=a.each,G=a.map,r=a.pick,h=a.Series,p=a.seriesType;p("area","line",{softThreshold:!1,threshold:0},{singleStacks:!1,getStackPoints:function(h){var p=[],q=[],x=this.xAxis,k=this.yAxis,m=k.stacks[this.stackKey],f={},e=this.index,c=k.series,b=c.length,w,l=r(k.options.reversedStacks,!0)?1:-1,D;h=h||this.points;if(this.options.stacking){for(D=
0;D<h.length;D++)h[D].leftNull=h[D].rightNull=null,f[h[D].x]=h[D];a.objectEach(m,function(a,b){null!==a.total&&q.push(b)});q.sort(function(a,b){return a-b});w=G(c,function(){return this.visible});E(q,function(a,c){var h=0,g,y;if(f[a]&&!f[a].isNull)p.push(f[a]),E([-1,1],function(k){var h=1===k?"rightNull":"leftNull",d=0,v=m[q[c+k]];if(v)for(D=e;0<=D&&D<b;)g=v.points[D],g||(D===e?f[a][h]=!0:w[D]&&(y=m[a].points[D])&&(d-=y[1]-y[0])),D+=l;f[a][1===k?"rightCliff":"leftCliff"]=d});else{for(D=e;0<=D&&D<
b;){if(g=m[a].points[D]){h=g[1];break}D+=l}h=k.translate(h,0,1,0,1);p.push({isNull:!0,plotX:x.translate(a,0,0,0,1),x:a,plotY:h,yBottom:h})}})}return p},getGraphPath:function(a){var p=h.prototype.getGraphPath,q=this.options,x=q.stacking,k=this.yAxis,m,f,e=[],c=[],b=this.index,w,l=k.stacks[this.stackKey],D=q.threshold,H=k.getThreshold(q.threshold),C,q=q.connectNulls||"percent"===x,K=function(g,f,m){var h=a[g];g=x&&l[h.x].points[b];var d=h[m+"Null"]||0;m=h[m+"Cliff"]||0;var v,y,h=!0;m||d?(v=(d?g[0]:
g[1])+m,y=g[0]+m,h=!!d):!x&&a[f]&&a[f].isNull&&(v=y=D);void 0!==v&&(c.push({plotX:w,plotY:null===v?H:k.getThreshold(v),isNull:h,isCliff:!0}),e.push({plotX:w,plotY:null===y?H:k.getThreshold(y),doCurve:!1}))};a=a||this.points;x&&(a=this.getStackPoints(a));for(m=0;m<a.length;m++)if(f=a[m].isNull,w=r(a[m].rectPlotX,a[m].plotX),C=r(a[m].yBottom,H),!f||q)q||K(m,m-1,"left"),f&&!x&&q||(c.push(a[m]),e.push({x:m,plotX:w,plotY:C})),q||K(m,m+1,"right");m=p.call(this,c,!0,!0);e.reversed=!0;f=p.call(this,e,!0,
!0);f.length&&(f[0]="L");f=m.concat(f);p=p.call(this,c,!1,q);f.xMap=m.xMap;this.areaPath=f;return p},drawGraph:function(){this.areaPath=[];h.prototype.drawGraph.apply(this);var a=this,p=this.areaPath,q=this.options,z=[["area","highcharts-area",this.color,q.fillColor]];E(this.zones,function(k,m){z.push(["zone-area-"+m,"highcharts-area highcharts-zone-area-"+m+" "+k.className,k.color||a.color,k.fillColor||q.fillColor])});E(z,function(k){var m=k[0],f=a[m];f?(f.endX=a.preventGraphAnimation?null:p.xMap,
f.animate({d:p})):(f=a[m]=a.chart.renderer.path(p).addClass(k[1]).attr({fill:r(k[3],F(k[2]).setOpacity(r(q.fillOpacity,.75)).get()),zIndex:0}).add(a.group),f.isArea=!0);f.startX=p.xMap;f.shiftUnit=q.step?2:1})},drawLegendSymbol:a.LegendSymbolMixin.drawRectangle})})(L);(function(a){var F=a.pick;a=a.seriesType;a("spline","line",{},{getPointSpline:function(a,G,r){var h=G.plotX,p=G.plotY,x=a[r-1];r=a[r+1];var t,q,z,k;if(x&&!x.isNull&&!1!==x.doCurve&&!G.isCliff&&r&&!r.isNull&&!1!==r.doCurve&&!G.isCliff){a=
x.plotY;z=r.plotX;r=r.plotY;var m=0;t=(1.5*h+x.plotX)/2.5;q=(1.5*p+a)/2.5;z=(1.5*h+z)/2.5;k=(1.5*p+r)/2.5;z!==t&&(m=(k-q)*(z-h)/(z-t)+p-k);q+=m;k+=m;q>a&&q>p?(q=Math.max(a,p),k=2*p-q):q<a&&q<p&&(q=Math.min(a,p),k=2*p-q);k>r&&k>p?(k=Math.max(r,p),q=2*p-k):k<r&&k<p&&(k=Math.min(r,p),q=2*p-k);G.rightContX=z;G.rightContY=k}G=["C",F(x.rightContX,x.plotX),F(x.rightContY,x.plotY),F(t,h),F(q,p),h,p];x.rightContX=x.rightContY=null;return G}})})(L);(function(a){var F=a.seriesTypes.area.prototype,E=a.seriesType;
E("areaspline","spline",a.defaultPlotOptions.area,{getStackPoints:F.getStackPoints,getGraphPath:F.getGraphPath,drawGraph:F.drawGraph,drawLegendSymbol:a.LegendSymbolMixin.drawRectangle})})(L);(function(a){var F=a.animObject,E=a.color,G=a.each,r=a.extend,h=a.isNumber,p=a.merge,x=a.pick,t=a.Series,q=a.seriesType,z=a.svg;q("column","line",{borderRadius:0,crisp:!0,groupPadding:.2,marker:null,pointPadding:.1,minPointLength:0,cropThreshold:50,pointRange:null,states:{hover:{halo:!1,brightness:.1},select:{color:"#cccccc",
borderColor:"#000000"}},dataLabels:{align:null,verticalAlign:null,y:null},softThreshold:!1,startFromThreshold:!0,stickyTracking:!1,tooltip:{distance:6},threshold:0,borderColor:"#ffffff"},{cropShoulder:0,directTouch:!0,trackerGroups:["group","dataLabelsGroup"],negStacks:!0,init:function(){t.prototype.init.apply(this,arguments);var a=this,m=a.chart;m.hasRendered&&G(m.series,function(f){f.type===a.type&&(f.isDirty=!0)})},getColumnMetrics:function(){var a=this,m=a.options,f=a.xAxis,e=a.yAxis,c=f.reversed,
b,h={},l=0;!1===m.grouping?l=1:G(a.chart.series,function(c){var g=c.options,f=c.yAxis,k;c.type!==a.type||!c.visible&&a.chart.options.chart.ignoreHiddenSeries||e.len!==f.len||e.pos!==f.pos||(g.stacking?(b=c.stackKey,void 0===h[b]&&(h[b]=l++),k=h[b]):!1!==g.grouping&&(k=l++),c.columnIndex=k)});var p=Math.min(Math.abs(f.transA)*(f.ordinalSlope||m.pointRange||f.closestPointRange||f.tickInterval||1),f.len),t=p*m.groupPadding,C=(p-2*t)/(l||1),m=Math.min(m.maxPointWidth||f.len,x(m.pointWidth,C*(1-2*m.pointPadding)));
a.columnMetrics={width:m,offset:(C-m)/2+(t+((a.columnIndex||0)+(c?1:0))*C-p/2)*(c?-1:1)};return a.columnMetrics},crispCol:function(a,m,f,e){var c=this.chart,b=this.borderWidth,k=-(b%2?.5:0),b=b%2?.5:1;c.inverted&&c.renderer.isVML&&(b+=1);this.options.crisp&&(f=Math.round(a+f)+k,a=Math.round(a)+k,f-=a);e=Math.round(m+e)+b;k=.5>=Math.abs(m)&&.5<e;m=Math.round(m)+b;e-=m;k&&e&&(--m,e+=1);return{x:a,y:m,width:f,height:e}},translate:function(){var a=this,m=a.chart,f=a.options,e=a.dense=2>a.closestPointRange*
a.xAxis.transA,e=a.borderWidth=x(f.borderWidth,e?0:1),c=a.yAxis,b=f.threshold,h=a.translatedThreshold=c.getThreshold(b),l=x(f.minPointLength,5),p=a.getColumnMetrics(),q=p.width,C=a.barW=Math.max(q,1+2*e),r=a.pointXOffset=p.offset;m.inverted&&(h-=.5);f.pointPadding&&(C=Math.ceil(C));t.prototype.translate.apply(a);G(a.points,function(g){var e=x(g.yBottom,h),f=999+Math.abs(e),f=Math.min(Math.max(-f,g.plotY),c.len+f),k=g.plotX+r,d=C,v=Math.min(f,e),w,u=Math.max(f,e)-v;l&&Math.abs(u)<l&&(u=l,w=!c.reversed&&
!g.negative||c.reversed&&g.negative,g.y===b&&a.dataMax<=b&&c.min<b&&(w=!w),v=Math.abs(v-h)>l?e-l:h-(w?l:0));g.barX=k;g.pointWidth=q;g.tooltipPos=m.inverted?[c.len+c.pos-m.plotLeft-f,a.xAxis.len-k-d/2,u]:[k+d/2,f+c.pos-m.plotTop,u];g.shapeType="rect";g.shapeArgs=a.crispCol.apply(a,g.isNull?[k,h,d,0]:[k,v,d,u])})},getSymbol:a.noop,drawLegendSymbol:a.LegendSymbolMixin.drawRectangle,drawGraph:function(){this.group[this.dense?"addClass":"removeClass"]("highcharts-dense-data")},pointAttribs:function(a,
m){var f=this.options,e,c=this.pointAttrToOptions||{};e=c.stroke||"borderColor";var b=c["stroke-width"]||"borderWidth",h=a&&a.color||this.color,l=a&&a[e]||f[e]||this.color||h,k=a&&a[b]||f[b]||this[b]||0,c=f.dashStyle;a&&this.zones.length&&(h=a.getZone(),h=a.options.color||h&&h.color||this.color);m&&(a=p(f.states[m],a.options.states&&a.options.states[m]||{}),m=a.brightness,h=a.color||void 0!==m&&E(h).brighten(a.brightness).get()||h,l=a[e]||l,k=a[b]||k,c=a.dashStyle||c);e={fill:h,stroke:l,"stroke-width":k};
c&&(e.dashstyle=c);return e},drawPoints:function(){var a=this,m=this.chart,f=a.options,e=m.renderer,c=f.animationLimit||250,b;G(a.points,function(k){var l=k.graphic;if(h(k.plotY)&&null!==k.y){b=k.shapeArgs;if(l)l[m.pointCount<c?"animate":"attr"](p(b));else k.graphic=l=e[k.shapeType](b).add(k.group||a.group);f.borderRadius&&l.attr({r:f.borderRadius});l.attr(a.pointAttribs(k,k.selected&&"select")).shadow(f.shadow,null,f.stacking&&!f.borderRadius);l.addClass(k.getClassName(),!0)}else l&&(k.graphic=l.destroy())})},
animate:function(a){var m=this,f=this.yAxis,e=m.options,c=this.chart.inverted,b={},h=c?"translateX":"translateY",l;z&&(a?(b.scaleY=.001,a=Math.min(f.pos+f.len,Math.max(f.pos,f.toPixels(e.threshold))),c?b.translateX=a-f.len:b.translateY=a,m.group.attr(b)):(l=m.group.attr(h),m.group.animate({scaleY:1},r(F(m.options.animation),{step:function(a,c){b[h]=l+c.pos*(f.pos-l);m.group.attr(b)}})),m.animate=null))},remove:function(){var a=this,h=a.chart;h.hasRendered&&G(h.series,function(f){f.type===a.type&&
(f.isDirty=!0)});t.prototype.remove.apply(a,arguments)}})})(L);(function(a){a=a.seriesType;a("bar","column",null,{inverted:!0})})(L);(function(a){var F=a.Series;a=a.seriesType;a("scatter","line",{lineWidth:0,findNearestPointBy:"xy",marker:{enabled:!0},tooltip:{headerFormat:'\x3cspan style\x3d"color:{point.color}"\x3e\u25cf\x3c/span\x3e \x3cspan style\x3d"font-size: 0.85em"\x3e {series.name}\x3c/span\x3e\x3cbr/\x3e',pointFormat:"x: \x3cb\x3e{point.x}\x3c/b\x3e\x3cbr/\x3ey: \x3cb\x3e{point.y}\x3c/b\x3e\x3cbr/\x3e"}},
{sorted:!1,requireSorting:!1,noSharedTooltip:!0,trackerGroups:["group","markerGroup","dataLabelsGroup"],takeOrdinalPosition:!1,drawGraph:function(){this.options.lineWidth&&F.prototype.drawGraph.call(this)}})})(L);(function(a){var F=a.deg2rad,E=a.isNumber,G=a.pick,r=a.relativeLength;a.CenteredSeriesMixin={getCenter:function(){var a=this.options,p=this.chart,x=2*(a.slicedOffset||0),t=p.plotWidth-2*x,p=p.plotHeight-2*x,q=a.center,q=[G(q[0],"50%"),G(q[1],"50%"),a.size||"100%",a.innerSize||0],z=Math.min(t,
p),k,m;for(k=0;4>k;++k)m=q[k],a=2>k||2===k&&/%$/.test(m),q[k]=r(m,[t,p,z,q[2]][k])+(a?x:0);q[3]>q[2]&&(q[3]=q[2]);return q},getStartAndEndRadians:function(a,p){a=E(a)?a:0;p=E(p)&&p>a&&360>p-a?p:a+360;return{start:F*(a+-90),end:F*(p+-90)}}}})(L);(function(a){var F=a.addEvent,E=a.CenteredSeriesMixin,G=a.defined,r=a.each,h=a.extend,p=E.getStartAndEndRadians,x=a.inArray,t=a.noop,q=a.pick,z=a.Point,k=a.Series,m=a.seriesType,f=a.setAnimation;m("pie","line",{center:[null,null],clip:!1,colorByPoint:!0,dataLabels:{distance:30,
enabled:!0,formatter:function(){return this.point.isNull?void 0:this.point.name},x:0},ignoreHiddenPoint:!0,legendType:"point",marker:null,size:null,showInLegend:!1,slicedOffset:10,stickyTracking:!1,tooltip:{followPointer:!0},borderColor:"#ffffff",borderWidth:1,states:{hover:{brightness:.1,shadow:!1}}},{isCartesian:!1,requireSorting:!1,directTouch:!0,noSharedTooltip:!0,trackerGroups:["group","dataLabelsGroup"],axisTypes:[],pointAttribs:a.seriesTypes.column.prototype.pointAttribs,animate:function(a){var c=
this,b=c.points,e=c.startAngleRad;a||(r(b,function(a){var b=a.graphic,l=a.shapeArgs;b&&(b.attr({r:a.startR||c.center[3]/2,start:e,end:e}),b.animate({r:l.r,start:l.start,end:l.end},c.options.animation))}),c.animate=null)},updateTotals:function(){var a,c=0,b=this.points,f=b.length,l,m=this.options.ignoreHiddenPoint;for(a=0;a<f;a++)l=b[a],c+=m&&!l.visible?0:l.isNull?0:l.y;this.total=c;for(a=0;a<f;a++)l=b[a],l.percentage=0<c&&(l.visible||!m)?l.y/c*100:0,l.total=c},generatePoints:function(){k.prototype.generatePoints.call(this);
this.updateTotals()},translate:function(a){this.generatePoints();var c=0,b=this.options,e=b.slicedOffset,l=e+(b.borderWidth||0),f,m,h,k=p(b.startAngle,b.endAngle),g=this.startAngleRad=k.start,k=(this.endAngleRad=k.end)-g,y=this.points,t,A=b.dataLabels.distance,b=b.ignoreHiddenPoint,d,v=y.length,B;a||(this.center=a=this.getCenter());this.getX=function(d,b,c){h=Math.asin(Math.min((d-a[1])/(a[2]/2+c.labelDistance),1));return a[0]+(b?-1:1)*Math.cos(h)*(a[2]/2+c.labelDistance)};for(d=0;d<v;d++){B=y[d];
B.labelDistance=q(B.options.dataLabels&&B.options.dataLabels.distance,A);this.maxLabelDistance=Math.max(this.maxLabelDistance||0,B.labelDistance);f=g+c*k;if(!b||B.visible)c+=B.percentage/100;m=g+c*k;B.shapeType="arc";B.shapeArgs={x:a[0],y:a[1],r:a[2]/2,innerR:a[3]/2,start:Math.round(1E3*f)/1E3,end:Math.round(1E3*m)/1E3};h=(m+f)/2;h>1.5*Math.PI?h-=2*Math.PI:h<-Math.PI/2&&(h+=2*Math.PI);B.slicedTranslation={translateX:Math.round(Math.cos(h)*e),translateY:Math.round(Math.sin(h)*e)};m=Math.cos(h)*a[2]/
2;t=Math.sin(h)*a[2]/2;B.tooltipPos=[a[0]+.7*m,a[1]+.7*t];B.half=h<-Math.PI/2||h>Math.PI/2?1:0;B.angle=h;f=Math.min(l,B.labelDistance/5);B.labelPos=[a[0]+m+Math.cos(h)*B.labelDistance,a[1]+t+Math.sin(h)*B.labelDistance,a[0]+m+Math.cos(h)*f,a[1]+t+Math.sin(h)*f,a[0]+m,a[1]+t,0>B.labelDistance?"center":B.half?"right":"left",h]}},drawGraph:null,drawPoints:function(){var a=this,c=a.chart.renderer,b,f,l,m,k=a.options.shadow;k&&!a.shadowGroup&&(a.shadowGroup=c.g("shadow").add(a.group));r(a.points,function(e){f=
e.graphic;if(e.isNull)f&&(e.graphic=f.destroy());else{m=e.shapeArgs;b=e.getTranslate();var p=e.shadowGroup;k&&!p&&(p=e.shadowGroup=c.g("shadow").add(a.shadowGroup));p&&p.attr(b);l=a.pointAttribs(e,e.selected&&"select");f?f.setRadialReference(a.center).attr(l).animate(h(m,b)):(e.graphic=f=c[e.shapeType](m).setRadialReference(a.center).attr(b).add(a.group),e.visible||f.attr({visibility:"hidden"}),f.attr(l).attr({"stroke-linejoin":"round"}).shadow(k,p));f.addClass(e.getClassName())}})},searchPoint:t,
sortByAngle:function(a,c){a.sort(function(a,e){return void 0!==a.angle&&(e.angle-a.angle)*c})},drawLegendSymbol:a.LegendSymbolMixin.drawRectangle,getCenter:E.getCenter,getSymbol:t},{init:function(){z.prototype.init.apply(this,arguments);var a=this,c;a.name=q(a.name,"Slice");c=function(b){a.slice("select"===b.type)};F(a,"select",c);F(a,"unselect",c);return a},isValid:function(){return a.isNumber(this.y,!0)&&0<=this.y},setVisible:function(a,c){var b=this,e=b.series,l=e.chart,f=e.options.ignoreHiddenPoint;
c=q(c,f);a!==b.visible&&(b.visible=b.options.visible=a=void 0===a?!b.visible:a,e.options.data[x(b,e.data)]=b.options,r(["graphic","dataLabel","connector","shadowGroup"],function(c){if(b[c])b[c][a?"show":"hide"](!0)}),b.legendItem&&l.legend.colorizeItem(b,a),a||"hover"!==b.state||b.setState(""),f&&(e.isDirty=!0),c&&l.redraw())},slice:function(a,c,b){var e=this.series;f(b,e.chart);q(c,!0);this.sliced=this.options.sliced=G(a)?a:!this.sliced;e.options.data[x(this,e.data)]=this.options;this.graphic.animate(this.getTranslate());
this.shadowGroup&&this.shadowGroup.animate(this.getTranslate())},getTranslate:function(){return this.sliced?this.slicedTranslation:{translateX:0,translateY:0}},haloPath:function(a){var c=this.shapeArgs;return this.sliced||!this.visible?[]:this.series.chart.renderer.symbols.arc(c.x,c.y,c.r+a,c.r+a,{innerR:this.shapeArgs.r,start:c.start,end:c.end})}})})(L);(function(a){var F=a.addEvent,E=a.arrayMax,G=a.defined,r=a.each,h=a.extend,p=a.format,x=a.map,t=a.merge,q=a.noop,z=a.pick,k=a.relativeLength,m=a.Series,
f=a.seriesTypes,e=a.stableSort;a.distribute=function(a,b){function c(a,b){return a.target-b.target}var l,f=!0,m=a,h=[],k;k=0;for(l=a.length;l--;)k+=a[l].size;if(k>b){e(a,function(a,b){return(b.rank||0)-(a.rank||0)});for(k=l=0;k<=b;)k+=a[l].size,l++;h=a.splice(l-1,a.length)}e(a,c);for(a=x(a,function(a){return{size:a.size,targets:[a.target],align:z(a.align,.5)}});f;){for(l=a.length;l--;)f=a[l],k=(Math.min.apply(0,f.targets)+Math.max.apply(0,f.targets))/2,f.pos=Math.min(Math.max(0,k-f.size*f.align),
b-f.size);l=a.length;for(f=!1;l--;)0<l&&a[l-1].pos+a[l-1].size>a[l].pos&&(a[l-1].size+=a[l].size,a[l-1].targets=a[l-1].targets.concat(a[l].targets),a[l-1].align=.5,a[l-1].pos+a[l-1].size>b&&(a[l-1].pos=b-a[l-1].size),a.splice(l,1),f=!0)}l=0;r(a,function(a){var b=0;r(a.targets,function(){m[l].pos=a.pos+b;b+=m[l].size;l++})});m.push.apply(m,h);e(m,c)};m.prototype.drawDataLabels=function(){function c(a,b){var d=b.filter;return d?(b=d.operator,a=a[d.property],d=d.value,"\x3e"===b&&a>d||"\x3c"===b&&a<
d||"\x3e\x3d"===b&&a>=d||"\x3c\x3d"===b&&a<=d||"\x3d\x3d"===b&&a==d||"\x3d\x3d\x3d"===b&&a===d?!0:!1):!0}var b=this,e=b.options,l=e.dataLabels,f=b.points,m,h,k=b.hasRendered||0,g,y,q=z(l.defer,!!e.animation),A=b.chart.renderer;if(l.enabled||b._hasPointLabels)b.dlProcessOptions&&b.dlProcessOptions(l),y=b.plotGroup("dataLabelsGroup","data-labels",q&&!k?"hidden":"visible",l.zIndex||6),q&&(y.attr({opacity:+k}),k||F(b,"afterAnimate",function(){b.visible&&y.show(!0);y[e.animation?"animate":"attr"]({opacity:1},
{duration:200})})),h=l,r(f,function(d){var f,k=d.dataLabel,u,n,C=d.connector,w=!k,q;m=d.dlOptions||d.options&&d.options.dataLabels;(f=z(m&&m.enabled,h.enabled)&&!d.isNull)&&(f=!0===c(d,m||l));f&&(l=t(h,m),u=d.getLabelConfig(),q=l[d.formatPrefix+"Format"]||l.format,g=G(q)?p(q,u):(l[d.formatPrefix+"Formatter"]||l.formatter).call(u,l),q=l.style,u=l.rotation,q.color=z(l.color,q.color,b.color,"#000000"),"contrast"===q.color&&(d.contrastColor=A.getContrast(d.color||b.color),q.color=l.inside||0>z(d.labelDistance,
l.distance)||e.stacking?d.contrastColor:"#000000"),e.cursor&&(q.cursor=e.cursor),n={fill:l.backgroundColor,stroke:l.borderColor,"stroke-width":l.borderWidth,r:l.borderRadius||0,rotation:u,padding:l.padding,zIndex:1},a.objectEach(n,function(a,d){void 0===a&&delete n[d]}));!k||f&&G(g)?f&&G(g)&&(k?n.text=g:(k=d.dataLabel=A[u?"text":"label"](g,0,-9999,l.shape,null,null,l.useHTML,null,"data-label"),k.addClass("highcharts-data-label-color-"+d.colorIndex+" "+(l.className||"")+(l.useHTML?"highcharts-tracker":
""))),k.attr(n),k.css(q).shadow(l.shadow),k.added||k.add(y),b.alignDataLabel(d,k,l,null,w)):(d.dataLabel=k=k.destroy(),C&&(d.connector=C.destroy()))})};m.prototype.alignDataLabel=function(a,b,e,l,f){var c=this.chart,m=c.inverted,k=z(a.dlBox&&a.dlBox.centerX,a.plotX,-9999),g=z(a.plotY,-9999),y=b.getBBox(),p,A=e.rotation,d=e.align,v=this.visible&&(a.series.forceDL||c.isInsidePlot(k,Math.round(g),m)||l&&c.isInsidePlot(k,m?l.x+1:l.y+l.height-1,m)),B="justify"===z(e.overflow,"justify");if(v&&(p=e.style.fontSize,
p=c.renderer.fontMetrics(p,b).b,l=h({x:m?this.yAxis.len-g:k,y:Math.round(m?this.xAxis.len-k:g),width:0,height:0},l),h(e,{width:y.width,height:y.height}),A?(B=!1,k=c.renderer.rotCorr(p,A),k={x:l.x+e.x+l.width/2+k.x,y:l.y+e.y+{top:0,middle:.5,bottom:1}[e.verticalAlign]*l.height},b[f?"attr":"animate"](k).attr({align:d}),g=(A+720)%360,g=180<g&&360>g,"left"===d?k.y-=g?y.height:0:"center"===d?(k.x-=y.width/2,k.y-=y.height/2):"right"===d&&(k.x-=y.width,k.y-=g?0:y.height)):(b.align(e,null,l),k=b.alignAttr),
B?a.isLabelJustified=this.justifyDataLabel(b,e,k,y,l,f):z(e.crop,!0)&&(v=c.isInsidePlot(k.x,k.y)&&c.isInsidePlot(k.x+y.width,k.y+y.height)),e.shape&&!A))b[f?"attr":"animate"]({anchorX:m?c.plotWidth-a.plotY:a.plotX,anchorY:m?c.plotHeight-a.plotX:a.plotY});v||(b.attr({y:-9999}),b.placed=!1)};m.prototype.justifyDataLabel=function(a,b,e,f,k,m){var c=this.chart,l=b.align,g=b.verticalAlign,h,p,A=a.box?0:a.padding||0;h=e.x+A;0>h&&("right"===l?b.align="left":b.x=-h,p=!0);h=e.x+f.width-A;h>c.plotWidth&&("left"===
l?b.align="right":b.x=c.plotWidth-h,p=!0);h=e.y+A;0>h&&("bottom"===g?b.verticalAlign="top":b.y=-h,p=!0);h=e.y+f.height-A;h>c.plotHeight&&("top"===g?b.verticalAlign="bottom":b.y=c.plotHeight-h,p=!0);p&&(a.placed=!m,a.align(b,null,k));return p};f.pie&&(f.pie.prototype.drawDataLabels=function(){var c=this,b=c.data,e,f=c.chart,k=c.options.dataLabels,h=z(k.connectorPadding,10),p=z(k.connectorWidth,1),t=f.plotWidth,g=f.plotHeight,y,q=c.center,A=q[2]/2,d=q[1],v,B,u,n,x=[[],[]],M,O,N,F,I=[0,0,0,0];c.visible&&
(k.enabled||c._hasPointLabels)&&(r(b,function(a){a.dataLabel&&a.visible&&a.dataLabel.shortened&&(a.dataLabel.attr({width:"auto"}).css({width:"auto",textOverflow:"clip"}),a.dataLabel.shortened=!1)}),m.prototype.drawDataLabels.apply(c),r(b,function(a){a.dataLabel&&a.visible&&(x[a.half].push(a),a.dataLabel._pos=null)}),r(x,function(b,l){var m,p,y=b.length,C=[],w;if(y)for(c.sortByAngle(b,l-.5),0<c.maxLabelDistance&&(m=Math.max(0,d-A-c.maxLabelDistance),p=Math.min(d+A+c.maxLabelDistance,f.plotHeight),
r(b,function(a){0<a.labelDistance&&a.dataLabel&&(a.top=Math.max(0,d-A-a.labelDistance),a.bottom=Math.min(d+A+a.labelDistance,f.plotHeight),w=a.dataLabel.getBBox().height||21,a.positionsIndex=C.push({target:a.labelPos[1]-a.top+w/2,size:w,rank:a.y})-1)}),a.distribute(C,p+w-m)),F=0;F<y;F++)e=b[F],p=e.positionsIndex,u=e.labelPos,v=e.dataLabel,N=!1===e.visible?"hidden":"inherit",O=m=u[1],C&&G(C[p])&&(void 0===C[p].pos?N="hidden":(n=C[p].size,O=e.top+C[p].pos)),delete e.positionIndex,M=k.justify?q[0]+(l?
-1:1)*(A+e.labelDistance):c.getX(O<e.top+2||O>e.bottom-2?m:O,l,e),v._attr={visibility:N,align:u[6]},v._pos={x:M+k.x+({left:h,right:-h}[u[6]]||0),y:O+k.y-10},u.x=M,u.y=O,z(k.crop,!0)&&(B=v.getBBox().width,m=null,M-B<h?(m=Math.round(B-M+h),I[3]=Math.max(m,I[3])):M+B>t-h&&(m=Math.round(M+B-t+h),I[1]=Math.max(m,I[1])),0>O-n/2?I[0]=Math.max(Math.round(-O+n/2),I[0]):O+n/2>g&&(I[2]=Math.max(Math.round(O+n/2-g),I[2])),v.sideOverflow=m)}),0===E(I)||this.verifyDataLabelOverflow(I))&&(this.placeDataLabels(),
p&&r(this.points,function(a){var d;y=a.connector;if((v=a.dataLabel)&&v._pos&&a.visible&&0<a.labelDistance){N=v._attr.visibility;if(d=!y)a.connector=y=f.renderer.path().addClass("highcharts-data-label-connector  highcharts-color-"+a.colorIndex).add(c.dataLabelsGroup),y.attr({"stroke-width":p,stroke:k.connectorColor||a.color||"#666666"});y[d?"attr":"animate"]({d:c.connectorPath(a.labelPos)});y.attr("visibility",N)}else y&&(a.connector=y.destroy())}))},f.pie.prototype.connectorPath=function(a){var b=
a.x,c=a.y;return z(this.options.dataLabels.softConnector,!0)?["M",b+("left"===a[6]?5:-5),c,"C",b,c,2*a[2]-a[4],2*a[3]-a[5],a[2],a[3],"L",a[4],a[5]]:["M",b+("left"===a[6]?5:-5),c,"L",a[2],a[3],"L",a[4],a[5]]},f.pie.prototype.placeDataLabels=function(){r(this.points,function(a){var b=a.dataLabel;b&&a.visible&&((a=b._pos)?(b.sideOverflow&&(b._attr.width=b.getBBox().width-b.sideOverflow,b.css({width:b._attr.width+"px",textOverflow:"ellipsis"}),b.shortened=!0),b.attr(b._attr),b[b.moved?"animate":"attr"](a),
b.moved=!0):b&&b.attr({y:-9999}))},this)},f.pie.prototype.alignDataLabel=q,f.pie.prototype.verifyDataLabelOverflow=function(a){var b=this.center,c=this.options,e=c.center,f=c.minSize||80,m,h=null!==c.size;h||(null!==e[0]?m=Math.max(b[2]-Math.max(a[1],a[3]),f):(m=Math.max(b[2]-a[1]-a[3],f),b[0]+=(a[3]-a[1])/2),null!==e[1]?m=Math.max(Math.min(m,b[2]-Math.max(a[0],a[2])),f):(m=Math.max(Math.min(m,b[2]-a[0]-a[2]),f),b[1]+=(a[0]-a[2])/2),m<b[2]?(b[2]=m,b[3]=Math.min(k(c.innerSize||0,m),m),this.translate(b),
this.drawDataLabels&&this.drawDataLabels()):h=!0);return h});f.column&&(f.column.prototype.alignDataLabel=function(a,b,e,f,k){var c=this.chart.inverted,l=a.series,h=a.dlBox||a.shapeArgs,g=z(a.below,a.plotY>z(this.translatedThreshold,l.yAxis.len)),p=z(e.inside,!!this.options.stacking);h&&(f=t(h),0>f.y&&(f.height+=f.y,f.y=0),h=f.y+f.height-l.yAxis.len,0<h&&(f.height-=h),c&&(f={x:l.yAxis.len-f.y-f.height,y:l.xAxis.len-f.x-f.width,width:f.height,height:f.width}),p||(c?(f.x+=g?0:f.width,f.width=0):(f.y+=
g?f.height:0,f.height=0)));e.align=z(e.align,!c||p?"center":g?"right":"left");e.verticalAlign=z(e.verticalAlign,c||p?"middle":g?"top":"bottom");m.prototype.alignDataLabel.call(this,a,b,e,f,k);a.isLabelJustified&&a.contrastColor&&a.dataLabel.css({color:a.contrastColor})})})(L);(function(a){var F=a.Chart,E=a.each,G=a.objectEach,r=a.pick;a=a.addEvent;a(F.prototype,"render",function(){var a=[];E(this.labelCollectors||[],function(h){a=a.concat(h())});E(this.yAxis||[],function(h){h.options.stackLabels&&
!h.options.stackLabels.allowOverlap&&G(h.stacks,function(h){G(h,function(h){a.push(h.label)})})});E(this.series||[],function(h){var p=h.options.dataLabels,t=h.dataLabelCollections||["dataLabel"];(p.enabled||h._hasPointLabels)&&!p.allowOverlap&&h.visible&&E(t,function(p){E(h.points,function(h){h[p]&&(h[p].labelrank=r(h.labelrank,h.shapeArgs&&h.shapeArgs.height),a.push(h[p]))})})});this.hideOverlappingLabels(a)});F.prototype.hideOverlappingLabels=function(a){var h=a.length,r,t,q,z,k,m,f,e,c,b=function(a,
b,c,e,f,k,g,h){return!(f>a+c||f+g<a||k>b+e||k+h<b)};for(t=0;t<h;t++)if(r=a[t])r.oldOpacity=r.opacity,r.newOpacity=1,r.width||(q=r.getBBox(),r.width=q.width,r.height=q.height);a.sort(function(a,b){return(b.labelrank||0)-(a.labelrank||0)});for(t=0;t<h;t++)for(q=a[t],r=t+1;r<h;++r)if(z=a[r],q&&z&&q!==z&&q.placed&&z.placed&&0!==q.newOpacity&&0!==z.newOpacity&&(k=q.alignAttr,m=z.alignAttr,f=q.parentGroup,e=z.parentGroup,c=2*(q.box?0:q.padding||0),k=b(k.x+f.translateX,k.y+f.translateY,q.width-c,q.height-
c,m.x+e.translateX,m.y+e.translateY,z.width-c,z.height-c)))(q.labelrank<z.labelrank?q:z).newOpacity=0;E(a,function(a){var b,c;a&&(c=a.newOpacity,a.oldOpacity!==c&&a.placed&&(c?a.show(!0):b=function(){a.hide()},a.alignAttr.opacity=c,a[a.isOld?"animate":"attr"](a.alignAttr,null,b)),a.isOld=!0)})}})(L);(function(a){var F=a.addEvent,E=a.Chart,G=a.createElement,r=a.css,h=a.defaultOptions,p=a.defaultPlotOptions,x=a.each,t=a.extend,q=a.fireEvent,z=a.hasTouch,k=a.inArray,m=a.isObject,f=a.Legend,e=a.merge,
c=a.pick,b=a.Point,w=a.Series,l=a.seriesTypes,D=a.svg,H;H=a.TrackerMixin={drawTrackerPoint:function(){var a=this,b=a.chart.pointer,c=function(a){var c=b.getPointFromEvent(a);void 0!==c&&(b.isDirectTouch=!0,c.onMouseOver(a))};x(a.points,function(a){a.graphic&&(a.graphic.element.point=a);a.dataLabel&&(a.dataLabel.div?a.dataLabel.div.point=a:a.dataLabel.element.point=a)});a._hasTracking||(x(a.trackerGroups,function(g){if(a[g]){a[g].addClass("highcharts-tracker").on("mouseover",c).on("mouseout",function(a){b.onTrackerMouseOut(a)});
if(z)a[g].on("touchstart",c);a.options.cursor&&a[g].css(r).css({cursor:a.options.cursor})}}),a._hasTracking=!0)},drawTrackerGraph:function(){var a=this,b=a.options,c=b.trackByArea,e=[].concat(c?a.areaPath:a.graphPath),f=e.length,l=a.chart,d=l.pointer,k=l.renderer,h=l.options.tooltip.snap,m=a.tracker,n,p=function(){if(l.hoverSeries!==a)a.onMouseOver()},t="rgba(192,192,192,"+(D?.0001:.002)+")";if(f&&!c)for(n=f+1;n--;)"M"===e[n]&&e.splice(n+1,0,e[n+1]-h,e[n+2],"L"),(n&&"M"===e[n]||n===f)&&e.splice(n,
0,"L",e[n-2]+h,e[n-1]);m?m.attr({d:e}):a.graph&&(a.tracker=k.path(e).attr({"stroke-linejoin":"round",visibility:a.visible?"visible":"hidden",stroke:t,fill:c?t:"none","stroke-width":a.graph.strokeWidth()+(c?0:2*h),zIndex:2}).add(a.group),x([a.tracker,a.markerGroup],function(a){a.addClass("highcharts-tracker").on("mouseover",p).on("mouseout",function(a){d.onTrackerMouseOut(a)});b.cursor&&a.css({cursor:b.cursor});if(z)a.on("touchstart",p)}))}};l.column&&(l.column.prototype.drawTracker=H.drawTrackerPoint);
l.pie&&(l.pie.prototype.drawTracker=H.drawTrackerPoint);l.scatter&&(l.scatter.prototype.drawTracker=H.drawTrackerPoint);t(f.prototype,{setItemEvents:function(a,b,c){var g=this,f=g.chart.renderer.boxWrapper,l="highcharts-legend-"+(a.series?"point":"series")+"-active";(c?b:a.legendGroup).on("mouseover",function(){a.setState("hover");f.addClass(l);b.css(g.options.itemHoverStyle)}).on("mouseout",function(){b.css(e(a.visible?g.itemStyle:g.itemHiddenStyle));f.removeClass(l);a.setState()}).on("click",function(d){var b=
function(){a.setVisible&&a.setVisible()};d={browserEvent:d};a.firePointEvent?a.firePointEvent("legendItemClick",d,b):q(a,"legendItemClick",d,b)})},createCheckboxForItem:function(a){a.checkbox=G("input",{type:"checkbox",checked:a.selected,defaultChecked:a.selected},this.options.itemCheckboxStyle,this.chart.container);F(a.checkbox,"click",function(b){q(a.series||a,"checkboxClick",{checked:b.target.checked,item:a},function(){a.select()})})}});h.legend.itemStyle.cursor="pointer";t(E.prototype,{showResetZoom:function(){var a=
this,b=h.lang,c=a.options.chart.resetZoomButton,e=c.theme,f=e.states,l="chart"===c.relativeTo?null:"plotBox";this.resetZoomButton=a.renderer.button(b.resetZoom,null,null,function(){a.zoomOut()},e,f&&f.hover).attr({align:c.position.align,title:b.resetZoomTitle}).addClass("highcharts-reset-zoom").add().align(c.position,!1,l)},zoomOut:function(){var a=this;q(a,"selection",{resetSelection:!0},function(){a.zoom()})},zoom:function(a){var b,g=this.pointer,e=!1,f;!a||a.resetSelection?(x(this.axes,function(a){b=
a.zoom()}),g.initiated=!1):x(a.xAxis.concat(a.yAxis),function(a){var d=a.axis;g[d.isXAxis?"zoomX":"zoomY"]&&(b=d.zoom(a.min,a.max),d.displayBtn&&(e=!0))});f=this.resetZoomButton;e&&!f?this.showResetZoom():!e&&m(f)&&(this.resetZoomButton=f.destroy());b&&this.redraw(c(this.options.chart.animation,a&&a.animation,100>this.pointCount))},pan:function(a,b){var c=this,e=c.hoverPoints,f;e&&x(e,function(a){a.setState()});x("xy"===b?[1,0]:[1],function(b){b=c[b?"xAxis":"yAxis"][0];var d=b.horiz,g=a[d?"chartX":
"chartY"],d=d?"mouseDownX":"mouseDownY",e=c[d],l=(b.pointRange||0)/2,n=b.getExtremes(),k=b.toValue(e-g,!0)+l,l=b.toValue(e+b.len-g,!0)-l,h=l<k,e=h?l:k,k=h?k:l,l=Math.min(n.dataMin,b.toValue(b.toPixels(n.min)-b.minPixelPadding)),h=Math.max(n.dataMax,b.toValue(b.toPixels(n.max)+b.minPixelPadding)),m;m=l-e;0<m&&(k+=m,e=l);m=k-h;0<m&&(k=h,e-=m);b.series.length&&e!==n.min&&k!==n.max&&(b.setExtremes(e,k,!1,!1,{trigger:"pan"}),f=!0);c[d]=g});f&&c.redraw(!1);r(c.container,{cursor:"move"})}});t(b.prototype,
{select:function(a,b){var g=this,e=g.series,f=e.chart;a=c(a,!g.selected);g.firePointEvent(a?"select":"unselect",{accumulate:b},function(){g.selected=g.options.selected=a;e.options.data[k(g,e.data)]=g.options;g.setState(a&&"select");b||x(f.getSelectedPoints(),function(a){a.selected&&a!==g&&(a.selected=a.options.selected=!1,e.options.data[k(a,e.data)]=a.options,a.setState(""),a.firePointEvent("unselect"))})})},onMouseOver:function(a){var b=this.series.chart,c=b.pointer;a=a?c.normalize(a):c.getChartCoordinatesFromPoint(this,
b.inverted);c.runPointActions(a,this)},onMouseOut:function(){var a=this.series.chart;this.firePointEvent("mouseOut");x(a.hoverPoints||[],function(a){a.setState()});a.hoverPoints=a.hoverPoint=null},importEvents:function(){if(!this.hasImportedEvents){var b=this,c=e(b.series.options.point,b.options).events;b.events=c;a.objectEach(c,function(a,c){F(b,c,a)});this.hasImportedEvents=!0}},setState:function(a,b){var g=Math.floor(this.plotX),e=this.plotY,f=this.series,l=f.options.states[a]||{},d=p[f.type].marker&&
f.options.marker,k=d&&!1===d.enabled,h=d&&d.states&&d.states[a]||{},m=!1===h.enabled,n=f.stateMarkerGraphic,q=this.marker||{},w=f.chart,r=f.halo,C,D=d&&f.markerAttribs;a=a||"";if(!(a===this.state&&!b||this.selected&&"select"!==a||!1===l.enabled||a&&(m||k&&!1===h.enabled)||a&&q.states&&q.states[a]&&!1===q.states[a].enabled)){D&&(C=f.markerAttribs(this,a));if(this.graphic)this.state&&this.graphic.removeClass("highcharts-point-"+this.state),a&&this.graphic.addClass("highcharts-point-"+a),this.graphic.animate(f.pointAttribs(this,
a),c(w.options.chart.animation,l.animation)),C&&this.graphic.animate(C,c(w.options.chart.animation,h.animation,d.animation)),n&&n.hide();else{if(a&&h){d=q.symbol||f.symbol;n&&n.currentSymbol!==d&&(n=n.destroy());if(n)n[b?"animate":"attr"]({x:C.x,y:C.y});else d&&(f.stateMarkerGraphic=n=w.renderer.symbol(d,C.x,C.y,C.width,C.height).add(f.markerGroup),n.currentSymbol=d);n&&n.attr(f.pointAttribs(this,a))}n&&(n[a&&w.isInsidePlot(g,e,w.inverted)?"show":"hide"](),n.element.point=this)}(g=l.halo)&&g.size?
(r||(f.halo=r=w.renderer.path().add((this.graphic||n).parentGroup)),r[b?"animate":"attr"]({d:this.haloPath(g.size)}),r.attr({"class":"highcharts-halo highcharts-color-"+c(this.colorIndex,f.colorIndex)}),r.point=this,r.attr(t({fill:this.color||f.color,"fill-opacity":g.opacity,zIndex:-1},g.attributes))):r&&r.point&&r.point.haloPath&&r.animate({d:r.point.haloPath(0)});this.state=a}},haloPath:function(a){return this.series.chart.renderer.symbols.circle(Math.floor(this.plotX)-a,this.plotY-a,2*a,2*a)}});
t(w.prototype,{onMouseOver:function(){var a=this.chart,b=a.hoverSeries;if(b&&b!==this)b.onMouseOut();this.options.events.mouseOver&&q(this,"mouseOver");this.setState("hover");a.hoverSeries=this},onMouseOut:function(){var a=this.options,b=this.chart,c=b.tooltip,e=b.hoverPoint;b.hoverSeries=null;if(e)e.onMouseOut();this&&a.events.mouseOut&&q(this,"mouseOut");!c||this.stickyTracking||c.shared&&!this.noSharedTooltip||c.hide();this.setState()},setState:function(a){var b=this,g=b.options,e=b.graph,f=g.states,
l=g.lineWidth,g=0;a=a||"";if(b.state!==a&&(x([b.group,b.markerGroup,b.dataLabelsGroup],function(d){d&&(b.state&&d.removeClass("highcharts-series-"+b.state),a&&d.addClass("highcharts-series-"+a))}),b.state=a,!f[a]||!1!==f[a].enabled)&&(a&&(l=f[a].lineWidth||l+(f[a].lineWidthPlus||0)),e&&!e.dashstyle))for(l={"stroke-width":l},e.animate(l,c(b.chart.options.chart.animation,f[a]&&f[a].animation));b["zone-graph-"+g];)b["zone-graph-"+g].attr(l),g+=1},setVisible:function(a,b){var c=this,e=c.chart,f=c.legendItem,
l,d=e.options.chart.ignoreHiddenSeries,k=c.visible;l=(c.visible=a=c.options.visible=c.userOptions.visible=void 0===a?!k:a)?"show":"hide";x(["group","dataLabelsGroup","markerGroup","tracker","tt"],function(a){if(c[a])c[a][l]()});if(e.hoverSeries===c||(e.hoverPoint&&e.hoverPoint.series)===c)c.onMouseOut();f&&e.legend.colorizeItem(c,a);c.isDirty=!0;c.options.stacking&&x(e.series,function(a){a.options.stacking&&a.visible&&(a.isDirty=!0)});x(c.linkedSeries,function(d){d.setVisible(a,!1)});d&&(e.isDirtyBox=
!0);!1!==b&&e.redraw();q(c,l)},show:function(){this.setVisible(!0)},hide:function(){this.setVisible(!1)},select:function(a){this.selected=a=void 0===a?!this.selected:a;this.checkbox&&(this.checkbox.checked=a);q(this,a?"select":"unselect")},drawTracker:H.drawTrackerGraph})})(L);(function(a){var F=a.Chart,E=a.each,G=a.inArray,r=a.isArray,h=a.isObject,p=a.pick,x=a.splat;F.prototype.setResponsive=function(h){var p=this.options.responsive,t=[],k=this.currentResponsive;p&&p.rules&&E(p.rules,function(f){void 0===
f._id&&(f._id=a.uniqueKey());this.matchResponsiveRule(f,t,h)},this);var m=a.merge.apply(0,a.map(t,function(f){return a.find(p.rules,function(a){return a._id===f}).chartOptions})),t=t.toString()||void 0;t!==(k&&k.ruleIds)&&(k&&this.update(k.undoOptions,h),t?(this.currentResponsive={ruleIds:t,mergedOptions:m,undoOptions:this.currentOptions(m)},this.update(m,h)):this.currentResponsive=void 0)};F.prototype.matchResponsiveRule=function(a,h){var t=a.condition;(t.callback||function(){return this.chartWidth<=
p(t.maxWidth,Number.MAX_VALUE)&&this.chartHeight<=p(t.maxHeight,Number.MAX_VALUE)&&this.chartWidth>=p(t.minWidth,0)&&this.chartHeight>=p(t.minHeight,0)}).call(this)&&h.push(a._id)};F.prototype.currentOptions=function(p){function t(k,m,f,e){var c;a.objectEach(k,function(a,k){if(!e&&-1<G(k,["series","xAxis","yAxis"]))for(a=x(a),f[k]=[],c=0;c<a.length;c++)m[k][c]&&(f[k][c]={},t(a[c],m[k][c],f[k][c],e+1));else h(a)?(f[k]=r(a)?[]:{},t(a,m[k]||{},f[k],e+1)):f[k]=m[k]||null})}var z={};t(p,this.options,z,
0);return z}})(L);(function(a){var F=a.addEvent,E=a.Axis,G=a.Chart,r=a.css,h=a.dateFormat,p=a.defined,x=a.each,t=a.extend,q=a.noop,z=a.pick,k=a.timeUnits,m=a.wrap;m(a.Series.prototype,"init",function(a){var e;a.apply(this,Array.prototype.slice.call(arguments,1));(e=this.xAxis)&&e.options.ordinal&&F(this,"updatedData",function(){delete e.ordinalIndex})});m(E.prototype,"getTimeTicks",function(a,e,c,b,m,l,t,q){var f=0,r,g,y={},w,A,d,v=[],B=-Number.MAX_VALUE,u=this.options.tickPixelInterval;if(!this.options.ordinal&&
!this.options.breaks||!l||3>l.length||void 0===c)return a.call(this,e,c,b,m);A=l.length;for(r=0;r<A;r++){d=r&&l[r-1]>b;l[r]<c&&(f=r);if(r===A-1||l[r+1]-l[r]>5*t||d){if(l[r]>B){for(g=a.call(this,e,l[f],l[r],m);g.length&&g[0]<=B;)g.shift();g.length&&(B=g[g.length-1]);v=v.concat(g)}f=r+1}if(d)break}a=g.info;if(q&&a.unitRange<=k.hour){r=v.length-1;for(f=1;f<r;f++)h("%d",v[f])!==h("%d",v[f-1])&&(y[v[f]]="day",w=!0);w&&(y[v[0]]="day");a.higherRanks=y}v.info=a;if(q&&p(u)){q=a=v.length;r=[];var n;for(w=[];q--;)f=
this.translate(v[q]),n&&(w[q]=n-f),r[q]=n=f;w.sort();w=w[Math.floor(w.length/2)];w<.6*u&&(w=null);q=v[a-1]>b?a-1:a;for(n=void 0;q--;)f=r[q],b=Math.abs(n-f),n&&b<.8*u&&(null===w||b<.8*w)?(y[v[q]]&&!y[v[q+1]]?(b=q+1,n=f):b=q,v.splice(b,1)):n=f}return v});t(E.prototype,{beforeSetTickPositions:function(){var a,e=[],c=!1,b,k=this.getExtremes(),l=k.min,h=k.max,m,t=this.isXAxis&&!!this.options.breaks,k=this.options.ordinal,q=Number.MAX_VALUE,g=this.chart.options.chart.ignoreHiddenSeries;b="highcharts-navigator-xaxis"===
this.options.className;!this.options.overscroll||this.max!==this.dataMax||this.chart.mouseIsDown&&!b||this.eventArgs&&(!this.eventArgs||"navigator"===this.eventArgs.trigger)||(this.max+=this.options.overscroll,!b&&p(this.userMin)&&(this.min+=this.options.overscroll));if(k||t){x(this.series,function(b,c){if(!(g&&!1===b.visible||!1===b.takeOrdinalPosition&&!t)&&(e=e.concat(b.processedXData),a=e.length,e.sort(function(a,d){return a-d}),q=Math.min(q,z(b.closestPointRange,q)),a))for(c=a-1;c--;)e[c]===
e[c+1]&&e.splice(c,1)});a=e.length;if(2<a){b=e[1]-e[0];for(m=a-1;m--&&!c;)e[m+1]-e[m]!==b&&(c=!0);!this.options.keepOrdinalPadding&&(e[0]-l>b||h-e[e.length-1]>b)&&(c=!0)}else this.options.overscroll&&(2===a?q=e[1]-e[0]:1===a?(q=this.options.overscroll,e=[e[0],e[0]+q]):q=this.overscrollPointsRange);c?(this.options.overscroll&&(this.overscrollPointsRange=q,e=e.concat(this.getOverscrollPositions())),this.ordinalPositions=e,b=this.ordinal2lin(Math.max(l,e[0]),!0),m=Math.max(this.ordinal2lin(Math.min(h,
e[e.length-1]),!0),1),this.ordinalSlope=h=(h-l)/(m-b),this.ordinalOffset=l-b*h):(this.overscrollPointsRange=z(this.closestPointRange,this.overscrollPointsRange),this.ordinalPositions=this.ordinalSlope=this.ordinalOffset=void 0)}this.isOrdinal=k&&c;this.groupIntervalFactor=null},val2lin:function(a,e){var c=this.ordinalPositions;if(c){var b=c.length,f,l;for(f=b;f--;)if(c[f]===a){l=f;break}for(f=b-1;f--;)if(a>c[f]||0===f){a=(a-c[f])/(c[f+1]-c[f]);l=f+a;break}e=e?l:this.ordinalSlope*(l||0)+this.ordinalOffset}else e=
a;return e},lin2val:function(a,e){var c=this.ordinalPositions;if(c){var b=this.ordinalSlope,f=this.ordinalOffset,l=c.length-1,k;if(e)0>a?a=c[0]:a>l?a=c[l]:(l=Math.floor(a),k=a-l);else for(;l--;)if(e=b*l+f,a>=e){b=b*(l+1)+f;k=(a-e)/(b-e);break}return void 0!==k&&void 0!==c[l]?c[l]+(k?k*(c[l+1]-c[l]):0):a}return a},getExtendedPositions:function(){var a=this,e=a.chart,c=a.series[0].currentDataGrouping,b=a.ordinalIndex,k=c?c.count+c.unitName:"raw",l=a.options.overscroll,h=a.getExtremes(),m,p;b||(b=a.ordinalIndex=
{});b[k]||(m={series:[],chart:e,getExtremes:function(){return{min:h.dataMin,max:h.dataMax+l}},options:{ordinal:!0},val2lin:E.prototype.val2lin,ordinal2lin:E.prototype.ordinal2lin},x(a.series,function(b){p={xAxis:m,xData:b.xData.slice(),chart:e,destroyGroupedData:q};p.xData=p.xData.concat(a.getOverscrollPositions());p.options={dataGrouping:c?{enabled:!0,forced:!0,approximation:"open",units:[[c.unitName,[c.count]]]}:{enabled:!1}};b.processData.apply(p);m.series.push(p)}),a.beforeSetTickPositions.apply(m),
b[k]=m.ordinalPositions);return b[k]},getOverscrollPositions:function(){var f=this.options.overscroll,e=this.overscrollPointsRange,c=[],b=this.dataMax;if(a.defined(e))for(c.push(b);b<=this.dataMax+f;)b+=e,c.push(b);return c},getGroupIntervalFactor:function(a,e,c){var b;c=c.processedXData;var f=c.length,l=[];b=this.groupIntervalFactor;if(!b){for(b=0;b<f-1;b++)l[b]=c[b+1]-c[b];l.sort(function(a,b){return a-b});l=l[Math.floor(f/2)];a=Math.max(a,c[0]);e=Math.min(e,c[f-1]);this.groupIntervalFactor=b=f*
l/(e-a)}return b},postProcessTickInterval:function(a){var e=this.ordinalSlope;return e?this.options.breaks?this.closestPointRange||a:a/(e/this.closestPointRange):a}});E.prototype.ordinal2lin=E.prototype.val2lin;m(G.prototype,"pan",function(a,e){var c=this.xAxis[0],b=c.options.overscroll,f=e.chartX,l=!1;if(c.options.ordinal&&c.series.length){var k=this.mouseDownX,h=c.getExtremes(),m=h.dataMax,p=h.min,g=h.max,t=this.hoverPoints,q=c.closestPointRange||c.overscrollPointsRange,k=(k-f)/(c.translationSlope*
(c.ordinalSlope||q)),A={ordinalPositions:c.getExtendedPositions()},q=c.lin2val,d=c.val2lin,v;A.ordinalPositions?1<Math.abs(k)&&(t&&x(t,function(a){a.setState()}),0>k?(t=A,v=c.ordinalPositions?c:A):(t=c.ordinalPositions?c:A,v=A),A=v.ordinalPositions,m>A[A.length-1]&&A.push(m),this.fixedRange=g-p,k=c.toFixedRange(null,null,q.apply(t,[d.apply(t,[p,!0])+k,!0]),q.apply(v,[d.apply(v,[g,!0])+k,!0])),k.min>=Math.min(h.dataMin,p)&&k.max<=Math.max(m,g)+b&&c.setExtremes(k.min,k.max,!0,!1,{trigger:"pan"}),this.mouseDownX=
f,r(this.container,{cursor:"move"})):l=!0}else l=!0;l&&(b&&(c.max=c.dataMax+b),a.apply(this,Array.prototype.slice.call(arguments,1)))})})(L);(function(a){function F(){return Array.prototype.slice.call(arguments,1)}function E(a){a.apply(this);this.drawBreaks(this.xAxis,["x"]);this.drawBreaks(this.yAxis,G(this.pointArrayMap,["y"]))}var G=a.pick,r=a.wrap,h=a.each,p=a.extend,x=a.isArray,t=a.fireEvent,q=a.Axis,z=a.Series;p(q.prototype,{isInBreak:function(a,h){var f=a.repeat||Infinity,e=a.from,c=a.to-a.from;
h=h>=e?(h-e)%f:f-(e-h)%f;return a.inclusive?h<=c:h<c&&0!==h},isInAnyBreak:function(a,h){var f=this.options.breaks,e=f&&f.length,c,b,k;if(e){for(;e--;)this.isInBreak(f[e],a)&&(c=!0,b||(b=G(f[e].showPoints,this.isXAxis?!1:!0)));k=c&&h?c&&!b:c}return k}});r(q.prototype,"setTickPositions",function(a){a.apply(this,Array.prototype.slice.call(arguments,1));if(this.options.breaks){var k=this.tickPositions,f=this.tickPositions.info,e=[],c;for(c=0;c<k.length;c++)this.isInAnyBreak(k[c])||e.push(k[c]);this.tickPositions=
e;this.tickPositions.info=f}});r(q.prototype,"init",function(a,m,f){var e=this;f.breaks&&f.breaks.length&&(f.ordinal=!1);a.call(this,m,f);a=this.options.breaks;e.isBroken=x(a)&&!!a.length;e.isBroken&&(e.val2lin=function(a){var b=a,c,f;for(f=0;f<e.breakArray.length;f++)if(c=e.breakArray[f],c.to<=a)b-=c.len;else if(c.from>=a)break;else if(e.isInBreak(c,a)){b-=a-c.from;break}return b},e.lin2val=function(a){var b,c;for(c=0;c<e.breakArray.length&&!(b=e.breakArray[c],b.from>=a);c++)b.to<a?a+=b.len:e.isInBreak(b,
a)&&(a+=b.len);return a},e.setExtremes=function(a,b,e,f,k){for(;this.isInAnyBreak(a);)a-=this.closestPointRange;for(;this.isInAnyBreak(b);)b-=this.closestPointRange;q.prototype.setExtremes.call(this,a,b,e,f,k)},e.setAxisTranslation=function(a){q.prototype.setAxisTranslation.call(this,a);a=e.options.breaks;var b=[],c=[],f=0,k,m,p=e.userMin||e.min,r=e.userMax||e.max,g=G(e.pointRangePadding,0),y,x;h(a,function(a){m=a.repeat||Infinity;e.isInBreak(a,p)&&(p+=a.to%m-p%m);e.isInBreak(a,r)&&(r-=r%m-a.from%
m)});h(a,function(a){y=a.from;for(m=a.repeat||Infinity;y-m>p;)y-=m;for(;y<p;)y+=m;for(x=y;x<r;x+=m)b.push({value:x,move:"in"}),b.push({value:x+(a.to-a.from),move:"out",size:a.breakSize})});b.sort(function(a,d){return a.value===d.value?("in"===a.move?0:1)-("in"===d.move?0:1):a.value-d.value});k=0;y=p;h(b,function(a){k+="in"===a.move?1:-1;1===k&&"in"===a.move&&(y=a.value);0===k&&(c.push({from:y,to:a.value,len:a.value-y-(a.size||0)}),f+=a.value-y-(a.size||0))});e.breakArray=c;e.unitLength=r-p-f+g;t(e,
"afterBreaks");e.options.staticScale?e.transA=e.options.staticScale:e.unitLength&&(e.transA*=(r-e.min+g)/e.unitLength);g&&(e.minPixelPadding=e.transA*e.minPointOffset);e.min=p;e.max=r})});r(z.prototype,"generatePoints",function(a){a.apply(this,F(arguments));var k=this.xAxis,f=this.yAxis,e=this.points,c,b=e.length,h=this.options.connectNulls,l;if(k&&f&&(k.options.breaks||f.options.breaks))for(;b--;)c=e[b],l=null===c.y&&!1===h,l||!k.isInAnyBreak(c.x,!0)&&!f.isInAnyBreak(c.y,!0)||(e.splice(b,1),this.data[b]&&
this.data[b].destroyElements())});a.Series.prototype.drawBreaks=function(a,m){var f=this,e=f.points,c,b,k,l;a&&h(m,function(m){c=a.breakArray||[];b=a.isXAxis?a.min:G(f.options.threshold,a.min);h(e,function(e){l=G(e["stack"+m.toUpperCase()],e[m]);h(c,function(c){k=!1;if(b<c.from&&l>c.to||b>c.from&&l<c.from)k="pointBreak";else if(b<c.from&&l>c.from&&l<c.to||b>c.from&&l>c.to&&l<c.from)k="pointInBreak";k&&t(a,k,{point:e,brk:c})})})})};a.Series.prototype.gappedPath=function(){var k=this.options.gapSize,
h=this.points.slice(),f=h.length-1,e=this.yAxis,c;if(k&&0<f)for("value"!==this.options.gapUnit&&(k*=this.closestPointRange);f--;)h[f+1].x-h[f].x>k&&(c=(h[f].x+h[f+1].x)/2,h.splice(f+1,0,{isNull:!0,x:c}),this.options.stacking&&(c=e.stacks[this.stackKey][c]=new a.StackItem(e,e.options.stackLabels,!1,c,this.stack),c.total=0));return this.getGraphPath(h)};r(a.seriesTypes.column.prototype,"drawPoints",E);r(a.Series.prototype,"drawPoints",E)})(L);(function(a){var F=a.arrayMax,E=a.arrayMin,G=a.Axis,r=a.defaultPlotOptions,
h=a.defined,p=a.each,x=a.extend,t=a.format,q=a.isNumber,z=a.merge,k=a.pick,m=a.Point,f=a.Tooltip,e=a.wrap,c=a.Series.prototype,b=c.processData,w=c.generatePoints,l=c.destroy,D={approximation:"average",groupPixelWidth:2,dateTimeLabelFormats:{millisecond:["%A, %b %e, %H:%M:%S.%L","%A, %b %e, %H:%M:%S.%L","-%H:%M:%S.%L"],second:["%A, %b %e, %H:%M:%S","%A, %b %e, %H:%M:%S","-%H:%M:%S"],minute:["%A, %b %e, %H:%M","%A, %b %e, %H:%M","-%H:%M"],hour:["%A, %b %e, %H:%M","%A, %b %e, %H:%M","-%H:%M"],day:["%A, %b %e, %Y",
"%A, %b %e","-%A, %b %e, %Y"],week:["Week from %A, %b %e, %Y","%A, %b %e","-%A, %b %e, %Y"],month:["%B %Y","%B","-%B %Y"],year:["%Y","%Y","-%Y"]}},H={line:{},spline:{},area:{},areaspline:{},column:{approximation:"sum",groupPixelWidth:10},arearange:{approximation:"range"},areasplinerange:{approximation:"range"},columnrange:{approximation:"range",groupPixelWidth:10},candlestick:{approximation:"ohlc",groupPixelWidth:10},ohlc:{approximation:"ohlc",groupPixelWidth:5}},C=a.defaultDataGroupingUnits=[["millisecond",
[1,2,5,10,20,25,50,100,200,500]],["second",[1,2,5,10,15,30]],["minute",[1,2,5,10,15,30]],["hour",[1,2,3,4,6,8,12]],["day",[1]],["week",[1]],["month",[1,3,6]],["year",null]],K=a.approximations={sum:function(a){var b=a.length,c;if(!b&&a.hasNulls)c=null;else if(b)for(c=0;b--;)c+=a[b];return c},average:function(a){var b=a.length;a=K.sum(a);q(a)&&b&&(a/=b);return a},averages:function(){var a=[];p(arguments,function(b){a.push(K.average(b))});return void 0===a[0]?void 0:a},open:function(a){return a.length?
a[0]:a.hasNulls?null:void 0},high:function(a){return a.length?F(a):a.hasNulls?null:void 0},low:function(a){return a.length?E(a):a.hasNulls?null:void 0},close:function(a){return a.length?a[a.length-1]:a.hasNulls?null:void 0},ohlc:function(a,b,c,e){a=K.open(a);b=K.high(b);c=K.low(c);e=K.close(e);if(q(a)||q(b)||q(c)||q(e))return[a,b,c,e]},range:function(a,b){a=K.low(a);b=K.high(b);if(q(a)||q(b))return[a,b];if(null===a&&null===b)return null}};c.groupData=function(a,b,c,e){var d=this.data,g=this.options.data,
f=[],l=[],n=[],k=a.length,h,m,t=!!b,r=[];e="function"===typeof e?e:K[e]||H[this.type]&&K[H[this.type].approximation]||K[D.approximation];var y=this.pointArrayMap,A=y&&y.length,w=0;m=0;var x,z;A?p(y,function(){r.push([])}):r.push([]);x=A||1;for(z=0;z<=k&&!(a[z]>=c[0]);z++);for(z;z<=k;z++){for(;void 0!==c[w+1]&&a[z]>=c[w+1]||z===k;){h=c[w];this.dataGroupInfo={start:m,length:r[0].length};m=e.apply(this,r);void 0!==m&&(f.push(h),l.push(m),n.push(this.dataGroupInfo));m=z;for(h=0;h<x;h++)r[h].length=0,
r[h].hasNulls=!1;w+=1;if(z===k)break}if(z===k)break;if(y){h=this.cropStart+z;var C=d&&d[h]||this.pointClass.prototype.applyOptions.apply({series:this},[g[h]]),J;for(h=0;h<A;h++)J=C[y[h]],q(J)?r[h].push(J):null===J&&(r[h].hasNulls=!0)}else h=t?b[z]:null,q(h)?r[0].push(h):null===h&&(r[0].hasNulls=!0)}return[f,l,n]};c.processData=function(){var a=this.chart,e=this.options.dataGrouping,f=!1!==this.allowDG&&e&&k(e.enabled,a.options.isStock),l=this.visible||!a.options.chart.ignoreHiddenSeries,d,m=this.currentDataGrouping,
p;this.forceCrop=f;this.groupPixelWidth=null;this.hasProcessed=!0;if(!1!==b.apply(this,arguments)&&f){this.destroyGroupedData();var u=this.processedXData,n=this.processedYData,t=a.plotSizeX,a=this.xAxis,q=a.options.ordinal,r=this.groupPixelWidth=a.getGroupPixelWidth&&a.getGroupPixelWidth();if(r){this.isDirty=d=!0;this.points=null;f=a.getExtremes();p=f.min;f=f.max;q=q&&a.getGroupIntervalFactor(p,f,this)||1;r=r*(f-p)/t*q;t=a.getTimeTicks(a.normalizeTimeTickInterval(r,e.units||C),Math.min(p,u[0]),Math.max(f,
u[u.length-1]),a.options.startOfWeek,u,this.closestPointRange);u=c.groupData.apply(this,[u,n,t,e.approximation]);n=u[0];q=u[1];if(e.smoothed&&n.length){e=n.length-1;for(n[e]=Math.min(n[e],f);e--&&0<e;)n[e]+=r/2;n[0]=Math.max(n[0],p)}p=t.info;this.closestPointRange=t.info.totalRange;this.groupMap=u[2];h(n[0])&&n[0]<a.dataMin&&l&&(a.min===a.dataMin&&(a.min=n[0]),a.dataMin=n[0]);this.processedXData=n;this.processedYData=q}else this.groupMap=null;this.hasGroupedData=d;this.currentDataGrouping=p;this.preventGraphAnimation=
(m&&m.totalRange)!==(p&&p.totalRange)}};c.destroyGroupedData=function(){var a=this.groupedData;p(a||[],function(b,c){b&&(a[c]=b.destroy?b.destroy():null)});this.groupedData=null};c.generatePoints=function(){w.apply(this);this.destroyGroupedData();this.groupedData=this.hasGroupedData?this.points:null};e(m.prototype,"update",function(b){this.dataGroup?a.error(24):b.apply(this,[].slice.call(arguments,1))});e(f.prototype,"tooltipFooterHeaderFormatter",function(b,c,e){var g=c.series,d=g.tooltipOptions,
f=g.options.dataGrouping,l=d.xDateFormat,h,n=g.xAxis,k=a.dateFormat;return n&&"datetime"===n.options.type&&f&&q(c.key)?(b=g.currentDataGrouping,f=f.dateTimeLabelFormats,b?(n=f[b.unitName],1===b.count?l=n[0]:(l=n[1],h=n[2])):!l&&f&&(l=this.getXDateFormat(c,d,n)),l=k(l,c.key),h&&(l+=k(h,c.key+b.totalRange-1)),t(d[(e?"footer":"header")+"Format"],{point:x(c.point,{key:l}),series:g})):b.call(this,c,e)});c.destroy=function(){for(var a=this.groupedData||[],b=a.length;b--;)a[b]&&a[b].destroy();l.apply(this)};
e(c,"setOptions",function(a,b){a=a.call(this,b);var c=this.type,e=this.chart.options.plotOptions,d=r[c].dataGrouping;H[c]&&(d||(d=z(D,H[c])),a.dataGrouping=z(d,e.series&&e.series.dataGrouping,e[c].dataGrouping,b.dataGrouping));this.chart.options.isStock&&(this.requireSorting=!0);return a});e(G.prototype,"setScale",function(a){a.call(this);p(this.series,function(a){a.hasProcessed=!1})});G.prototype.getGroupPixelWidth=function(){var a=this.series,b=a.length,c,e=0,d=!1,f;for(c=b;c--;)(f=a[c].options.dataGrouping)&&
(e=Math.max(e,f.groupPixelWidth));for(c=b;c--;)(f=a[c].options.dataGrouping)&&a[c].hasProcessed&&(b=(a[c].processedXData||a[c].data).length,a[c].groupPixelWidth||b>this.chart.plotSizeX/e||b&&f.forced)&&(d=!0);return d?e:0};G.prototype.setDataGrouping=function(a,b){var c;b=k(b,!0);a||(a={forced:!1,units:null});if(this instanceof G)for(c=this.series.length;c--;)this.series[c].update({dataGrouping:a},!1);else p(this.chart.options.series,function(b){b.dataGrouping=a},!1);b&&this.chart.redraw()}})(L);
(function(a){var F=a.each,E=a.Point,G=a.seriesType,r=a.seriesTypes;G("ohlc","column",{lineWidth:1,tooltip:{pointFormat:'\x3cspan style\x3d"color:{point.color}"\x3e\u25cf\x3c/span\x3e \x3cb\x3e {series.name}\x3c/b\x3e\x3cbr/\x3eOpen: {point.open}\x3cbr/\x3eHigh: {point.high}\x3cbr/\x3eLow: {point.low}\x3cbr/\x3eClose: {point.close}\x3cbr/\x3e'},threshold:null,states:{hover:{lineWidth:3}},stickyTracking:!0},{directTouch:!1,pointArrayMap:["open","high","low","close"],toYData:function(a){return[a.open,
a.high,a.low,a.close]},pointValKey:"close",pointAttrToOptions:{stroke:"color","stroke-width":"lineWidth"},pointAttribs:function(a,p){p=r.column.prototype.pointAttribs.call(this,a,p);var h=this.options;delete p.fill;!a.options.color&&h.upColor&&a.open<a.close&&(p.stroke=h.upColor);return p},translate:function(){var a=this,p=a.yAxis,x=!!a.modifyValue,t=["plotOpen","plotHigh","plotLow","plotClose","yBottom"];r.column.prototype.translate.apply(a);F(a.points,function(h){F([h.open,h.high,h.low,h.close,
h.low],function(q,k){null!==q&&(x&&(q=a.modifyValue(q)),h[t[k]]=p.toPixels(q,!0))});h.tooltipPos[1]=h.plotHigh+p.pos-a.chart.plotTop})},drawPoints:function(){var a=this,p=a.chart;F(a.points,function(h){var t,q,r,k,m=h.graphic,f,e=!m;void 0!==h.plotY&&(m||(h.graphic=m=p.renderer.path().add(a.group)),m.attr(a.pointAttribs(h,h.selected&&"select")),q=m.strokeWidth()%2/2,f=Math.round(h.plotX)-q,r=Math.round(h.shapeArgs.width/2),k=["M",f,Math.round(h.yBottom),"L",f,Math.round(h.plotHigh)],null!==h.open&&
(t=Math.round(h.plotOpen)+q,k.push("M",f,t,"L",f-r,t)),null!==h.close&&(t=Math.round(h.plotClose)+q,k.push("M",f,t,"L",f+r,t)),m[e?"attr":"animate"]({d:k}).addClass(h.getClassName(),!0))})},animate:null},{getClassName:function(){return E.prototype.getClassName.call(this)+(this.open<this.close?" highcharts-point-up":" highcharts-point-down")}})})(L);(function(a){var F=a.defaultPlotOptions,E=a.each,G=a.merge,r=a.seriesType,h=a.seriesTypes;r("candlestick","ohlc",G(F.column,{states:{hover:{lineWidth:2}},
tooltip:F.ohlc.tooltip,threshold:null,lineColor:"#000000",lineWidth:1,upColor:"#ffffff",stickyTracking:!0}),{pointAttribs:function(a,r){var p=h.column.prototype.pointAttribs.call(this,a,r),q=this.options,x=a.open<a.close,k=q.lineColor||this.color;p["stroke-width"]=q.lineWidth;p.fill=a.options.color||(x?q.upColor||this.color:this.color);p.stroke=a.lineColor||(x?q.upLineColor||k:k);r&&(a=q.states[r],p.fill=a.color||p.fill,p.stroke=a.lineColor||p.stroke,p["stroke-width"]=a.lineWidth||p["stroke-width"]);
return p},drawPoints:function(){var a=this,h=a.chart;E(a.points,function(p){var t=p.graphic,r,k,m,f,e,c,b,w=!t;void 0!==p.plotY&&(t||(p.graphic=t=h.renderer.path().add(a.group)),t.attr(a.pointAttribs(p,p.selected&&"select")).shadow(a.options.shadow),e=t.strokeWidth()%2/2,c=Math.round(p.plotX)-e,r=p.plotOpen,k=p.plotClose,m=Math.min(r,k),r=Math.max(r,k),b=Math.round(p.shapeArgs.width/2),k=Math.round(m)!==Math.round(p.plotHigh),f=r!==p.yBottom,m=Math.round(m)+e,r=Math.round(r)+e,e=[],e.push("M",c-b,
r,"L",c-b,m,"L",c+b,m,"L",c+b,r,"Z","M",c,m,"L",c,k?Math.round(p.plotHigh):m,"M",c,r,"L",c,f?Math.round(p.yBottom):r),t[w?"attr":"animate"]({d:e}).addClass(p.getClassName(),!0))})}})})(L);Z=function(a){var F=a.each,E=a.seriesTypes,G=a.stableSort;return{translate:function(){E.column.prototype.translate.apply(this);var a=this.options,h=this.chart,p=this.points,x=p.length-1,t,q,z=a.onSeries;t=z&&h.get(z);var a=a.onKey||"y",z=t&&t.options.step,k=t&&t.points,m=k&&k.length,f=this.xAxis,e=this.yAxis,c=f.getExtremes(),
b=0,w,l,D;if(t&&t.visible&&m)for(b=(t.pointXOffset||0)+(t.barW||0)/2,t=t.currentDataGrouping,l=k[m-1].x+(t?t.totalRange:0),G(p,function(a,b){return a.x-b.x}),a="plot"+a[0].toUpperCase()+a.substr(1);m--&&p[x]&&!(t=p[x],w=k[m],w.x<=t.x&&void 0!==w[a]&&(t.x<=l&&(t.plotY=w[a],w.x<t.x&&!z&&(D=k[m+1])&&void 0!==D[a]&&(t.plotY+=(t.x-w.x)/(D.x-w.x)*(D[a]-w[a]))),x--,m++,0>x)););F(p,function(a,l){var k;void 0===a.plotY&&(a.x>=c.min&&a.x<=c.max?a.plotY=h.chartHeight-f.bottom-(f.opposite?f.height:0)+f.offset-
e.top:a.shapeArgs={});a.plotX+=b;(q=p[l-1])&&q.plotX===a.plotX&&(void 0===q.stackIndex&&(q.stackIndex=0),k=q.stackIndex+1);a.stackIndex=k})}}}(L);(function(a,F){var E=a.addEvent,G=a.each,r=a.merge,h=a.noop,p=a.Renderer,x=a.seriesType,t=a.TrackerMixin,q=a.VMLRenderer,z=a.SVGRenderer.prototype.symbols;x("flags","column",{pointRange:0,shape:"flag",stackDistance:12,textAlign:"center",tooltip:{pointFormat:"{point.text}\x3cbr/\x3e"},threshold:null,y:-30,fillColor:"#ffffff",lineWidth:1,states:{hover:{lineColor:"#000000",
fillColor:"#ccd6eb"}},style:{fontSize:"11px",fontWeight:"bold"}},{sorted:!1,noSharedTooltip:!0,allowDG:!1,takeOrdinalPosition:!1,trackerGroups:["markerGroup"],forceCrop:!0,init:a.Series.prototype.init,pointAttribs:function(a,h){var f=this.options,e=a&&a.color||this.color,c=f.lineColor,b=a&&a.lineWidth;a=a&&a.fillColor||f.fillColor;h&&(a=f.states[h].fillColor,c=f.states[h].lineColor,b=f.states[h].lineWidth);return{fill:a||e,stroke:c||e,"stroke-width":b||f.lineWidth||0}},translate:F.translate,drawPoints:function(){var h=
this.points,m=this.chart,f=m.renderer,e,c,b=this.options,p=b.y,l,t,q,x,z,g,y=this.yAxis,J={},A=[];for(t=h.length;t--;)q=h[t],g=q.plotX>this.xAxis.len,e=q.plotX,x=q.stackIndex,l=q.options.shape||b.shape,c=q.plotY,void 0!==c&&(c=q.plotY+p-(void 0!==x&&x*b.stackDistance)),q.anchorX=x?void 0:q.plotX,z=x?void 0:q.plotY,x=q.graphic,void 0!==c&&0<=e&&!g?(x||(x=q.graphic=f.label("",null,null,l,null,null,b.useHTML).attr(this.pointAttribs(q)).css(r(b.style,q.style)).attr({align:"flag"===l?"left":"center",width:b.width,
height:b.height,"text-align":b.textAlign}).addClass("highcharts-point").add(this.markerGroup),q.graphic.div&&(q.graphic.div.point=q),x.shadow(b.shadow),x.isNew=!0),0<e&&(e-=x.strokeWidth()%2),x.attr({text:q.options.title||b.title||"A"})[x.isNew?"attr":"animate"]({y:c,anchorY:z}),J[q.plotX]?J[q.plotX].size=Math.max(J[q.plotX].size,x.width):J[q.plotX]={align:0,size:x.width,target:e,anchorX:e},q.tooltipPos=m.inverted?[y.len+y.pos-m.plotLeft-c,this.xAxis.len-e]:[e,c+y.pos-m.plotTop]):x&&(q.graphic=x.destroy());
a.objectEach(J,function(a){a.plotX=a.anchorX;A.push(a)});a.distribute(A,this.xAxis.len);G(h,function(a){var b=a.graphic&&J[a.plotX];b&&(a.graphic[a.graphic.isNew?"attr":"animate"]({x:b.pos,anchorX:a.anchorX}),a.graphic.isNew=!1)});b.useHTML&&a.wrap(this.markerGroup,"on",function(b){return a.SVGElement.prototype.on.apply(b.apply(this,[].slice.call(arguments,1)),[].slice.call(arguments,1))})},drawTracker:function(){var a=this.points;t.drawTrackerPoint.apply(this);G(a,function(h){var f=h.graphic;f&&
E(f.element,"mouseover",function(){0<h.stackIndex&&!h.raised&&(h._y=f.y,f.attr({y:h._y-8}),h.raised=!0);G(a,function(a){a!==h&&a.raised&&a.graphic&&(a.graphic.attr({y:a._y}),a.raised=!1)})})})},animate:h,buildKDTree:h,setClip:h});z.flag=function(a,h,f,e,c){var b=c&&c.anchorX||a;c=c&&c.anchorY||h;return z.circle(b-1,c-1,2,2).concat(["M",b,c,"L",a,h+e,a,h,a+f,h,a+f,h+e,a,h+e,"Z"])};G(["circle","square"],function(a){z[a+"pin"]=function(h,f,e,c,b){var k=b&&b.anchorX;b=b&&b.anchorY;"circle"===a&&c>e&&
(h-=Math.round((c-e)/2),e=c);h=z[a](h,f,e,c);k&&b&&(h.push("M","circle"===a?h[1]-h[4]:h[1]+h[4]/2,f>b?f:f+c,"L",k,b),h=h.concat(z.circle(k-1,b-1,2,2)));return h}});p===q&&G(["flag","circlepin","squarepin"],function(a){q.prototype.symbols[a]=z[a]})})(L,Z);(function(a){function F(a,b,c){this.init(a,b,c)}var E=a.addEvent,G=a.Axis,r=a.correctFloat,h=a.defaultOptions,p=a.defined,x=a.destroyObjectProperties,t=a.each,q=a.fireEvent,z=a.hasTouch,k=a.isTouchDevice,m=a.merge,f=a.pick,e=a.removeEvent,c=a.wrap,
b,w={height:k?20:14,barBorderRadius:0,buttonBorderRadius:0,liveRedraw:a.svg&&!k,margin:10,minWidth:6,step:.2,zIndex:3,barBackgroundColor:"#cccccc",barBorderWidth:1,barBorderColor:"#cccccc",buttonArrowColor:"#333333",buttonBackgroundColor:"#e6e6e6",buttonBorderColor:"#cccccc",buttonBorderWidth:1,rifleColor:"#333333",trackBackgroundColor:"#f2f2f2",trackBorderColor:"#f2f2f2",trackBorderWidth:1};h.scrollbar=m(!0,w,h.scrollbar);a.swapXY=b=function(a,b){var c=a.length,e;if(b)for(b=0;b<c;b+=3)e=a[b+1],a[b+
1]=a[b+2],a[b+2]=e;return a};F.prototype={init:function(a,b,c){this.scrollbarButtons=[];this.renderer=a;this.userOptions=b;this.options=m(w,b);this.chart=c;this.size=f(this.options.size,this.options.height);b.enabled&&(this.render(),this.initEvents(),this.addEvents())},render:function(){var a=this.renderer,c=this.options,e=this.size,f;this.group=f=a.g("scrollbar").attr({zIndex:c.zIndex,translateY:-99999}).add();this.track=a.rect().addClass("highcharts-scrollbar-track").attr({x:0,r:c.trackBorderRadius||
0,height:e,width:e}).add(f);this.track.attr({fill:c.trackBackgroundColor,stroke:c.trackBorderColor,"stroke-width":c.trackBorderWidth});this.trackBorderWidth=this.track.strokeWidth();this.track.attr({y:-this.trackBorderWidth%2/2});this.scrollbarGroup=a.g().add(f);this.scrollbar=a.rect().addClass("highcharts-scrollbar-thumb").attr({height:e,width:e,r:c.barBorderRadius||0}).add(this.scrollbarGroup);this.scrollbarRifles=a.path(b(["M",-3,e/4,"L",-3,2*e/3,"M",0,e/4,"L",0,2*e/3,"M",3,e/4,"L",3,2*e/3],c.vertical)).addClass("highcharts-scrollbar-rifles").add(this.scrollbarGroup);
this.scrollbar.attr({fill:c.barBackgroundColor,stroke:c.barBorderColor,"stroke-width":c.barBorderWidth});this.scrollbarRifles.attr({stroke:c.rifleColor,"stroke-width":1});this.scrollbarStrokeWidth=this.scrollbar.strokeWidth();this.scrollbarGroup.translate(-this.scrollbarStrokeWidth%2/2,-this.scrollbarStrokeWidth%2/2);this.drawScrollbarButton(0);this.drawScrollbarButton(1)},position:function(a,b,c,e){var f=this.options.vertical,g=0,h=this.rendered?"animate":"attr";this.x=a;this.y=b+this.trackBorderWidth;
this.width=c;this.xOffset=this.height=e;this.yOffset=g;f?(this.width=this.yOffset=c=g=this.size,this.xOffset=b=0,this.barWidth=e-2*c,this.x=a+=this.options.margin):(this.height=this.xOffset=e=b=this.size,this.barWidth=c-2*e,this.y+=this.options.margin);this.group[h]({translateX:a,translateY:this.y});this.track[h]({width:c,height:e});this.scrollbarButtons[1][h]({translateX:f?0:c-b,translateY:f?e-g:0})},drawScrollbarButton:function(a){var c=this.renderer,e=this.scrollbarButtons,f=this.options,h=this.size,
g;g=c.g().add(this.group);e.push(g);g=c.rect().addClass("highcharts-scrollbar-button").add(g);g.attr({stroke:f.buttonBorderColor,"stroke-width":f.buttonBorderWidth,fill:f.buttonBackgroundColor});g.attr(g.crisp({x:-.5,y:-.5,width:h+1,height:h+1,r:f.buttonBorderRadius},g.strokeWidth()));g=c.path(b(["M",h/2+(a?-1:1),h/2-3,"L",h/2+(a?-1:1),h/2+3,"L",h/2+(a?2:-2),h/2],f.vertical)).addClass("highcharts-scrollbar-arrow").add(e[a]);g.attr({fill:f.buttonArrowColor})},setRange:function(a,b){var c=this.options,
e=c.vertical,f=c.minWidth,g=this.barWidth,h,l,k=this.rendered&&!this.hasDragged?"animate":"attr";p(g)&&(a=Math.max(a,0),h=Math.ceil(g*a),this.calculatedWidth=l=r(g*Math.min(b,1)-h),l<f&&(h=(g-f+l)*a,l=f),f=Math.floor(h+this.xOffset+this.yOffset),g=l/2-.5,this.from=a,this.to=b,e?(this.scrollbarGroup[k]({translateY:f}),this.scrollbar[k]({height:l}),this.scrollbarRifles[k]({translateY:g}),this.scrollbarTop=f,this.scrollbarLeft=0):(this.scrollbarGroup[k]({translateX:f}),this.scrollbar[k]({width:l}),this.scrollbarRifles[k]({translateX:g}),
this.scrollbarLeft=f,this.scrollbarTop=0),12>=l?this.scrollbarRifles.hide():this.scrollbarRifles.show(!0),!1===c.showFull&&(0>=a&&1<=b?this.group.hide():this.group.show()),this.rendered=!0)},initEvents:function(){var a=this;a.mouseMoveHandler=function(b){var c=a.chart.pointer.normalize(b),e=a.options.vertical?"chartY":"chartX",f=a.initPositions;!a.grabbedCenter||b.touches&&0===b.touches[0][e]||(c=a.cursorToScrollbarPosition(c)[e],e=a[e],e=c-e,a.hasDragged=!0,a.updatePosition(f[0]+e,f[1]+e),a.hasDragged&&
q(a,"changed",{from:a.from,to:a.to,trigger:"scrollbar",DOMType:b.type,DOMEvent:b}))};a.mouseUpHandler=function(b){a.hasDragged&&q(a,"changed",{from:a.from,to:a.to,trigger:"scrollbar",DOMType:b.type,DOMEvent:b});a.grabbedCenter=a.hasDragged=a.chartX=a.chartY=null};a.mouseDownHandler=function(b){b=a.chart.pointer.normalize(b);b=a.cursorToScrollbarPosition(b);a.chartX=b.chartX;a.chartY=b.chartY;a.initPositions=[a.from,a.to];a.grabbedCenter=!0};a.buttonToMinClick=function(b){var c=r(a.to-a.from)*a.options.step;
a.updatePosition(r(a.from-c),r(a.to-c));q(a,"changed",{from:a.from,to:a.to,trigger:"scrollbar",DOMEvent:b})};a.buttonToMaxClick=function(b){var c=(a.to-a.from)*a.options.step;a.updatePosition(a.from+c,a.to+c);q(a,"changed",{from:a.from,to:a.to,trigger:"scrollbar",DOMEvent:b})};a.trackClick=function(b){var c=a.chart.pointer.normalize(b),e=a.to-a.from,f=a.y+a.scrollbarTop,g=a.x+a.scrollbarLeft;a.options.vertical&&c.chartY>f||!a.options.vertical&&c.chartX>g?a.updatePosition(a.from+e,a.to+e):a.updatePosition(a.from-
e,a.to-e);q(a,"changed",{from:a.from,to:a.to,trigger:"scrollbar",DOMEvent:b})}},cursorToScrollbarPosition:function(a){var b=this.options,b=b.minWidth>this.calculatedWidth?b.minWidth:0;return{chartX:(a.chartX-this.x-this.xOffset)/(this.barWidth-b),chartY:(a.chartY-this.y-this.yOffset)/(this.barWidth-b)}},updatePosition:function(a,b){1<b&&(a=r(1-r(b-a)),b=1);0>a&&(b=r(b-a),a=0);this.from=a;this.to=b},update:function(a){this.destroy();this.init(this.chart.renderer,m(!0,this.options,a),this.chart)},addEvents:function(){var a=
this.options.inverted?[1,0]:[0,1],b=this.scrollbarButtons,c=this.scrollbarGroup.element,e=this.mouseDownHandler,f=this.mouseMoveHandler,g=this.mouseUpHandler,a=[[b[a[0]].element,"click",this.buttonToMinClick],[b[a[1]].element,"click",this.buttonToMaxClick],[this.track.element,"click",this.trackClick],[c,"mousedown",e],[c.ownerDocument,"mousemove",f],[c.ownerDocument,"mouseup",g]];z&&a.push([c,"touchstart",e],[c.ownerDocument,"touchmove",f],[c.ownerDocument,"touchend",g]);t(a,function(a){E.apply(null,
a)});this._events=a},removeEvents:function(){t(this._events,function(a){e.apply(null,a)});this._events.length=0},destroy:function(){var a=this.chart.scroller;this.removeEvents();t(["track","scrollbarRifles","scrollbar","scrollbarGroup","group"],function(a){this[a]&&this[a].destroy&&(this[a]=this[a].destroy())},this);a&&this===a.scrollbar&&(a.scrollbar=null,x(a.scrollbarButtons))}};c(G.prototype,"init",function(a){var b=this;a.apply(b,Array.prototype.slice.call(arguments,1));b.options.scrollbar&&b.options.scrollbar.enabled&&
(b.options.scrollbar.vertical=!b.horiz,b.options.startOnTick=b.options.endOnTick=!1,b.scrollbar=new F(b.chart.renderer,b.options.scrollbar,b.chart),E(b.scrollbar,"changed",function(a){var c=Math.min(f(b.options.min,b.min),b.min,b.dataMin),e=Math.max(f(b.options.max,b.max),b.max,b.dataMax)-c,g;b.horiz&&!b.reversed||!b.horiz&&b.reversed?(g=c+e*this.to,c+=e*this.from):(g=c+e*(1-this.from),c+=e*(1-this.to));b.setExtremes(c,g,!0,!1,a)}))});c(G.prototype,"render",function(a){var b=Math.min(f(this.options.min,
this.min),this.min,f(this.dataMin,this.min)),c=Math.max(f(this.options.max,this.max),this.max,f(this.dataMax,this.max)),e=this.scrollbar,h=this.titleOffset||0;a.apply(this,Array.prototype.slice.call(arguments,1));if(e){this.horiz?(e.position(this.left,this.top+this.height+2+this.chart.scrollbarsOffsets[1]+(this.opposite?0:h+this.axisTitleMargin+this.offset),this.width,this.height),h=1):(e.position(this.left+this.width+2+this.chart.scrollbarsOffsets[0]+(this.opposite?h+this.axisTitleMargin+this.offset:
0),this.top,this.width,this.height),h=0);if(!this.opposite&&!this.horiz||this.opposite&&this.horiz)this.chart.scrollbarsOffsets[h]+=this.scrollbar.size+this.scrollbar.options.margin;isNaN(b)||isNaN(c)||!p(this.min)||!p(this.max)?e.setRange(0,0):(h=(this.min-b)/(c-b),b=(this.max-b)/(c-b),this.horiz&&!this.reversed||!this.horiz&&this.reversed?e.setRange(h,b):e.setRange(1-b,1-h))}});c(G.prototype,"getOffset",function(a){var b=this.horiz?2:1,c=this.scrollbar;a.apply(this,Array.prototype.slice.call(arguments,
1));c&&(this.chart.scrollbarsOffsets=[0,0],this.chart.axisOffset[b]+=c.size+c.options.margin)});c(G.prototype,"destroy",function(a){this.scrollbar&&(this.scrollbar=this.scrollbar.destroy());a.apply(this,Array.prototype.slice.call(arguments,1))});a.Scrollbar=F})(L);(function(a){function F(a){this.init(a)}var E=a.addEvent,G=a.Axis,r=a.Chart,h=a.color,p=a.defaultOptions,x=a.defined,t=a.destroyObjectProperties,q=a.each,z=a.erase,k=a.error,m=a.extend,f=a.grep,e=a.hasTouch,c=a.isArray,b=a.isNumber,w=a.isObject,
l=a.merge,D=a.pick,H=a.removeEvent,C=a.Scrollbar,K=a.Series,g=a.seriesTypes,y=a.wrap,J=[].concat(a.defaultDataGroupingUnits),A=function(a){var d=f(arguments,b);if(d.length)return Math[a].apply(0,d)};J[4]=["day",[1,2,3,4]];J[5]=["week",[1,2,3]];g=void 0===g.areaspline?"line":"areaspline";m(p,{navigator:{height:40,margin:25,maskInside:!0,handles:{width:7,height:15,symbols:["navigator-handle","navigator-handle"],enabled:!0,lineWidth:1,backgroundColor:"#f2f2f2",borderColor:"#999999"},maskFill:h("#6685c2").setOpacity(.3).get(),
outlineColor:"#cccccc",outlineWidth:1,series:{type:g,fillOpacity:.05,lineWidth:1,compare:null,dataGrouping:{approximation:"average",enabled:!0,groupPixelWidth:2,smoothed:!0,units:J},dataLabels:{enabled:!1,zIndex:2},id:"highcharts-navigator-series",className:"highcharts-navigator-series",lineColor:null,marker:{enabled:!1},pointRange:0,threshold:null},xAxis:{overscroll:0,className:"highcharts-navigator-xaxis",tickLength:0,lineWidth:0,gridLineColor:"#e6e6e6",gridLineWidth:1,tickPixelInterval:200,labels:{align:"left",
style:{color:"#999999"},x:3,y:-4},crosshair:!1},yAxis:{className:"highcharts-navigator-yaxis",gridLineWidth:0,startOnTick:!1,endOnTick:!1,minPadding:.1,maxPadding:.1,labels:{enabled:!1},crosshair:!1,title:{text:null},tickLength:0,tickWidth:0}}});a.Renderer.prototype.symbols["navigator-handle"]=function(a,b,c,e,g){a=g.width/2;b=Math.round(a/3)+.5;g=g.height;return["M",-a-1,.5,"L",a,.5,"L",a,g+.5,"L",-a-1,g+.5,"L",-a-1,.5,"M",-b,4,"L",-b,g-3,"M",b-1,4,"L",b-1,g-3]};F.prototype={drawHandle:function(a,
b,c,e){var d=this.navigatorOptions.handles.height;this.handles[b][e](c?{translateX:Math.round(this.left+this.height/2),translateY:Math.round(this.top+parseInt(a,10)+.5-d)}:{translateX:Math.round(this.left+parseInt(a,10)),translateY:Math.round(this.top+this.height/2-d/2-1)})},drawOutline:function(a,b,c,e){var d=this.navigatorOptions.maskInside,g=this.outline.strokeWidth(),f=g/2,g=g%2/2,h=this.outlineHeight,k=this.scrollbarHeight,l=this.size,m=this.left-k,v=this.top;c?(m-=f,c=v+b+g,b=v+a+g,a=["M",m+
h,v-k-g,"L",m+h,c,"L",m,c,"L",m,b,"L",m+h,b,"L",m+h,v+l+k].concat(d?["M",m+h,c-f,"L",m+h,b+f]:[])):(a+=m+k-g,b+=m+k-g,v+=f,a=["M",m,v,"L",a,v,"L",a,v+h,"L",b,v+h,"L",b,v,"L",m+l+2*k,v].concat(d?["M",a-f,v,"L",b+f,v]:[]));this.outline[e]({d:a})},drawMasks:function(a,b,c,e){var d=this.left,g=this.top,f=this.height,h,k,l,m;c?(l=[d,d,d],m=[g,g+a,g+b],k=[f,f,f],h=[a,b-a,this.size-b]):(l=[d,d+a,d+b],m=[g,g,g],k=[a,b-a,this.size-b],h=[f,f,f]);q(this.shades,function(a,b){a[e]({x:l[b],y:m[b],width:k[b],height:h[b]})})},
renderElements:function(){var a=this,b=a.navigatorOptions,c=b.maskInside,e=a.chart,g=e.inverted,f=e.renderer,h;a.navigatorGroup=h=f.g("navigator").attr({zIndex:8,visibility:"hidden"}).add();var k={cursor:g?"ns-resize":"ew-resize"};q([!c,c,!c],function(d,c){a.shades[c]=f.rect().addClass("highcharts-navigator-mask"+(1===c?"-inside":"-outside")).attr({fill:d?b.maskFill:"rgba(0,0,0,0)"}).css(1===c&&k).add(h)});a.outline=f.path().addClass("highcharts-navigator-outline").attr({"stroke-width":b.outlineWidth,
stroke:b.outlineColor}).add(h);b.handles.enabled&&q([0,1],function(d){b.handles.inverted=e.inverted;a.handles[d]=f.symbol(b.handles.symbols[d],-b.handles.width/2-1,0,b.handles.width,b.handles.height,b.handles);a.handles[d].attr({zIndex:7-d}).addClass("highcharts-navigator-handle highcharts-navigator-handle-"+["left","right"][d]).add(h);var c=b.handles;a.handles[d].attr({fill:c.backgroundColor,stroke:c.borderColor,"stroke-width":c.lineWidth}).css(k)})},update:function(a){q(this.series||[],function(a){a.baseSeries&&
delete a.baseSeries.navigatorSeries});this.destroy();l(!0,this.chart.options.navigator,this.options,a);this.init(this.chart)},render:function(d,c,e,g){var f=this.chart,h,k,l=this.scrollbarHeight,m,v=this.xAxis;h=v.fake?f.xAxis[0]:v;var p=this.navigatorEnabled,u,q=this.rendered;k=f.inverted;var t,r=f.xAxis[0].minRange,B=f.xAxis[0].options.maxRange;if(!this.hasDragged||x(e)){if(!b(d)||!b(c))if(q)e=0,g=D(v.width,h.width);else return;this.left=D(v.left,f.plotLeft+l+(k?f.plotWidth:0));this.size=u=m=D(v.len,
(k?f.plotHeight:f.plotWidth)-2*l);f=k?l:m+2*l;e=D(e,v.toPixels(d,!0));g=D(g,v.toPixels(c,!0));b(e)&&Infinity!==Math.abs(e)||(e=0,g=f);d=v.toValue(e,!0);c=v.toValue(g,!0);t=Math.abs(a.correctFloat(c-d));t<r?this.grabbedLeft?e=v.toPixels(c-r,!0):this.grabbedRight&&(g=v.toPixels(d+r,!0)):x(B)&&t>B&&(this.grabbedLeft?e=v.toPixels(c-B,!0):this.grabbedRight&&(g=v.toPixels(d+B,!0)));this.zoomedMax=Math.min(Math.max(e,g,0),u);this.zoomedMin=Math.min(Math.max(this.fixedWidth?this.zoomedMax-this.fixedWidth:
Math.min(e,g),0),u);this.range=this.zoomedMax-this.zoomedMin;u=Math.round(this.zoomedMax);e=Math.round(this.zoomedMin);p&&(this.navigatorGroup.attr({visibility:"visible"}),q=q&&!this.hasDragged?"animate":"attr",this.drawMasks(e,u,k,q),this.drawOutline(e,u,k,q),this.navigatorOptions.handles.enabled&&(this.drawHandle(e,0,k,q),this.drawHandle(u,1,k,q)));this.scrollbar&&(k?(k=this.top-l,h=this.left-l+(p||!h.opposite?0:(h.titleOffset||0)+h.axisTitleMargin),l=m+2*l):(k=this.top+(p?this.height:-l),h=this.left-
l),this.scrollbar.position(h,k,f,l),this.scrollbar.setRange(this.zoomedMin/m,this.zoomedMax/m));this.rendered=!0}},addMouseEvents:function(){var a=this,b=a.chart,c=b.container,g=[],f,h;a.mouseMoveHandler=f=function(b){a.onMouseMove(b)};a.mouseUpHandler=h=function(b){a.onMouseUp(b)};g=a.getPartsEvents("mousedown");g.push(E(c,"mousemove",f),E(c.ownerDocument,"mouseup",h));e&&(g.push(E(c,"touchmove",f),E(c.ownerDocument,"touchend",h)),g.concat(a.getPartsEvents("touchstart")));a.eventsToUnbind=g;a.series&&
a.series[0]&&g.push(E(a.series[0].xAxis,"foundExtremes",function(){b.navigator.modifyNavigatorAxisExtremes()}))},getPartsEvents:function(a){var b=this,d=[];q(["shades","handles"],function(c){q(b[c],function(e,g){d.push(E(e.element,a,function(a){b[c+"Mousedown"](a,g)}))})});return d},shadesMousedown:function(a,b){a=this.chart.pointer.normalize(a);var d=this.chart,c=this.xAxis,e=this.zoomedMin,g=this.left,f=this.size,h=this.range,k=a.chartX,l;d.inverted&&(k=a.chartY,g=this.top);1===b?(this.grabbedCenter=
k,this.fixedWidth=h,this.dragOffset=k-e):(a=k-g-h/2,0===b?a=Math.max(0,a):2===b&&a+h>=f&&(a=f-h,l=this.getUnionExtremes().dataMax),a!==e&&(this.fixedWidth=h,b=c.toFixedRange(a,a+h,null,l),d.xAxis[0].setExtremes(Math.min(b.min,b.max),Math.max(b.min,b.max),!0,null,{trigger:"navigator"})))},handlesMousedown:function(a,b){this.chart.pointer.normalize(a);a=this.chart;var d=a.xAxis[0],c=a.inverted&&!d.reversed||!a.inverted&&d.reversed;0===b?(this.grabbedLeft=!0,this.otherHandlePos=this.zoomedMax,this.fixedExtreme=
c?d.min:d.max):(this.grabbedRight=!0,this.otherHandlePos=this.zoomedMin,this.fixedExtreme=c?d.max:d.min);a.fixedRange=null},onMouseMove:function(a){var b=this,d=b.chart,c=b.left,e=b.navigatorSize,g=b.range,f=b.dragOffset,h=d.inverted;a.touches&&0===a.touches[0].pageX||(a=d.pointer.normalize(a),d=a.chartX,h&&(c=b.top,d=a.chartY),b.grabbedLeft?(b.hasDragged=!0,b.render(0,0,d-c,b.otherHandlePos)):b.grabbedRight?(b.hasDragged=!0,b.render(0,0,b.otherHandlePos,d-c)):b.grabbedCenter&&(b.hasDragged=!0,d<
f?d=f:d>e+f-g&&(d=e+f-g),b.render(0,0,d-f,d-f+g)),b.hasDragged&&b.scrollbar&&b.scrollbar.options.liveRedraw&&(a.DOMType=a.type,setTimeout(function(){b.onMouseUp(a)},0)))},onMouseUp:function(a){var b=this.chart,d=this.xAxis,c=this.scrollbar,e,g,f=a.DOMEvent||a;(!this.hasDragged||c&&c.hasDragged)&&"scrollbar"!==a.trigger||(this.zoomedMin===this.otherHandlePos?e=this.fixedExtreme:this.zoomedMax===this.otherHandlePos&&(g=this.fixedExtreme),this.zoomedMax===this.size&&(g=this.getUnionExtremes().dataMax),
d=d.toFixedRange(this.zoomedMin,this.zoomedMax,e,g),x(d.min)&&b.xAxis[0].setExtremes(Math.min(d.min,d.max),Math.max(d.min,d.max),!0,this.hasDragged?!1:null,{trigger:"navigator",triggerOp:"navigator-drag",DOMEvent:f}));"mousemove"!==a.DOMType&&(this.grabbedLeft=this.grabbedRight=this.grabbedCenter=this.fixedWidth=this.fixedExtreme=this.otherHandlePos=this.hasDragged=this.dragOffset=null)},removeEvents:function(){this.eventsToUnbind&&(q(this.eventsToUnbind,function(a){a()}),this.eventsToUnbind=void 0);
this.removeBaseSeriesEvents()},removeBaseSeriesEvents:function(){var a=this.baseSeries||[];this.navigatorEnabled&&a[0]&&(!1!==this.navigatorOptions.adaptToUpdatedData&&q(a,function(a){H(a,"updatedData",this.updatedDataHandler)},this),a[0].xAxis&&H(a[0].xAxis,"foundExtremes",this.modifyBaseAxisExtremes))},init:function(a){var b=a.options,d=b.navigator,c=d.enabled,e=b.scrollbar,g=e.enabled,b=c?d.height:0,f=g?e.height:0;this.handles=[];this.shades=[];this.chart=a;this.setBaseSeries();this.height=b;this.scrollbarHeight=
f;this.scrollbarEnabled=g;this.navigatorEnabled=c;this.navigatorOptions=d;this.scrollbarOptions=e;this.outlineHeight=b+f;this.opposite=D(d.opposite,!c&&a.inverted);var h=this,e=h.baseSeries,g=a.xAxis.length,k=a.yAxis.length,m=e&&e[0]&&e[0].xAxis||a.xAxis[0];a.extraMargin={type:h.opposite?"plotTop":"marginBottom",value:(c||!a.inverted?h.outlineHeight:0)+d.margin};a.inverted&&(a.extraMargin.type=h.opposite?"marginRight":"plotLeft");a.isDirtyBox=!0;h.navigatorEnabled?(h.xAxis=new G(a,l({breaks:m.options.breaks,
ordinal:m.options.ordinal},d.xAxis,{id:"navigator-x-axis",yAxis:"navigator-y-axis",isX:!0,type:"datetime",index:g,offset:0,keepOrdinalPadding:!0,startOnTick:!1,endOnTick:!1,minPadding:0,maxPadding:0,zoomEnabled:!1},a.inverted?{offsets:[f,0,-f,0],width:b}:{offsets:[0,-f,0,f],height:b})),h.yAxis=new G(a,l(d.yAxis,{id:"navigator-y-axis",alignTicks:!1,offset:0,index:k,zoomEnabled:!1},a.inverted?{width:b}:{height:b})),e||d.series.data?h.updateNavigatorSeries():0===a.series.length&&y(a,"redraw",function(b,
d){0<a.series.length&&!h.series&&(h.setBaseSeries(),a.redraw=b);b.call(a,d)}),h.renderElements(),h.addMouseEvents()):h.xAxis={translate:function(b,d){var c=a.xAxis[0],e=c.getExtremes(),g=c.len-2*f,h=A("min",c.options.min,e.dataMin),c=A("max",c.options.max,e.dataMax)-h;return d?b*c/g+h:g*(b-h)/c},toPixels:function(a){return this.translate(a)},toValue:function(a){return this.translate(a,!0)},toFixedRange:G.prototype.toFixedRange,fake:!0};a.options.scrollbar.enabled&&(a.scrollbar=h.scrollbar=new C(a.renderer,
l(a.options.scrollbar,{margin:h.navigatorEnabled?0:10,vertical:a.inverted}),a),E(h.scrollbar,"changed",function(b){var d=h.size,c=d*this.to,d=d*this.from;h.hasDragged=h.scrollbar.hasDragged;h.render(0,0,d,c);(a.options.scrollbar.liveRedraw||"mousemove"!==b.DOMType)&&setTimeout(function(){h.onMouseUp(b)})}));h.addBaseSeriesEvents();h.addChartEvents()},getUnionExtremes:function(a){var b=this.chart.xAxis[0],d=this.xAxis,c=d.options,e=b.options,g;a&&null===b.dataMin||(g={dataMin:D(c&&c.min,A("min",e.min,
b.dataMin,d.dataMin,d.min)),dataMax:D(c&&c.max,A("max",e.max,b.dataMax,d.dataMax,d.max))});return g},setBaseSeries:function(a,b){var d=this.chart,c=this.baseSeries=[];a=a||d.options&&d.options.navigator.baseSeries||0;q(d.series||[],function(b,d){b.options.isInternal||!b.options.showInNavigator&&(d!==a&&b.options.id!==a||!1===b.options.showInNavigator)||c.push(b)});this.xAxis&&!this.xAxis.fake&&this.updateNavigatorSeries(b)},updateNavigatorSeries:function(b){var d=this,e=d.chart,g=d.baseSeries,f,h,
k=d.navigatorOptions.series,t,r={enableMouseTracking:!1,index:null,linkedTo:null,group:"nav",padXAxis:!1,xAxis:"navigator-x-axis",yAxis:"navigator-y-axis",showInLegend:!1,stacking:!1,isInternal:!0,visible:!0},y=d.series=a.grep(d.series||[],function(b){var c=b.baseSeries;return 0>a.inArray(c,g)?(c&&(H(c,"updatedData",d.updatedDataHandler),delete c.navigatorSeries),b.destroy(),!1):!0});g&&g.length&&q(g,function(a){var n=a.navigatorSeries,v=m({color:a.color},c(k)?p.navigator.series:k);n&&!1===d.navigatorOptions.adaptToUpdatedData||
(r.name="Navigator "+g.length,f=a.options||{},t=f.navigatorOptions||{},h=l(f,r,v,t),v=t.data||v.data,d.hasNavigatorData=d.hasNavigatorData||!!v,h.data=v||f.data&&f.data.slice(0),n&&n.options?n.update(h,b):(a.navigatorSeries=e.initSeries(h),a.navigatorSeries.baseSeries=a,y.push(a.navigatorSeries)))});if(k.data&&(!g||!g.length)||c(k))d.hasNavigatorData=!1,k=a.splat(k),q(k,function(a,b){r.name="Navigator "+(y.length+1);h=l(p.navigator.series,{color:e.series[b]&&!e.series[b].options.isInternal&&e.series[b].color||
e.options.colors[b]||e.options.colors[0]},r,a);h.data=a.data;h.data&&(d.hasNavigatorData=!0,y.push(e.initSeries(h)))});this.addBaseSeriesEvents()},addBaseSeriesEvents:function(){var a=this,b=a.baseSeries||[];b[0]&&b[0].xAxis&&E(b[0].xAxis,"foundExtremes",this.modifyBaseAxisExtremes);q(b,function(b){E(b,"show",function(){this.navigatorSeries&&this.navigatorSeries.setVisible(!0,!1)});E(b,"hide",function(){this.navigatorSeries&&this.navigatorSeries.setVisible(!1,!1)});!1!==this.navigatorOptions.adaptToUpdatedData&&
b.xAxis&&E(b,"updatedData",this.updatedDataHandler);E(b,"remove",function(){this.navigatorSeries&&(z(a.series,this.navigatorSeries),this.navigatorSeries.remove(!1),delete this.navigatorSeries)})},this)},modifyNavigatorAxisExtremes:function(){var a=this.xAxis,b;a.getExtremes&&(!(b=this.getUnionExtremes(!0))||b.dataMin===a.min&&b.dataMax===a.max||(a.min=b.dataMin,a.max=b.dataMax))},modifyBaseAxisExtremes:function(){var a=this.chart.navigator,c=this.getExtremes(),e=c.dataMin,g=c.dataMax,c=c.max-c.min,
f=a.stickToMin,h=a.stickToMax,k=this.options.overscroll,l,m,p=a.series&&a.series[0],q=!!this.setExtremes;this.eventArgs&&"rangeSelectorButton"===this.eventArgs.trigger||(f&&(m=e,l=m+c),h&&(l=g+k,f||(m=Math.max(l-c,p&&p.xData?p.xData[0]:-Number.MAX_VALUE))),q&&(f||h)&&b(m)&&(this.min=this.userMin=m,this.max=this.userMax=l));a.stickToMin=a.stickToMax=null},updatedDataHandler:function(){var a=this.chart.navigator,c=this.navigatorSeries;a.stickToMax=Math.round(a.zoomedMax)>=Math.round(a.size);a.stickToMin=
b(this.xAxis.min)&&this.xAxis.min<=this.xData[0]&&(!this.chart.fixedRange||!a.stickToMax);c&&!a.hasNavigatorData&&(c.options.pointStart=this.xData[0],c.setData(this.options.data,!1,null,!1))},addChartEvents:function(){E(this.chart,"redraw",function(){var a=this.navigator,b=a&&(a.baseSeries&&a.baseSeries[0]&&a.baseSeries[0].xAxis||a.scrollbar&&this.xAxis[0]);b&&a.render(b.min,b.max)})},destroy:function(){this.removeEvents();this.xAxis&&(z(this.chart.xAxis,this.xAxis),z(this.chart.axes,this.xAxis));
this.yAxis&&(z(this.chart.yAxis,this.yAxis),z(this.chart.axes,this.yAxis));q(this.series||[],function(a){a.destroy&&a.destroy()});q("series xAxis yAxis shades outline scrollbarTrack scrollbarRifles scrollbarGroup scrollbar navigatorGroup rendered".split(" "),function(a){this[a]&&this[a].destroy&&this[a].destroy();this[a]=null},this);q([this.handles],function(a){t(a)},this)}};a.Navigator=F;y(G.prototype,"zoom",function(a,b,c){var d=this.chart,e=d.options,g=e.chart.zoomType,f=e.navigator,e=e.rangeSelector,
h;this.isXAxis&&(f&&f.enabled||e&&e.enabled)&&("x"===g?d.resetZoomButton="blocked":"y"===g?h=!1:"xy"===g&&this.options.range&&(d=this.previousZoom,x(b)?this.previousZoom=[this.min,this.max]:d&&(b=d[0],c=d[1],delete this.previousZoom)));return void 0!==h?h:a.call(this,b,c)});y(r.prototype,"init",function(a,b,c){E(this,"beforeRender",function(){var a=this.options;if(a.navigator.enabled||a.scrollbar.enabled)this.scroller=this.navigator=new F(this)});a.call(this,b,c)});y(r.prototype,"setChartSize",function(a){var b=
this.legend,d=this.navigator,c,e,g,f;a.apply(this,[].slice.call(arguments,1));d&&(e=b&&b.options,g=d.xAxis,f=d.yAxis,c=d.scrollbarHeight,this.inverted?(d.left=d.opposite?this.chartWidth-c-d.height:this.spacing[3]+c,d.top=this.plotTop+c):(d.left=this.plotLeft+c,d.top=d.navigatorOptions.top||this.chartHeight-d.height-c-this.spacing[2]-(this.rangeSelector&&this.extraBottomMargin?this.rangeSelector.getHeight():0)-(e&&"bottom"===e.verticalAlign&&e.enabled&&!e.floating?b.legendHeight+D(e.margin,10):0)),
g&&f&&(this.inverted?g.options.left=f.options.left=d.left:g.options.top=f.options.top=d.top,g.setAxisSize(),f.setAxisSize()))});y(K.prototype,"addPoint",function(a,b,c,e,g){var d=this.options.turboThreshold;d&&this.xData.length>d&&w(b,!0)&&this.chart.navigator&&k(20,!0);a.call(this,b,c,e,g)});y(r.prototype,"addSeries",function(a,b,c,e){a=a.call(this,b,!1,e);this.navigator&&this.navigator.setBaseSeries(null,!1);D(c,!0)&&this.redraw();return a});y(K.prototype,"update",function(a,b,c){a.call(this,b,
!1);this.chart.navigator&&!this.options.isInternal&&this.chart.navigator.setBaseSeries(null,!1);D(c,!0)&&this.chart.redraw()});r.prototype.callbacks.push(function(a){var b=a.navigator;b&&(a=a.xAxis[0].getExtremes(),b.render(a.min,a.max))})})(L);(function(a){function F(a){this.init(a)}var E=a.addEvent,G=a.Axis,r=a.Chart,h=a.css,p=a.createElement,x=a.dateFormat,t=a.defaultOptions,q=t.global.useUTC,z=a.defined,k=a.destroyObjectProperties,m=a.discardElement,f=a.each,e=a.extend,c=a.fireEvent,b=a.Date,
w=a.isNumber,l=a.merge,D=a.pick,H=a.pInt,C=a.splat,K=a.wrap;e(t,{rangeSelector:{verticalAlign:"top",buttonTheme:{"stroke-width":0,width:28,height:18,padding:2,zIndex:7},floating:!1,x:0,y:0,height:void 0,inputPosition:{align:"right",x:0,y:0},buttonPosition:{align:"left",x:0,y:0},labelStyle:{color:"#666666"}}});t.lang=l(t.lang,{rangeSelectorZoom:"Zoom",rangeSelectorFrom:"From",rangeSelectorTo:"To"});F.prototype={clickButton:function(a,b){var c=this,e=c.chart,d=c.buttonOptions[a],g=e.xAxis[0],h=e.scroller&&
e.scroller.getUnionExtremes()||g||{},k=h.dataMin,n=h.dataMax,l,m=g&&Math.round(Math.min(g.max,D(n,g.max))),p=d.type,t,h=d._range,r,y,x,z=d.dataGrouping;if(null!==k&&null!==n){e.fixedRange=h;z&&(this.forcedDataGrouping=!0,G.prototype.setDataGrouping.call(g||{chart:this.chart},z,!1));if("month"===p||"year"===p)g?(p={range:d,max:m,dataMin:k,dataMax:n},l=g.minFromRange.call(p),w(p.newMax)&&(m=p.newMax)):h=d;else if(h)l=Math.max(m-h,k),m=Math.min(l+h,n);else if("ytd"===p)if(g)void 0===n&&(k=Number.MAX_VALUE,
n=Number.MIN_VALUE,f(e.series,function(a){a=a.xData;k=Math.min(a[0],k);n=Math.max(a[a.length-1],n)}),b=!1),m=c.getYTDExtremes(n,k,q),l=r=m.min,m=m.max;else{E(e,"beforeRender",function(){c.clickButton(a)});return}else"all"===p&&g&&(l=k,m=n);l+=d._offsetMin;m+=d._offsetMax;c.setSelected(a);g?g.setExtremes(l,m,D(b,1),null,{trigger:"rangeSelectorButton",rangeSelectorButton:d}):(t=C(e.options.xAxis)[0],x=t.range,t.range=h,y=t.min,t.min=r,E(e,"load",function(){t.range=x;t.min=y}))}},setSelected:function(a){this.selected=
this.options.selected=a},defaultButtons:[{type:"month",count:1,text:"1m"},{type:"month",count:3,text:"3m"},{type:"month",count:6,text:"6m"},{type:"ytd",text:"YTD"},{type:"year",count:1,text:"1y"},{type:"all",text:"All"}],init:function(a){var b=this,e=a.options.rangeSelector,g=e.buttons||[].concat(b.defaultButtons),d=e.selected,h=function(){var a=b.minInput,d=b.maxInput;a&&a.blur&&c(a,"blur");d&&d.blur&&c(d,"blur")};b.chart=a;b.options=e;b.buttons=[];a.extraTopMargin=e.height;b.buttonOptions=g;this.unMouseDown=
E(a.container,"mousedown",h);this.unResize=E(a,"resize",h);f(g,b.computeButtonRange);void 0!==d&&g[d]&&this.clickButton(d,!1);E(a,"load",function(){a.xAxis&&a.xAxis[0]&&E(a.xAxis[0],"setExtremes",function(d){this.max-this.min!==a.fixedRange&&"rangeSelectorButton"!==d.trigger&&"updatedData"!==d.trigger&&b.forcedDataGrouping&&this.setDataGrouping(!1,!1)})})},updateButtonStates:function(){var a=this.chart,b=a.xAxis[0],c=Math.round(b.max-b.min),e=!b.hasVisibleSeries,a=a.scroller&&a.scroller.getUnionExtremes()||
b,d=a.dataMin,h=a.dataMax,a=this.getYTDExtremes(h,d,q),k=a.min,l=a.max,n=this.selected,m=w(n),p=this.options.allButtonsEnabled,t=this.buttons;f(this.buttonOptions,function(a,g){var f=a._range,q=a.type,v=a.count||1,r=t[g],u=0;a=a._offsetMax-a._offsetMin;g=g===n;var y=f>h-d,A=f<b.minRange,w=!1,x=!1,f=f===c;("month"===q||"year"===q)&&c>=864E5*{month:28,year:365}[q]*v+a&&c<=864E5*{month:31,year:366}[q]*v+a?f=!0:"ytd"===q?(f=l-k+a===c,w=!g):"all"===q&&(f=b.max-b.min>=h-d,x=!g&&m&&f);q=!p&&(y||A||x||e);
v=g&&f||f&&!m&&!w;q?u=3:v&&(m=!0,u=2);r.state!==u&&r.setState(u)})},computeButtonRange:function(a){var b=a.type,c=a.count||1,e={millisecond:1,second:1E3,minute:6E4,hour:36E5,day:864E5,week:6048E5};if(e[b])a._range=e[b]*c;else if("month"===b||"year"===b)a._range=864E5*{month:30,year:365}[b]*c;a._offsetMin=D(a.offsetMin,0);a._offsetMax=D(a.offsetMax,0);a._range+=a._offsetMax-a._offsetMin},setInputValue:function(a,b){var c=this.chart.options.rangeSelector,e=this[a+"Input"];z(b)&&(e.previousValue=e.HCTime,
e.HCTime=b);e.value=x(c.inputEditDateFormat||"%Y-%m-%d",e.HCTime);this[a+"DateBox"].attr({text:x(c.inputDateFormat||"%b %e, %Y",e.HCTime)})},showInput:function(a){var b=this.inputGroup,c=this[a+"DateBox"];h(this[a+"Input"],{left:b.translateX+c.x+"px",top:b.translateY+"px",width:c.width-2+"px",height:c.height-2+"px",border:"2px solid silver"})},hideInput:function(a){h(this[a+"Input"],{border:0,width:"1px",height:"1px"});this.setInputValue(a)},drawInput:function(a){function b(){var a=r.value,b=(k.inputDateParser||
Date.parse)(a),d=f.xAxis[0],e=f.scroller&&f.scroller.xAxis?f.scroller.xAxis:d,g=e.dataMin,e=e.dataMax;b!==r.previousValue&&(r.previousValue=b,w(b)||(b=a.split("-"),b=Date.UTC(H(b[0]),H(b[1])-1,H(b[2]))),w(b)&&(q||(b+=6E4*(new Date).getTimezoneOffset()),n?b>c.maxInput.HCTime?b=void 0:b<g&&(b=g):b<c.minInput.HCTime?b=void 0:b>e&&(b=e),void 0!==b&&d.setExtremes(n?b:d.min,n?d.max:b,void 0,void 0,{trigger:"rangeSelectorInput"})))}var c=this,f=c.chart,d=f.renderer.style||{},g=f.renderer,k=f.options.rangeSelector,
m=c.div,n="min"===a,r,x,z=this.inputGroup;this[a+"Label"]=x=g.label(t.lang[n?"rangeSelectorFrom":"rangeSelectorTo"],this.inputGroup.offset).addClass("highcharts-range-label").attr({padding:2}).add(z);z.offset+=x.width+5;this[a+"DateBox"]=g=g.label("",z.offset).addClass("highcharts-range-input").attr({padding:2,width:k.inputBoxWidth||90,height:k.inputBoxHeight||17,stroke:k.inputBoxBorderColor||"#cccccc","stroke-width":1,"text-align":"center"}).on("click",function(){c.showInput(a);c[a+"Input"].focus()}).add(z);
z.offset+=g.width+(n?10:0);this[a+"Input"]=r=p("input",{name:a,className:"highcharts-range-selector",type:"text"},{top:f.plotTop+"px"},m);x.css(l(d,k.labelStyle));g.css(l({color:"#333333"},d,k.inputStyle));h(r,e({position:"absolute",border:0,width:"1px",height:"1px",padding:0,textAlign:"center",fontSize:d.fontSize,fontFamily:d.fontFamily,top:"-9999em"},k.inputStyle));r.onfocus=function(){c.showInput(a)};r.onblur=function(){c.hideInput(a)};r.onchange=b;r.onkeypress=function(a){13===a.keyCode&&b()}},
getPosition:function(){var a=this.chart,b=a.options.rangeSelector,a="top"===b.verticalAlign?a.plotTop-a.axisOffset[0]:0;return{buttonTop:a+b.buttonPosition.y,inputTop:a+b.inputPosition.y-10}},getYTDExtremes:function(a,c,e){var f=new b(a),d=f[b.hcGetFullYear]();e=e?b.UTC(d,0,1):+new b(d,0,1);c=Math.max(c||0,e);f=f.getTime();return{max:Math.min(a||f,f),min:c}},render:function(a,b){var c=this,e=c.chart,d=e.renderer,g=e.container,h=e.options,k=h.exporting&&!1!==h.exporting.enabled&&h.navigation&&h.navigation.buttonOptions,
n=t.lang,l=c.div,m=h.rangeSelector,h=m.floating,q=c.buttons,l=c.inputGroup,r=m.buttonTheme,w=m.buttonPosition,x=m.inputPosition,y=m.inputEnabled,z=r&&r.states,C=e.plotLeft,E,F=c.buttonGroup,G;G=c.rendered;var H=c.options.verticalAlign,K=e.legend,L=K&&K.options,Y=w.y,X=x.y,Q=G||!1,T=0,U=0,V;if(!1!==m.enabled){G||(c.group=G=d.g("range-selector-group").attr({zIndex:7}).add(),c.buttonGroup=F=d.g("range-selector-buttons").add(G),c.zoomText=d.text(n.rangeSelectorZoom,D(C+w.x,C),15).css(m.labelStyle).add(F),
E=D(C+w.x,C)+c.zoomText.getBBox().width+5,f(c.buttonOptions,function(a,b){q[b]=d.button(a.text,E,0,function(){var d=a.events&&a.events.click,e;d&&(e=d.call(a));!1!==e&&c.clickButton(b);c.isActive=!0},r,z&&z.hover,z&&z.select,z&&z.disabled).attr({"text-align":"center"}).add(F);E+=q[b].width+D(m.buttonSpacing,5)}),!1!==y&&(c.div=l=p("div",null,{position:"relative",height:0,zIndex:1}),g.parentNode.insertBefore(l,g),c.inputGroup=l=d.g("input-group").add(G),l.offset=0,c.drawInput("min"),c.drawInput("max")));
C=e.plotLeft-e.spacing[3];c.updateButtonStates();k&&this.titleCollision(e)&&"top"===H&&"right"===w.align&&w.y+F.getBBox().height-12<(k.y||0)+k.height&&(T=-40);"left"===w.align?V=w.x-e.spacing[3]:"right"===w.align&&(V=w.x+T-e.spacing[1]);F.align({y:w.y,width:F.getBBox().width,align:w.align,x:V},!0,e.spacingBox);c.group.placed=Q;c.buttonGroup.placed=Q;!1!==y&&(T=k&&this.titleCollision(e)&&"top"===H&&"right"===x.align&&x.y-l.getBBox().height-12<(k.y||0)+k.height+e.spacing[0]?-40:0,"left"===x.align?V=
C:"right"===x.align&&(V=-Math.max(e.axisOffset[1],-T)),l.align({y:x.y,width:l.getBBox().width,align:x.align,x:x.x+V-2},!0,e.spacingBox),g=l.alignAttr.translateX+l.alignOptions.x-T+l.getBBox().x+2,k=l.alignOptions.width,n=F.alignAttr.translateX+F.getBBox().x,V=F.getBBox().width+20,(x.align===w.align||n+V>g&&g+k>n&&Y<X+l.getBBox().height)&&l.attr({translateX:l.alignAttr.translateX+(e.axisOffset[1]>=-T?0:-T),translateY:l.alignAttr.translateY+F.getBBox().height+10}),c.setInputValue("min",a),c.setInputValue("max",
b),c.inputGroup.placed=Q);c.group.align({verticalAlign:H},!0,e.spacingBox);a=c.group.getBBox().height+20;b=c.group.alignAttr.translateY;"bottom"===H&&(K=L&&"bottom"===L.verticalAlign&&L.enabled&&!L.floating?K.legendHeight+D(L.margin,10):0,a=a+K-20,U=b-a-(h?0:m.y)-10);if("top"===H)h&&(U=0),e.titleOffset&&(U=e.titleOffset+e.options.title.margin),U+=e.margin[0]-e.spacing[0]||0;else if("middle"===H)if(X===Y)U=0>X?b+void 0:b;else if(X||Y)U=0>X||0>Y?U-Math.min(X,Y):b-a+NaN;c.group.translate(m.x,m.y+Math.floor(U));
!1!==y&&(c.minInput.style.marginTop=c.group.translateY+"px",c.maxInput.style.marginTop=c.group.translateY+"px");c.rendered=!0}},getHeight:function(){var a=this.options,b=this.group,c=a.y,e=a.buttonPosition.y,a=a.inputPosition.y,b=b?b.getBBox(!0).height+13+c:0,c=Math.min(a,e);if(0>a&&0>e||0<a&&0<e)b+=Math.abs(c);return b},titleCollision:function(a){return!(a.options.title.text||a.options.subtitle.text)},update:function(a){var b=this.chart;l(!0,b.options.rangeSelector,a);this.destroy();this.init(b);
b.rangeSelector.render()},destroy:function(){var b=this,c=b.minInput,e=b.maxInput;b.unMouseDown();b.unResize();k(b.buttons);c&&(c.onfocus=c.onblur=c.onchange=null);e&&(e.onfocus=e.onblur=e.onchange=null);a.objectEach(b,function(a,c){a&&"chart"!==c&&(a.destroy?a.destroy():a.nodeType&&m(this[c]));a!==F.prototype[c]&&(b[c]=null)},this)}};G.prototype.toFixedRange=function(a,b,c,e){var d=this.chart&&this.chart.fixedRange;a=D(c,this.translate(a,!0,!this.horiz));b=D(e,this.translate(b,!0,!this.horiz));c=
d&&(b-a)/d;.7<c&&1.3>c&&(e?a=b-d:b=a+d);w(a)||(a=b=void 0);return{min:a,max:b}};G.prototype.minFromRange=function(){var a=this.range,b={month:"Month",year:"FullYear"}[a.type],c,e=this.max,d,f,h=function(a,c){var d=new Date(a),e=d["get"+b]();d["set"+b](e+c);e===d["get"+b]()&&d.setDate(0);return d.getTime()-a};w(a)?(c=e-a,f=a):(c=e+h(e,-a.count),this.chart&&(this.chart.fixedRange=e-c));d=D(this.dataMin,Number.MIN_VALUE);w(c)||(c=d);c<=d&&(c=d,void 0===f&&(f=h(c,a.count)),this.newMax=Math.min(c+f,this.dataMax));
w(e)||(c=void 0);return c};K(r.prototype,"init",function(a,b,c){E(this,"init",function(){this.options.rangeSelector.enabled&&(this.rangeSelector=new F(this))});a.call(this,b,c)});K(r.prototype,"render",function(a,b,c){var e=this.axes,d=this.rangeSelector;d&&(f(e,function(a){a.updateNames();a.setScale()}),this.getAxisMargins(),d.render(),e=d.options.verticalAlign,d.options.floating||("bottom"===e?this.extraBottomMargin=!0:"middle"!==e&&(this.extraTopMargin=!0)));a.call(this,b,c)});K(r.prototype,"update",
function(b,c,e,f){var d=this.rangeSelector,g;this.extraTopMargin=this.extraBottomMargin=!1;d&&(d.render(),g=c.rangeSelector&&c.rangeSelector.verticalAlign||d.options&&d.options.verticalAlign,d.options.floating||("bottom"===g?this.extraBottomMargin=!0:"middle"!==g&&(this.extraTopMargin=!0)));b.call(this,a.merge(!0,c,{chart:{marginBottom:D(c.chart&&c.chart.marginBottom,this.margin.bottom),spacingBottom:D(c.chart&&c.chart.spacingBottom,this.spacing.bottom)}}),e,f)});K(r.prototype,"redraw",function(a,
b,c){var e=this.rangeSelector;e&&!e.options.floating&&(e.render(),e=e.options.verticalAlign,"bottom"===e?this.extraBottomMargin=!0:"middle"!==e&&(this.extraTopMargin=!0));a.call(this,b,c)});r.prototype.adjustPlotArea=function(){var a=this.rangeSelector;this.rangeSelector&&(a=a.getHeight(),this.extraTopMargin&&(this.plotTop+=a),this.extraBottomMargin&&(this.marginBottom+=a))};r.prototype.callbacks.push(function(a){function b(){c=a.xAxis[0].getExtremes();w(c.min)&&e.render(c.min,c.max)}var c,e=a.rangeSelector,
d,f;e&&(f=E(a.xAxis[0],"afterSetExtremes",function(a){e.render(a.min,a.max)}),d=E(a,"redraw",b),b());E(a,"destroy",function(){e&&(d(),f())})});a.RangeSelector=F})(L);(function(a){var F=a.arrayMax,E=a.arrayMin,G=a.Axis,r=a.Chart,h=a.defined,p=a.each,x=a.extend,t=a.format,q=a.grep,z=a.inArray,k=a.isNumber,m=a.isString,f=a.map,e=a.merge,c=a.pick,b=a.Point,w=a.Renderer,l=a.Series,D=a.splat,H=a.SVGRenderer,C=a.VMLRenderer,K=a.wrap,g=l.prototype,y=g.init,J=g.processData,A=b.prototype.tooltipFormatter;a.StockChart=
a.stockChart=function(b,g,h){var d=m(b)||b.nodeName,k=arguments[d?1:0],l=k.series,p=a.getOptions(),q,t=c(k.navigator&&k.navigator.enabled,p.navigator.enabled,!0),v=t?{startOnTick:!1,endOnTick:!1}:null,w={marker:{enabled:!1,radius:2}},x={shadow:!1,borderWidth:0};k.xAxis=f(D(k.xAxis||{}),function(a){return e({minPadding:0,maxPadding:0,overscroll:0,ordinal:!0,title:{text:null},labels:{overflow:"justify"},showLastLabel:!0},p.xAxis,a,{type:"datetime",categories:null},v)});k.yAxis=f(D(k.yAxis||{}),function(a){q=
c(a.opposite,!0);return e({labels:{y:-2},opposite:q,showLastLabel:!1,title:{text:null}},p.yAxis,a)});k.series=null;k=e({chart:{panning:!0,pinchType:"x"},navigator:{enabled:t},scrollbar:{enabled:c(p.scrollbar.enabled,!0)},rangeSelector:{enabled:c(p.rangeSelector.enabled,!0)},title:{text:null},tooltip:{split:!0,crosshairs:!0},legend:{enabled:!1},plotOptions:{line:w,spline:w,area:w,areaspline:w,arearange:w,areasplinerange:w,column:x,columnrange:x,candlestick:x,ohlc:x}},k,{isStock:!0});k.series=l;return d?
new r(b,k,h):new r(k,g)};K(G.prototype,"autoLabelAlign",function(a){var b=this.chart,c=this.options,b=b._labelPanes=b._labelPanes||{},d=this.options.labels;return this.chart.options.isStock&&"yAxis"===this.coll&&(c=c.top+","+c.height,!b[c]&&d.enabled)?(15===d.x&&(d.x=0),void 0===d.align&&(d.align="right"),b[c]=this,"right"):a.apply(this,[].slice.call(arguments,1))});K(G.prototype,"destroy",function(a){var b=this.chart,c=this.options&&this.options.top+","+this.options.height;c&&b._labelPanes&&b._labelPanes[c]===
this&&delete b._labelPanes[c];return a.apply(this,Array.prototype.slice.call(arguments,1))});K(G.prototype,"getPlotLinePath",function(b,e,g,l,n,q){var d=this,t=this.isLinked&&!this.series?this.linkedParent.series:this.series,r=d.chart,u=r.renderer,v=d.left,w=d.top,x,y,A,B,C=[],D=[],E,F;if("xAxis"!==d.coll&&"yAxis"!==d.coll)return b.apply(this,[].slice.call(arguments,1));D=function(a){var b="xAxis"===a?"yAxis":"xAxis";a=d.options[b];return k(a)?[r[b][a]]:m(a)?[r.get(a)]:f(t,function(a){return a[b]})}(d.coll);
p(d.isXAxis?r.yAxis:r.xAxis,function(a){if(h(a.options.id)?-1===a.options.id.indexOf("navigator"):1){var b=a.isXAxis?"yAxis":"xAxis",b=h(a.options[b])?r[b][a.options[b]]:r[b][0];d===b&&D.push(a)}});E=D.length?[]:[d.isXAxis?r.yAxis[0]:r.xAxis[0]];p(D,function(b){-1!==z(b,E)||a.find(E,function(a){return a.pos===b.pos&&a.len&&b.len})||E.push(b)});F=c(q,d.translate(e,null,null,l));k(F)&&(d.horiz?p(E,function(a){var b;y=a.pos;B=y+a.len;x=A=Math.round(F+d.transB);if(x<v||x>v+d.width)n?x=A=Math.min(Math.max(v,
x),v+d.width):b=!0;b||C.push("M",x,y,"L",A,B)}):p(E,function(a){var b;x=a.pos;A=x+a.len;y=B=Math.round(w+d.height-F);if(y<w||y>w+d.height)n?y=B=Math.min(Math.max(w,y),d.top+d.height):b=!0;b||C.push("M",x,y,"L",A,B)}));return 0<C.length?u.crispPolyLine(C,g||1):null});H.prototype.crispPolyLine=function(a,b){var c;for(c=0;c<a.length;c+=6)a[c+1]===a[c+4]&&(a[c+1]=a[c+4]=Math.round(a[c+1])-b%2/2),a[c+2]===a[c+5]&&(a[c+2]=a[c+5]=Math.round(a[c+2])+b%2/2);return a};w===C&&(C.prototype.crispPolyLine=H.prototype.crispPolyLine);
K(G.prototype,"hideCrosshair",function(a,b){a.call(this,b);this.crossLabel&&(this.crossLabel=this.crossLabel.hide())});K(G.prototype,"drawCrosshair",function(a,b,e){var d,f;a.call(this,b,e);if(h(this.crosshair.label)&&this.crosshair.label.enabled&&this.cross){a=this.chart;var g=this.options.crosshair.label,k=this.horiz;d=this.opposite;f=this.left;var l=this.top,m=this.crossLabel,p,q=g.format,r="",v="inside"===this.options.tickPosition,w=!1!==this.crosshair.snap,y=0;b||(b=this.cross&&this.cross.e);
p=k?"center":d?"right"===this.labelAlign?"right":"left":"left"===this.labelAlign?"left":"center";m||(m=this.crossLabel=a.renderer.label(null,null,null,g.shape||"callout").addClass("highcharts-crosshair-label"+(this.series[0]&&" highcharts-color-"+this.series[0].colorIndex)).attr({align:g.align||p,padding:c(g.padding,8),r:c(g.borderRadius,3),zIndex:2}).add(this.labelGroup),m.attr({fill:g.backgroundColor||this.series[0]&&this.series[0].color||"#666666",stroke:g.borderColor||"","stroke-width":g.borderWidth||
0}).css(x({color:"#ffffff",fontWeight:"normal",fontSize:"11px",textAlign:"center"},g.style)));k?(p=w?e.plotX+f:b.chartX,l+=d?0:this.height):(p=d?this.width+f:0,l=w?e.plotY+l:b.chartY);q||g.formatter||(this.isDatetimeAxis&&(r="%b %d, %Y"),q="{value"+(r?":"+r:"")+"}");b=w?e[this.isXAxis?"x":"y"]:this.toValue(k?b.chartX:b.chartY);m.attr({text:q?t(q,{value:b}):g.formatter.call(this,b),x:p,y:l,visibility:"visible"});b=m.getBBox();if(k){if(v&&!d||!v&&d)l=m.y-b.height}else l=m.y-b.height/2;k?(d=f-b.x,f=
f+this.width-b.x):(d="left"===this.labelAlign?f:0,f="right"===this.labelAlign?f+this.width:a.chartWidth);m.translateX<d&&(y=d-m.translateX);m.translateX+b.width>=f&&(y=-(m.translateX+b.width-f));m.attr({x:p+y,y:l,anchorX:k?p:this.opposite?0:a.chartWidth,anchorY:k?this.opposite?a.chartHeight:0:l+b.height/2})}});g.init=function(){y.apply(this,arguments);this.setCompare(this.options.compare)};g.setCompare=function(a){this.modifyValue="value"===a||"percent"===a?function(b,c){var d=this.compareValue;if(void 0!==
b&&void 0!==d)return b="value"===a?b-d:b/d*100-(100===this.options.compareBase?0:100),c&&(c.change=b),b}:null;this.userOptions.compare=a;this.chart.hasRendered&&(this.isDirty=!0)};g.processData=function(){var a,b=-1,c,e,f=!0===this.options.compareStart?0:1,g,h;J.apply(this,arguments);if(this.xAxis&&this.processedYData)for(c=this.processedXData,e=this.processedYData,g=e.length,this.pointArrayMap&&(b=z("close",this.pointArrayMap),-1===b&&(b=z(this.pointValKey||"y",this.pointArrayMap))),a=0;a<g-f;a++)if(h=
e[a]&&-1<b?e[a][b]:e[a],k(h)&&c[a+f]>=this.xAxis.min&&0!==h){this.compareValue=h;break}};K(g,"getExtremes",function(a){var b;a.apply(this,[].slice.call(arguments,1));this.modifyValue&&(b=[this.modifyValue(this.dataMin),this.modifyValue(this.dataMax)],this.dataMin=E(b),this.dataMax=F(b))});G.prototype.setCompare=function(a,b){this.isXAxis||(p(this.series,function(b){b.setCompare(a)}),c(b,!0)&&this.chart.redraw())};b.prototype.tooltipFormatter=function(b){b=b.replace("{point.change}",(0<this.change?
"+":"")+a.numberFormat(this.change,c(this.series.tooltipOptions.changeDecimals,2)));return A.apply(this,[b])};K(l.prototype,"render",function(a){this.chart.is3d&&this.chart.is3d()||this.chart.polar||!this.xAxis||this.xAxis.isRadial||(!this.clipBox&&this.animate?(this.clipBox=e(this.chart.clipBox),this.clipBox.width=this.xAxis.len,this.clipBox.height=this.yAxis.len):this.chart[this.sharedClipKey]?this.chart[this.sharedClipKey].attr({width:this.xAxis.len,height:this.yAxis.len}):this.clipBox&&(this.clipBox.width=
this.xAxis.len,this.clipBox.height=this.yAxis.len));a.call(this)});K(r.prototype,"getSelectedPoints",function(a){var b=a.call(this);p(this.series,function(a){a.hasGroupedData&&(b=b.concat(q(a.points||[],function(a){return a.selected})))});return b});K(r.prototype,"update",function(a,b){"scrollbar"in b&&this.navigator&&(e(!0,this.options.scrollbar,b.scrollbar),this.navigator.update({},!1),delete b.scrollbar);return a.apply(this,Array.prototype.slice.call(arguments,1))})})(L);return L});

},{}],40:[function(require,module,exports){
(function (global){
'use strict';
var Mutation = global.MutationObserver || global.WebKitMutationObserver;

var scheduleDrain;

{
  if (Mutation) {
    var called = 0;
    var observer = new Mutation(nextTick);
    var element = global.document.createTextNode('');
    observer.observe(element, {
      characterData: true
    });
    scheduleDrain = function () {
      element.data = (called = ++called % 2);
    };
  } else if (!global.setImmediate && typeof global.MessageChannel !== 'undefined') {
    var channel = new global.MessageChannel();
    channel.port1.onmessage = nextTick;
    scheduleDrain = function () {
      channel.port2.postMessage(0);
    };
  } else if ('document' in global && 'onreadystatechange' in global.document.createElement('script')) {
    scheduleDrain = function () {

      // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
      // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
      var scriptEl = global.document.createElement('script');
      scriptEl.onreadystatechange = function () {
        nextTick();

        scriptEl.onreadystatechange = null;
        scriptEl.parentNode.removeChild(scriptEl);
        scriptEl = null;
      };
      global.document.documentElement.appendChild(scriptEl);
    };
  } else {
    scheduleDrain = function () {
      setTimeout(nextTick, 0);
    };
  }
}

var draining;
var queue = [];
//named nextTick for less confusing stack traces
function nextTick() {
  draining = true;
  var i, oldQueue;
  var len = queue.length;
  while (len) {
    oldQueue = queue;
    queue = [];
    i = -1;
    while (++i < len) {
      oldQueue[i]();
    }
    len = queue.length;
  }
  draining = false;
}

module.exports = immediate;
function immediate(task) {
  if (queue.push(task) === 1 && !draining) {
    scheduleDrain();
  }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],41:[function(require,module,exports){
'use strict';
var utils = require('./utils');
var support = require('./support');
// private property
var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";


// public method for encoding
exports.encode = function(input) {
    var output = [];
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0, len = input.length, remainingBytes = len;

    var isArray = utils.getTypeOf(input) !== "string";
    while (i < input.length) {
        remainingBytes = len - i;

        if (!isArray) {
            chr1 = input.charCodeAt(i++);
            chr2 = i < len ? input.charCodeAt(i++) : 0;
            chr3 = i < len ? input.charCodeAt(i++) : 0;
        } else {
            chr1 = input[i++];
            chr2 = i < len ? input[i++] : 0;
            chr3 = i < len ? input[i++] : 0;
        }

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = remainingBytes > 1 ? (((chr2 & 15) << 2) | (chr3 >> 6)) : 64;
        enc4 = remainingBytes > 2 ? (chr3 & 63) : 64;

        output.push(_keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4));

    }

    return output.join("");
};

// public method for decoding
exports.decode = function(input) {
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0, resultIndex = 0;

    var dataUrlPrefix = "data:";

    if (input.substr(0, dataUrlPrefix.length) === dataUrlPrefix) {
        // This is a common error: people give a data url
        // (data:image/png;base64,iVBOR...) with a {base64: true} and
        // wonders why things don't work.
        // We can detect that the string input looks like a data url but we
        // *can't* be sure it is one: removing everything up to the comma would
        // be too dangerous.
        throw new Error("Invalid base64 input, it looks like a data url.");
    }

    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

    var totalLength = input.length * 3 / 4;
    if(input.charAt(input.length - 1) === _keyStr.charAt(64)) {
        totalLength--;
    }
    if(input.charAt(input.length - 2) === _keyStr.charAt(64)) {
        totalLength--;
    }
    if (totalLength % 1 !== 0) {
        // totalLength is not an integer, the length does not match a valid
        // base64 content. That can happen if:
        // - the input is not a base64 content
        // - the input is *almost* a base64 content, with a extra chars at the
        //   beginning or at the end
        // - the input uses a base64 variant (base64url for example)
        throw new Error("Invalid base64 input, bad content length.");
    }
    var output;
    if (support.uint8array) {
        output = new Uint8Array(totalLength|0);
    } else {
        output = new Array(totalLength|0);
    }

    while (i < input.length) {

        enc1 = _keyStr.indexOf(input.charAt(i++));
        enc2 = _keyStr.indexOf(input.charAt(i++));
        enc3 = _keyStr.indexOf(input.charAt(i++));
        enc4 = _keyStr.indexOf(input.charAt(i++));

        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;

        output[resultIndex++] = chr1;

        if (enc3 !== 64) {
            output[resultIndex++] = chr2;
        }
        if (enc4 !== 64) {
            output[resultIndex++] = chr3;
        }

    }

    return output;
};

},{"./support":70,"./utils":72}],42:[function(require,module,exports){
'use strict';

var external = require("./external");
var DataWorker = require('./stream/DataWorker');
var DataLengthProbe = require('./stream/DataLengthProbe');
var Crc32Probe = require('./stream/Crc32Probe');
var DataLengthProbe = require('./stream/DataLengthProbe');

/**
 * Represent a compressed object, with everything needed to decompress it.
 * @constructor
 * @param {number} compressedSize the size of the data compressed.
 * @param {number} uncompressedSize the size of the data after decompression.
 * @param {number} crc32 the crc32 of the decompressed file.
 * @param {object} compression the type of compression, see lib/compressions.js.
 * @param {String|ArrayBuffer|Uint8Array|Buffer} data the compressed data.
 */
function CompressedObject(compressedSize, uncompressedSize, crc32, compression, data) {
    this.compressedSize = compressedSize;
    this.uncompressedSize = uncompressedSize;
    this.crc32 = crc32;
    this.compression = compression;
    this.compressedContent = data;
}

CompressedObject.prototype = {
    /**
     * Create a worker to get the uncompressed content.
     * @return {GenericWorker} the worker.
     */
    getContentWorker : function () {
        var worker = new DataWorker(external.Promise.resolve(this.compressedContent))
        .pipe(this.compression.uncompressWorker())
        .pipe(new DataLengthProbe("data_length"));

        var that = this;
        worker.on("end", function () {
            if(this.streamInfo['data_length'] !== that.uncompressedSize) {
                throw new Error("Bug : uncompressed data size mismatch");
            }
        });
        return worker;
    },
    /**
     * Create a worker to get the compressed content.
     * @return {GenericWorker} the worker.
     */
    getCompressedWorker : function () {
        return new DataWorker(external.Promise.resolve(this.compressedContent))
        .withStreamInfo("compressedSize", this.compressedSize)
        .withStreamInfo("uncompressedSize", this.uncompressedSize)
        .withStreamInfo("crc32", this.crc32)
        .withStreamInfo("compression", this.compression)
        ;
    }
};

/**
 * Chain the given worker with other workers to compress the content with the
 * given compresion.
 * @param {GenericWorker} uncompressedWorker the worker to pipe.
 * @param {Object} compression the compression object.
 * @param {Object} compressionOptions the options to use when compressing.
 * @return {GenericWorker} the new worker compressing the content.
 */
CompressedObject.createWorkerFrom = function (uncompressedWorker, compression, compressionOptions) {
    return uncompressedWorker
    .pipe(new Crc32Probe())
    .pipe(new DataLengthProbe("uncompressedSize"))
    .pipe(compression.compressWorker(compressionOptions))
    .pipe(new DataLengthProbe("compressedSize"))
    .withStreamInfo("compression", compression);
};

module.exports = CompressedObject;

},{"./external":46,"./stream/Crc32Probe":65,"./stream/DataLengthProbe":66,"./stream/DataWorker":67}],43:[function(require,module,exports){
'use strict';

var GenericWorker = require("./stream/GenericWorker");

exports.STORE = {
    magic: "\x00\x00",
    compressWorker : function (compressionOptions) {
        return new GenericWorker("STORE compression");
    },
    uncompressWorker : function () {
        return new GenericWorker("STORE decompression");
    }
};
exports.DEFLATE = require('./flate');

},{"./flate":47,"./stream/GenericWorker":68}],44:[function(require,module,exports){
'use strict';

var utils = require('./utils');

/**
 * The following functions come from pako, from pako/lib/zlib/crc32.js
 * released under the MIT license, see pako https://github.com/nodeca/pako/
 */

// Use ordinary array, since untyped makes no boost here
function makeTable() {
    var c, table = [];

    for(var n =0; n < 256; n++){
        c = n;
        for(var k =0; k < 8; k++){
            c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c;
    }

    return table;
}

// Create table on load. Just 255 signed longs. Not a problem.
var crcTable = makeTable();


function crc32(crc, buf, len, pos) {
    var t = crcTable, end = pos + len;

    crc = crc ^ (-1);

    for (var i = pos; i < end; i++ ) {
        crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
    }

    return (crc ^ (-1)); // >>> 0;
}

// That's all for the pako functions.

/**
 * Compute the crc32 of a string.
 * This is almost the same as the function crc32, but for strings. Using the
 * same function for the two use cases leads to horrible performances.
 * @param {Number} crc the starting value of the crc.
 * @param {String} str the string to use.
 * @param {Number} len the length of the string.
 * @param {Number} pos the starting position for the crc32 computation.
 * @return {Number} the computed crc32.
 */
function crc32str(crc, str, len, pos) {
    var t = crcTable, end = pos + len;

    crc = crc ^ (-1);

    for (var i = pos; i < end; i++ ) {
        crc = (crc >>> 8) ^ t[(crc ^ str.charCodeAt(i)) & 0xFF];
    }

    return (crc ^ (-1)); // >>> 0;
}

module.exports = function crc32wrapper(input, crc) {
    if (typeof input === "undefined" || !input.length) {
        return 0;
    }

    var isArray = utils.getTypeOf(input) !== "string";

    if(isArray) {
        return crc32(crc|0, input, input.length, 0);
    } else {
        return crc32str(crc|0, input, input.length, 0);
    }
};

},{"./utils":72}],45:[function(require,module,exports){
'use strict';
exports.base64 = false;
exports.binary = false;
exports.dir = false;
exports.createFolders = true;
exports.date = null;
exports.compression = null;
exports.compressionOptions = null;
exports.comment = null;
exports.unixPermissions = null;
exports.dosPermissions = null;

},{}],46:[function(require,module,exports){
/* global Promise */
'use strict';

// load the global object first:
// - it should be better integrated in the system (unhandledRejection in node)
// - the environment may have a custom Promise implementation (see zone.js)
var ES6Promise = null;
if (typeof Promise !== "undefined") {
    ES6Promise = Promise;
} else {
    ES6Promise = require("lie");
}

/**
 * Let the user use/change some implementations.
 */
module.exports = {
    Promise: ES6Promise
};

},{"lie":97}],47:[function(require,module,exports){
'use strict';
var USE_TYPEDARRAY = (typeof Uint8Array !== 'undefined') && (typeof Uint16Array !== 'undefined') && (typeof Uint32Array !== 'undefined');

var pako = require("pako");
var utils = require("./utils");
var GenericWorker = require("./stream/GenericWorker");

var ARRAY_TYPE = USE_TYPEDARRAY ? "uint8array" : "array";

exports.magic = "\x08\x00";

/**
 * Create a worker that uses pako to inflate/deflate.
 * @constructor
 * @param {String} action the name of the pako function to call : either "Deflate" or "Inflate".
 * @param {Object} options the options to use when (de)compressing.
 */
function FlateWorker(action, options) {
    GenericWorker.call(this, "FlateWorker/" + action);

    this._pako = null;
    this._pakoAction = action;
    this._pakoOptions = options;
    // the `meta` object from the last chunk received
    // this allow this worker to pass around metadata
    this.meta = {};
}

utils.inherits(FlateWorker, GenericWorker);

/**
 * @see GenericWorker.processChunk
 */
FlateWorker.prototype.processChunk = function (chunk) {
    this.meta = chunk.meta;
    if (this._pako === null) {
        this._createPako();
    }
    this._pako.push(utils.transformTo(ARRAY_TYPE, chunk.data), false);
};

/**
 * @see GenericWorker.flush
 */
FlateWorker.prototype.flush = function () {
    GenericWorker.prototype.flush.call(this);
    if (this._pako === null) {
        this._createPako();
    }
    this._pako.push([], true);
};
/**
 * @see GenericWorker.cleanUp
 */
FlateWorker.prototype.cleanUp = function () {
    GenericWorker.prototype.cleanUp.call(this);
    this._pako = null;
};

/**
 * Create the _pako object.
 * TODO: lazy-loading this object isn't the best solution but it's the
 * quickest. The best solution is to lazy-load the worker list. See also the
 * issue #446.
 */
FlateWorker.prototype._createPako = function () {
    this._pako = new pako[this._pakoAction]({
        raw: true,
        level: this._pakoOptions.level || -1 // default compression
    });
    var self = this;
    this._pako.onData = function(data) {
        self.push({
            data : data,
            meta : self.meta
        });
    };
};

exports.compressWorker = function (compressionOptions) {
    return new FlateWorker("Deflate", compressionOptions);
};
exports.uncompressWorker = function () {
    return new FlateWorker("Inflate", {});
};

},{"./stream/GenericWorker":68,"./utils":72,"pako":98}],48:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var GenericWorker = require('../stream/GenericWorker');
var utf8 = require('../utf8');
var crc32 = require('../crc32');
var signature = require('../signature');

/**
 * Transform an integer into a string in hexadecimal.
 * @private
 * @param {number} dec the number to convert.
 * @param {number} bytes the number of bytes to generate.
 * @returns {string} the result.
 */
var decToHex = function(dec, bytes) {
    var hex = "", i;
    for (i = 0; i < bytes; i++) {
        hex += String.fromCharCode(dec & 0xff);
        dec = dec >>> 8;
    }
    return hex;
};

/**
 * Generate the UNIX part of the external file attributes.
 * @param {Object} unixPermissions the unix permissions or null.
 * @param {Boolean} isDir true if the entry is a directory, false otherwise.
 * @return {Number} a 32 bit integer.
 *
 * adapted from http://unix.stackexchange.com/questions/14705/the-zip-formats-external-file-attribute :
 *
 * TTTTsstrwxrwxrwx0000000000ADVSHR
 * ^^^^____________________________ file type, see zipinfo.c (UNX_*)
 *     ^^^_________________________ setuid, setgid, sticky
 *        ^^^^^^^^^________________ permissions
 *                 ^^^^^^^^^^______ not used ?
 *                           ^^^^^^ DOS attribute bits : Archive, Directory, Volume label, System file, Hidden, Read only
 */
var generateUnixExternalFileAttr = function (unixPermissions, isDir) {

    var result = unixPermissions;
    if (!unixPermissions) {
        // I can't use octal values in strict mode, hence the hexa.
        //  040775 => 0x41fd
        // 0100664 => 0x81b4
        result = isDir ? 0x41fd : 0x81b4;
    }
    return (result & 0xFFFF) << 16;
};

/**
 * Generate the DOS part of the external file attributes.
 * @param {Object} dosPermissions the dos permissions or null.
 * @param {Boolean} isDir true if the entry is a directory, false otherwise.
 * @return {Number} a 32 bit integer.
 *
 * Bit 0     Read-Only
 * Bit 1     Hidden
 * Bit 2     System
 * Bit 3     Volume Label
 * Bit 4     Directory
 * Bit 5     Archive
 */
var generateDosExternalFileAttr = function (dosPermissions, isDir) {

    // the dir flag is already set for compatibility
    return (dosPermissions || 0)  & 0x3F;
};

/**
 * Generate the various parts used in the construction of the final zip file.
 * @param {Object} streamInfo the hash with informations about the compressed file.
 * @param {Boolean} streamedContent is the content streamed ?
 * @param {Boolean} streamingEnded is the stream finished ?
 * @param {number} offset the current offset from the start of the zip file.
 * @param {String} platform let's pretend we are this platform (change platform dependents fields)
 * @param {Function} encodeFileName the function to encode the file name / comment.
 * @return {Object} the zip parts.
 */
var generateZipParts = function(streamInfo, streamedContent, streamingEnded, offset, platform, encodeFileName) {
    var file = streamInfo['file'],
    compression = streamInfo['compression'],
    useCustomEncoding = encodeFileName !== utf8.utf8encode,
    encodedFileName = utils.transformTo("string", encodeFileName(file.name)),
    utfEncodedFileName = utils.transformTo("string", utf8.utf8encode(file.name)),
    comment = file.comment,
    encodedComment = utils.transformTo("string", encodeFileName(comment)),
    utfEncodedComment = utils.transformTo("string", utf8.utf8encode(comment)),
    useUTF8ForFileName = utfEncodedFileName.length !== file.name.length,
    useUTF8ForComment = utfEncodedComment.length !== comment.length,
    dosTime,
    dosDate,
    extraFields = "",
    unicodePathExtraField = "",
    unicodeCommentExtraField = "",
    dir = file.dir,
    date = file.date;


    var dataInfo = {
        crc32 : 0,
        compressedSize : 0,
        uncompressedSize : 0
    };

    // if the content is streamed, the sizes/crc32 are only available AFTER
    // the end of the stream.
    if (!streamedContent || streamingEnded) {
        dataInfo.crc32 = streamInfo['crc32'];
        dataInfo.compressedSize = streamInfo['compressedSize'];
        dataInfo.uncompressedSize = streamInfo['uncompressedSize'];
    }

    var bitflag = 0;
    if (streamedContent) {
        // Bit 3: the sizes/crc32 are set to zero in the local header.
        // The correct values are put in the data descriptor immediately
        // following the compressed data.
        bitflag |= 0x0008;
    }
    if (!useCustomEncoding && (useUTF8ForFileName || useUTF8ForComment)) {
        // Bit 11: Language encoding flag (EFS).
        bitflag |= 0x0800;
    }


    var extFileAttr = 0;
    var versionMadeBy = 0;
    if (dir) {
        // dos or unix, we set the dos dir flag
        extFileAttr |= 0x00010;
    }
    if(platform === "UNIX") {
        versionMadeBy = 0x031E; // UNIX, version 3.0
        extFileAttr |= generateUnixExternalFileAttr(file.unixPermissions, dir);
    } else { // DOS or other, fallback to DOS
        versionMadeBy = 0x0014; // DOS, version 2.0
        extFileAttr |= generateDosExternalFileAttr(file.dosPermissions, dir);
    }

    // date
    // @see http://www.delorie.com/djgpp/doc/rbinter/it/52/13.html
    // @see http://www.delorie.com/djgpp/doc/rbinter/it/65/16.html
    // @see http://www.delorie.com/djgpp/doc/rbinter/it/66/16.html

    dosTime = date.getUTCHours();
    dosTime = dosTime << 6;
    dosTime = dosTime | date.getUTCMinutes();
    dosTime = dosTime << 5;
    dosTime = dosTime | date.getUTCSeconds() / 2;

    dosDate = date.getUTCFullYear() - 1980;
    dosDate = dosDate << 4;
    dosDate = dosDate | (date.getUTCMonth() + 1);
    dosDate = dosDate << 5;
    dosDate = dosDate | date.getUTCDate();

    if (useUTF8ForFileName) {
        // set the unicode path extra field. unzip needs at least one extra
        // field to correctly handle unicode path, so using the path is as good
        // as any other information. This could improve the situation with
        // other archive managers too.
        // This field is usually used without the utf8 flag, with a non
        // unicode path in the header (winrar, winzip). This helps (a bit)
        // with the messy Windows' default compressed folders feature but
        // breaks on p7zip which doesn't seek the unicode path extra field.
        // So for now, UTF-8 everywhere !
        unicodePathExtraField =
            // Version
            decToHex(1, 1) +
            // NameCRC32
            decToHex(crc32(encodedFileName), 4) +
            // UnicodeName
            utfEncodedFileName;

        extraFields +=
            // Info-ZIP Unicode Path Extra Field
            "\x75\x70" +
            // size
            decToHex(unicodePathExtraField.length, 2) +
            // content
            unicodePathExtraField;
    }

    if(useUTF8ForComment) {

        unicodeCommentExtraField =
            // Version
            decToHex(1, 1) +
            // CommentCRC32
            decToHex(crc32(encodedComment), 4) +
            // UnicodeName
            utfEncodedComment;

        extraFields +=
            // Info-ZIP Unicode Path Extra Field
            "\x75\x63" +
            // size
            decToHex(unicodeCommentExtraField.length, 2) +
            // content
            unicodeCommentExtraField;
    }

    var header = "";

    // version needed to extract
    header += "\x0A\x00";
    // general purpose bit flag
    header += decToHex(bitflag, 2);
    // compression method
    header += compression.magic;
    // last mod file time
    header += decToHex(dosTime, 2);
    // last mod file date
    header += decToHex(dosDate, 2);
    // crc-32
    header += decToHex(dataInfo.crc32, 4);
    // compressed size
    header += decToHex(dataInfo.compressedSize, 4);
    // uncompressed size
    header += decToHex(dataInfo.uncompressedSize, 4);
    // file name length
    header += decToHex(encodedFileName.length, 2);
    // extra field length
    header += decToHex(extraFields.length, 2);


    var fileRecord = signature.LOCAL_FILE_HEADER + header + encodedFileName + extraFields;

    var dirRecord = signature.CENTRAL_FILE_HEADER +
        // version made by (00: DOS)
        decToHex(versionMadeBy, 2) +
        // file header (common to file and central directory)
        header +
        // file comment length
        decToHex(encodedComment.length, 2) +
        // disk number start
        "\x00\x00" +
        // internal file attributes TODO
        "\x00\x00" +
        // external file attributes
        decToHex(extFileAttr, 4) +
        // relative offset of local header
        decToHex(offset, 4) +
        // file name
        encodedFileName +
        // extra field
        extraFields +
        // file comment
        encodedComment;

    return {
        fileRecord: fileRecord,
        dirRecord: dirRecord
    };
};

/**
 * Generate the EOCD record.
 * @param {Number} entriesCount the number of entries in the zip file.
 * @param {Number} centralDirLength the length (in bytes) of the central dir.
 * @param {Number} localDirLength the length (in bytes) of the local dir.
 * @param {String} comment the zip file comment as a binary string.
 * @param {Function} encodeFileName the function to encode the comment.
 * @return {String} the EOCD record.
 */
var generateCentralDirectoryEnd = function (entriesCount, centralDirLength, localDirLength, comment, encodeFileName) {
    var dirEnd = "";
    var encodedComment = utils.transformTo("string", encodeFileName(comment));

    // end of central dir signature
    dirEnd = signature.CENTRAL_DIRECTORY_END +
        // number of this disk
        "\x00\x00" +
        // number of the disk with the start of the central directory
        "\x00\x00" +
        // total number of entries in the central directory on this disk
        decToHex(entriesCount, 2) +
        // total number of entries in the central directory
        decToHex(entriesCount, 2) +
        // size of the central directory   4 bytes
        decToHex(centralDirLength, 4) +
        // offset of start of central directory with respect to the starting disk number
        decToHex(localDirLength, 4) +
        // .ZIP file comment length
        decToHex(encodedComment.length, 2) +
        // .ZIP file comment
        encodedComment;

    return dirEnd;
};

/**
 * Generate data descriptors for a file entry.
 * @param {Object} streamInfo the hash generated by a worker, containing informations
 * on the file entry.
 * @return {String} the data descriptors.
 */
var generateDataDescriptors = function (streamInfo) {
    var descriptor = "";
    descriptor = signature.DATA_DESCRIPTOR +
        // crc-32                          4 bytes
        decToHex(streamInfo['crc32'], 4) +
        // compressed size                 4 bytes
        decToHex(streamInfo['compressedSize'], 4) +
        // uncompressed size               4 bytes
        decToHex(streamInfo['uncompressedSize'], 4);

    return descriptor;
};


/**
 * A worker to concatenate other workers to create a zip file.
 * @param {Boolean} streamFiles `true` to stream the content of the files,
 * `false` to accumulate it.
 * @param {String} comment the comment to use.
 * @param {String} platform the platform to use, "UNIX" or "DOS".
 * @param {Function} encodeFileName the function to encode file names and comments.
 */
function ZipFileWorker(streamFiles, comment, platform, encodeFileName) {
    GenericWorker.call(this, "ZipFileWorker");
    // The number of bytes written so far. This doesn't count accumulated chunks.
    this.bytesWritten = 0;
    // The comment of the zip file
    this.zipComment = comment;
    // The platform "generating" the zip file.
    this.zipPlatform = platform;
    // the function to encode file names and comments.
    this.encodeFileName = encodeFileName;
    // Should we stream the content of the files ?
    this.streamFiles = streamFiles;
    // If `streamFiles` is false, we will need to accumulate the content of the
    // files to calculate sizes / crc32 (and write them *before* the content).
    // This boolean indicates if we are accumulating chunks (it will change a lot
    // during the lifetime of this worker).
    this.accumulate = false;
    // The buffer receiving chunks when accumulating content.
    this.contentBuffer = [];
    // The list of generated directory records.
    this.dirRecords = [];
    // The offset (in bytes) from the beginning of the zip file for the current source.
    this.currentSourceOffset = 0;
    // The total number of entries in this zip file.
    this.entriesCount = 0;
    // the name of the file currently being added, null when handling the end of the zip file.
    // Used for the emited metadata.
    this.currentFile = null;



    this._sources = [];
}
utils.inherits(ZipFileWorker, GenericWorker);

/**
 * @see GenericWorker.push
 */
ZipFileWorker.prototype.push = function (chunk) {

    var currentFilePercent = chunk.meta.percent || 0;
    var entriesCount = this.entriesCount;
    var remainingFiles = this._sources.length;

    if(this.accumulate) {
        this.contentBuffer.push(chunk);
    } else {
        this.bytesWritten += chunk.data.length;

        GenericWorker.prototype.push.call(this, {
            data : chunk.data,
            meta : {
                currentFile : this.currentFile,
                percent : entriesCount ? (currentFilePercent + 100 * (entriesCount - remainingFiles - 1)) / entriesCount : 100
            }
        });
    }
};

/**
 * The worker started a new source (an other worker).
 * @param {Object} streamInfo the streamInfo object from the new source.
 */
ZipFileWorker.prototype.openedSource = function (streamInfo) {
    this.currentSourceOffset = this.bytesWritten;
    this.currentFile = streamInfo['file'].name;

    var streamedContent = this.streamFiles && !streamInfo['file'].dir;

    // don't stream folders (because they don't have any content)
    if(streamedContent) {
        var record = generateZipParts(streamInfo, streamedContent, false, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
        this.push({
            data : record.fileRecord,
            meta : {percent:0}
        });
    } else {
        // we need to wait for the whole file before pushing anything
        this.accumulate = true;
    }
};

/**
 * The worker finished a source (an other worker).
 * @param {Object} streamInfo the streamInfo object from the finished source.
 */
ZipFileWorker.prototype.closedSource = function (streamInfo) {
    this.accumulate = false;
    var streamedContent = this.streamFiles && !streamInfo['file'].dir;
    var record = generateZipParts(streamInfo, streamedContent, true, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);

    this.dirRecords.push(record.dirRecord);
    if(streamedContent) {
        // after the streamed file, we put data descriptors
        this.push({
            data : generateDataDescriptors(streamInfo),
            meta : {percent:100}
        });
    } else {
        // the content wasn't streamed, we need to push everything now
        // first the file record, then the content
        this.push({
            data : record.fileRecord,
            meta : {percent:0}
        });
        while(this.contentBuffer.length) {
            this.push(this.contentBuffer.shift());
        }
    }
    this.currentFile = null;
};

/**
 * @see GenericWorker.flush
 */
ZipFileWorker.prototype.flush = function () {

    var localDirLength = this.bytesWritten;
    for(var i = 0; i < this.dirRecords.length; i++) {
        this.push({
            data : this.dirRecords[i],
            meta : {percent:100}
        });
    }
    var centralDirLength = this.bytesWritten - localDirLength;

    var dirEnd = generateCentralDirectoryEnd(this.dirRecords.length, centralDirLength, localDirLength, this.zipComment, this.encodeFileName);

    this.push({
        data : dirEnd,
        meta : {percent:100}
    });
};

/**
 * Prepare the next source to be read.
 */
ZipFileWorker.prototype.prepareNextSource = function () {
    this.previous = this._sources.shift();
    this.openedSource(this.previous.streamInfo);
    if (this.isPaused) {
        this.previous.pause();
    } else {
        this.previous.resume();
    }
};

/**
 * @see GenericWorker.registerPrevious
 */
ZipFileWorker.prototype.registerPrevious = function (previous) {
    this._sources.push(previous);
    var self = this;

    previous.on('data', function (chunk) {
        self.processChunk(chunk);
    });
    previous.on('end', function () {
        self.closedSource(self.previous.streamInfo);
        if(self._sources.length) {
            self.prepareNextSource();
        } else {
            self.end();
        }
    });
    previous.on('error', function (e) {
        self.error(e);
    });
    return this;
};

/**
 * @see GenericWorker.resume
 */
ZipFileWorker.prototype.resume = function () {
    if(!GenericWorker.prototype.resume.call(this)) {
        return false;
    }

    if (!this.previous && this._sources.length) {
        this.prepareNextSource();
        return true;
    }
    if (!this.previous && !this._sources.length && !this.generatedError) {
        this.end();
        return true;
    }
};

/**
 * @see GenericWorker.error
 */
ZipFileWorker.prototype.error = function (e) {
    var sources = this._sources;
    if(!GenericWorker.prototype.error.call(this, e)) {
        return false;
    }
    for(var i = 0; i < sources.length; i++) {
        try {
            sources[i].error(e);
        } catch(e) {
            // the `error` exploded, nothing to do
        }
    }
    return true;
};

/**
 * @see GenericWorker.lock
 */
ZipFileWorker.prototype.lock = function () {
    GenericWorker.prototype.lock.call(this);
    var sources = this._sources;
    for(var i = 0; i < sources.length; i++) {
        sources[i].lock();
    }
};

module.exports = ZipFileWorker;

},{"../crc32":44,"../signature":63,"../stream/GenericWorker":68,"../utf8":71,"../utils":72}],49:[function(require,module,exports){
'use strict';

var compressions = require('../compressions');
var ZipFileWorker = require('./ZipFileWorker');

/**
 * Find the compression to use.
 * @param {String} fileCompression the compression defined at the file level, if any.
 * @param {String} zipCompression the compression defined at the load() level.
 * @return {Object} the compression object to use.
 */
var getCompression = function (fileCompression, zipCompression) {

    var compressionName = fileCompression || zipCompression;
    var compression = compressions[compressionName];
    if (!compression) {
        throw new Error(compressionName + " is not a valid compression method !");
    }
    return compression;
};

/**
 * Create a worker to generate a zip file.
 * @param {JSZip} zip the JSZip instance at the right root level.
 * @param {Object} options to generate the zip file.
 * @param {String} comment the comment to use.
 */
exports.generateWorker = function (zip, options, comment) {

    var zipFileWorker = new ZipFileWorker(options.streamFiles, comment, options.platform, options.encodeFileName);
    var entriesCount = 0;
    try {

        zip.forEach(function (relativePath, file) {
            entriesCount++;
            var compression = getCompression(file.options.compression, options.compression);
            var compressionOptions = file.options.compressionOptions || options.compressionOptions || {};
            var dir = file.dir, date = file.date;

            file._compressWorker(compression, compressionOptions)
            .withStreamInfo("file", {
                name : relativePath,
                dir : dir,
                date : date,
                comment : file.comment || "",
                unixPermissions : file.unixPermissions,
                dosPermissions : file.dosPermissions
            })
            .pipe(zipFileWorker);
        });
        zipFileWorker.entriesCount = entriesCount;
    } catch (e) {
        zipFileWorker.error(e);
    }

    return zipFileWorker;
};

},{"../compressions":43,"./ZipFileWorker":48}],50:[function(require,module,exports){
'use strict';

/**
 * Representation a of zip file in js
 * @constructor
 */
function JSZip() {
    // if this constructor is used without `new`, it adds `new` before itself:
    if(!(this instanceof JSZip)) {
        return new JSZip();
    }

    if(arguments.length) {
        throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
    }

    // object containing the files :
    // {
    //   "folder/" : {...},
    //   "folder/data.txt" : {...}
    // }
    this.files = {};

    this.comment = null;

    // Where we are in the hierarchy
    this.root = "";
    this.clone = function() {
        var newObj = new JSZip();
        for (var i in this) {
            if (typeof this[i] !== "function") {
                newObj[i] = this[i];
            }
        }
        return newObj;
    };
}
JSZip.prototype = require('./object');
JSZip.prototype.loadAsync = require('./load');
JSZip.support = require('./support');
JSZip.defaults = require('./defaults');

// TODO find a better way to handle this version,
// a require('package.json').version doesn't work with webpack, see #327
JSZip.version = "3.1.5";

JSZip.loadAsync = function (content, options) {
    return new JSZip().loadAsync(content, options);
};

JSZip.external = require("./external");
module.exports = JSZip;

},{"./defaults":45,"./external":46,"./load":51,"./object":55,"./support":70}],51:[function(require,module,exports){
'use strict';
var utils = require('./utils');
var external = require("./external");
var utf8 = require('./utf8');
var utils = require('./utils');
var ZipEntries = require('./zipEntries');
var Crc32Probe = require('./stream/Crc32Probe');
var nodejsUtils = require("./nodejsUtils");

/**
 * Check the CRC32 of an entry.
 * @param {ZipEntry} zipEntry the zip entry to check.
 * @return {Promise} the result.
 */
function checkEntryCRC32(zipEntry) {
    return new external.Promise(function (resolve, reject) {
        var worker = zipEntry.decompressed.getContentWorker().pipe(new Crc32Probe());
        worker.on("error", function (e) {
            reject(e);
        })
        .on("end", function () {
            if (worker.streamInfo.crc32 !== zipEntry.decompressed.crc32) {
                reject(new Error("Corrupted zip : CRC32 mismatch"));
            } else {
                resolve();
            }
        })
        .resume();
    });
}

module.exports = function(data, options) {
    var zip = this;
    options = utils.extend(options || {}, {
        base64: false,
        checkCRC32: false,
        optimizedBinaryString: false,
        createFolders: false,
        decodeFileName: utf8.utf8decode
    });

    if (nodejsUtils.isNode && nodejsUtils.isStream(data)) {
        return external.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file."));
    }

    return utils.prepareContent("the loaded zip file", data, true, options.optimizedBinaryString, options.base64)
    .then(function(data) {
        var zipEntries = new ZipEntries(options);
        zipEntries.load(data);
        return zipEntries;
    }).then(function checkCRC32(zipEntries) {
        var promises = [external.Promise.resolve(zipEntries)];
        var files = zipEntries.files;
        if (options.checkCRC32) {
            for (var i = 0; i < files.length; i++) {
                promises.push(checkEntryCRC32(files[i]));
            }
        }
        return external.Promise.all(promises);
    }).then(function addFiles(results) {
        var zipEntries = results.shift();
        var files = zipEntries.files;
        for (var i = 0; i < files.length; i++) {
            var input = files[i];
            zip.file(input.fileNameStr, input.decompressed, {
                binary: true,
                optimizedBinaryString: true,
                date: input.date,
                dir: input.dir,
                comment : input.fileCommentStr.length ? input.fileCommentStr : null,
                unixPermissions : input.unixPermissions,
                dosPermissions : input.dosPermissions,
                createFolders: options.createFolders
            });
        }
        if (zipEntries.zipComment.length) {
            zip.comment = zipEntries.zipComment;
        }

        return zip;
    });
};

},{"./external":46,"./nodejsUtils":52,"./stream/Crc32Probe":65,"./utf8":71,"./utils":72,"./zipEntries":73}],52:[function(require,module,exports){
(function (Buffer){
'use strict';

module.exports = {
    /**
     * True if this is running in Nodejs, will be undefined in a browser.
     * In a browser, browserify won't include this file and the whole module
     * will be resolved an empty object.
     */
    isNode : typeof Buffer !== "undefined",
    /**
     * Create a new nodejs Buffer from an existing content.
     * @param {Object} data the data to pass to the constructor.
     * @param {String} encoding the encoding to use.
     * @return {Buffer} a new Buffer.
     */
    newBufferFrom: function(data, encoding) {
        // XXX We can't use `Buffer.from` which comes from `Uint8Array.from`
        // in nodejs v4 (< v.4.5). It's not the expected implementation (and
        // has a different signature).
        // see https://github.com/nodejs/node/issues/8053
        // A condition on nodejs' version won't solve the issue as we don't
        // control the Buffer polyfills that may or may not be used.
        return new Buffer(data, encoding);
    },
    /**
     * Create a new nodejs Buffer with the specified size.
     * @param {Integer} size the size of the buffer.
     * @return {Buffer} a new Buffer.
     */
    allocBuffer: function (size) {
        if (Buffer.alloc) {
            return Buffer.alloc(size);
        } else {
            return new Buffer(size);
        }
    },
    /**
     * Find out if an object is a Buffer.
     * @param {Object} b the object to test.
     * @return {Boolean} true if the object is a Buffer, false otherwise.
     */
    isBuffer : function(b){
        return Buffer.isBuffer(b);
    },

    isStream : function (obj) {
        return obj &&
            typeof obj.on === "function" &&
            typeof obj.pause === "function" &&
            typeof obj.resume === "function";
    }
};

}).call(this,require("buffer").Buffer)
},{"buffer":3}],53:[function(require,module,exports){
"use strict";

var utils = require('../utils');
var GenericWorker = require('../stream/GenericWorker');

/**
 * A worker that use a nodejs stream as source.
 * @constructor
 * @param {String} filename the name of the file entry for this stream.
 * @param {Readable} stream the nodejs stream.
 */
function NodejsStreamInputAdapter(filename, stream) {
    GenericWorker.call(this, "Nodejs stream input adapter for " + filename);
    this._upstreamEnded = false;
    this._bindStream(stream);
}

utils.inherits(NodejsStreamInputAdapter, GenericWorker);

/**
 * Prepare the stream and bind the callbacks on it.
 * Do this ASAP on node 0.10 ! A lazy binding doesn't always work.
 * @param {Stream} stream the nodejs stream to use.
 */
NodejsStreamInputAdapter.prototype._bindStream = function (stream) {
    var self = this;
    this._stream = stream;
    stream.pause();
    stream
    .on("data", function (chunk) {
        self.push({
            data: chunk,
            meta : {
                percent : 0
            }
        });
    })
    .on("error", function (e) {
        if(self.isPaused) {
            this.generatedError = e;
        } else {
            self.error(e);
        }
    })
    .on("end", function () {
        if(self.isPaused) {
            self._upstreamEnded = true;
        } else {
            self.end();
        }
    });
};
NodejsStreamInputAdapter.prototype.pause = function () {
    if(!GenericWorker.prototype.pause.call(this)) {
        return false;
    }
    this._stream.pause();
    return true;
};
NodejsStreamInputAdapter.prototype.resume = function () {
    if(!GenericWorker.prototype.resume.call(this)) {
        return false;
    }

    if(this._upstreamEnded) {
        this.end();
    } else {
        this._stream.resume();
    }

    return true;
};

module.exports = NodejsStreamInputAdapter;

},{"../stream/GenericWorker":68,"../utils":72}],54:[function(require,module,exports){
'use strict';

var Readable = require('readable-stream').Readable;

var utils = require('../utils');
utils.inherits(NodejsStreamOutputAdapter, Readable);

/**
* A nodejs stream using a worker as source.
* @see the SourceWrapper in http://nodejs.org/api/stream.html
* @constructor
* @param {StreamHelper} helper the helper wrapping the worker
* @param {Object} options the nodejs stream options
* @param {Function} updateCb the update callback.
*/
function NodejsStreamOutputAdapter(helper, options, updateCb) {
    Readable.call(this, options);
    this._helper = helper;

    var self = this;
    helper.on("data", function (data, meta) {
        if (!self.push(data)) {
            self._helper.pause();
        }
        if(updateCb) {
            updateCb(meta);
        }
    })
    .on("error", function(e) {
        self.emit('error', e);
    })
    .on("end", function () {
        self.push(null);
    });
}


NodejsStreamOutputAdapter.prototype._read = function() {
    this._helper.resume();
};

module.exports = NodejsStreamOutputAdapter;

},{"../utils":72,"readable-stream":56}],55:[function(require,module,exports){
'use strict';
var utf8 = require('./utf8');
var utils = require('./utils');
var GenericWorker = require('./stream/GenericWorker');
var StreamHelper = require('./stream/StreamHelper');
var defaults = require('./defaults');
var CompressedObject = require('./compressedObject');
var ZipObject = require('./zipObject');
var generate = require("./generate");
var nodejsUtils = require("./nodejsUtils");
var NodejsStreamInputAdapter = require("./nodejs/NodejsStreamInputAdapter");


/**
 * Add a file in the current folder.
 * @private
 * @param {string} name the name of the file
 * @param {String|ArrayBuffer|Uint8Array|Buffer} data the data of the file
 * @param {Object} originalOptions the options of the file
 * @return {Object} the new file.
 */
var fileAdd = function(name, data, originalOptions) {
    // be sure sub folders exist
    var dataType = utils.getTypeOf(data),
        parent;


    /*
     * Correct options.
     */

    var o = utils.extend(originalOptions || {}, defaults);
    o.date = o.date || new Date();
    if (o.compression !== null) {
        o.compression = o.compression.toUpperCase();
    }

    if (typeof o.unixPermissions === "string") {
        o.unixPermissions = parseInt(o.unixPermissions, 8);
    }

    // UNX_IFDIR  0040000 see zipinfo.c
    if (o.unixPermissions && (o.unixPermissions & 0x4000)) {
        o.dir = true;
    }
    // Bit 4    Directory
    if (o.dosPermissions && (o.dosPermissions & 0x0010)) {
        o.dir = true;
    }

    if (o.dir) {
        name = forceTrailingSlash(name);
    }
    if (o.createFolders && (parent = parentFolder(name))) {
        folderAdd.call(this, parent, true);
    }

    var isUnicodeString = dataType === "string" && o.binary === false && o.base64 === false;
    if (!originalOptions || typeof originalOptions.binary === "undefined") {
        o.binary = !isUnicodeString;
    }


    var isCompressedEmpty = (data instanceof CompressedObject) && data.uncompressedSize === 0;

    if (isCompressedEmpty || o.dir || !data || data.length === 0) {
        o.base64 = false;
        o.binary = true;
        data = "";
        o.compression = "STORE";
        dataType = "string";
    }

    /*
     * Convert content to fit.
     */

    var zipObjectContent = null;
    if (data instanceof CompressedObject || data instanceof GenericWorker) {
        zipObjectContent = data;
    } else if (nodejsUtils.isNode && nodejsUtils.isStream(data)) {
        zipObjectContent = new NodejsStreamInputAdapter(name, data);
    } else {
        zipObjectContent = utils.prepareContent(name, data, o.binary, o.optimizedBinaryString, o.base64);
    }

    var object = new ZipObject(name, zipObjectContent, o);
    this.files[name] = object;
    /*
    TODO: we can't throw an exception because we have async promises
    (we can have a promise of a Date() for example) but returning a
    promise is useless because file(name, data) returns the JSZip
    object for chaining. Should we break that to allow the user
    to catch the error ?

    return external.Promise.resolve(zipObjectContent)
    .then(function () {
        return object;
    });
    */
};

/**
 * Find the parent folder of the path.
 * @private
 * @param {string} path the path to use
 * @return {string} the parent folder, or ""
 */
var parentFolder = function (path) {
    if (path.slice(-1) === '/') {
        path = path.substring(0, path.length - 1);
    }
    var lastSlash = path.lastIndexOf('/');
    return (lastSlash > 0) ? path.substring(0, lastSlash) : "";
};

/**
 * Returns the path with a slash at the end.
 * @private
 * @param {String} path the path to check.
 * @return {String} the path with a trailing slash.
 */
var forceTrailingSlash = function(path) {
    // Check the name ends with a /
    if (path.slice(-1) !== "/") {
        path += "/"; // IE doesn't like substr(-1)
    }
    return path;
};

/**
 * Add a (sub) folder in the current folder.
 * @private
 * @param {string} name the folder's name
 * @param {boolean=} [createFolders] If true, automatically create sub
 *  folders. Defaults to false.
 * @return {Object} the new folder.
 */
var folderAdd = function(name, createFolders) {
    createFolders = (typeof createFolders !== 'undefined') ? createFolders : defaults.createFolders;

    name = forceTrailingSlash(name);

    // Does this folder already exist?
    if (!this.files[name]) {
        fileAdd.call(this, name, null, {
            dir: true,
            createFolders: createFolders
        });
    }
    return this.files[name];
};

/**
* Cross-window, cross-Node-context regular expression detection
* @param  {Object}  object Anything
* @return {Boolean}        true if the object is a regular expression,
* false otherwise
*/
function isRegExp(object) {
    return Object.prototype.toString.call(object) === "[object RegExp]";
}

// return the actual prototype of JSZip
var out = {
    /**
     * @see loadAsync
     */
    load: function() {
        throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
    },


    /**
     * Call a callback function for each entry at this folder level.
     * @param {Function} cb the callback function:
     * function (relativePath, file) {...}
     * It takes 2 arguments : the relative path and the file.
     */
    forEach: function(cb) {
        var filename, relativePath, file;
        for (filename in this.files) {
            if (!this.files.hasOwnProperty(filename)) {
                continue;
            }
            file = this.files[filename];
            relativePath = filename.slice(this.root.length, filename.length);
            if (relativePath && filename.slice(0, this.root.length) === this.root) { // the file is in the current root
                cb(relativePath, file); // TODO reverse the parameters ? need to be clean AND consistent with the filter search fn...
            }
        }
    },

    /**
     * Filter nested files/folders with the specified function.
     * @param {Function} search the predicate to use :
     * function (relativePath, file) {...}
     * It takes 2 arguments : the relative path and the file.
     * @return {Array} An array of matching elements.
     */
    filter: function(search) {
        var result = [];
        this.forEach(function (relativePath, entry) {
            if (search(relativePath, entry)) { // the file matches the function
                result.push(entry);
            }

        });
        return result;
    },

    /**
     * Add a file to the zip file, or search a file.
     * @param   {string|RegExp} name The name of the file to add (if data is defined),
     * the name of the file to find (if no data) or a regex to match files.
     * @param   {String|ArrayBuffer|Uint8Array|Buffer} data  The file data, either raw or base64 encoded
     * @param   {Object} o     File options
     * @return  {JSZip|Object|Array} this JSZip object (when adding a file),
     * a file (when searching by string) or an array of files (when searching by regex).
     */
    file: function(name, data, o) {
        if (arguments.length === 1) {
            if (isRegExp(name)) {
                var regexp = name;
                return this.filter(function(relativePath, file) {
                    return !file.dir && regexp.test(relativePath);
                });
            }
            else { // text
                var obj = this.files[this.root + name];
                if (obj && !obj.dir) {
                    return obj;
                } else {
                    return null;
                }
            }
        }
        else { // more than one argument : we have data !
            name = this.root + name;
            fileAdd.call(this, name, data, o);
        }
        return this;
    },

    /**
     * Add a directory to the zip file, or search.
     * @param   {String|RegExp} arg The name of the directory to add, or a regex to search folders.
     * @return  {JSZip} an object with the new directory as the root, or an array containing matching folders.
     */
    folder: function(arg) {
        if (!arg) {
            return this;
        }

        if (isRegExp(arg)) {
            return this.filter(function(relativePath, file) {
                return file.dir && arg.test(relativePath);
            });
        }

        // else, name is a new folder
        var name = this.root + arg;
        var newFolder = folderAdd.call(this, name);

        // Allow chaining by returning a new object with this folder as the root
        var ret = this.clone();
        ret.root = newFolder.name;
        return ret;
    },

    /**
     * Delete a file, or a directory and all sub-files, from the zip
     * @param {string} name the name of the file to delete
     * @return {JSZip} this JSZip object
     */
    remove: function(name) {
        name = this.root + name;
        var file = this.files[name];
        if (!file) {
            // Look for any folders
            if (name.slice(-1) !== "/") {
                name += "/";
            }
            file = this.files[name];
        }

        if (file && !file.dir) {
            // file
            delete this.files[name];
        } else {
            // maybe a folder, delete recursively
            var kids = this.filter(function(relativePath, file) {
                return file.name.slice(0, name.length) === name;
            });
            for (var i = 0; i < kids.length; i++) {
                delete this.files[kids[i].name];
            }
        }

        return this;
    },

    /**
     * Generate the complete zip file
     * @param {Object} options the options to generate the zip file :
     * - compression, "STORE" by default.
     * - type, "base64" by default. Values are : string, base64, uint8array, arraybuffer, blob.
     * @return {String|Uint8Array|ArrayBuffer|Buffer|Blob} the zip file
     */
    generate: function(options) {
        throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
    },

    /**
     * Generate the complete zip file as an internal stream.
     * @param {Object} options the options to generate the zip file :
     * - compression, "STORE" by default.
     * - type, "base64" by default. Values are : string, base64, uint8array, arraybuffer, blob.
     * @return {StreamHelper} the streamed zip file.
     */
    generateInternalStream: function(options) {
      var worker, opts = {};
      try {
          opts = utils.extend(options || {}, {
              streamFiles: false,
              compression: "STORE",
              compressionOptions : null,
              type: "",
              platform: "DOS",
              comment: null,
              mimeType: 'application/zip',
              encodeFileName: utf8.utf8encode
          });

          opts.type = opts.type.toLowerCase();
          opts.compression = opts.compression.toUpperCase();

          // "binarystring" is prefered but the internals use "string".
          if(opts.type === "binarystring") {
            opts.type = "string";
          }

          if (!opts.type) {
            throw new Error("No output type specified.");
          }

          utils.checkSupport(opts.type);

          // accept nodejs `process.platform`
          if(
              opts.platform === 'darwin' ||
              opts.platform === 'freebsd' ||
              opts.platform === 'linux' ||
              opts.platform === 'sunos'
          ) {
              opts.platform = "UNIX";
          }
          if (opts.platform === 'win32') {
              opts.platform = "DOS";
          }

          var comment = opts.comment || this.comment || "";
          worker = generate.generateWorker(this, opts, comment);
      } catch (e) {
        worker = new GenericWorker("error");
        worker.error(e);
      }
      return new StreamHelper(worker, opts.type || "string", opts.mimeType);
    },
    /**
     * Generate the complete zip file asynchronously.
     * @see generateInternalStream
     */
    generateAsync: function(options, onUpdate) {
        return this.generateInternalStream(options).accumulate(onUpdate);
    },
    /**
     * Generate the complete zip file asynchronously.
     * @see generateInternalStream
     */
    generateNodeStream: function(options, onUpdate) {
        options = options || {};
        if (!options.type) {
            options.type = "nodebuffer";
        }
        return this.generateInternalStream(options).toNodejsStream(onUpdate);
    }
};
module.exports = out;

},{"./compressedObject":42,"./defaults":45,"./generate":49,"./nodejs/NodejsStreamInputAdapter":53,"./nodejsUtils":52,"./stream/GenericWorker":68,"./stream/StreamHelper":69,"./utf8":71,"./utils":72,"./zipObject":75}],56:[function(require,module,exports){
/*
 * This file is used by module bundlers (browserify/webpack/etc) when
 * including a stream implementation. We use "readable-stream" to get a
 * consistent behavior between nodejs versions but bundlers often have a shim
 * for "stream". Using this shim greatly improve the compatibility and greatly
 * reduce the final size of the bundle (only one stream implementation, not
 * two).
 */
module.exports = require("stream");

},{"stream":26}],57:[function(require,module,exports){
'use strict';
var DataReader = require('./DataReader');
var utils = require('../utils');

function ArrayReader(data) {
    DataReader.call(this, data);
	for(var i = 0; i < this.data.length; i++) {
		data[i] = data[i] & 0xFF;
	}
}
utils.inherits(ArrayReader, DataReader);
/**
 * @see DataReader.byteAt
 */
ArrayReader.prototype.byteAt = function(i) {
    return this.data[this.zero + i];
};
/**
 * @see DataReader.lastIndexOfSignature
 */
ArrayReader.prototype.lastIndexOfSignature = function(sig) {
    var sig0 = sig.charCodeAt(0),
        sig1 = sig.charCodeAt(1),
        sig2 = sig.charCodeAt(2),
        sig3 = sig.charCodeAt(3);
    for (var i = this.length - 4; i >= 0; --i) {
        if (this.data[i] === sig0 && this.data[i + 1] === sig1 && this.data[i + 2] === sig2 && this.data[i + 3] === sig3) {
            return i - this.zero;
        }
    }

    return -1;
};
/**
 * @see DataReader.readAndCheckSignature
 */
ArrayReader.prototype.readAndCheckSignature = function (sig) {
    var sig0 = sig.charCodeAt(0),
        sig1 = sig.charCodeAt(1),
        sig2 = sig.charCodeAt(2),
        sig3 = sig.charCodeAt(3),
        data = this.readData(4);
    return sig0 === data[0] && sig1 === data[1] && sig2 === data[2] && sig3 === data[3];
};
/**
 * @see DataReader.readData
 */
ArrayReader.prototype.readData = function(size) {
    this.checkOffset(size);
    if(size === 0) {
        return [];
    }
    var result = this.data.slice(this.zero + this.index, this.zero + this.index + size);
    this.index += size;
    return result;
};
module.exports = ArrayReader;

},{"../utils":72,"./DataReader":58}],58:[function(require,module,exports){
'use strict';
var utils = require('../utils');

function DataReader(data) {
    this.data = data; // type : see implementation
    this.length = data.length;
    this.index = 0;
    this.zero = 0;
}
DataReader.prototype = {
    /**
     * Check that the offset will not go too far.
     * @param {string} offset the additional offset to check.
     * @throws {Error} an Error if the offset is out of bounds.
     */
    checkOffset: function(offset) {
        this.checkIndex(this.index + offset);
    },
    /**
     * Check that the specified index will not be too far.
     * @param {string} newIndex the index to check.
     * @throws {Error} an Error if the index is out of bounds.
     */
    checkIndex: function(newIndex) {
        if (this.length < this.zero + newIndex || newIndex < 0) {
            throw new Error("End of data reached (data length = " + this.length + ", asked index = " + (newIndex) + "). Corrupted zip ?");
        }
    },
    /**
     * Change the index.
     * @param {number} newIndex The new index.
     * @throws {Error} if the new index is out of the data.
     */
    setIndex: function(newIndex) {
        this.checkIndex(newIndex);
        this.index = newIndex;
    },
    /**
     * Skip the next n bytes.
     * @param {number} n the number of bytes to skip.
     * @throws {Error} if the new index is out of the data.
     */
    skip: function(n) {
        this.setIndex(this.index + n);
    },
    /**
     * Get the byte at the specified index.
     * @param {number} i the index to use.
     * @return {number} a byte.
     */
    byteAt: function(i) {
        // see implementations
    },
    /**
     * Get the next number with a given byte size.
     * @param {number} size the number of bytes to read.
     * @return {number} the corresponding number.
     */
    readInt: function(size) {
        var result = 0,
            i;
        this.checkOffset(size);
        for (i = this.index + size - 1; i >= this.index; i--) {
            result = (result << 8) + this.byteAt(i);
        }
        this.index += size;
        return result;
    },
    /**
     * Get the next string with a given byte size.
     * @param {number} size the number of bytes to read.
     * @return {string} the corresponding string.
     */
    readString: function(size) {
        return utils.transformTo("string", this.readData(size));
    },
    /**
     * Get raw data without conversion, <size> bytes.
     * @param {number} size the number of bytes to read.
     * @return {Object} the raw data, implementation specific.
     */
    readData: function(size) {
        // see implementations
    },
    /**
     * Find the last occurence of a zip signature (4 bytes).
     * @param {string} sig the signature to find.
     * @return {number} the index of the last occurence, -1 if not found.
     */
    lastIndexOfSignature: function(sig) {
        // see implementations
    },
    /**
     * Read the signature (4 bytes) at the current position and compare it with sig.
     * @param {string} sig the expected signature
     * @return {boolean} true if the signature matches, false otherwise.
     */
    readAndCheckSignature: function(sig) {
        // see implementations
    },
    /**
     * Get the next date.
     * @return {Date} the date.
     */
    readDate: function() {
        var dostime = this.readInt(4);
        return new Date(Date.UTC(
        ((dostime >> 25) & 0x7f) + 1980, // year
        ((dostime >> 21) & 0x0f) - 1, // month
        (dostime >> 16) & 0x1f, // day
        (dostime >> 11) & 0x1f, // hour
        (dostime >> 5) & 0x3f, // minute
        (dostime & 0x1f) << 1)); // second
    }
};
module.exports = DataReader;

},{"../utils":72}],59:[function(require,module,exports){
'use strict';
var Uint8ArrayReader = require('./Uint8ArrayReader');
var utils = require('../utils');

function NodeBufferReader(data) {
    Uint8ArrayReader.call(this, data);
}
utils.inherits(NodeBufferReader, Uint8ArrayReader);

/**
 * @see DataReader.readData
 */
NodeBufferReader.prototype.readData = function(size) {
    this.checkOffset(size);
    var result = this.data.slice(this.zero + this.index, this.zero + this.index + size);
    this.index += size;
    return result;
};
module.exports = NodeBufferReader;

},{"../utils":72,"./Uint8ArrayReader":61}],60:[function(require,module,exports){
'use strict';
var DataReader = require('./DataReader');
var utils = require('../utils');

function StringReader(data) {
    DataReader.call(this, data);
}
utils.inherits(StringReader, DataReader);
/**
 * @see DataReader.byteAt
 */
StringReader.prototype.byteAt = function(i) {
    return this.data.charCodeAt(this.zero + i);
};
/**
 * @see DataReader.lastIndexOfSignature
 */
StringReader.prototype.lastIndexOfSignature = function(sig) {
    return this.data.lastIndexOf(sig) - this.zero;
};
/**
 * @see DataReader.readAndCheckSignature
 */
StringReader.prototype.readAndCheckSignature = function (sig) {
    var data = this.readData(4);
    return sig === data;
};
/**
 * @see DataReader.readData
 */
StringReader.prototype.readData = function(size) {
    this.checkOffset(size);
    // this will work because the constructor applied the "& 0xff" mask.
    var result = this.data.slice(this.zero + this.index, this.zero + this.index + size);
    this.index += size;
    return result;
};
module.exports = StringReader;

},{"../utils":72,"./DataReader":58}],61:[function(require,module,exports){
'use strict';
var ArrayReader = require('./ArrayReader');
var utils = require('../utils');

function Uint8ArrayReader(data) {
    ArrayReader.call(this, data);
}
utils.inherits(Uint8ArrayReader, ArrayReader);
/**
 * @see DataReader.readData
 */
Uint8ArrayReader.prototype.readData = function(size) {
    this.checkOffset(size);
    if(size === 0) {
        // in IE10, when using subarray(idx, idx), we get the array [0x00] instead of [].
        return new Uint8Array(0);
    }
    var result = this.data.subarray(this.zero + this.index, this.zero + this.index + size);
    this.index += size;
    return result;
};
module.exports = Uint8ArrayReader;

},{"../utils":72,"./ArrayReader":57}],62:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var support = require('../support');
var ArrayReader = require('./ArrayReader');
var StringReader = require('./StringReader');
var NodeBufferReader = require('./NodeBufferReader');
var Uint8ArrayReader = require('./Uint8ArrayReader');

/**
 * Create a reader adapted to the data.
 * @param {String|ArrayBuffer|Uint8Array|Buffer} data the data to read.
 * @return {DataReader} the data reader.
 */
module.exports = function (data) {
    var type = utils.getTypeOf(data);
    utils.checkSupport(type);
    if (type === "string" && !support.uint8array) {
        return new StringReader(data);
    }
    if (type === "nodebuffer") {
        return new NodeBufferReader(data);
    }
    if (support.uint8array) {
        return new Uint8ArrayReader(utils.transformTo("uint8array", data));
    }
    return new ArrayReader(utils.transformTo("array", data));
};

},{"../support":70,"../utils":72,"./ArrayReader":57,"./NodeBufferReader":59,"./StringReader":60,"./Uint8ArrayReader":61}],63:[function(require,module,exports){
'use strict';
exports.LOCAL_FILE_HEADER = "PK\x03\x04";
exports.CENTRAL_FILE_HEADER = "PK\x01\x02";
exports.CENTRAL_DIRECTORY_END = "PK\x05\x06";
exports.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x06\x07";
exports.ZIP64_CENTRAL_DIRECTORY_END = "PK\x06\x06";
exports.DATA_DESCRIPTOR = "PK\x07\x08";

},{}],64:[function(require,module,exports){
'use strict';

var GenericWorker = require('./GenericWorker');
var utils = require('../utils');

/**
 * A worker which convert chunks to a specified type.
 * @constructor
 * @param {String} destType the destination type.
 */
function ConvertWorker(destType) {
    GenericWorker.call(this, "ConvertWorker to " + destType);
    this.destType = destType;
}
utils.inherits(ConvertWorker, GenericWorker);

/**
 * @see GenericWorker.processChunk
 */
ConvertWorker.prototype.processChunk = function (chunk) {
    this.push({
        data : utils.transformTo(this.destType, chunk.data),
        meta : chunk.meta
    });
};
module.exports = ConvertWorker;

},{"../utils":72,"./GenericWorker":68}],65:[function(require,module,exports){
'use strict';

var GenericWorker = require('./GenericWorker');
var crc32 = require('../crc32');
var utils = require('../utils');

/**
 * A worker which calculate the crc32 of the data flowing through.
 * @constructor
 */
function Crc32Probe() {
    GenericWorker.call(this, "Crc32Probe");
    this.withStreamInfo("crc32", 0);
}
utils.inherits(Crc32Probe, GenericWorker);

/**
 * @see GenericWorker.processChunk
 */
Crc32Probe.prototype.processChunk = function (chunk) {
    this.streamInfo.crc32 = crc32(chunk.data, this.streamInfo.crc32 || 0);
    this.push(chunk);
};
module.exports = Crc32Probe;

},{"../crc32":44,"../utils":72,"./GenericWorker":68}],66:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var GenericWorker = require('./GenericWorker');

/**
 * A worker which calculate the total length of the data flowing through.
 * @constructor
 * @param {String} propName the name used to expose the length
 */
function DataLengthProbe(propName) {
    GenericWorker.call(this, "DataLengthProbe for " + propName);
    this.propName = propName;
    this.withStreamInfo(propName, 0);
}
utils.inherits(DataLengthProbe, GenericWorker);

/**
 * @see GenericWorker.processChunk
 */
DataLengthProbe.prototype.processChunk = function (chunk) {
    if(chunk) {
        var length = this.streamInfo[this.propName] || 0;
        this.streamInfo[this.propName] = length + chunk.data.length;
    }
    GenericWorker.prototype.processChunk.call(this, chunk);
};
module.exports = DataLengthProbe;


},{"../utils":72,"./GenericWorker":68}],67:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var GenericWorker = require('./GenericWorker');

// the size of the generated chunks
// TODO expose this as a public variable
var DEFAULT_BLOCK_SIZE = 16 * 1024;

/**
 * A worker that reads a content and emits chunks.
 * @constructor
 * @param {Promise} dataP the promise of the data to split
 */
function DataWorker(dataP) {
    GenericWorker.call(this, "DataWorker");
    var self = this;
    this.dataIsReady = false;
    this.index = 0;
    this.max = 0;
    this.data = null;
    this.type = "";

    this._tickScheduled = false;

    dataP.then(function (data) {
        self.dataIsReady = true;
        self.data = data;
        self.max = data && data.length || 0;
        self.type = utils.getTypeOf(data);
        if(!self.isPaused) {
            self._tickAndRepeat();
        }
    }, function (e) {
        self.error(e);
    });
}

utils.inherits(DataWorker, GenericWorker);

/**
 * @see GenericWorker.cleanUp
 */
DataWorker.prototype.cleanUp = function () {
    GenericWorker.prototype.cleanUp.call(this);
    this.data = null;
};

/**
 * @see GenericWorker.resume
 */
DataWorker.prototype.resume = function () {
    if(!GenericWorker.prototype.resume.call(this)) {
        return false;
    }

    if (!this._tickScheduled && this.dataIsReady) {
        this._tickScheduled = true;
        utils.delay(this._tickAndRepeat, [], this);
    }
    return true;
};

/**
 * Trigger a tick a schedule an other call to this function.
 */
DataWorker.prototype._tickAndRepeat = function() {
    this._tickScheduled = false;
    if(this.isPaused || this.isFinished) {
        return;
    }
    this._tick();
    if(!this.isFinished) {
        utils.delay(this._tickAndRepeat, [], this);
        this._tickScheduled = true;
    }
};

/**
 * Read and push a chunk.
 */
DataWorker.prototype._tick = function() {

    if(this.isPaused || this.isFinished) {
        return false;
    }

    var size = DEFAULT_BLOCK_SIZE;
    var data = null, nextIndex = Math.min(this.max, this.index + size);
    if (this.index >= this.max) {
        // EOF
        return this.end();
    } else {
        switch(this.type) {
            case "string":
                data = this.data.substring(this.index, nextIndex);
            break;
            case "uint8array":
                data = this.data.subarray(this.index, nextIndex);
            break;
            case "array":
            case "nodebuffer":
                data = this.data.slice(this.index, nextIndex);
            break;
        }
        this.index = nextIndex;
        return this.push({
            data : data,
            meta : {
                percent : this.max ? this.index / this.max * 100 : 0
            }
        });
    }
};

module.exports = DataWorker;

},{"../utils":72,"./GenericWorker":68}],68:[function(require,module,exports){
'use strict';

/**
 * A worker that does nothing but passing chunks to the next one. This is like
 * a nodejs stream but with some differences. On the good side :
 * - it works on IE 6-9 without any issue / polyfill
 * - it weights less than the full dependencies bundled with browserify
 * - it forwards errors (no need to declare an error handler EVERYWHERE)
 *
 * A chunk is an object with 2 attributes : `meta` and `data`. The former is an
 * object containing anything (`percent` for example), see each worker for more
 * details. The latter is the real data (String, Uint8Array, etc).
 *
 * @constructor
 * @param {String} name the name of the stream (mainly used for debugging purposes)
 */
function GenericWorker(name) {
    // the name of the worker
    this.name = name || "default";
    // an object containing metadata about the workers chain
    this.streamInfo = {};
    // an error which happened when the worker was paused
    this.generatedError = null;
    // an object containing metadata to be merged by this worker into the general metadata
    this.extraStreamInfo = {};
    // true if the stream is paused (and should not do anything), false otherwise
    this.isPaused = true;
    // true if the stream is finished (and should not do anything), false otherwise
    this.isFinished = false;
    // true if the stream is locked to prevent further structure updates (pipe), false otherwise
    this.isLocked = false;
    // the event listeners
    this._listeners = {
        'data':[],
        'end':[],
        'error':[]
    };
    // the previous worker, if any
    this.previous = null;
}

GenericWorker.prototype = {
    /**
     * Push a chunk to the next workers.
     * @param {Object} chunk the chunk to push
     */
    push : function (chunk) {
        this.emit("data", chunk);
    },
    /**
     * End the stream.
     * @return {Boolean} true if this call ended the worker, false otherwise.
     */
    end : function () {
        if (this.isFinished) {
            return false;
        }

        this.flush();
        try {
            this.emit("end");
            this.cleanUp();
            this.isFinished = true;
        } catch (e) {
            this.emit("error", e);
        }
        return true;
    },
    /**
     * End the stream with an error.
     * @param {Error} e the error which caused the premature end.
     * @return {Boolean} true if this call ended the worker with an error, false otherwise.
     */
    error : function (e) {
        if (this.isFinished) {
            return false;
        }

        if(this.isPaused) {
            this.generatedError = e;
        } else {
            this.isFinished = true;

            this.emit("error", e);

            // in the workers chain exploded in the middle of the chain,
            // the error event will go downward but we also need to notify
            // workers upward that there has been an error.
            if(this.previous) {
                this.previous.error(e);
            }

            this.cleanUp();
        }
        return true;
    },
    /**
     * Add a callback on an event.
     * @param {String} name the name of the event (data, end, error)
     * @param {Function} listener the function to call when the event is triggered
     * @return {GenericWorker} the current object for chainability
     */
    on : function (name, listener) {
        this._listeners[name].push(listener);
        return this;
    },
    /**
     * Clean any references when a worker is ending.
     */
    cleanUp : function () {
        this.streamInfo = this.generatedError = this.extraStreamInfo = null;
        this._listeners = [];
    },
    /**
     * Trigger an event. This will call registered callback with the provided arg.
     * @param {String} name the name of the event (data, end, error)
     * @param {Object} arg the argument to call the callback with.
     */
    emit : function (name, arg) {
        if (this._listeners[name]) {
            for(var i = 0; i < this._listeners[name].length; i++) {
                this._listeners[name][i].call(this, arg);
            }
        }
    },
    /**
     * Chain a worker with an other.
     * @param {Worker} next the worker receiving events from the current one.
     * @return {worker} the next worker for chainability
     */
    pipe : function (next) {
        return next.registerPrevious(this);
    },
    /**
     * Same as `pipe` in the other direction.
     * Using an API with `pipe(next)` is very easy.
     * Implementing the API with the point of view of the next one registering
     * a source is easier, see the ZipFileWorker.
     * @param {Worker} previous the previous worker, sending events to this one
     * @return {Worker} the current worker for chainability
     */
    registerPrevious : function (previous) {
        if (this.isLocked) {
            throw new Error("The stream '" + this + "' has already been used.");
        }

        // sharing the streamInfo...
        this.streamInfo = previous.streamInfo;
        // ... and adding our own bits
        this.mergeStreamInfo();
        this.previous =  previous;
        var self = this;
        previous.on('data', function (chunk) {
            self.processChunk(chunk);
        });
        previous.on('end', function () {
            self.end();
        });
        previous.on('error', function (e) {
            self.error(e);
        });
        return this;
    },
    /**
     * Pause the stream so it doesn't send events anymore.
     * @return {Boolean} true if this call paused the worker, false otherwise.
     */
    pause : function () {
        if(this.isPaused || this.isFinished) {
            return false;
        }
        this.isPaused = true;

        if(this.previous) {
            this.previous.pause();
        }
        return true;
    },
    /**
     * Resume a paused stream.
     * @return {Boolean} true if this call resumed the worker, false otherwise.
     */
    resume : function () {
        if(!this.isPaused || this.isFinished) {
            return false;
        }
        this.isPaused = false;

        // if true, the worker tried to resume but failed
        var withError = false;
        if(this.generatedError) {
            this.error(this.generatedError);
            withError = true;
        }
        if(this.previous) {
            this.previous.resume();
        }

        return !withError;
    },
    /**
     * Flush any remaining bytes as the stream is ending.
     */
    flush : function () {},
    /**
     * Process a chunk. This is usually the method overridden.
     * @param {Object} chunk the chunk to process.
     */
    processChunk : function(chunk) {
        this.push(chunk);
    },
    /**
     * Add a key/value to be added in the workers chain streamInfo once activated.
     * @param {String} key the key to use
     * @param {Object} value the associated value
     * @return {Worker} the current worker for chainability
     */
    withStreamInfo : function (key, value) {
        this.extraStreamInfo[key] = value;
        this.mergeStreamInfo();
        return this;
    },
    /**
     * Merge this worker's streamInfo into the chain's streamInfo.
     */
    mergeStreamInfo : function () {
        for(var key in this.extraStreamInfo) {
            if (!this.extraStreamInfo.hasOwnProperty(key)) {
                continue;
            }
            this.streamInfo[key] = this.extraStreamInfo[key];
        }
    },

    /**
     * Lock the stream to prevent further updates on the workers chain.
     * After calling this method, all calls to pipe will fail.
     */
    lock: function () {
        if (this.isLocked) {
            throw new Error("The stream '" + this + "' has already been used.");
        }
        this.isLocked = true;
        if (this.previous) {
            this.previous.lock();
        }
    },

    /**
     *
     * Pretty print the workers chain.
     */
    toString : function () {
        var me = "Worker " + this.name;
        if (this.previous) {
            return this.previous + " -> " + me;
        } else {
            return me;
        }
    }
};

module.exports = GenericWorker;

},{}],69:[function(require,module,exports){
(function (Buffer){
'use strict';

var utils = require('../utils');
var ConvertWorker = require('./ConvertWorker');
var GenericWorker = require('./GenericWorker');
var base64 = require('../base64');
var support = require("../support");
var external = require("../external");

var NodejsStreamOutputAdapter = null;
if (support.nodestream) {
    try {
        NodejsStreamOutputAdapter = require('../nodejs/NodejsStreamOutputAdapter');
    } catch(e) {}
}

/**
 * Apply the final transformation of the data. If the user wants a Blob for
 * example, it's easier to work with an U8intArray and finally do the
 * ArrayBuffer/Blob conversion.
 * @param {String} type the name of the final type
 * @param {String|Uint8Array|Buffer} content the content to transform
 * @param {String} mimeType the mime type of the content, if applicable.
 * @return {String|Uint8Array|ArrayBuffer|Buffer|Blob} the content in the right format.
 */
function transformZipOutput(type, content, mimeType) {
    switch(type) {
        case "blob" :
            return utils.newBlob(utils.transformTo("arraybuffer", content), mimeType);
        case "base64" :
            return base64.encode(content);
        default :
            return utils.transformTo(type, content);
    }
}

/**
 * Concatenate an array of data of the given type.
 * @param {String} type the type of the data in the given array.
 * @param {Array} dataArray the array containing the data chunks to concatenate
 * @return {String|Uint8Array|Buffer} the concatenated data
 * @throws Error if the asked type is unsupported
 */
function concat (type, dataArray) {
    var i, index = 0, res = null, totalLength = 0;
    for(i = 0; i < dataArray.length; i++) {
        totalLength += dataArray[i].length;
    }
    switch(type) {
        case "string":
            return dataArray.join("");
          case "array":
            return Array.prototype.concat.apply([], dataArray);
        case "uint8array":
            res = new Uint8Array(totalLength);
            for(i = 0; i < dataArray.length; i++) {
                res.set(dataArray[i], index);
                index += dataArray[i].length;
            }
            return res;
        case "nodebuffer":
            return Buffer.concat(dataArray);
        default:
            throw new Error("concat : unsupported type '"  + type + "'");
    }
}

/**
 * Listen a StreamHelper, accumulate its content and concatenate it into a
 * complete block.
 * @param {StreamHelper} helper the helper to use.
 * @param {Function} updateCallback a callback called on each update. Called
 * with one arg :
 * - the metadata linked to the update received.
 * @return Promise the promise for the accumulation.
 */
function accumulate(helper, updateCallback) {
    return new external.Promise(function (resolve, reject){
        var dataArray = [];
        var chunkType = helper._internalType,
            resultType = helper._outputType,
            mimeType = helper._mimeType;
        helper
        .on('data', function (data, meta) {
            dataArray.push(data);
            if(updateCallback) {
                updateCallback(meta);
            }
        })
        .on('error', function(err) {
            dataArray = [];
            reject(err);
        })
        .on('end', function (){
            try {
                var result = transformZipOutput(resultType, concat(chunkType, dataArray), mimeType);
                resolve(result);
            } catch (e) {
                reject(e);
            }
            dataArray = [];
        })
        .resume();
    });
}

/**
 * An helper to easily use workers outside of JSZip.
 * @constructor
 * @param {Worker} worker the worker to wrap
 * @param {String} outputType the type of data expected by the use
 * @param {String} mimeType the mime type of the content, if applicable.
 */
function StreamHelper(worker, outputType, mimeType) {
    var internalType = outputType;
    switch(outputType) {
        case "blob":
        case "arraybuffer":
            internalType = "uint8array";
        break;
        case "base64":
            internalType = "string";
        break;
    }

    try {
        // the type used internally
        this._internalType = internalType;
        // the type used to output results
        this._outputType = outputType;
        // the mime type
        this._mimeType = mimeType;
        utils.checkSupport(internalType);
        this._worker = worker.pipe(new ConvertWorker(internalType));
        // the last workers can be rewired without issues but we need to
        // prevent any updates on previous workers.
        worker.lock();
    } catch(e) {
        this._worker = new GenericWorker("error");
        this._worker.error(e);
    }
}

StreamHelper.prototype = {
    /**
     * Listen a StreamHelper, accumulate its content and concatenate it into a
     * complete block.
     * @param {Function} updateCb the update callback.
     * @return Promise the promise for the accumulation.
     */
    accumulate : function (updateCb) {
        return accumulate(this, updateCb);
    },
    /**
     * Add a listener on an event triggered on a stream.
     * @param {String} evt the name of the event
     * @param {Function} fn the listener
     * @return {StreamHelper} the current helper.
     */
    on : function (evt, fn) {
        var self = this;

        if(evt === "data") {
            this._worker.on(evt, function (chunk) {
                fn.call(self, chunk.data, chunk.meta);
            });
        } else {
            this._worker.on(evt, function () {
                utils.delay(fn, arguments, self);
            });
        }
        return this;
    },
    /**
     * Resume the flow of chunks.
     * @return {StreamHelper} the current helper.
     */
    resume : function () {
        utils.delay(this._worker.resume, [], this._worker);
        return this;
    },
    /**
     * Pause the flow of chunks.
     * @return {StreamHelper} the current helper.
     */
    pause : function () {
        this._worker.pause();
        return this;
    },
    /**
     * Return a nodejs stream for this helper.
     * @param {Function} updateCb the update callback.
     * @return {NodejsStreamOutputAdapter} the nodejs stream.
     */
    toNodejsStream : function (updateCb) {
        utils.checkSupport("nodestream");
        if (this._outputType !== "nodebuffer") {
            // an object stream containing blob/arraybuffer/uint8array/string
            // is strange and I don't know if it would be useful.
            // I you find this comment and have a good usecase, please open a
            // bug report !
            throw new Error(this._outputType + " is not supported by this method");
        }

        return new NodejsStreamOutputAdapter(this, {
            objectMode : this._outputType !== "nodebuffer"
        }, updateCb);
    }
};


module.exports = StreamHelper;

}).call(this,require("buffer").Buffer)
},{"../base64":41,"../external":46,"../nodejs/NodejsStreamOutputAdapter":54,"../support":70,"../utils":72,"./ConvertWorker":64,"./GenericWorker":68,"buffer":3}],70:[function(require,module,exports){
(function (Buffer){
'use strict';

exports.base64 = true;
exports.array = true;
exports.string = true;
exports.arraybuffer = typeof ArrayBuffer !== "undefined" && typeof Uint8Array !== "undefined";
exports.nodebuffer = typeof Buffer !== "undefined";
// contains true if JSZip can read/generate Uint8Array, false otherwise.
exports.uint8array = typeof Uint8Array !== "undefined";

if (typeof ArrayBuffer === "undefined") {
    exports.blob = false;
}
else {
    var buffer = new ArrayBuffer(0);
    try {
        exports.blob = new Blob([buffer], {
            type: "application/zip"
        }).size === 0;
    }
    catch (e) {
        try {
            var Builder = self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder;
            var builder = new Builder();
            builder.append(buffer);
            exports.blob = builder.getBlob('application/zip').size === 0;
        }
        catch (e) {
            exports.blob = false;
        }
    }
}

try {
    exports.nodestream = !!require('readable-stream').Readable;
} catch(e) {
    exports.nodestream = false;
}

}).call(this,require("buffer").Buffer)
},{"buffer":3,"readable-stream":56}],71:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var support = require('./support');
var nodejsUtils = require('./nodejsUtils');
var GenericWorker = require('./stream/GenericWorker');

/**
 * The following functions come from pako, from pako/lib/utils/strings
 * released under the MIT license, see pako https://github.com/nodeca/pako/
 */

// Table with utf8 lengths (calculated by first byte of sequence)
// Note, that 5 & 6-byte values and some 4-byte values can not be represented in JS,
// because max possible codepoint is 0x10ffff
var _utf8len = new Array(256);
for (var i=0; i<256; i++) {
  _utf8len[i] = (i >= 252 ? 6 : i >= 248 ? 5 : i >= 240 ? 4 : i >= 224 ? 3 : i >= 192 ? 2 : 1);
}
_utf8len[254]=_utf8len[254]=1; // Invalid sequence start

// convert string to array (typed, when possible)
var string2buf = function (str) {
    var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;

    // count binary size
    for (m_pos = 0; m_pos < str_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
            c2 = str.charCodeAt(m_pos+1);
            if ((c2 & 0xfc00) === 0xdc00) {
                c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                m_pos++;
            }
        }
        buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    }

    // allocate buffer
    if (support.uint8array) {
        buf = new Uint8Array(buf_len);
    } else {
        buf = new Array(buf_len);
    }

    // convert
    for (i=0, m_pos = 0; i < buf_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
            c2 = str.charCodeAt(m_pos+1);
            if ((c2 & 0xfc00) === 0xdc00) {
                c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                m_pos++;
            }
        }
        if (c < 0x80) {
            /* one byte */
            buf[i++] = c;
        } else if (c < 0x800) {
            /* two bytes */
            buf[i++] = 0xC0 | (c >>> 6);
            buf[i++] = 0x80 | (c & 0x3f);
        } else if (c < 0x10000) {
            /* three bytes */
            buf[i++] = 0xE0 | (c >>> 12);
            buf[i++] = 0x80 | (c >>> 6 & 0x3f);
            buf[i++] = 0x80 | (c & 0x3f);
        } else {
            /* four bytes */
            buf[i++] = 0xf0 | (c >>> 18);
            buf[i++] = 0x80 | (c >>> 12 & 0x3f);
            buf[i++] = 0x80 | (c >>> 6 & 0x3f);
            buf[i++] = 0x80 | (c & 0x3f);
        }
    }

    return buf;
};

// Calculate max possible position in utf8 buffer,
// that will not break sequence. If that's not possible
// - (very small limits) return max size as is.
//
// buf[] - utf8 bytes array
// max   - length limit (mandatory);
var utf8border = function(buf, max) {
    var pos;

    max = max || buf.length;
    if (max > buf.length) { max = buf.length; }

    // go back from last position, until start of sequence found
    pos = max-1;
    while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) { pos--; }

    // Fuckup - very small and broken sequence,
    // return max, because we should return something anyway.
    if (pos < 0) { return max; }

    // If we came to start of buffer - that means vuffer is too small,
    // return max too.
    if (pos === 0) { return max; }

    return (pos + _utf8len[buf[pos]] > max) ? pos : max;
};

// convert array to string
var buf2string = function (buf) {
    var str, i, out, c, c_len;
    var len = buf.length;

    // Reserve max possible length (2 words per char)
    // NB: by unknown reasons, Array is significantly faster for
    //     String.fromCharCode.apply than Uint16Array.
    var utf16buf = new Array(len*2);

    for (out=0, i=0; i<len;) {
        c = buf[i++];
        // quick process ascii
        if (c < 0x80) { utf16buf[out++] = c; continue; }

        c_len = _utf8len[c];
        // skip 5 & 6 byte codes
        if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len-1; continue; }

        // apply mask on first byte
        c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
        // join the rest
        while (c_len > 1 && i < len) {
            c = (c << 6) | (buf[i++] & 0x3f);
            c_len--;
        }

        // terminated by end of string?
        if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }

        if (c < 0x10000) {
            utf16buf[out++] = c;
        } else {
            c -= 0x10000;
            utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
            utf16buf[out++] = 0xdc00 | (c & 0x3ff);
        }
    }

    // shrinkBuf(utf16buf, out)
    if (utf16buf.length !== out) {
        if(utf16buf.subarray) {
            utf16buf = utf16buf.subarray(0, out);
        } else {
            utf16buf.length = out;
        }
    }

    // return String.fromCharCode.apply(null, utf16buf);
    return utils.applyFromCharCode(utf16buf);
};


// That's all for the pako functions.


/**
 * Transform a javascript string into an array (typed if possible) of bytes,
 * UTF-8 encoded.
 * @param {String} str the string to encode
 * @return {Array|Uint8Array|Buffer} the UTF-8 encoded string.
 */
exports.utf8encode = function utf8encode(str) {
    if (support.nodebuffer) {
        return nodejsUtils.newBufferFrom(str, "utf-8");
    }

    return string2buf(str);
};


/**
 * Transform a bytes array (or a representation) representing an UTF-8 encoded
 * string into a javascript string.
 * @param {Array|Uint8Array|Buffer} buf the data de decode
 * @return {String} the decoded string.
 */
exports.utf8decode = function utf8decode(buf) {
    if (support.nodebuffer) {
        return utils.transformTo("nodebuffer", buf).toString("utf-8");
    }

    buf = utils.transformTo(support.uint8array ? "uint8array" : "array", buf);

    return buf2string(buf);
};

/**
 * A worker to decode utf8 encoded binary chunks into string chunks.
 * @constructor
 */
function Utf8DecodeWorker() {
    GenericWorker.call(this, "utf-8 decode");
    // the last bytes if a chunk didn't end with a complete codepoint.
    this.leftOver = null;
}
utils.inherits(Utf8DecodeWorker, GenericWorker);

/**
 * @see GenericWorker.processChunk
 */
Utf8DecodeWorker.prototype.processChunk = function (chunk) {

    var data = utils.transformTo(support.uint8array ? "uint8array" : "array", chunk.data);

    // 1st step, re-use what's left of the previous chunk
    if (this.leftOver && this.leftOver.length) {
        if(support.uint8array) {
            var previousData = data;
            data = new Uint8Array(previousData.length + this.leftOver.length);
            data.set(this.leftOver, 0);
            data.set(previousData, this.leftOver.length);
        } else {
            data = this.leftOver.concat(data);
        }
        this.leftOver = null;
    }

    var nextBoundary = utf8border(data);
    var usableData = data;
    if (nextBoundary !== data.length) {
        if (support.uint8array) {
            usableData = data.subarray(0, nextBoundary);
            this.leftOver = data.subarray(nextBoundary, data.length);
        } else {
            usableData = data.slice(0, nextBoundary);
            this.leftOver = data.slice(nextBoundary, data.length);
        }
    }

    this.push({
        data : exports.utf8decode(usableData),
        meta : chunk.meta
    });
};

/**
 * @see GenericWorker.flush
 */
Utf8DecodeWorker.prototype.flush = function () {
    if(this.leftOver && this.leftOver.length) {
        this.push({
            data : exports.utf8decode(this.leftOver),
            meta : {}
        });
        this.leftOver = null;
    }
};
exports.Utf8DecodeWorker = Utf8DecodeWorker;

/**
 * A worker to endcode string chunks into utf8 encoded binary chunks.
 * @constructor
 */
function Utf8EncodeWorker() {
    GenericWorker.call(this, "utf-8 encode");
}
utils.inherits(Utf8EncodeWorker, GenericWorker);

/**
 * @see GenericWorker.processChunk
 */
Utf8EncodeWorker.prototype.processChunk = function (chunk) {
    this.push({
        data : exports.utf8encode(chunk.data),
        meta : chunk.meta
    });
};
exports.Utf8EncodeWorker = Utf8EncodeWorker;

},{"./nodejsUtils":52,"./stream/GenericWorker":68,"./support":70,"./utils":72}],72:[function(require,module,exports){
'use strict';

var support = require('./support');
var base64 = require('./base64');
var nodejsUtils = require('./nodejsUtils');
var setImmediate = require('core-js/library/fn/set-immediate');
var external = require("./external");


/**
 * Convert a string that pass as a "binary string": it should represent a byte
 * array but may have > 255 char codes. Be sure to take only the first byte
 * and returns the byte array.
 * @param {String} str the string to transform.
 * @return {Array|Uint8Array} the string in a binary format.
 */
function string2binary(str) {
    var result = null;
    if (support.uint8array) {
      result = new Uint8Array(str.length);
    } else {
      result = new Array(str.length);
    }
    return stringToArrayLike(str, result);
}

/**
 * Create a new blob with the given content and the given type.
 * @param {String|ArrayBuffer} part the content to put in the blob. DO NOT use
 * an Uint8Array because the stock browser of android 4 won't accept it (it
 * will be silently converted to a string, "[object Uint8Array]").
 *
 * Use only ONE part to build the blob to avoid a memory leak in IE11 / Edge:
 * when a large amount of Array is used to create the Blob, the amount of
 * memory consumed is nearly 100 times the original data amount.
 *
 * @param {String} type the mime type of the blob.
 * @return {Blob} the created blob.
 */
exports.newBlob = function(part, type) {
    exports.checkSupport("blob");

    try {
        // Blob constructor
        return new Blob([part], {
            type: type
        });
    }
    catch (e) {

        try {
            // deprecated, browser only, old way
            var Builder = self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder;
            var builder = new Builder();
            builder.append(part);
            return builder.getBlob(type);
        }
        catch (e) {

            // well, fuck ?!
            throw new Error("Bug : can't construct the Blob.");
        }
    }


};
/**
 * The identity function.
 * @param {Object} input the input.
 * @return {Object} the same input.
 */
function identity(input) {
    return input;
}

/**
 * Fill in an array with a string.
 * @param {String} str the string to use.
 * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to fill in (will be mutated).
 * @return {Array|ArrayBuffer|Uint8Array|Buffer} the updated array.
 */
function stringToArrayLike(str, array) {
    for (var i = 0; i < str.length; ++i) {
        array[i] = str.charCodeAt(i) & 0xFF;
    }
    return array;
}

/**
 * An helper for the function arrayLikeToString.
 * This contains static informations and functions that
 * can be optimized by the browser JIT compiler.
 */
var arrayToStringHelper = {
    /**
     * Transform an array of int into a string, chunk by chunk.
     * See the performances notes on arrayLikeToString.
     * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to transform.
     * @param {String} type the type of the array.
     * @param {Integer} chunk the chunk size.
     * @return {String} the resulting string.
     * @throws Error if the chunk is too big for the stack.
     */
    stringifyByChunk: function(array, type, chunk) {
        var result = [], k = 0, len = array.length;
        // shortcut
        if (len <= chunk) {
            return String.fromCharCode.apply(null, array);
        }
        while (k < len) {
            if (type === "array" || type === "nodebuffer") {
                result.push(String.fromCharCode.apply(null, array.slice(k, Math.min(k + chunk, len))));
            }
            else {
                result.push(String.fromCharCode.apply(null, array.subarray(k, Math.min(k + chunk, len))));
            }
            k += chunk;
        }
        return result.join("");
    },
    /**
     * Call String.fromCharCode on every item in the array.
     * This is the naive implementation, which generate A LOT of intermediate string.
     * This should be used when everything else fail.
     * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to transform.
     * @return {String} the result.
     */
    stringifyByChar: function(array){
        var resultStr = "";
        for(var i = 0; i < array.length; i++) {
            resultStr += String.fromCharCode(array[i]);
        }
        return resultStr;
    },
    applyCanBeUsed : {
        /**
         * true if the browser accepts to use String.fromCharCode on Uint8Array
         */
        uint8array : (function () {
            try {
                return support.uint8array && String.fromCharCode.apply(null, new Uint8Array(1)).length === 1;
            } catch (e) {
                return false;
            }
        })(),
        /**
         * true if the browser accepts to use String.fromCharCode on nodejs Buffer.
         */
        nodebuffer : (function () {
            try {
                return support.nodebuffer && String.fromCharCode.apply(null, nodejsUtils.allocBuffer(1)).length === 1;
            } catch (e) {
                return false;
            }
        })()
    }
};

/**
 * Transform an array-like object to a string.
 * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to transform.
 * @return {String} the result.
 */
function arrayLikeToString(array) {
    // Performances notes :
    // --------------------
    // String.fromCharCode.apply(null, array) is the fastest, see
    // see http://jsperf.com/converting-a-uint8array-to-a-string/2
    // but the stack is limited (and we can get huge arrays !).
    //
    // result += String.fromCharCode(array[i]); generate too many strings !
    //
    // This code is inspired by http://jsperf.com/arraybuffer-to-string-apply-performance/2
    // TODO : we now have workers that split the work. Do we still need that ?
    var chunk = 65536,
        type = exports.getTypeOf(array),
        canUseApply = true;
    if (type === "uint8array") {
        canUseApply = arrayToStringHelper.applyCanBeUsed.uint8array;
    } else if (type === "nodebuffer") {
        canUseApply = arrayToStringHelper.applyCanBeUsed.nodebuffer;
    }

    if (canUseApply) {
        while (chunk > 1) {
            try {
                return arrayToStringHelper.stringifyByChunk(array, type, chunk);
            } catch (e) {
                chunk = Math.floor(chunk / 2);
            }
        }
    }

    // no apply or chunk error : slow and painful algorithm
    // default browser on android 4.*
    return arrayToStringHelper.stringifyByChar(array);
}

exports.applyFromCharCode = arrayLikeToString;


/**
 * Copy the data from an array-like to an other array-like.
 * @param {Array|ArrayBuffer|Uint8Array|Buffer} arrayFrom the origin array.
 * @param {Array|ArrayBuffer|Uint8Array|Buffer} arrayTo the destination array which will be mutated.
 * @return {Array|ArrayBuffer|Uint8Array|Buffer} the updated destination array.
 */
function arrayLikeToArrayLike(arrayFrom, arrayTo) {
    for (var i = 0; i < arrayFrom.length; i++) {
        arrayTo[i] = arrayFrom[i];
    }
    return arrayTo;
}

// a matrix containing functions to transform everything into everything.
var transform = {};

// string to ?
transform["string"] = {
    "string": identity,
    "array": function(input) {
        return stringToArrayLike(input, new Array(input.length));
    },
    "arraybuffer": function(input) {
        return transform["string"]["uint8array"](input).buffer;
    },
    "uint8array": function(input) {
        return stringToArrayLike(input, new Uint8Array(input.length));
    },
    "nodebuffer": function(input) {
        return stringToArrayLike(input, nodejsUtils.allocBuffer(input.length));
    }
};

// array to ?
transform["array"] = {
    "string": arrayLikeToString,
    "array": identity,
    "arraybuffer": function(input) {
        return (new Uint8Array(input)).buffer;
    },
    "uint8array": function(input) {
        return new Uint8Array(input);
    },
    "nodebuffer": function(input) {
        return nodejsUtils.newBufferFrom(input);
    }
};

// arraybuffer to ?
transform["arraybuffer"] = {
    "string": function(input) {
        return arrayLikeToString(new Uint8Array(input));
    },
    "array": function(input) {
        return arrayLikeToArrayLike(new Uint8Array(input), new Array(input.byteLength));
    },
    "arraybuffer": identity,
    "uint8array": function(input) {
        return new Uint8Array(input);
    },
    "nodebuffer": function(input) {
        return nodejsUtils.newBufferFrom(new Uint8Array(input));
    }
};

// uint8array to ?
transform["uint8array"] = {
    "string": arrayLikeToString,
    "array": function(input) {
        return arrayLikeToArrayLike(input, new Array(input.length));
    },
    "arraybuffer": function(input) {
        return input.buffer;
    },
    "uint8array": identity,
    "nodebuffer": function(input) {
        return nodejsUtils.newBufferFrom(input);
    }
};

// nodebuffer to ?
transform["nodebuffer"] = {
    "string": arrayLikeToString,
    "array": function(input) {
        return arrayLikeToArrayLike(input, new Array(input.length));
    },
    "arraybuffer": function(input) {
        return transform["nodebuffer"]["uint8array"](input).buffer;
    },
    "uint8array": function(input) {
        return arrayLikeToArrayLike(input, new Uint8Array(input.length));
    },
    "nodebuffer": identity
};

/**
 * Transform an input into any type.
 * The supported output type are : string, array, uint8array, arraybuffer, nodebuffer.
 * If no output type is specified, the unmodified input will be returned.
 * @param {String} outputType the output type.
 * @param {String|Array|ArrayBuffer|Uint8Array|Buffer} input the input to convert.
 * @throws {Error} an Error if the browser doesn't support the requested output type.
 */
exports.transformTo = function(outputType, input) {
    if (!input) {
        // undefined, null, etc
        // an empty string won't harm.
        input = "";
    }
    if (!outputType) {
        return input;
    }
    exports.checkSupport(outputType);
    var inputType = exports.getTypeOf(input);
    var result = transform[inputType][outputType](input);
    return result;
};

/**
 * Return the type of the input.
 * The type will be in a format valid for JSZip.utils.transformTo : string, array, uint8array, arraybuffer.
 * @param {Object} input the input to identify.
 * @return {String} the (lowercase) type of the input.
 */
exports.getTypeOf = function(input) {
    if (typeof input === "string") {
        return "string";
    }
    if (Object.prototype.toString.call(input) === "[object Array]") {
        return "array";
    }
    if (support.nodebuffer && nodejsUtils.isBuffer(input)) {
        return "nodebuffer";
    }
    if (support.uint8array && input instanceof Uint8Array) {
        return "uint8array";
    }
    if (support.arraybuffer && input instanceof ArrayBuffer) {
        return "arraybuffer";
    }
};

/**
 * Throw an exception if the type is not supported.
 * @param {String} type the type to check.
 * @throws {Error} an Error if the browser doesn't support the requested type.
 */
exports.checkSupport = function(type) {
    var supported = support[type.toLowerCase()];
    if (!supported) {
        throw new Error(type + " is not supported by this platform");
    }
};

exports.MAX_VALUE_16BITS = 65535;
exports.MAX_VALUE_32BITS = -1; // well, "\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF" is parsed as -1

/**
 * Prettify a string read as binary.
 * @param {string} str the string to prettify.
 * @return {string} a pretty string.
 */
exports.pretty = function(str) {
    var res = '',
        code, i;
    for (i = 0; i < (str || "").length; i++) {
        code = str.charCodeAt(i);
        res += '\\x' + (code < 16 ? "0" : "") + code.toString(16).toUpperCase();
    }
    return res;
};

/**
 * Defer the call of a function.
 * @param {Function} callback the function to call asynchronously.
 * @param {Array} args the arguments to give to the callback.
 */
exports.delay = function(callback, args, self) {
    setImmediate(function () {
        callback.apply(self || null, args || []);
    });
};

/**
 * Extends a prototype with an other, without calling a constructor with
 * side effects. Inspired by nodejs' `utils.inherits`
 * @param {Function} ctor the constructor to augment
 * @param {Function} superCtor the parent constructor to use
 */
exports.inherits = function (ctor, superCtor) {
    var Obj = function() {};
    Obj.prototype = superCtor.prototype;
    ctor.prototype = new Obj();
};

/**
 * Merge the objects passed as parameters into a new one.
 * @private
 * @param {...Object} var_args All objects to merge.
 * @return {Object} a new object with the data of the others.
 */
exports.extend = function() {
    var result = {}, i, attr;
    for (i = 0; i < arguments.length; i++) { // arguments is not enumerable in some browsers
        for (attr in arguments[i]) {
            if (arguments[i].hasOwnProperty(attr) && typeof result[attr] === "undefined") {
                result[attr] = arguments[i][attr];
            }
        }
    }
    return result;
};

/**
 * Transform arbitrary content into a Promise.
 * @param {String} name a name for the content being processed.
 * @param {Object} inputData the content to process.
 * @param {Boolean} isBinary true if the content is not an unicode string
 * @param {Boolean} isOptimizedBinaryString true if the string content only has one byte per character.
 * @param {Boolean} isBase64 true if the string content is encoded with base64.
 * @return {Promise} a promise in a format usable by JSZip.
 */
exports.prepareContent = function(name, inputData, isBinary, isOptimizedBinaryString, isBase64) {

    // if inputData is already a promise, this flatten it.
    var promise = external.Promise.resolve(inputData).then(function(data) {
        
        
        var isBlob = support.blob && (data instanceof Blob || ['[object File]', '[object Blob]'].indexOf(Object.prototype.toString.call(data)) !== -1);

        if (isBlob && typeof FileReader !== "undefined") {
            return new external.Promise(function (resolve, reject) {
                var reader = new FileReader();

                reader.onload = function(e) {
                    resolve(e.target.result);
                };
                reader.onerror = function(e) {
                    reject(e.target.error);
                };
                reader.readAsArrayBuffer(data);
            });
        } else {
            return data;
        }
    });

    return promise.then(function(data) {
        var dataType = exports.getTypeOf(data);

        if (!dataType) {
            return external.Promise.reject(
                new Error("Can't read the data of '" + name + "'. Is it " +
                          "in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?")
            );
        }
        // special case : it's way easier to work with Uint8Array than with ArrayBuffer
        if (dataType === "arraybuffer") {
            data = exports.transformTo("uint8array", data);
        } else if (dataType === "string") {
            if (isBase64) {
                data = base64.decode(data);
            }
            else if (isBinary) {
                // optimizedBinaryString === true means that the file has already been filtered with a 0xFF mask
                if (isOptimizedBinaryString !== true) {
                    // this is a string, not in a base64 format.
                    // Be sure that this is a correct "binary string"
                    data = string2binary(data);
                }
            }
        }
        return data;
    });
};

},{"./base64":41,"./external":46,"./nodejsUtils":52,"./support":70,"core-js/library/fn/set-immediate":76}],73:[function(require,module,exports){
'use strict';
var readerFor = require('./reader/readerFor');
var utils = require('./utils');
var sig = require('./signature');
var ZipEntry = require('./zipEntry');
var utf8 = require('./utf8');
var support = require('./support');
//  class ZipEntries {{{
/**
 * All the entries in the zip file.
 * @constructor
 * @param {Object} loadOptions Options for loading the stream.
 */
function ZipEntries(loadOptions) {
    this.files = [];
    this.loadOptions = loadOptions;
}
ZipEntries.prototype = {
    /**
     * Check that the reader is on the specified signature.
     * @param {string} expectedSignature the expected signature.
     * @throws {Error} if it is an other signature.
     */
    checkSignature: function(expectedSignature) {
        if (!this.reader.readAndCheckSignature(expectedSignature)) {
            this.reader.index -= 4;
            var signature = this.reader.readString(4);
            throw new Error("Corrupted zip or bug: unexpected signature " + "(" + utils.pretty(signature) + ", expected " + utils.pretty(expectedSignature) + ")");
        }
    },
    /**
     * Check if the given signature is at the given index.
     * @param {number} askedIndex the index to check.
     * @param {string} expectedSignature the signature to expect.
     * @return {boolean} true if the signature is here, false otherwise.
     */
    isSignature: function(askedIndex, expectedSignature) {
        var currentIndex = this.reader.index;
        this.reader.setIndex(askedIndex);
        var signature = this.reader.readString(4);
        var result = signature === expectedSignature;
        this.reader.setIndex(currentIndex);
        return result;
    },
    /**
     * Read the end of the central directory.
     */
    readBlockEndOfCentral: function() {
        this.diskNumber = this.reader.readInt(2);
        this.diskWithCentralDirStart = this.reader.readInt(2);
        this.centralDirRecordsOnThisDisk = this.reader.readInt(2);
        this.centralDirRecords = this.reader.readInt(2);
        this.centralDirSize = this.reader.readInt(4);
        this.centralDirOffset = this.reader.readInt(4);

        this.zipCommentLength = this.reader.readInt(2);
        // warning : the encoding depends of the system locale
        // On a linux machine with LANG=en_US.utf8, this field is utf8 encoded.
        // On a windows machine, this field is encoded with the localized windows code page.
        var zipComment = this.reader.readData(this.zipCommentLength);
        var decodeParamType = support.uint8array ? "uint8array" : "array";
        // To get consistent behavior with the generation part, we will assume that
        // this is utf8 encoded unless specified otherwise.
        var decodeContent = utils.transformTo(decodeParamType, zipComment);
        this.zipComment = this.loadOptions.decodeFileName(decodeContent);
    },
    /**
     * Read the end of the Zip 64 central directory.
     * Not merged with the method readEndOfCentral :
     * The end of central can coexist with its Zip64 brother,
     * I don't want to read the wrong number of bytes !
     */
    readBlockZip64EndOfCentral: function() {
        this.zip64EndOfCentralSize = this.reader.readInt(8);
        this.reader.skip(4);
        // this.versionMadeBy = this.reader.readString(2);
        // this.versionNeeded = this.reader.readInt(2);
        this.diskNumber = this.reader.readInt(4);
        this.diskWithCentralDirStart = this.reader.readInt(4);
        this.centralDirRecordsOnThisDisk = this.reader.readInt(8);
        this.centralDirRecords = this.reader.readInt(8);
        this.centralDirSize = this.reader.readInt(8);
        this.centralDirOffset = this.reader.readInt(8);

        this.zip64ExtensibleData = {};
        var extraDataSize = this.zip64EndOfCentralSize - 44,
            index = 0,
            extraFieldId,
            extraFieldLength,
            extraFieldValue;
        while (index < extraDataSize) {
            extraFieldId = this.reader.readInt(2);
            extraFieldLength = this.reader.readInt(4);
            extraFieldValue = this.reader.readData(extraFieldLength);
            this.zip64ExtensibleData[extraFieldId] = {
                id: extraFieldId,
                length: extraFieldLength,
                value: extraFieldValue
            };
        }
    },
    /**
     * Read the end of the Zip 64 central directory locator.
     */
    readBlockZip64EndOfCentralLocator: function() {
        this.diskWithZip64CentralDirStart = this.reader.readInt(4);
        this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8);
        this.disksCount = this.reader.readInt(4);
        if (this.disksCount > 1) {
            throw new Error("Multi-volumes zip are not supported");
        }
    },
    /**
     * Read the local files, based on the offset read in the central part.
     */
    readLocalFiles: function() {
        var i, file;
        for (i = 0; i < this.files.length; i++) {
            file = this.files[i];
            this.reader.setIndex(file.localHeaderOffset);
            this.checkSignature(sig.LOCAL_FILE_HEADER);
            file.readLocalPart(this.reader);
            file.handleUTF8();
            file.processAttributes();
        }
    },
    /**
     * Read the central directory.
     */
    readCentralDir: function() {
        var file;

        this.reader.setIndex(this.centralDirOffset);
        while (this.reader.readAndCheckSignature(sig.CENTRAL_FILE_HEADER)) {
            file = new ZipEntry({
                zip64: this.zip64
            }, this.loadOptions);
            file.readCentralPart(this.reader);
            this.files.push(file);
        }

        if (this.centralDirRecords !== this.files.length) {
            if (this.centralDirRecords !== 0 && this.files.length === 0) {
                // We expected some records but couldn't find ANY.
                // This is really suspicious, as if something went wrong.
                throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
            } else {
                // We found some records but not all.
                // Something is wrong but we got something for the user: no error here.
                // console.warn("expected", this.centralDirRecords, "records in central dir, got", this.files.length);
            }
        }
    },
    /**
     * Read the end of central directory.
     */
    readEndOfCentral: function() {
        var offset = this.reader.lastIndexOfSignature(sig.CENTRAL_DIRECTORY_END);
        if (offset < 0) {
            // Check if the content is a truncated zip or complete garbage.
            // A "LOCAL_FILE_HEADER" is not required at the beginning (auto
            // extractible zip for example) but it can give a good hint.
            // If an ajax request was used without responseType, we will also
            // get unreadable data.
            var isGarbage = !this.isSignature(0, sig.LOCAL_FILE_HEADER);

            if (isGarbage) {
                throw new Error("Can't find end of central directory : is this a zip file ? " +
                                "If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");
            } else {
                throw new Error("Corrupted zip: can't find end of central directory");
            }

        }
        this.reader.setIndex(offset);
        var endOfCentralDirOffset = offset;
        this.checkSignature(sig.CENTRAL_DIRECTORY_END);
        this.readBlockEndOfCentral();


        /* extract from the zip spec :
            4)  If one of the fields in the end of central directory
                record is too small to hold required data, the field
                should be set to -1 (0xFFFF or 0xFFFFFFFF) and the
                ZIP64 format record should be created.
            5)  The end of central directory record and the
                Zip64 end of central directory locator record must
                reside on the same disk when splitting or spanning
                an archive.
         */
        if (this.diskNumber === utils.MAX_VALUE_16BITS || this.diskWithCentralDirStart === utils.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === utils.MAX_VALUE_16BITS || this.centralDirRecords === utils.MAX_VALUE_16BITS || this.centralDirSize === utils.MAX_VALUE_32BITS || this.centralDirOffset === utils.MAX_VALUE_32BITS) {
            this.zip64 = true;

            /*
            Warning : the zip64 extension is supported, but ONLY if the 64bits integer read from
            the zip file can fit into a 32bits integer. This cannot be solved : JavaScript represents
            all numbers as 64-bit double precision IEEE 754 floating point numbers.
            So, we have 53bits for integers and bitwise operations treat everything as 32bits.
            see https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Operators/Bitwise_Operators
            and http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-262.pdf section 8.5
            */

            // should look for a zip64 EOCD locator
            offset = this.reader.lastIndexOfSignature(sig.ZIP64_CENTRAL_DIRECTORY_LOCATOR);
            if (offset < 0) {
                throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
            }
            this.reader.setIndex(offset);
            this.checkSignature(sig.ZIP64_CENTRAL_DIRECTORY_LOCATOR);
            this.readBlockZip64EndOfCentralLocator();

            // now the zip64 EOCD record
            if (!this.isSignature(this.relativeOffsetEndOfZip64CentralDir, sig.ZIP64_CENTRAL_DIRECTORY_END)) {
                // console.warn("ZIP64 end of central directory not where expected.");
                this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(sig.ZIP64_CENTRAL_DIRECTORY_END);
                if (this.relativeOffsetEndOfZip64CentralDir < 0) {
                    throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
                }
            }
            this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir);
            this.checkSignature(sig.ZIP64_CENTRAL_DIRECTORY_END);
            this.readBlockZip64EndOfCentral();
        }

        var expectedEndOfCentralDirOffset = this.centralDirOffset + this.centralDirSize;
        if (this.zip64) {
            expectedEndOfCentralDirOffset += 20; // end of central dir 64 locator
            expectedEndOfCentralDirOffset += 12 /* should not include the leading 12 bytes */ + this.zip64EndOfCentralSize;
        }

        var extraBytes = endOfCentralDirOffset - expectedEndOfCentralDirOffset;

        if (extraBytes > 0) {
            // console.warn(extraBytes, "extra bytes at beginning or within zipfile");
            if (this.isSignature(endOfCentralDirOffset, sig.CENTRAL_FILE_HEADER)) {
                // The offsets seem wrong, but we have something at the specified offset.
                // So… we keep it.
            } else {
                // the offset is wrong, update the "zero" of the reader
                // this happens if data has been prepended (crx files for example)
                this.reader.zero = extraBytes;
            }
        } else if (extraBytes < 0) {
            throw new Error("Corrupted zip: missing " + Math.abs(extraBytes) + " bytes.");
        }
    },
    prepareReader: function(data) {
        this.reader = readerFor(data);
    },
    /**
     * Read a zip file and create ZipEntries.
     * @param {String|ArrayBuffer|Uint8Array|Buffer} data the binary string representing a zip file.
     */
    load: function(data) {
        this.prepareReader(data);
        this.readEndOfCentral();
        this.readCentralDir();
        this.readLocalFiles();
    }
};
// }}} end of ZipEntries
module.exports = ZipEntries;

},{"./reader/readerFor":62,"./signature":63,"./support":70,"./utf8":71,"./utils":72,"./zipEntry":74}],74:[function(require,module,exports){
'use strict';
var readerFor = require('./reader/readerFor');
var utils = require('./utils');
var CompressedObject = require('./compressedObject');
var crc32fn = require('./crc32');
var utf8 = require('./utf8');
var compressions = require('./compressions');
var support = require('./support');

var MADE_BY_DOS = 0x00;
var MADE_BY_UNIX = 0x03;

/**
 * Find a compression registered in JSZip.
 * @param {string} compressionMethod the method magic to find.
 * @return {Object|null} the JSZip compression object, null if none found.
 */
var findCompression = function(compressionMethod) {
    for (var method in compressions) {
        if (!compressions.hasOwnProperty(method)) {
            continue;
        }
        if (compressions[method].magic === compressionMethod) {
            return compressions[method];
        }
    }
    return null;
};

// class ZipEntry {{{
/**
 * An entry in the zip file.
 * @constructor
 * @param {Object} options Options of the current file.
 * @param {Object} loadOptions Options for loading the stream.
 */
function ZipEntry(options, loadOptions) {
    this.options = options;
    this.loadOptions = loadOptions;
}
ZipEntry.prototype = {
    /**
     * say if the file is encrypted.
     * @return {boolean} true if the file is encrypted, false otherwise.
     */
    isEncrypted: function() {
        // bit 1 is set
        return (this.bitFlag & 0x0001) === 0x0001;
    },
    /**
     * say if the file has utf-8 filename/comment.
     * @return {boolean} true if the filename/comment is in utf-8, false otherwise.
     */
    useUTF8: function() {
        // bit 11 is set
        return (this.bitFlag & 0x0800) === 0x0800;
    },
    /**
     * Read the local part of a zip file and add the info in this object.
     * @param {DataReader} reader the reader to use.
     */
    readLocalPart: function(reader) {
        var compression, localExtraFieldsLength;

        // we already know everything from the central dir !
        // If the central dir data are false, we are doomed.
        // On the bright side, the local part is scary  : zip64, data descriptors, both, etc.
        // The less data we get here, the more reliable this should be.
        // Let's skip the whole header and dash to the data !
        reader.skip(22);
        // in some zip created on windows, the filename stored in the central dir contains \ instead of /.
        // Strangely, the filename here is OK.
        // I would love to treat these zip files as corrupted (see http://www.info-zip.org/FAQ.html#backslashes
        // or APPNOTE#4.4.17.1, "All slashes MUST be forward slashes '/'") but there are a lot of bad zip generators...
        // Search "unzip mismatching "local" filename continuing with "central" filename version" on
        // the internet.
        //
        // I think I see the logic here : the central directory is used to display
        // content and the local directory is used to extract the files. Mixing / and \
        // may be used to display \ to windows users and use / when extracting the files.
        // Unfortunately, this lead also to some issues : http://seclists.org/fulldisclosure/2009/Sep/394
        this.fileNameLength = reader.readInt(2);
        localExtraFieldsLength = reader.readInt(2); // can't be sure this will be the same as the central dir
        // the fileName is stored as binary data, the handleUTF8 method will take care of the encoding.
        this.fileName = reader.readData(this.fileNameLength);
        reader.skip(localExtraFieldsLength);

        if (this.compressedSize === -1 || this.uncompressedSize === -1) {
            throw new Error("Bug or corrupted zip : didn't get enough informations from the central directory " + "(compressedSize === -1 || uncompressedSize === -1)");
        }

        compression = findCompression(this.compressionMethod);
        if (compression === null) { // no compression found
            throw new Error("Corrupted zip : compression " + utils.pretty(this.compressionMethod) + " unknown (inner file : " + utils.transformTo("string", this.fileName) + ")");
        }
        this.decompressed = new CompressedObject(this.compressedSize, this.uncompressedSize, this.crc32, compression, reader.readData(this.compressedSize));
    },

    /**
     * Read the central part of a zip file and add the info in this object.
     * @param {DataReader} reader the reader to use.
     */
    readCentralPart: function(reader) {
        this.versionMadeBy = reader.readInt(2);
        reader.skip(2);
        // this.versionNeeded = reader.readInt(2);
        this.bitFlag = reader.readInt(2);
        this.compressionMethod = reader.readString(2);
        this.date = reader.readDate();
        this.crc32 = reader.readInt(4);
        this.compressedSize = reader.readInt(4);
        this.uncompressedSize = reader.readInt(4);
        var fileNameLength = reader.readInt(2);
        this.extraFieldsLength = reader.readInt(2);
        this.fileCommentLength = reader.readInt(2);
        this.diskNumberStart = reader.readInt(2);
        this.internalFileAttributes = reader.readInt(2);
        this.externalFileAttributes = reader.readInt(4);
        this.localHeaderOffset = reader.readInt(4);

        if (this.isEncrypted()) {
            throw new Error("Encrypted zip are not supported");
        }

        // will be read in the local part, see the comments there
        reader.skip(fileNameLength);
        this.readExtraFields(reader);
        this.parseZIP64ExtraField(reader);
        this.fileComment = reader.readData(this.fileCommentLength);
    },

    /**
     * Parse the external file attributes and get the unix/dos permissions.
     */
    processAttributes: function () {
        this.unixPermissions = null;
        this.dosPermissions = null;
        var madeBy = this.versionMadeBy >> 8;

        // Check if we have the DOS directory flag set.
        // We look for it in the DOS and UNIX permissions
        // but some unknown platform could set it as a compatibility flag.
        this.dir = this.externalFileAttributes & 0x0010 ? true : false;

        if(madeBy === MADE_BY_DOS) {
            // first 6 bits (0 to 5)
            this.dosPermissions = this.externalFileAttributes & 0x3F;
        }

        if(madeBy === MADE_BY_UNIX) {
            this.unixPermissions = (this.externalFileAttributes >> 16) & 0xFFFF;
            // the octal permissions are in (this.unixPermissions & 0x01FF).toString(8);
        }

        // fail safe : if the name ends with a / it probably means a folder
        if (!this.dir && this.fileNameStr.slice(-1) === '/') {
            this.dir = true;
        }
    },

    /**
     * Parse the ZIP64 extra field and merge the info in the current ZipEntry.
     * @param {DataReader} reader the reader to use.
     */
    parseZIP64ExtraField: function(reader) {

        if (!this.extraFields[0x0001]) {
            return;
        }

        // should be something, preparing the extra reader
        var extraReader = readerFor(this.extraFields[0x0001].value);

        // I really hope that these 64bits integer can fit in 32 bits integer, because js
        // won't let us have more.
        if (this.uncompressedSize === utils.MAX_VALUE_32BITS) {
            this.uncompressedSize = extraReader.readInt(8);
        }
        if (this.compressedSize === utils.MAX_VALUE_32BITS) {
            this.compressedSize = extraReader.readInt(8);
        }
        if (this.localHeaderOffset === utils.MAX_VALUE_32BITS) {
            this.localHeaderOffset = extraReader.readInt(8);
        }
        if (this.diskNumberStart === utils.MAX_VALUE_32BITS) {
            this.diskNumberStart = extraReader.readInt(4);
        }
    },
    /**
     * Read the central part of a zip file and add the info in this object.
     * @param {DataReader} reader the reader to use.
     */
    readExtraFields: function(reader) {
        var end = reader.index + this.extraFieldsLength,
            extraFieldId,
            extraFieldLength,
            extraFieldValue;

        if (!this.extraFields) {
            this.extraFields = {};
        }

        while (reader.index < end) {
            extraFieldId = reader.readInt(2);
            extraFieldLength = reader.readInt(2);
            extraFieldValue = reader.readData(extraFieldLength);

            this.extraFields[extraFieldId] = {
                id: extraFieldId,
                length: extraFieldLength,
                value: extraFieldValue
            };
        }
    },
    /**
     * Apply an UTF8 transformation if needed.
     */
    handleUTF8: function() {
        var decodeParamType = support.uint8array ? "uint8array" : "array";
        if (this.useUTF8()) {
            this.fileNameStr = utf8.utf8decode(this.fileName);
            this.fileCommentStr = utf8.utf8decode(this.fileComment);
        } else {
            var upath = this.findExtraFieldUnicodePath();
            if (upath !== null) {
                this.fileNameStr = upath;
            } else {
                // ASCII text or unsupported code page
                var fileNameByteArray =  utils.transformTo(decodeParamType, this.fileName);
                this.fileNameStr = this.loadOptions.decodeFileName(fileNameByteArray);
            }

            var ucomment = this.findExtraFieldUnicodeComment();
            if (ucomment !== null) {
                this.fileCommentStr = ucomment;
            } else {
                // ASCII text or unsupported code page
                var commentByteArray =  utils.transformTo(decodeParamType, this.fileComment);
                this.fileCommentStr = this.loadOptions.decodeFileName(commentByteArray);
            }
        }
    },

    /**
     * Find the unicode path declared in the extra field, if any.
     * @return {String} the unicode path, null otherwise.
     */
    findExtraFieldUnicodePath: function() {
        var upathField = this.extraFields[0x7075];
        if (upathField) {
            var extraReader = readerFor(upathField.value);

            // wrong version
            if (extraReader.readInt(1) !== 1) {
                return null;
            }

            // the crc of the filename changed, this field is out of date.
            if (crc32fn(this.fileName) !== extraReader.readInt(4)) {
                return null;
            }

            return utf8.utf8decode(extraReader.readData(upathField.length - 5));
        }
        return null;
    },

    /**
     * Find the unicode comment declared in the extra field, if any.
     * @return {String} the unicode comment, null otherwise.
     */
    findExtraFieldUnicodeComment: function() {
        var ucommentField = this.extraFields[0x6375];
        if (ucommentField) {
            var extraReader = readerFor(ucommentField.value);

            // wrong version
            if (extraReader.readInt(1) !== 1) {
                return null;
            }

            // the crc of the comment changed, this field is out of date.
            if (crc32fn(this.fileComment) !== extraReader.readInt(4)) {
                return null;
            }

            return utf8.utf8decode(extraReader.readData(ucommentField.length - 5));
        }
        return null;
    }
};
module.exports = ZipEntry;

},{"./compressedObject":42,"./compressions":43,"./crc32":44,"./reader/readerFor":62,"./support":70,"./utf8":71,"./utils":72}],75:[function(require,module,exports){
'use strict';

var StreamHelper = require('./stream/StreamHelper');
var DataWorker = require('./stream/DataWorker');
var utf8 = require('./utf8');
var CompressedObject = require('./compressedObject');
var GenericWorker = require('./stream/GenericWorker');

/**
 * A simple object representing a file in the zip file.
 * @constructor
 * @param {string} name the name of the file
 * @param {String|ArrayBuffer|Uint8Array|Buffer} data the data
 * @param {Object} options the options of the file
 */
var ZipObject = function(name, data, options) {
    this.name = name;
    this.dir = options.dir;
    this.date = options.date;
    this.comment = options.comment;
    this.unixPermissions = options.unixPermissions;
    this.dosPermissions = options.dosPermissions;

    this._data = data;
    this._dataBinary = options.binary;
    // keep only the compression
    this.options = {
        compression : options.compression,
        compressionOptions : options.compressionOptions
    };
};

ZipObject.prototype = {
    /**
     * Create an internal stream for the content of this object.
     * @param {String} type the type of each chunk.
     * @return StreamHelper the stream.
     */
    internalStream: function (type) {
        var result = null, outputType = "string";
        try {
            if (!type) {
                throw new Error("No output type specified.");
            }
            outputType = type.toLowerCase();
            var askUnicodeString = outputType === "string" || outputType === "text";
            if (outputType === "binarystring" || outputType === "text") {
                outputType = "string";
            }
            result = this._decompressWorker();

            var isUnicodeString = !this._dataBinary;

            if (isUnicodeString && !askUnicodeString) {
                result = result.pipe(new utf8.Utf8EncodeWorker());
            }
            if (!isUnicodeString && askUnicodeString) {
                result = result.pipe(new utf8.Utf8DecodeWorker());
            }
        } catch (e) {
            result = new GenericWorker("error");
            result.error(e);
        }

        return new StreamHelper(result, outputType, "");
    },

    /**
     * Prepare the content in the asked type.
     * @param {String} type the type of the result.
     * @param {Function} onUpdate a function to call on each internal update.
     * @return Promise the promise of the result.
     */
    async: function (type, onUpdate) {
        return this.internalStream(type).accumulate(onUpdate);
    },

    /**
     * Prepare the content as a nodejs stream.
     * @param {String} type the type of each chunk.
     * @param {Function} onUpdate a function to call on each internal update.
     * @return Stream the stream.
     */
    nodeStream: function (type, onUpdate) {
        return this.internalStream(type || "nodebuffer").toNodejsStream(onUpdate);
    },

    /**
     * Return a worker for the compressed content.
     * @private
     * @param {Object} compression the compression object to use.
     * @param {Object} compressionOptions the options to use when compressing.
     * @return Worker the worker.
     */
    _compressWorker: function (compression, compressionOptions) {
        if (
            this._data instanceof CompressedObject &&
            this._data.compression.magic === compression.magic
        ) {
            return this._data.getCompressedWorker();
        } else {
            var result = this._decompressWorker();
            if(!this._dataBinary) {
                result = result.pipe(new utf8.Utf8EncodeWorker());
            }
            return CompressedObject.createWorkerFrom(result, compression, compressionOptions);
        }
    },
    /**
     * Return a worker for the decompressed content.
     * @private
     * @return Worker the worker.
     */
    _decompressWorker : function () {
        if (this._data instanceof CompressedObject) {
            return this._data.getContentWorker();
        } else if (this._data instanceof GenericWorker) {
            return this._data;
        } else {
            return new DataWorker(this._data);
        }
    }
};

var removedMethods = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"];
var removedFn = function () {
    throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
};

for(var i = 0; i < removedMethods.length; i++) {
    ZipObject.prototype[removedMethods[i]] = removedFn;
}
module.exports = ZipObject;

},{"./compressedObject":42,"./stream/DataWorker":67,"./stream/GenericWorker":68,"./stream/StreamHelper":69,"./utf8":71}],76:[function(require,module,exports){
require('../modules/web.immediate');
module.exports = require('../modules/_core').setImmediate;
},{"../modules/_core":80,"../modules/web.immediate":96}],77:[function(require,module,exports){
module.exports = function(it){
  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
  return it;
};
},{}],78:[function(require,module,exports){
var isObject = require('./_is-object');
module.exports = function(it){
  if(!isObject(it))throw TypeError(it + ' is not an object!');
  return it;
};
},{"./_is-object":91}],79:[function(require,module,exports){
var toString = {}.toString;

module.exports = function(it){
  return toString.call(it).slice(8, -1);
};
},{}],80:[function(require,module,exports){
var core = module.exports = {version: '2.3.0'};
if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef
},{}],81:[function(require,module,exports){
// optional / simple context binding
var aFunction = require('./_a-function');
module.exports = function(fn, that, length){
  aFunction(fn);
  if(that === undefined)return fn;
  switch(length){
    case 1: return function(a){
      return fn.call(that, a);
    };
    case 2: return function(a, b){
      return fn.call(that, a, b);
    };
    case 3: return function(a, b, c){
      return fn.call(that, a, b, c);
    };
  }
  return function(/* ...args */){
    return fn.apply(that, arguments);
  };
};
},{"./_a-function":77}],82:[function(require,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !require('./_fails')(function(){
  return Object.defineProperty({}, 'a', {get: function(){ return 7; }}).a != 7;
});
},{"./_fails":85}],83:[function(require,module,exports){
var isObject = require('./_is-object')
  , document = require('./_global').document
  // in old IE typeof document.createElement is 'object'
  , is = isObject(document) && isObject(document.createElement);
module.exports = function(it){
  return is ? document.createElement(it) : {};
};
},{"./_global":86,"./_is-object":91}],84:[function(require,module,exports){
var global    = require('./_global')
  , core      = require('./_core')
  , ctx       = require('./_ctx')
  , hide      = require('./_hide')
  , PROTOTYPE = 'prototype';

var $export = function(type, name, source){
  var IS_FORCED = type & $export.F
    , IS_GLOBAL = type & $export.G
    , IS_STATIC = type & $export.S
    , IS_PROTO  = type & $export.P
    , IS_BIND   = type & $export.B
    , IS_WRAP   = type & $export.W
    , exports   = IS_GLOBAL ? core : core[name] || (core[name] = {})
    , expProto  = exports[PROTOTYPE]
    , target    = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE]
    , key, own, out;
  if(IS_GLOBAL)source = name;
  for(key in source){
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined;
    if(own && key in exports)continue;
    // export native or passed
    out = own ? target[key] : source[key];
    // prevent global pollution for namespaces
    exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key]
    // bind timers to global for call from export context
    : IS_BIND && own ? ctx(out, global)
    // wrap global constructors for prevent change them in library
    : IS_WRAP && target[key] == out ? (function(C){
      var F = function(a, b, c){
        if(this instanceof C){
          switch(arguments.length){
            case 0: return new C;
            case 1: return new C(a);
            case 2: return new C(a, b);
          } return new C(a, b, c);
        } return C.apply(this, arguments);
      };
      F[PROTOTYPE] = C[PROTOTYPE];
      return F;
    // make static versions for prototype methods
    })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    // export proto methods to core.%CONSTRUCTOR%.methods.%NAME%
    if(IS_PROTO){
      (exports.virtual || (exports.virtual = {}))[key] = out;
      // export proto methods to core.%CONSTRUCTOR%.prototype.%NAME%
      if(type & $export.R && expProto && !expProto[key])hide(expProto, key, out);
    }
  }
};
// type bitmap
$export.F = 1;   // forced
$export.G = 2;   // global
$export.S = 4;   // static
$export.P = 8;   // proto
$export.B = 16;  // bind
$export.W = 32;  // wrap
$export.U = 64;  // safe
$export.R = 128; // real proto method for `library` 
module.exports = $export;
},{"./_core":80,"./_ctx":81,"./_global":86,"./_hide":87}],85:[function(require,module,exports){
module.exports = function(exec){
  try {
    return !!exec();
  } catch(e){
    return true;
  }
};
},{}],86:[function(require,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef
},{}],87:[function(require,module,exports){
var dP         = require('./_object-dp')
  , createDesc = require('./_property-desc');
module.exports = require('./_descriptors') ? function(object, key, value){
  return dP.f(object, key, createDesc(1, value));
} : function(object, key, value){
  object[key] = value;
  return object;
};
},{"./_descriptors":82,"./_object-dp":92,"./_property-desc":93}],88:[function(require,module,exports){
module.exports = require('./_global').document && document.documentElement;
},{"./_global":86}],89:[function(require,module,exports){
module.exports = !require('./_descriptors') && !require('./_fails')(function(){
  return Object.defineProperty(require('./_dom-create')('div'), 'a', {get: function(){ return 7; }}).a != 7;
});
},{"./_descriptors":82,"./_dom-create":83,"./_fails":85}],90:[function(require,module,exports){
// fast apply, http://jsperf.lnkit.com/fast-apply/5
module.exports = function(fn, args, that){
  var un = that === undefined;
  switch(args.length){
    case 0: return un ? fn()
                      : fn.call(that);
    case 1: return un ? fn(args[0])
                      : fn.call(that, args[0]);
    case 2: return un ? fn(args[0], args[1])
                      : fn.call(that, args[0], args[1]);
    case 3: return un ? fn(args[0], args[1], args[2])
                      : fn.call(that, args[0], args[1], args[2]);
    case 4: return un ? fn(args[0], args[1], args[2], args[3])
                      : fn.call(that, args[0], args[1], args[2], args[3]);
  } return              fn.apply(that, args);
};
},{}],91:[function(require,module,exports){
module.exports = function(it){
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};
},{}],92:[function(require,module,exports){
var anObject       = require('./_an-object')
  , IE8_DOM_DEFINE = require('./_ie8-dom-define')
  , toPrimitive    = require('./_to-primitive')
  , dP             = Object.defineProperty;

exports.f = require('./_descriptors') ? Object.defineProperty : function defineProperty(O, P, Attributes){
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if(IE8_DOM_DEFINE)try {
    return dP(O, P, Attributes);
  } catch(e){ /* empty */ }
  if('get' in Attributes || 'set' in Attributes)throw TypeError('Accessors not supported!');
  if('value' in Attributes)O[P] = Attributes.value;
  return O;
};
},{"./_an-object":78,"./_descriptors":82,"./_ie8-dom-define":89,"./_to-primitive":95}],93:[function(require,module,exports){
module.exports = function(bitmap, value){
  return {
    enumerable  : !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable    : !(bitmap & 4),
    value       : value
  };
};
},{}],94:[function(require,module,exports){
var ctx                = require('./_ctx')
  , invoke             = require('./_invoke')
  , html               = require('./_html')
  , cel                = require('./_dom-create')
  , global             = require('./_global')
  , process            = global.process
  , setTask            = global.setImmediate
  , clearTask          = global.clearImmediate
  , MessageChannel     = global.MessageChannel
  , counter            = 0
  , queue              = {}
  , ONREADYSTATECHANGE = 'onreadystatechange'
  , defer, channel, port;
var run = function(){
  var id = +this;
  if(queue.hasOwnProperty(id)){
    var fn = queue[id];
    delete queue[id];
    fn();
  }
};
var listener = function(event){
  run.call(event.data);
};
// Node.js 0.9+ & IE10+ has setImmediate, otherwise:
if(!setTask || !clearTask){
  setTask = function setImmediate(fn){
    var args = [], i = 1;
    while(arguments.length > i)args.push(arguments[i++]);
    queue[++counter] = function(){
      invoke(typeof fn == 'function' ? fn : Function(fn), args);
    };
    defer(counter);
    return counter;
  };
  clearTask = function clearImmediate(id){
    delete queue[id];
  };
  // Node.js 0.8-
  if(require('./_cof')(process) == 'process'){
    defer = function(id){
      process.nextTick(ctx(run, id, 1));
    };
  // Browsers with MessageChannel, includes WebWorkers
  } else if(MessageChannel){
    channel = new MessageChannel;
    port    = channel.port2;
    channel.port1.onmessage = listener;
    defer = ctx(port.postMessage, port, 1);
  // Browsers with postMessage, skip WebWorkers
  // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
  } else if(global.addEventListener && typeof postMessage == 'function' && !global.importScripts){
    defer = function(id){
      global.postMessage(id + '', '*');
    };
    global.addEventListener('message', listener, false);
  // IE8-
  } else if(ONREADYSTATECHANGE in cel('script')){
    defer = function(id){
      html.appendChild(cel('script'))[ONREADYSTATECHANGE] = function(){
        html.removeChild(this);
        run.call(id);
      };
    };
  // Rest old browsers
  } else {
    defer = function(id){
      setTimeout(ctx(run, id, 1), 0);
    };
  }
}
module.exports = {
  set:   setTask,
  clear: clearTask
};
},{"./_cof":79,"./_ctx":81,"./_dom-create":83,"./_global":86,"./_html":88,"./_invoke":90}],95:[function(require,module,exports){
// 7.1.1 ToPrimitive(input [, PreferredType])
var isObject = require('./_is-object');
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
module.exports = function(it, S){
  if(!isObject(it))return it;
  var fn, val;
  if(S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  if(typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it)))return val;
  if(!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  throw TypeError("Can't convert object to primitive value");
};
},{"./_is-object":91}],96:[function(require,module,exports){
var $export = require('./_export')
  , $task   = require('./_task');
$export($export.G + $export.B, {
  setImmediate:   $task.set,
  clearImmediate: $task.clear
});
},{"./_export":84,"./_task":94}],97:[function(require,module,exports){
'use strict';
var immediate = require('immediate');

/* istanbul ignore next */
function INTERNAL() {}

var handlers = {};

var REJECTED = ['REJECTED'];
var FULFILLED = ['FULFILLED'];
var PENDING = ['PENDING'];

module.exports = Promise;

function Promise(resolver) {
  if (typeof resolver !== 'function') {
    throw new TypeError('resolver must be a function');
  }
  this.state = PENDING;
  this.queue = [];
  this.outcome = void 0;
  if (resolver !== INTERNAL) {
    safelyResolveThenable(this, resolver);
  }
}

Promise.prototype["catch"] = function (onRejected) {
  return this.then(null, onRejected);
};
Promise.prototype.then = function (onFulfilled, onRejected) {
  if (typeof onFulfilled !== 'function' && this.state === FULFILLED ||
    typeof onRejected !== 'function' && this.state === REJECTED) {
    return this;
  }
  var promise = new this.constructor(INTERNAL);
  if (this.state !== PENDING) {
    var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
    unwrap(promise, resolver, this.outcome);
  } else {
    this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
  }

  return promise;
};
function QueueItem(promise, onFulfilled, onRejected) {
  this.promise = promise;
  if (typeof onFulfilled === 'function') {
    this.onFulfilled = onFulfilled;
    this.callFulfilled = this.otherCallFulfilled;
  }
  if (typeof onRejected === 'function') {
    this.onRejected = onRejected;
    this.callRejected = this.otherCallRejected;
  }
}
QueueItem.prototype.callFulfilled = function (value) {
  handlers.resolve(this.promise, value);
};
QueueItem.prototype.otherCallFulfilled = function (value) {
  unwrap(this.promise, this.onFulfilled, value);
};
QueueItem.prototype.callRejected = function (value) {
  handlers.reject(this.promise, value);
};
QueueItem.prototype.otherCallRejected = function (value) {
  unwrap(this.promise, this.onRejected, value);
};

function unwrap(promise, func, value) {
  immediate(function () {
    var returnValue;
    try {
      returnValue = func(value);
    } catch (e) {
      return handlers.reject(promise, e);
    }
    if (returnValue === promise) {
      handlers.reject(promise, new TypeError('Cannot resolve promise with itself'));
    } else {
      handlers.resolve(promise, returnValue);
    }
  });
}

handlers.resolve = function (self, value) {
  var result = tryCatch(getThen, value);
  if (result.status === 'error') {
    return handlers.reject(self, result.value);
  }
  var thenable = result.value;

  if (thenable) {
    safelyResolveThenable(self, thenable);
  } else {
    self.state = FULFILLED;
    self.outcome = value;
    var i = -1;
    var len = self.queue.length;
    while (++i < len) {
      self.queue[i].callFulfilled(value);
    }
  }
  return self;
};
handlers.reject = function (self, error) {
  self.state = REJECTED;
  self.outcome = error;
  var i = -1;
  var len = self.queue.length;
  while (++i < len) {
    self.queue[i].callRejected(error);
  }
  return self;
};

function getThen(obj) {
  // Make sure we only access the accessor once as required by the spec
  var then = obj && obj.then;
  if (obj && (typeof obj === 'object' || typeof obj === 'function') && typeof then === 'function') {
    return function appyThen() {
      then.apply(obj, arguments);
    };
  }
}

function safelyResolveThenable(self, thenable) {
  // Either fulfill, reject or reject with error
  var called = false;
  function onError(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.reject(self, value);
  }

  function onSuccess(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.resolve(self, value);
  }

  function tryToUnwrap() {
    thenable(onSuccess, onError);
  }

  var result = tryCatch(tryToUnwrap);
  if (result.status === 'error') {
    onError(result.value);
  }
}

function tryCatch(func, value) {
  var out = {};
  try {
    out.value = func(value);
    out.status = 'success';
  } catch (e) {
    out.status = 'error';
    out.value = e;
  }
  return out;
}

Promise.resolve = resolve;
function resolve(value) {
  if (value instanceof this) {
    return value;
  }
  return handlers.resolve(new this(INTERNAL), value);
}

Promise.reject = reject;
function reject(reason) {
  var promise = new this(INTERNAL);
  return handlers.reject(promise, reason);
}

Promise.all = all;
function all(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var values = new Array(len);
  var resolved = 0;
  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    allResolver(iterable[i], i);
  }
  return promise;
  function allResolver(value, i) {
    self.resolve(value).then(resolveFromAll, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
    function resolveFromAll(outValue) {
      values[i] = outValue;
      if (++resolved === len && !called) {
        called = true;
        handlers.resolve(promise, values);
      }
    }
  }
}

Promise.race = race;
function race(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    resolver(iterable[i]);
  }
  return promise;
  function resolver(value) {
    self.resolve(value).then(function (response) {
      if (!called) {
        called = true;
        handlers.resolve(promise, response);
      }
    }, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
  }
}

},{"immediate":40}],98:[function(require,module,exports){
// Top level file is just a mixin of submodules & constants
'use strict';

var assign    = require('./lib/utils/common').assign;

var deflate   = require('./lib/deflate');
var inflate   = require('./lib/inflate');
var constants = require('./lib/zlib/constants');

var pako = {};

assign(pako, deflate, inflate, constants);

module.exports = pako;

},{"./lib/deflate":99,"./lib/inflate":100,"./lib/utils/common":101,"./lib/zlib/constants":104}],99:[function(require,module,exports){
'use strict';


var zlib_deflate = require('./zlib/deflate');
var utils        = require('./utils/common');
var strings      = require('./utils/strings');
var msg          = require('./zlib/messages');
var ZStream      = require('./zlib/zstream');

var toString = Object.prototype.toString;

/* Public constants ==========================================================*/
/* ===========================================================================*/

var Z_NO_FLUSH      = 0;
var Z_FINISH        = 4;

var Z_OK            = 0;
var Z_STREAM_END    = 1;
var Z_SYNC_FLUSH    = 2;

var Z_DEFAULT_COMPRESSION = -1;

var Z_DEFAULT_STRATEGY    = 0;

var Z_DEFLATED  = 8;

/* ===========================================================================*/


/**
 * class Deflate
 *
 * Generic JS-style wrapper for zlib calls. If you don't need
 * streaming behaviour - use more simple functions: [[deflate]],
 * [[deflateRaw]] and [[gzip]].
 **/

/* internal
 * Deflate.chunks -> Array
 *
 * Chunks of output data, if [[Deflate#onData]] not overridden.
 **/

/**
 * Deflate.result -> Uint8Array|Array
 *
 * Compressed result, generated by default [[Deflate#onData]]
 * and [[Deflate#onEnd]] handlers. Filled after you push last chunk
 * (call [[Deflate#push]] with `Z_FINISH` / `true` param)  or if you
 * push a chunk with explicit flush (call [[Deflate#push]] with
 * `Z_SYNC_FLUSH` param).
 **/

/**
 * Deflate.err -> Number
 *
 * Error code after deflate finished. 0 (Z_OK) on success.
 * You will not need it in real life, because deflate errors
 * are possible only on wrong options or bad `onData` / `onEnd`
 * custom handlers.
 **/

/**
 * Deflate.msg -> String
 *
 * Error message, if [[Deflate.err]] != 0
 **/


/**
 * new Deflate(options)
 * - options (Object): zlib deflate options.
 *
 * Creates new deflator instance with specified params. Throws exception
 * on bad params. Supported options:
 *
 * - `level`
 * - `windowBits`
 * - `memLevel`
 * - `strategy`
 * - `dictionary`
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Additional options, for internal needs:
 *
 * - `chunkSize` - size of generated data chunks (16K by default)
 * - `raw` (Boolean) - do raw deflate
 * - `gzip` (Boolean) - create gzip wrapper
 * - `to` (String) - if equal to 'string', then result will be "binary string"
 *    (each char code [0..255])
 * - `header` (Object) - custom header for gzip
 *   - `text` (Boolean) - true if compressed data believed to be text
 *   - `time` (Number) - modification time, unix timestamp
 *   - `os` (Number) - operation system code
 *   - `extra` (Array) - array of bytes with extra data (max 65536)
 *   - `name` (String) - file name (binary string)
 *   - `comment` (String) - comment (binary string)
 *   - `hcrc` (Boolean) - true if header crc should be added
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , chunk1 = Uint8Array([1,2,3,4,5,6,7,8,9])
 *   , chunk2 = Uint8Array([10,11,12,13,14,15,16,17,18,19]);
 *
 * var deflate = new pako.Deflate({ level: 3});
 *
 * deflate.push(chunk1, false);
 * deflate.push(chunk2, true);  // true -> last chunk
 *
 * if (deflate.err) { throw new Error(deflate.err); }
 *
 * console.log(deflate.result);
 * ```
 **/
function Deflate(options) {
  if (!(this instanceof Deflate)) return new Deflate(options);

  this.options = utils.assign({
    level: Z_DEFAULT_COMPRESSION,
    method: Z_DEFLATED,
    chunkSize: 16384,
    windowBits: 15,
    memLevel: 8,
    strategy: Z_DEFAULT_STRATEGY,
    to: ''
  }, options || {});

  var opt = this.options;

  if (opt.raw && (opt.windowBits > 0)) {
    opt.windowBits = -opt.windowBits;
  }

  else if (opt.gzip && (opt.windowBits > 0) && (opt.windowBits < 16)) {
    opt.windowBits += 16;
  }

  this.err    = 0;      // error code, if happens (0 = Z_OK)
  this.msg    = '';     // error message
  this.ended  = false;  // used to avoid multiple onEnd() calls
  this.chunks = [];     // chunks of compressed data

  this.strm = new ZStream();
  this.strm.avail_out = 0;

  var status = zlib_deflate.deflateInit2(
    this.strm,
    opt.level,
    opt.method,
    opt.windowBits,
    opt.memLevel,
    opt.strategy
  );

  if (status !== Z_OK) {
    throw new Error(msg[status]);
  }

  if (opt.header) {
    zlib_deflate.deflateSetHeader(this.strm, opt.header);
  }

  if (opt.dictionary) {
    var dict;
    // Convert data if needed
    if (typeof opt.dictionary === 'string') {
      // If we need to compress text, change encoding to utf8.
      dict = strings.string2buf(opt.dictionary);
    } else if (toString.call(opt.dictionary) === '[object ArrayBuffer]') {
      dict = new Uint8Array(opt.dictionary);
    } else {
      dict = opt.dictionary;
    }

    status = zlib_deflate.deflateSetDictionary(this.strm, dict);

    if (status !== Z_OK) {
      throw new Error(msg[status]);
    }

    this._dict_set = true;
  }
}

/**
 * Deflate#push(data[, mode]) -> Boolean
 * - data (Uint8Array|Array|ArrayBuffer|String): input data. Strings will be
 *   converted to utf8 byte sequence.
 * - mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE modes.
 *   See constants. Skipped or `false` means Z_NO_FLUSH, `true` means Z_FINISH.
 *
 * Sends input data to deflate pipe, generating [[Deflate#onData]] calls with
 * new compressed chunks. Returns `true` on success. The last data block must have
 * mode Z_FINISH (or `true`). That will flush internal pending buffers and call
 * [[Deflate#onEnd]]. For interim explicit flushes (without ending the stream) you
 * can use mode Z_SYNC_FLUSH, keeping the compression context.
 *
 * On fail call [[Deflate#onEnd]] with error code and return false.
 *
 * We strongly recommend to use `Uint8Array` on input for best speed (output
 * array format is detected automatically). Also, don't skip last param and always
 * use the same type in your code (boolean or number). That will improve JS speed.
 *
 * For regular `Array`-s make sure all elements are [0..255].
 *
 * ##### Example
 *
 * ```javascript
 * push(chunk, false); // push one of data chunks
 * ...
 * push(chunk, true);  // push last chunk
 * ```
 **/
Deflate.prototype.push = function (data, mode) {
  var strm = this.strm;
  var chunkSize = this.options.chunkSize;
  var status, _mode;

  if (this.ended) { return false; }

  _mode = (mode === ~~mode) ? mode : ((mode === true) ? Z_FINISH : Z_NO_FLUSH);

  // Convert data if needed
  if (typeof data === 'string') {
    // If we need to compress text, change encoding to utf8.
    strm.input = strings.string2buf(data);
  } else if (toString.call(data) === '[object ArrayBuffer]') {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }

  strm.next_in = 0;
  strm.avail_in = strm.input.length;

  do {
    if (strm.avail_out === 0) {
      strm.output = new utils.Buf8(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    status = zlib_deflate.deflate(strm, _mode);    /* no bad return value */

    if (status !== Z_STREAM_END && status !== Z_OK) {
      this.onEnd(status);
      this.ended = true;
      return false;
    }
    if (strm.avail_out === 0 || (strm.avail_in === 0 && (_mode === Z_FINISH || _mode === Z_SYNC_FLUSH))) {
      if (this.options.to === 'string') {
        this.onData(strings.buf2binstring(utils.shrinkBuf(strm.output, strm.next_out)));
      } else {
        this.onData(utils.shrinkBuf(strm.output, strm.next_out));
      }
    }
  } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== Z_STREAM_END);

  // Finalize on the last chunk.
  if (_mode === Z_FINISH) {
    status = zlib_deflate.deflateEnd(this.strm);
    this.onEnd(status);
    this.ended = true;
    return status === Z_OK;
  }

  // callback interim results if Z_SYNC_FLUSH.
  if (_mode === Z_SYNC_FLUSH) {
    this.onEnd(Z_OK);
    strm.avail_out = 0;
    return true;
  }

  return true;
};


/**
 * Deflate#onData(chunk) -> Void
 * - chunk (Uint8Array|Array|String): output data. Type of array depends
 *   on js engine support. When string output requested, each chunk
 *   will be string.
 *
 * By default, stores data blocks in `chunks[]` property and glue
 * those in `onEnd`. Override this handler, if you need another behaviour.
 **/
Deflate.prototype.onData = function (chunk) {
  this.chunks.push(chunk);
};


/**
 * Deflate#onEnd(status) -> Void
 * - status (Number): deflate status. 0 (Z_OK) on success,
 *   other if not.
 *
 * Called once after you tell deflate that the input stream is
 * complete (Z_FINISH) or should be flushed (Z_SYNC_FLUSH)
 * or if an error happened. By default - join collected chunks,
 * free memory and fill `results` / `err` properties.
 **/
Deflate.prototype.onEnd = function (status) {
  // On success - join
  if (status === Z_OK) {
    if (this.options.to === 'string') {
      this.result = this.chunks.join('');
    } else {
      this.result = utils.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};


/**
 * deflate(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * Compress `data` with deflate algorithm and `options`.
 *
 * Supported options are:
 *
 * - level
 * - windowBits
 * - memLevel
 * - strategy
 * - dictionary
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Sugar (options):
 *
 * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
 *   negative windowBits implicitly.
 * - `to` (String) - if equal to 'string', then result will be "binary string"
 *    (each char code [0..255])
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , data = Uint8Array([1,2,3,4,5,6,7,8,9]);
 *
 * console.log(pako.deflate(data));
 * ```
 **/
function deflate(input, options) {
  var deflator = new Deflate(options);

  deflator.push(input, true);

  // That will never happens, if you don't cheat with options :)
  if (deflator.err) { throw deflator.msg || msg[deflator.err]; }

  return deflator.result;
}


/**
 * deflateRaw(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * The same as [[deflate]], but creates raw data, without wrapper
 * (header and adler32 crc).
 **/
function deflateRaw(input, options) {
  options = options || {};
  options.raw = true;
  return deflate(input, options);
}


/**
 * gzip(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * The same as [[deflate]], but create gzip wrapper instead of
 * deflate one.
 **/
function gzip(input, options) {
  options = options || {};
  options.gzip = true;
  return deflate(input, options);
}


exports.Deflate = Deflate;
exports.deflate = deflate;
exports.deflateRaw = deflateRaw;
exports.gzip = gzip;

},{"./utils/common":101,"./utils/strings":102,"./zlib/deflate":106,"./zlib/messages":111,"./zlib/zstream":113}],100:[function(require,module,exports){
'use strict';


var zlib_inflate = require('./zlib/inflate');
var utils        = require('./utils/common');
var strings      = require('./utils/strings');
var c            = require('./zlib/constants');
var msg          = require('./zlib/messages');
var ZStream      = require('./zlib/zstream');
var GZheader     = require('./zlib/gzheader');

var toString = Object.prototype.toString;

/**
 * class Inflate
 *
 * Generic JS-style wrapper for zlib calls. If you don't need
 * streaming behaviour - use more simple functions: [[inflate]]
 * and [[inflateRaw]].
 **/

/* internal
 * inflate.chunks -> Array
 *
 * Chunks of output data, if [[Inflate#onData]] not overridden.
 **/

/**
 * Inflate.result -> Uint8Array|Array|String
 *
 * Uncompressed result, generated by default [[Inflate#onData]]
 * and [[Inflate#onEnd]] handlers. Filled after you push last chunk
 * (call [[Inflate#push]] with `Z_FINISH` / `true` param) or if you
 * push a chunk with explicit flush (call [[Inflate#push]] with
 * `Z_SYNC_FLUSH` param).
 **/

/**
 * Inflate.err -> Number
 *
 * Error code after inflate finished. 0 (Z_OK) on success.
 * Should be checked if broken data possible.
 **/

/**
 * Inflate.msg -> String
 *
 * Error message, if [[Inflate.err]] != 0
 **/


/**
 * new Inflate(options)
 * - options (Object): zlib inflate options.
 *
 * Creates new inflator instance with specified params. Throws exception
 * on bad params. Supported options:
 *
 * - `windowBits`
 * - `dictionary`
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Additional options, for internal needs:
 *
 * - `chunkSize` - size of generated data chunks (16K by default)
 * - `raw` (Boolean) - do raw inflate
 * - `to` (String) - if equal to 'string', then result will be converted
 *   from utf8 to utf16 (javascript) string. When string output requested,
 *   chunk length can differ from `chunkSize`, depending on content.
 *
 * By default, when no options set, autodetect deflate/gzip data format via
 * wrapper header.
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , chunk1 = Uint8Array([1,2,3,4,5,6,7,8,9])
 *   , chunk2 = Uint8Array([10,11,12,13,14,15,16,17,18,19]);
 *
 * var inflate = new pako.Inflate({ level: 3});
 *
 * inflate.push(chunk1, false);
 * inflate.push(chunk2, true);  // true -> last chunk
 *
 * if (inflate.err) { throw new Error(inflate.err); }
 *
 * console.log(inflate.result);
 * ```
 **/
function Inflate(options) {
  if (!(this instanceof Inflate)) return new Inflate(options);

  this.options = utils.assign({
    chunkSize: 16384,
    windowBits: 0,
    to: ''
  }, options || {});

  var opt = this.options;

  // Force window size for `raw` data, if not set directly,
  // because we have no header for autodetect.
  if (opt.raw && (opt.windowBits >= 0) && (opt.windowBits < 16)) {
    opt.windowBits = -opt.windowBits;
    if (opt.windowBits === 0) { opt.windowBits = -15; }
  }

  // If `windowBits` not defined (and mode not raw) - set autodetect flag for gzip/deflate
  if ((opt.windowBits >= 0) && (opt.windowBits < 16) &&
      !(options && options.windowBits)) {
    opt.windowBits += 32;
  }

  // Gzip header has no info about windows size, we can do autodetect only
  // for deflate. So, if window size not set, force it to max when gzip possible
  if ((opt.windowBits > 15) && (opt.windowBits < 48)) {
    // bit 3 (16) -> gzipped data
    // bit 4 (32) -> autodetect gzip/deflate
    if ((opt.windowBits & 15) === 0) {
      opt.windowBits |= 15;
    }
  }

  this.err    = 0;      // error code, if happens (0 = Z_OK)
  this.msg    = '';     // error message
  this.ended  = false;  // used to avoid multiple onEnd() calls
  this.chunks = [];     // chunks of compressed data

  this.strm   = new ZStream();
  this.strm.avail_out = 0;

  var status  = zlib_inflate.inflateInit2(
    this.strm,
    opt.windowBits
  );

  if (status !== c.Z_OK) {
    throw new Error(msg[status]);
  }

  this.header = new GZheader();

  zlib_inflate.inflateGetHeader(this.strm, this.header);
}

/**
 * Inflate#push(data[, mode]) -> Boolean
 * - data (Uint8Array|Array|ArrayBuffer|String): input data
 * - mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE modes.
 *   See constants. Skipped or `false` means Z_NO_FLUSH, `true` means Z_FINISH.
 *
 * Sends input data to inflate pipe, generating [[Inflate#onData]] calls with
 * new output chunks. Returns `true` on success. The last data block must have
 * mode Z_FINISH (or `true`). That will flush internal pending buffers and call
 * [[Inflate#onEnd]]. For interim explicit flushes (without ending the stream) you
 * can use mode Z_SYNC_FLUSH, keeping the decompression context.
 *
 * On fail call [[Inflate#onEnd]] with error code and return false.
 *
 * We strongly recommend to use `Uint8Array` on input for best speed (output
 * format is detected automatically). Also, don't skip last param and always
 * use the same type in your code (boolean or number). That will improve JS speed.
 *
 * For regular `Array`-s make sure all elements are [0..255].
 *
 * ##### Example
 *
 * ```javascript
 * push(chunk, false); // push one of data chunks
 * ...
 * push(chunk, true);  // push last chunk
 * ```
 **/
Inflate.prototype.push = function (data, mode) {
  var strm = this.strm;
  var chunkSize = this.options.chunkSize;
  var dictionary = this.options.dictionary;
  var status, _mode;
  var next_out_utf8, tail, utf8str;
  var dict;

  // Flag to properly process Z_BUF_ERROR on testing inflate call
  // when we check that all output data was flushed.
  var allowBufError = false;

  if (this.ended) { return false; }
  _mode = (mode === ~~mode) ? mode : ((mode === true) ? c.Z_FINISH : c.Z_NO_FLUSH);

  // Convert data if needed
  if (typeof data === 'string') {
    // Only binary strings can be decompressed on practice
    strm.input = strings.binstring2buf(data);
  } else if (toString.call(data) === '[object ArrayBuffer]') {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }

  strm.next_in = 0;
  strm.avail_in = strm.input.length;

  do {
    if (strm.avail_out === 0) {
      strm.output = new utils.Buf8(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }

    status = zlib_inflate.inflate(strm, c.Z_NO_FLUSH);    /* no bad return value */

    if (status === c.Z_NEED_DICT && dictionary) {
      // Convert data if needed
      if (typeof dictionary === 'string') {
        dict = strings.string2buf(dictionary);
      } else if (toString.call(dictionary) === '[object ArrayBuffer]') {
        dict = new Uint8Array(dictionary);
      } else {
        dict = dictionary;
      }

      status = zlib_inflate.inflateSetDictionary(this.strm, dict);

    }

    if (status === c.Z_BUF_ERROR && allowBufError === true) {
      status = c.Z_OK;
      allowBufError = false;
    }

    if (status !== c.Z_STREAM_END && status !== c.Z_OK) {
      this.onEnd(status);
      this.ended = true;
      return false;
    }

    if (strm.next_out) {
      if (strm.avail_out === 0 || status === c.Z_STREAM_END || (strm.avail_in === 0 && (_mode === c.Z_FINISH || _mode === c.Z_SYNC_FLUSH))) {

        if (this.options.to === 'string') {

          next_out_utf8 = strings.utf8border(strm.output, strm.next_out);

          tail = strm.next_out - next_out_utf8;
          utf8str = strings.buf2string(strm.output, next_out_utf8);

          // move tail
          strm.next_out = tail;
          strm.avail_out = chunkSize - tail;
          if (tail) { utils.arraySet(strm.output, strm.output, next_out_utf8, tail, 0); }

          this.onData(utf8str);

        } else {
          this.onData(utils.shrinkBuf(strm.output, strm.next_out));
        }
      }
    }

    // When no more input data, we should check that internal inflate buffers
    // are flushed. The only way to do it when avail_out = 0 - run one more
    // inflate pass. But if output data not exists, inflate return Z_BUF_ERROR.
    // Here we set flag to process this error properly.
    //
    // NOTE. Deflate does not return error in this case and does not needs such
    // logic.
    if (strm.avail_in === 0 && strm.avail_out === 0) {
      allowBufError = true;
    }

  } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== c.Z_STREAM_END);

  if (status === c.Z_STREAM_END) {
    _mode = c.Z_FINISH;
  }

  // Finalize on the last chunk.
  if (_mode === c.Z_FINISH) {
    status = zlib_inflate.inflateEnd(this.strm);
    this.onEnd(status);
    this.ended = true;
    return status === c.Z_OK;
  }

  // callback interim results if Z_SYNC_FLUSH.
  if (_mode === c.Z_SYNC_FLUSH) {
    this.onEnd(c.Z_OK);
    strm.avail_out = 0;
    return true;
  }

  return true;
};


/**
 * Inflate#onData(chunk) -> Void
 * - chunk (Uint8Array|Array|String): output data. Type of array depends
 *   on js engine support. When string output requested, each chunk
 *   will be string.
 *
 * By default, stores data blocks in `chunks[]` property and glue
 * those in `onEnd`. Override this handler, if you need another behaviour.
 **/
Inflate.prototype.onData = function (chunk) {
  this.chunks.push(chunk);
};


/**
 * Inflate#onEnd(status) -> Void
 * - status (Number): inflate status. 0 (Z_OK) on success,
 *   other if not.
 *
 * Called either after you tell inflate that the input stream is
 * complete (Z_FINISH) or should be flushed (Z_SYNC_FLUSH)
 * or if an error happened. By default - join collected chunks,
 * free memory and fill `results` / `err` properties.
 **/
Inflate.prototype.onEnd = function (status) {
  // On success - join
  if (status === c.Z_OK) {
    if (this.options.to === 'string') {
      // Glue & convert here, until we teach pako to send
      // utf8 aligned strings to onData
      this.result = this.chunks.join('');
    } else {
      this.result = utils.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};


/**
 * inflate(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * Decompress `data` with inflate/ungzip and `options`. Autodetect
 * format via wrapper header by default. That's why we don't provide
 * separate `ungzip` method.
 *
 * Supported options are:
 *
 * - windowBits
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information.
 *
 * Sugar (options):
 *
 * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
 *   negative windowBits implicitly.
 * - `to` (String) - if equal to 'string', then result will be converted
 *   from utf8 to utf16 (javascript) string. When string output requested,
 *   chunk length can differ from `chunkSize`, depending on content.
 *
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , input = pako.deflate([1,2,3,4,5,6,7,8,9])
 *   , output;
 *
 * try {
 *   output = pako.inflate(input);
 * } catch (err)
 *   console.log(err);
 * }
 * ```
 **/
function inflate(input, options) {
  var inflator = new Inflate(options);

  inflator.push(input, true);

  // That will never happens, if you don't cheat with options :)
  if (inflator.err) { throw inflator.msg || msg[inflator.err]; }

  return inflator.result;
}


/**
 * inflateRaw(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * The same as [[inflate]], but creates raw data, without wrapper
 * (header and adler32 crc).
 **/
function inflateRaw(input, options) {
  options = options || {};
  options.raw = true;
  return inflate(input, options);
}


/**
 * ungzip(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * Just shortcut to [[inflate]], because it autodetects format
 * by header.content. Done for convenience.
 **/


exports.Inflate = Inflate;
exports.inflate = inflate;
exports.inflateRaw = inflateRaw;
exports.ungzip  = inflate;

},{"./utils/common":101,"./utils/strings":102,"./zlib/constants":104,"./zlib/gzheader":107,"./zlib/inflate":109,"./zlib/messages":111,"./zlib/zstream":113}],101:[function(require,module,exports){
'use strict';


var TYPED_OK =  (typeof Uint8Array !== 'undefined') &&
                (typeof Uint16Array !== 'undefined') &&
                (typeof Int32Array !== 'undefined');

function _has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

exports.assign = function (obj /*from1, from2, from3, ...*/) {
  var sources = Array.prototype.slice.call(arguments, 1);
  while (sources.length) {
    var source = sources.shift();
    if (!source) { continue; }

    if (typeof source !== 'object') {
      throw new TypeError(source + 'must be non-object');
    }

    for (var p in source) {
      if (_has(source, p)) {
        obj[p] = source[p];
      }
    }
  }

  return obj;
};


// reduce buffer size, avoiding mem copy
exports.shrinkBuf = function (buf, size) {
  if (buf.length === size) { return buf; }
  if (buf.subarray) { return buf.subarray(0, size); }
  buf.length = size;
  return buf;
};


var fnTyped = {
  arraySet: function (dest, src, src_offs, len, dest_offs) {
    if (src.subarray && dest.subarray) {
      dest.set(src.subarray(src_offs, src_offs + len), dest_offs);
      return;
    }
    // Fallback to ordinary array
    for (var i = 0; i < len; i++) {
      dest[dest_offs + i] = src[src_offs + i];
    }
  },
  // Join array of chunks to single array.
  flattenChunks: function (chunks) {
    var i, l, len, pos, chunk, result;

    // calculate data length
    len = 0;
    for (i = 0, l = chunks.length; i < l; i++) {
      len += chunks[i].length;
    }

    // join chunks
    result = new Uint8Array(len);
    pos = 0;
    for (i = 0, l = chunks.length; i < l; i++) {
      chunk = chunks[i];
      result.set(chunk, pos);
      pos += chunk.length;
    }

    return result;
  }
};

var fnUntyped = {
  arraySet: function (dest, src, src_offs, len, dest_offs) {
    for (var i = 0; i < len; i++) {
      dest[dest_offs + i] = src[src_offs + i];
    }
  },
  // Join array of chunks to single array.
  flattenChunks: function (chunks) {
    return [].concat.apply([], chunks);
  }
};


// Enable/Disable typed arrays use, for testing
//
exports.setTyped = function (on) {
  if (on) {
    exports.Buf8  = Uint8Array;
    exports.Buf16 = Uint16Array;
    exports.Buf32 = Int32Array;
    exports.assign(exports, fnTyped);
  } else {
    exports.Buf8  = Array;
    exports.Buf16 = Array;
    exports.Buf32 = Array;
    exports.assign(exports, fnUntyped);
  }
};

exports.setTyped(TYPED_OK);

},{}],102:[function(require,module,exports){
// String encode/decode helpers
'use strict';


var utils = require('./common');


// Quick check if we can use fast array to bin string conversion
//
// - apply(Array) can fail on Android 2.2
// - apply(Uint8Array) can fail on iOS 5.1 Safari
//
var STR_APPLY_OK = true;
var STR_APPLY_UIA_OK = true;

try { String.fromCharCode.apply(null, [ 0 ]); } catch (__) { STR_APPLY_OK = false; }
try { String.fromCharCode.apply(null, new Uint8Array(1)); } catch (__) { STR_APPLY_UIA_OK = false; }


// Table with utf8 lengths (calculated by first byte of sequence)
// Note, that 5 & 6-byte values and some 4-byte values can not be represented in JS,
// because max possible codepoint is 0x10ffff
var _utf8len = new utils.Buf8(256);
for (var q = 0; q < 256; q++) {
  _utf8len[q] = (q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1);
}
_utf8len[254] = _utf8len[254] = 1; // Invalid sequence start


// convert string to array (typed, when possible)
exports.string2buf = function (str) {
  var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;

  // count binary size
  for (m_pos = 0; m_pos < str_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }

  // allocate buffer
  buf = new utils.Buf8(buf_len);

  // convert
  for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    if (c < 0x80) {
      /* one byte */
      buf[i++] = c;
    } else if (c < 0x800) {
      /* two bytes */
      buf[i++] = 0xC0 | (c >>> 6);
      buf[i++] = 0x80 | (c & 0x3f);
    } else if (c < 0x10000) {
      /* three bytes */
      buf[i++] = 0xE0 | (c >>> 12);
      buf[i++] = 0x80 | (c >>> 6 & 0x3f);
      buf[i++] = 0x80 | (c & 0x3f);
    } else {
      /* four bytes */
      buf[i++] = 0xf0 | (c >>> 18);
      buf[i++] = 0x80 | (c >>> 12 & 0x3f);
      buf[i++] = 0x80 | (c >>> 6 & 0x3f);
      buf[i++] = 0x80 | (c & 0x3f);
    }
  }

  return buf;
};

// Helper (used in 2 places)
function buf2binstring(buf, len) {
  // use fallback for big arrays to avoid stack overflow
  if (len < 65537) {
    if ((buf.subarray && STR_APPLY_UIA_OK) || (!buf.subarray && STR_APPLY_OK)) {
      return String.fromCharCode.apply(null, utils.shrinkBuf(buf, len));
    }
  }

  var result = '';
  for (var i = 0; i < len; i++) {
    result += String.fromCharCode(buf[i]);
  }
  return result;
}


// Convert byte array to binary string
exports.buf2binstring = function (buf) {
  return buf2binstring(buf, buf.length);
};


// Convert binary string (typed, when possible)
exports.binstring2buf = function (str) {
  var buf = new utils.Buf8(str.length);
  for (var i = 0, len = buf.length; i < len; i++) {
    buf[i] = str.charCodeAt(i);
  }
  return buf;
};


// convert array to string
exports.buf2string = function (buf, max) {
  var i, out, c, c_len;
  var len = max || buf.length;

  // Reserve max possible length (2 words per char)
  // NB: by unknown reasons, Array is significantly faster for
  //     String.fromCharCode.apply than Uint16Array.
  var utf16buf = new Array(len * 2);

  for (out = 0, i = 0; i < len;) {
    c = buf[i++];
    // quick process ascii
    if (c < 0x80) { utf16buf[out++] = c; continue; }

    c_len = _utf8len[c];
    // skip 5 & 6 byte codes
    if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len - 1; continue; }

    // apply mask on first byte
    c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
    // join the rest
    while (c_len > 1 && i < len) {
      c = (c << 6) | (buf[i++] & 0x3f);
      c_len--;
    }

    // terminated by end of string?
    if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }

    if (c < 0x10000) {
      utf16buf[out++] = c;
    } else {
      c -= 0x10000;
      utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
      utf16buf[out++] = 0xdc00 | (c & 0x3ff);
    }
  }

  return buf2binstring(utf16buf, out);
};


// Calculate max possible position in utf8 buffer,
// that will not break sequence. If that's not possible
// - (very small limits) return max size as is.
//
// buf[] - utf8 bytes array
// max   - length limit (mandatory);
exports.utf8border = function (buf, max) {
  var pos;

  max = max || buf.length;
  if (max > buf.length) { max = buf.length; }

  // go back from last position, until start of sequence found
  pos = max - 1;
  while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) { pos--; }

  // Very small and broken sequence,
  // return max, because we should return something anyway.
  if (pos < 0) { return max; }

  // If we came to start of buffer - that means buffer is too small,
  // return max too.
  if (pos === 0) { return max; }

  return (pos + _utf8len[buf[pos]] > max) ? pos : max;
};

},{"./common":101}],103:[function(require,module,exports){
'use strict';

// Note: adler32 takes 12% for level 0 and 2% for level 6.
// It isn't worth it to make additional optimizations as in original.
// Small size is preferable.

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

function adler32(adler, buf, len, pos) {
  var s1 = (adler & 0xffff) |0,
      s2 = ((adler >>> 16) & 0xffff) |0,
      n = 0;

  while (len !== 0) {
    // Set limit ~ twice less than 5552, to keep
    // s2 in 31-bits, because we force signed ints.
    // in other case %= will fail.
    n = len > 2000 ? 2000 : len;
    len -= n;

    do {
      s1 = (s1 + buf[pos++]) |0;
      s2 = (s2 + s1) |0;
    } while (--n);

    s1 %= 65521;
    s2 %= 65521;
  }

  return (s1 | (s2 << 16)) |0;
}


module.exports = adler32;

},{}],104:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

module.exports = {

  /* Allowed flush values; see deflate() and inflate() below for details */
  Z_NO_FLUSH:         0,
  Z_PARTIAL_FLUSH:    1,
  Z_SYNC_FLUSH:       2,
  Z_FULL_FLUSH:       3,
  Z_FINISH:           4,
  Z_BLOCK:            5,
  Z_TREES:            6,

  /* Return codes for the compression/decompression functions. Negative values
  * are errors, positive values are used for special but normal events.
  */
  Z_OK:               0,
  Z_STREAM_END:       1,
  Z_NEED_DICT:        2,
  Z_ERRNO:           -1,
  Z_STREAM_ERROR:    -2,
  Z_DATA_ERROR:      -3,
  //Z_MEM_ERROR:     -4,
  Z_BUF_ERROR:       -5,
  //Z_VERSION_ERROR: -6,

  /* compression levels */
  Z_NO_COMPRESSION:         0,
  Z_BEST_SPEED:             1,
  Z_BEST_COMPRESSION:       9,
  Z_DEFAULT_COMPRESSION:   -1,


  Z_FILTERED:               1,
  Z_HUFFMAN_ONLY:           2,
  Z_RLE:                    3,
  Z_FIXED:                  4,
  Z_DEFAULT_STRATEGY:       0,

  /* Possible values of the data_type field (though see inflate()) */
  Z_BINARY:                 0,
  Z_TEXT:                   1,
  //Z_ASCII:                1, // = Z_TEXT (deprecated)
  Z_UNKNOWN:                2,

  /* The deflate compression method */
  Z_DEFLATED:               8
  //Z_NULL:                 null // Use -1 or null inline, depending on var type
};

},{}],105:[function(require,module,exports){
'use strict';

// Note: we can't get significant speed boost here.
// So write code to minimize size - no pregenerated tables
// and array tools dependencies.

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

// Use ordinary array, since untyped makes no boost here
function makeTable() {
  var c, table = [];

  for (var n = 0; n < 256; n++) {
    c = n;
    for (var k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }

  return table;
}

// Create table on load. Just 255 signed longs. Not a problem.
var crcTable = makeTable();


function crc32(crc, buf, len, pos) {
  var t = crcTable,
      end = pos + len;

  crc ^= -1;

  for (var i = pos; i < end; i++) {
    crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
  }

  return (crc ^ (-1)); // >>> 0;
}


module.exports = crc32;

},{}],106:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

var utils   = require('../utils/common');
var trees   = require('./trees');
var adler32 = require('./adler32');
var crc32   = require('./crc32');
var msg     = require('./messages');

/* Public constants ==========================================================*/
/* ===========================================================================*/


/* Allowed flush values; see deflate() and inflate() below for details */
var Z_NO_FLUSH      = 0;
var Z_PARTIAL_FLUSH = 1;
//var Z_SYNC_FLUSH    = 2;
var Z_FULL_FLUSH    = 3;
var Z_FINISH        = 4;
var Z_BLOCK         = 5;
//var Z_TREES         = 6;


/* Return codes for the compression/decompression functions. Negative values
 * are errors, positive values are used for special but normal events.
 */
var Z_OK            = 0;
var Z_STREAM_END    = 1;
//var Z_NEED_DICT     = 2;
//var Z_ERRNO         = -1;
var Z_STREAM_ERROR  = -2;
var Z_DATA_ERROR    = -3;
//var Z_MEM_ERROR     = -4;
var Z_BUF_ERROR     = -5;
//var Z_VERSION_ERROR = -6;


/* compression levels */
//var Z_NO_COMPRESSION      = 0;
//var Z_BEST_SPEED          = 1;
//var Z_BEST_COMPRESSION    = 9;
var Z_DEFAULT_COMPRESSION = -1;


var Z_FILTERED            = 1;
var Z_HUFFMAN_ONLY        = 2;
var Z_RLE                 = 3;
var Z_FIXED               = 4;
var Z_DEFAULT_STRATEGY    = 0;

/* Possible values of the data_type field (though see inflate()) */
//var Z_BINARY              = 0;
//var Z_TEXT                = 1;
//var Z_ASCII               = 1; // = Z_TEXT
var Z_UNKNOWN             = 2;


/* The deflate compression method */
var Z_DEFLATED  = 8;

/*============================================================================*/


var MAX_MEM_LEVEL = 9;
/* Maximum value for memLevel in deflateInit2 */
var MAX_WBITS = 15;
/* 32K LZ77 window */
var DEF_MEM_LEVEL = 8;


var LENGTH_CODES  = 29;
/* number of length codes, not counting the special END_BLOCK code */
var LITERALS      = 256;
/* number of literal bytes 0..255 */
var L_CODES       = LITERALS + 1 + LENGTH_CODES;
/* number of Literal or Length codes, including the END_BLOCK code */
var D_CODES       = 30;
/* number of distance codes */
var BL_CODES      = 19;
/* number of codes used to transfer the bit lengths */
var HEAP_SIZE     = 2 * L_CODES + 1;
/* maximum heap size */
var MAX_BITS  = 15;
/* All codes must not exceed MAX_BITS bits */

var MIN_MATCH = 3;
var MAX_MATCH = 258;
var MIN_LOOKAHEAD = (MAX_MATCH + MIN_MATCH + 1);

var PRESET_DICT = 0x20;

var INIT_STATE = 42;
var EXTRA_STATE = 69;
var NAME_STATE = 73;
var COMMENT_STATE = 91;
var HCRC_STATE = 103;
var BUSY_STATE = 113;
var FINISH_STATE = 666;

var BS_NEED_MORE      = 1; /* block not completed, need more input or more output */
var BS_BLOCK_DONE     = 2; /* block flush performed */
var BS_FINISH_STARTED = 3; /* finish started, need only more output at next deflate */
var BS_FINISH_DONE    = 4; /* finish done, accept no more input or output */

var OS_CODE = 0x03; // Unix :) . Don't detect, use this default.

function err(strm, errorCode) {
  strm.msg = msg[errorCode];
  return errorCode;
}

function rank(f) {
  return ((f) << 1) - ((f) > 4 ? 9 : 0);
}

function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }


/* =========================================================================
 * Flush as much pending output as possible. All deflate() output goes
 * through this function so some applications may wish to modify it
 * to avoid allocating a large strm->output buffer and copying into it.
 * (See also read_buf()).
 */
function flush_pending(strm) {
  var s = strm.state;

  //_tr_flush_bits(s);
  var len = s.pending;
  if (len > strm.avail_out) {
    len = strm.avail_out;
  }
  if (len === 0) { return; }

  utils.arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
  strm.next_out += len;
  s.pending_out += len;
  strm.total_out += len;
  strm.avail_out -= len;
  s.pending -= len;
  if (s.pending === 0) {
    s.pending_out = 0;
  }
}


function flush_block_only(s, last) {
  trees._tr_flush_block(s, (s.block_start >= 0 ? s.block_start : -1), s.strstart - s.block_start, last);
  s.block_start = s.strstart;
  flush_pending(s.strm);
}


function put_byte(s, b) {
  s.pending_buf[s.pending++] = b;
}


/* =========================================================================
 * Put a short in the pending buffer. The 16-bit value is put in MSB order.
 * IN assertion: the stream state is correct and there is enough room in
 * pending_buf.
 */
function putShortMSB(s, b) {
//  put_byte(s, (Byte)(b >> 8));
//  put_byte(s, (Byte)(b & 0xff));
  s.pending_buf[s.pending++] = (b >>> 8) & 0xff;
  s.pending_buf[s.pending++] = b & 0xff;
}


/* ===========================================================================
 * Read a new buffer from the current input stream, update the adler32
 * and total number of bytes read.  All deflate() input goes through
 * this function so some applications may wish to modify it to avoid
 * allocating a large strm->input buffer and copying from it.
 * (See also flush_pending()).
 */
function read_buf(strm, buf, start, size) {
  var len = strm.avail_in;

  if (len > size) { len = size; }
  if (len === 0) { return 0; }

  strm.avail_in -= len;

  // zmemcpy(buf, strm->next_in, len);
  utils.arraySet(buf, strm.input, strm.next_in, len, start);
  if (strm.state.wrap === 1) {
    strm.adler = adler32(strm.adler, buf, len, start);
  }

  else if (strm.state.wrap === 2) {
    strm.adler = crc32(strm.adler, buf, len, start);
  }

  strm.next_in += len;
  strm.total_in += len;

  return len;
}


/* ===========================================================================
 * Set match_start to the longest match starting at the given string and
 * return its length. Matches shorter or equal to prev_length are discarded,
 * in which case the result is equal to prev_length and match_start is
 * garbage.
 * IN assertions: cur_match is the head of the hash chain for the current
 *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
 * OUT assertion: the match length is not greater than s->lookahead.
 */
function longest_match(s, cur_match) {
  var chain_length = s.max_chain_length;      /* max hash chain length */
  var scan = s.strstart; /* current string */
  var match;                       /* matched string */
  var len;                           /* length of current match */
  var best_len = s.prev_length;              /* best match length so far */
  var nice_match = s.nice_match;             /* stop if match long enough */
  var limit = (s.strstart > (s.w_size - MIN_LOOKAHEAD)) ?
      s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0/*NIL*/;

  var _win = s.window; // shortcut

  var wmask = s.w_mask;
  var prev  = s.prev;

  /* Stop when cur_match becomes <= limit. To simplify the code,
   * we prevent matches with the string of window index 0.
   */

  var strend = s.strstart + MAX_MATCH;
  var scan_end1  = _win[scan + best_len - 1];
  var scan_end   = _win[scan + best_len];

  /* The code is optimized for HASH_BITS >= 8 and MAX_MATCH-2 multiple of 16.
   * It is easy to get rid of this optimization if necessary.
   */
  // Assert(s->hash_bits >= 8 && MAX_MATCH == 258, "Code too clever");

  /* Do not waste too much time if we already have a good match: */
  if (s.prev_length >= s.good_match) {
    chain_length >>= 2;
  }
  /* Do not look for matches beyond the end of the input. This is necessary
   * to make deflate deterministic.
   */
  if (nice_match > s.lookahead) { nice_match = s.lookahead; }

  // Assert((ulg)s->strstart <= s->window_size-MIN_LOOKAHEAD, "need lookahead");

  do {
    // Assert(cur_match < s->strstart, "no future");
    match = cur_match;

    /* Skip to next match if the match length cannot increase
     * or if the match length is less than 2.  Note that the checks below
     * for insufficient lookahead only occur occasionally for performance
     * reasons.  Therefore uninitialized memory will be accessed, and
     * conditional jumps will be made that depend on those values.
     * However the length of the match is limited to the lookahead, so
     * the output of deflate is not affected by the uninitialized values.
     */

    if (_win[match + best_len]     !== scan_end  ||
        _win[match + best_len - 1] !== scan_end1 ||
        _win[match]                !== _win[scan] ||
        _win[++match]              !== _win[scan + 1]) {
      continue;
    }

    /* The check at best_len-1 can be removed because it will be made
     * again later. (This heuristic is not always a win.)
     * It is not necessary to compare scan[2] and match[2] since they
     * are always equal when the other bytes match, given that
     * the hash keys are equal and that HASH_BITS >= 8.
     */
    scan += 2;
    match++;
    // Assert(*scan == *match, "match[2]?");

    /* We check for insufficient lookahead only every 8th comparison;
     * the 256th check will be made at strstart+258.
     */
    do {
      /*jshint noempty:false*/
    } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             scan < strend);

    // Assert(scan <= s->window+(unsigned)(s->window_size-1), "wild scan");

    len = MAX_MATCH - (strend - scan);
    scan = strend - MAX_MATCH;

    if (len > best_len) {
      s.match_start = cur_match;
      best_len = len;
      if (len >= nice_match) {
        break;
      }
      scan_end1  = _win[scan + best_len - 1];
      scan_end   = _win[scan + best_len];
    }
  } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);

  if (best_len <= s.lookahead) {
    return best_len;
  }
  return s.lookahead;
}


/* ===========================================================================
 * Fill the window when the lookahead becomes insufficient.
 * Updates strstart and lookahead.
 *
 * IN assertion: lookahead < MIN_LOOKAHEAD
 * OUT assertions: strstart <= window_size-MIN_LOOKAHEAD
 *    At least one byte has been read, or avail_in == 0; reads are
 *    performed for at least two bytes (required for the zip translate_eol
 *    option -- not supported here).
 */
function fill_window(s) {
  var _w_size = s.w_size;
  var p, n, m, more, str;

  //Assert(s->lookahead < MIN_LOOKAHEAD, "already enough lookahead");

  do {
    more = s.window_size - s.lookahead - s.strstart;

    // JS ints have 32 bit, block below not needed
    /* Deal with !@#$% 64K limit: */
    //if (sizeof(int) <= 2) {
    //    if (more == 0 && s->strstart == 0 && s->lookahead == 0) {
    //        more = wsize;
    //
    //  } else if (more == (unsigned)(-1)) {
    //        /* Very unlikely, but possible on 16 bit machine if
    //         * strstart == 0 && lookahead == 1 (input done a byte at time)
    //         */
    //        more--;
    //    }
    //}


    /* If the window is almost full and there is insufficient lookahead,
     * move the upper half to the lower one to make room in the upper half.
     */
    if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {

      utils.arraySet(s.window, s.window, _w_size, _w_size, 0);
      s.match_start -= _w_size;
      s.strstart -= _w_size;
      /* we now have strstart >= MAX_DIST */
      s.block_start -= _w_size;

      /* Slide the hash table (could be avoided with 32 bit values
       at the expense of memory usage). We slide even when level == 0
       to keep the hash table consistent if we switch back to level > 0
       later. (Using level 0 permanently is not an optimal usage of
       zlib, so we don't care about this pathological case.)
       */

      n = s.hash_size;
      p = n;
      do {
        m = s.head[--p];
        s.head[p] = (m >= _w_size ? m - _w_size : 0);
      } while (--n);

      n = _w_size;
      p = n;
      do {
        m = s.prev[--p];
        s.prev[p] = (m >= _w_size ? m - _w_size : 0);
        /* If n is not on any hash chain, prev[n] is garbage but
         * its value will never be used.
         */
      } while (--n);

      more += _w_size;
    }
    if (s.strm.avail_in === 0) {
      break;
    }

    /* If there was no sliding:
     *    strstart <= WSIZE+MAX_DIST-1 && lookahead <= MIN_LOOKAHEAD - 1 &&
     *    more == window_size - lookahead - strstart
     * => more >= window_size - (MIN_LOOKAHEAD-1 + WSIZE + MAX_DIST-1)
     * => more >= window_size - 2*WSIZE + 2
     * In the BIG_MEM or MMAP case (not yet supported),
     *   window_size == input_size + MIN_LOOKAHEAD  &&
     *   strstart + s->lookahead <= input_size => more >= MIN_LOOKAHEAD.
     * Otherwise, window_size == 2*WSIZE so more >= 2.
     * If there was sliding, more >= WSIZE. So in all cases, more >= 2.
     */
    //Assert(more >= 2, "more < 2");
    n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
    s.lookahead += n;

    /* Initialize the hash value now that we have some input: */
    if (s.lookahead + s.insert >= MIN_MATCH) {
      str = s.strstart - s.insert;
      s.ins_h = s.window[str];

      /* UPDATE_HASH(s, s->ins_h, s->window[str + 1]); */
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + 1]) & s.hash_mask;
//#if MIN_MATCH != 3
//        Call update_hash() MIN_MATCH-3 more times
//#endif
      while (s.insert) {
        /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
        s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;

        s.prev[str & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = str;
        str++;
        s.insert--;
        if (s.lookahead + s.insert < MIN_MATCH) {
          break;
        }
      }
    }
    /* If the whole input has less than MIN_MATCH bytes, ins_h is garbage,
     * but this is not important since only literal bytes will be emitted.
     */

  } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);

  /* If the WIN_INIT bytes after the end of the current data have never been
   * written, then zero those bytes in order to avoid memory check reports of
   * the use of uninitialized (or uninitialised as Julian writes) bytes by
   * the longest match routines.  Update the high water mark for the next
   * time through here.  WIN_INIT is set to MAX_MATCH since the longest match
   * routines allow scanning to strstart + MAX_MATCH, ignoring lookahead.
   */
//  if (s.high_water < s.window_size) {
//    var curr = s.strstart + s.lookahead;
//    var init = 0;
//
//    if (s.high_water < curr) {
//      /* Previous high water mark below current data -- zero WIN_INIT
//       * bytes or up to end of window, whichever is less.
//       */
//      init = s.window_size - curr;
//      if (init > WIN_INIT)
//        init = WIN_INIT;
//      zmemzero(s->window + curr, (unsigned)init);
//      s->high_water = curr + init;
//    }
//    else if (s->high_water < (ulg)curr + WIN_INIT) {
//      /* High water mark at or above current data, but below current data
//       * plus WIN_INIT -- zero out to current data plus WIN_INIT, or up
//       * to end of window, whichever is less.
//       */
//      init = (ulg)curr + WIN_INIT - s->high_water;
//      if (init > s->window_size - s->high_water)
//        init = s->window_size - s->high_water;
//      zmemzero(s->window + s->high_water, (unsigned)init);
//      s->high_water += init;
//    }
//  }
//
//  Assert((ulg)s->strstart <= s->window_size - MIN_LOOKAHEAD,
//    "not enough room for search");
}

/* ===========================================================================
 * Copy without compression as much as possible from the input stream, return
 * the current block state.
 * This function does not insert new strings in the dictionary since
 * uncompressible data is probably not useful. This function is used
 * only for the level=0 compression option.
 * NOTE: this function should be optimized to avoid extra copying from
 * window to pending_buf.
 */
function deflate_stored(s, flush) {
  /* Stored blocks are limited to 0xffff bytes, pending_buf is limited
   * to pending_buf_size, and each stored block has a 5 byte header:
   */
  var max_block_size = 0xffff;

  if (max_block_size > s.pending_buf_size - 5) {
    max_block_size = s.pending_buf_size - 5;
  }

  /* Copy as much as possible from input to output: */
  for (;;) {
    /* Fill the window as much as possible: */
    if (s.lookahead <= 1) {

      //Assert(s->strstart < s->w_size+MAX_DIST(s) ||
      //  s->block_start >= (long)s->w_size, "slide too late");
//      if (!(s.strstart < s.w_size + (s.w_size - MIN_LOOKAHEAD) ||
//        s.block_start >= s.w_size)) {
//        throw  new Error("slide too late");
//      }

      fill_window(s);
      if (s.lookahead === 0 && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }

      if (s.lookahead === 0) {
        break;
      }
      /* flush the current block */
    }
    //Assert(s->block_start >= 0L, "block gone");
//    if (s.block_start < 0) throw new Error("block gone");

    s.strstart += s.lookahead;
    s.lookahead = 0;

    /* Emit a stored block if pending_buf will be full: */
    var max_start = s.block_start + max_block_size;

    if (s.strstart === 0 || s.strstart >= max_start) {
      /* strstart == 0 is possible when wraparound on 16-bit machine */
      s.lookahead = s.strstart - max_start;
      s.strstart = max_start;
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/


    }
    /* Flush if we may have to slide, otherwise block_start may become
     * negative and the data will be gone:
     */
    if (s.strstart - s.block_start >= (s.w_size - MIN_LOOKAHEAD)) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }

  s.insert = 0;

  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }

  if (s.strstart > s.block_start) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }

  return BS_NEED_MORE;
}

/* ===========================================================================
 * Compress as much as possible from the input stream, return the current
 * block state.
 * This function does not perform lazy evaluation of matches and inserts
 * new strings in the dictionary only for unmatched strings or for short
 * matches. It is used only for the fast compression options.
 */
function deflate_fast(s, flush) {
  var hash_head;        /* head of the hash chain */
  var bflush;           /* set if current block must be flushed */

  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the next match, plus MIN_MATCH bytes to insert the
     * string following the next match.
     */
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break; /* flush the current block */
      }
    }

    /* Insert the string window[strstart .. strstart+2] in the
     * dictionary, and set hash_head to the head of the hash chain:
     */
    hash_head = 0/*NIL*/;
    if (s.lookahead >= MIN_MATCH) {
      /*** INSERT_STRING(s, s.strstart, hash_head); ***/
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
      /***/
    }

    /* Find the longest match, discarding those <= prev_length.
     * At this point we have always match_length < MIN_MATCH
     */
    if (hash_head !== 0/*NIL*/ && ((s.strstart - hash_head) <= (s.w_size - MIN_LOOKAHEAD))) {
      /* To simplify the code, we prevent matches with the string
       * of window index 0 (in particular we have to avoid a match
       * of the string with itself at the start of the input file).
       */
      s.match_length = longest_match(s, hash_head);
      /* longest_match() sets match_start */
    }
    if (s.match_length >= MIN_MATCH) {
      // check_match(s, s.strstart, s.match_start, s.match_length); // for debug only

      /*** _tr_tally_dist(s, s.strstart - s.match_start,
                     s.match_length - MIN_MATCH, bflush); ***/
      bflush = trees._tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);

      s.lookahead -= s.match_length;

      /* Insert new strings in the hash table only if the match length
       * is not too large. This saves time but degrades compression.
       */
      if (s.match_length <= s.max_lazy_match/*max_insert_length*/ && s.lookahead >= MIN_MATCH) {
        s.match_length--; /* string at strstart already in table */
        do {
          s.strstart++;
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
          /* strstart never exceeds WSIZE-MAX_MATCH, so there are
           * always MIN_MATCH bytes ahead.
           */
        } while (--s.match_length !== 0);
        s.strstart++;
      } else
      {
        s.strstart += s.match_length;
        s.match_length = 0;
        s.ins_h = s.window[s.strstart];
        /* UPDATE_HASH(s, s.ins_h, s.window[s.strstart+1]); */
        s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + 1]) & s.hash_mask;

//#if MIN_MATCH != 3
//                Call UPDATE_HASH() MIN_MATCH-3 more times
//#endif
        /* If lookahead < MIN_MATCH, ins_h is garbage, but it does not
         * matter since it will be recomputed at next deflate call.
         */
      }
    } else {
      /* No match, output a literal byte */
      //Tracevv((stderr,"%c", s.window[s.strstart]));
      /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
      bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }
  s.insert = ((s.strstart < (MIN_MATCH - 1)) ? s.strstart : MIN_MATCH - 1);
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }
  return BS_BLOCK_DONE;
}

/* ===========================================================================
 * Same as above, but achieves better compression. We use a lazy
 * evaluation for matches: a match is finally adopted only if there is
 * no better match at the next window position.
 */
function deflate_slow(s, flush) {
  var hash_head;          /* head of hash chain */
  var bflush;              /* set if current block must be flushed */

  var max_insert;

  /* Process the input block. */
  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the next match, plus MIN_MATCH bytes to insert the
     * string following the next match.
     */
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) { break; } /* flush the current block */
    }

    /* Insert the string window[strstart .. strstart+2] in the
     * dictionary, and set hash_head to the head of the hash chain:
     */
    hash_head = 0/*NIL*/;
    if (s.lookahead >= MIN_MATCH) {
      /*** INSERT_STRING(s, s.strstart, hash_head); ***/
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
      /***/
    }

    /* Find the longest match, discarding those <= prev_length.
     */
    s.prev_length = s.match_length;
    s.prev_match = s.match_start;
    s.match_length = MIN_MATCH - 1;

    if (hash_head !== 0/*NIL*/ && s.prev_length < s.max_lazy_match &&
        s.strstart - hash_head <= (s.w_size - MIN_LOOKAHEAD)/*MAX_DIST(s)*/) {
      /* To simplify the code, we prevent matches with the string
       * of window index 0 (in particular we have to avoid a match
       * of the string with itself at the start of the input file).
       */
      s.match_length = longest_match(s, hash_head);
      /* longest_match() sets match_start */

      if (s.match_length <= 5 &&
         (s.strategy === Z_FILTERED || (s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096/*TOO_FAR*/))) {

        /* If prev_match is also MIN_MATCH, match_start is garbage
         * but we will ignore the current match anyway.
         */
        s.match_length = MIN_MATCH - 1;
      }
    }
    /* If there was a match at the previous step and the current
     * match is not better, output the previous match:
     */
    if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
      max_insert = s.strstart + s.lookahead - MIN_MATCH;
      /* Do not insert strings in hash table beyond this. */

      //check_match(s, s.strstart-1, s.prev_match, s.prev_length);

      /***_tr_tally_dist(s, s.strstart - 1 - s.prev_match,
                     s.prev_length - MIN_MATCH, bflush);***/
      bflush = trees._tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
      /* Insert in hash table all strings up to the end of the match.
       * strstart-1 and strstart are already inserted. If there is not
       * enough lookahead, the last two strings are not inserted in
       * the hash table.
       */
      s.lookahead -= s.prev_length - 1;
      s.prev_length -= 2;
      do {
        if (++s.strstart <= max_insert) {
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
        }
      } while (--s.prev_length !== 0);
      s.match_available = 0;
      s.match_length = MIN_MATCH - 1;
      s.strstart++;

      if (bflush) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }

    } else if (s.match_available) {
      /* If there was no match at the previous position, output a
       * single literal. If there was a match but the current match
       * is longer, truncate the previous match to a single literal.
       */
      //Tracevv((stderr,"%c", s->window[s->strstart-1]));
      /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
      bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);

      if (bflush) {
        /*** FLUSH_BLOCK_ONLY(s, 0) ***/
        flush_block_only(s, false);
        /***/
      }
      s.strstart++;
      s.lookahead--;
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    } else {
      /* There is no previous match to compare with, wait for
       * the next step to decide.
       */
      s.match_available = 1;
      s.strstart++;
      s.lookahead--;
    }
  }
  //Assert (flush != Z_NO_FLUSH, "no flush?");
  if (s.match_available) {
    //Tracevv((stderr,"%c", s->window[s->strstart-1]));
    /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
    bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);

    s.match_available = 0;
  }
  s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }

  return BS_BLOCK_DONE;
}


/* ===========================================================================
 * For Z_RLE, simply look for runs of bytes, generate matches only of distance
 * one.  Do not maintain a hash table.  (It will be regenerated if this run of
 * deflate switches away from Z_RLE.)
 */
function deflate_rle(s, flush) {
  var bflush;            /* set if current block must be flushed */
  var prev;              /* byte at distance one to match */
  var scan, strend;      /* scan goes up to strend for length of run */

  var _win = s.window;

  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the longest run, plus one for the unrolled loop.
     */
    if (s.lookahead <= MAX_MATCH) {
      fill_window(s);
      if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) { break; } /* flush the current block */
    }

    /* See how many times the previous byte repeats */
    s.match_length = 0;
    if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
      scan = s.strstart - 1;
      prev = _win[scan];
      if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
        strend = s.strstart + MAX_MATCH;
        do {
          /*jshint noempty:false*/
        } while (prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 scan < strend);
        s.match_length = MAX_MATCH - (strend - scan);
        if (s.match_length > s.lookahead) {
          s.match_length = s.lookahead;
        }
      }
      //Assert(scan <= s->window+(uInt)(s->window_size-1), "wild scan");
    }

    /* Emit match if have run of MIN_MATCH or longer, else emit literal */
    if (s.match_length >= MIN_MATCH) {
      //check_match(s, s.strstart, s.strstart - 1, s.match_length);

      /*** _tr_tally_dist(s, 1, s.match_length - MIN_MATCH, bflush); ***/
      bflush = trees._tr_tally(s, 1, s.match_length - MIN_MATCH);

      s.lookahead -= s.match_length;
      s.strstart += s.match_length;
      s.match_length = 0;
    } else {
      /* No match, output a literal byte */
      //Tracevv((stderr,"%c", s->window[s->strstart]));
      /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
      bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }
  return BS_BLOCK_DONE;
}

/* ===========================================================================
 * For Z_HUFFMAN_ONLY, do not look for matches.  Do not maintain a hash table.
 * (It will be regenerated if this run of deflate switches away from Huffman.)
 */
function deflate_huff(s, flush) {
  var bflush;             /* set if current block must be flushed */

  for (;;) {
    /* Make sure that we have a literal to write. */
    if (s.lookahead === 0) {
      fill_window(s);
      if (s.lookahead === 0) {
        if (flush === Z_NO_FLUSH) {
          return BS_NEED_MORE;
        }
        break;      /* flush the current block */
      }
    }

    /* Output a literal byte */
    s.match_length = 0;
    //Tracevv((stderr,"%c", s->window[s->strstart]));
    /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
    bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
    s.lookahead--;
    s.strstart++;
    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }
  return BS_BLOCK_DONE;
}

/* Values for max_lazy_match, good_match and max_chain_length, depending on
 * the desired pack level (0..9). The values given below have been tuned to
 * exclude worst case performance for pathological files. Better values may be
 * found for specific files.
 */
function Config(good_length, max_lazy, nice_length, max_chain, func) {
  this.good_length = good_length;
  this.max_lazy = max_lazy;
  this.nice_length = nice_length;
  this.max_chain = max_chain;
  this.func = func;
}

var configuration_table;

configuration_table = [
  /*      good lazy nice chain */
  new Config(0, 0, 0, 0, deflate_stored),          /* 0 store only */
  new Config(4, 4, 8, 4, deflate_fast),            /* 1 max speed, no lazy matches */
  new Config(4, 5, 16, 8, deflate_fast),           /* 2 */
  new Config(4, 6, 32, 32, deflate_fast),          /* 3 */

  new Config(4, 4, 16, 16, deflate_slow),          /* 4 lazy matches */
  new Config(8, 16, 32, 32, deflate_slow),         /* 5 */
  new Config(8, 16, 128, 128, deflate_slow),       /* 6 */
  new Config(8, 32, 128, 256, deflate_slow),       /* 7 */
  new Config(32, 128, 258, 1024, deflate_slow),    /* 8 */
  new Config(32, 258, 258, 4096, deflate_slow)     /* 9 max compression */
];


/* ===========================================================================
 * Initialize the "longest match" routines for a new zlib stream
 */
function lm_init(s) {
  s.window_size = 2 * s.w_size;

  /*** CLEAR_HASH(s); ***/
  zero(s.head); // Fill with NIL (= 0);

  /* Set the default configuration parameters:
   */
  s.max_lazy_match = configuration_table[s.level].max_lazy;
  s.good_match = configuration_table[s.level].good_length;
  s.nice_match = configuration_table[s.level].nice_length;
  s.max_chain_length = configuration_table[s.level].max_chain;

  s.strstart = 0;
  s.block_start = 0;
  s.lookahead = 0;
  s.insert = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  s.ins_h = 0;
}


function DeflateState() {
  this.strm = null;            /* pointer back to this zlib stream */
  this.status = 0;            /* as the name implies */
  this.pending_buf = null;      /* output still pending */
  this.pending_buf_size = 0;  /* size of pending_buf */
  this.pending_out = 0;       /* next pending byte to output to the stream */
  this.pending = 0;           /* nb of bytes in the pending buffer */
  this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
  this.gzhead = null;         /* gzip header information to write */
  this.gzindex = 0;           /* where in extra, name, or comment */
  this.method = Z_DEFLATED; /* can only be DEFLATED */
  this.last_flush = -1;   /* value of flush param for previous deflate call */

  this.w_size = 0;  /* LZ77 window size (32K by default) */
  this.w_bits = 0;  /* log2(w_size)  (8..16) */
  this.w_mask = 0;  /* w_size - 1 */

  this.window = null;
  /* Sliding window. Input bytes are read into the second half of the window,
   * and move to the first half later to keep a dictionary of at least wSize
   * bytes. With this organization, matches are limited to a distance of
   * wSize-MAX_MATCH bytes, but this ensures that IO is always
   * performed with a length multiple of the block size.
   */

  this.window_size = 0;
  /* Actual size of window: 2*wSize, except when the user input buffer
   * is directly used as sliding window.
   */

  this.prev = null;
  /* Link to older string with same hash index. To limit the size of this
   * array to 64K, this link is maintained only for the last 32K strings.
   * An index in this array is thus a window index modulo 32K.
   */

  this.head = null;   /* Heads of the hash chains or NIL. */

  this.ins_h = 0;       /* hash index of string to be inserted */
  this.hash_size = 0;   /* number of elements in hash table */
  this.hash_bits = 0;   /* log2(hash_size) */
  this.hash_mask = 0;   /* hash_size-1 */

  this.hash_shift = 0;
  /* Number of bits by which ins_h must be shifted at each input
   * step. It must be such that after MIN_MATCH steps, the oldest
   * byte no longer takes part in the hash key, that is:
   *   hash_shift * MIN_MATCH >= hash_bits
   */

  this.block_start = 0;
  /* Window position at the beginning of the current output block. Gets
   * negative when the window is moved backwards.
   */

  this.match_length = 0;      /* length of best match */
  this.prev_match = 0;        /* previous match */
  this.match_available = 0;   /* set if previous match exists */
  this.strstart = 0;          /* start of string to insert */
  this.match_start = 0;       /* start of matching string */
  this.lookahead = 0;         /* number of valid bytes ahead in window */

  this.prev_length = 0;
  /* Length of the best match at previous step. Matches not greater than this
   * are discarded. This is used in the lazy match evaluation.
   */

  this.max_chain_length = 0;
  /* To speed up deflation, hash chains are never searched beyond this
   * length.  A higher limit improves compression ratio but degrades the
   * speed.
   */

  this.max_lazy_match = 0;
  /* Attempt to find a better match only when the current match is strictly
   * smaller than this value. This mechanism is used only for compression
   * levels >= 4.
   */
  // That's alias to max_lazy_match, don't use directly
  //this.max_insert_length = 0;
  /* Insert new strings in the hash table only if the match length is not
   * greater than this length. This saves time but degrades compression.
   * max_insert_length is used only for compression levels <= 3.
   */

  this.level = 0;     /* compression level (1..9) */
  this.strategy = 0;  /* favor or force Huffman coding*/

  this.good_match = 0;
  /* Use a faster search when the previous match is longer than this */

  this.nice_match = 0; /* Stop searching when current match exceeds this */

              /* used by trees.c: */

  /* Didn't use ct_data typedef below to suppress compiler warning */

  // struct ct_data_s dyn_ltree[HEAP_SIZE];   /* literal and length tree */
  // struct ct_data_s dyn_dtree[2*D_CODES+1]; /* distance tree */
  // struct ct_data_s bl_tree[2*BL_CODES+1];  /* Huffman tree for bit lengths */

  // Use flat array of DOUBLE size, with interleaved fata,
  // because JS does not support effective
  this.dyn_ltree  = new utils.Buf16(HEAP_SIZE * 2);
  this.dyn_dtree  = new utils.Buf16((2 * D_CODES + 1) * 2);
  this.bl_tree    = new utils.Buf16((2 * BL_CODES + 1) * 2);
  zero(this.dyn_ltree);
  zero(this.dyn_dtree);
  zero(this.bl_tree);

  this.l_desc   = null;         /* desc. for literal tree */
  this.d_desc   = null;         /* desc. for distance tree */
  this.bl_desc  = null;         /* desc. for bit length tree */

  //ush bl_count[MAX_BITS+1];
  this.bl_count = new utils.Buf16(MAX_BITS + 1);
  /* number of codes at each bit length for an optimal tree */

  //int heap[2*L_CODES+1];      /* heap used to build the Huffman trees */
  this.heap = new utils.Buf16(2 * L_CODES + 1);  /* heap used to build the Huffman trees */
  zero(this.heap);

  this.heap_len = 0;               /* number of elements in the heap */
  this.heap_max = 0;               /* element of largest frequency */
  /* The sons of heap[n] are heap[2*n] and heap[2*n+1]. heap[0] is not used.
   * The same heap array is used to build all trees.
   */

  this.depth = new utils.Buf16(2 * L_CODES + 1); //uch depth[2*L_CODES+1];
  zero(this.depth);
  /* Depth of each subtree used as tie breaker for trees of equal frequency
   */

  this.l_buf = 0;          /* buffer index for literals or lengths */

  this.lit_bufsize = 0;
  /* Size of match buffer for literals/lengths.  There are 4 reasons for
   * limiting lit_bufsize to 64K:
   *   - frequencies can be kept in 16 bit counters
   *   - if compression is not successful for the first block, all input
   *     data is still in the window so we can still emit a stored block even
   *     when input comes from standard input.  (This can also be done for
   *     all blocks if lit_bufsize is not greater than 32K.)
   *   - if compression is not successful for a file smaller than 64K, we can
   *     even emit a stored file instead of a stored block (saving 5 bytes).
   *     This is applicable only for zip (not gzip or zlib).
   *   - creating new Huffman trees less frequently may not provide fast
   *     adaptation to changes in the input data statistics. (Take for
   *     example a binary file with poorly compressible code followed by
   *     a highly compressible string table.) Smaller buffer sizes give
   *     fast adaptation but have of course the overhead of transmitting
   *     trees more frequently.
   *   - I can't count above 4
   */

  this.last_lit = 0;      /* running index in l_buf */

  this.d_buf = 0;
  /* Buffer index for distances. To simplify the code, d_buf and l_buf have
   * the same number of elements. To use different lengths, an extra flag
   * array would be necessary.
   */

  this.opt_len = 0;       /* bit length of current block with optimal trees */
  this.static_len = 0;    /* bit length of current block with static trees */
  this.matches = 0;       /* number of string matches in current block */
  this.insert = 0;        /* bytes at end of window left to insert */


  this.bi_buf = 0;
  /* Output buffer. bits are inserted starting at the bottom (least
   * significant bits).
   */
  this.bi_valid = 0;
  /* Number of valid bits in bi_buf.  All bits above the last valid bit
   * are always zero.
   */

  // Used for window memory init. We safely ignore it for JS. That makes
  // sense only for pointers and memory check tools.
  //this.high_water = 0;
  /* High water mark offset in window for initialized bytes -- bytes above
   * this are set to zero in order to avoid memory check warnings when
   * longest match routines access bytes past the input.  This is then
   * updated to the new high water mark.
   */
}


function deflateResetKeep(strm) {
  var s;

  if (!strm || !strm.state) {
    return err(strm, Z_STREAM_ERROR);
  }

  strm.total_in = strm.total_out = 0;
  strm.data_type = Z_UNKNOWN;

  s = strm.state;
  s.pending = 0;
  s.pending_out = 0;

  if (s.wrap < 0) {
    s.wrap = -s.wrap;
    /* was made negative by deflate(..., Z_FINISH); */
  }
  s.status = (s.wrap ? INIT_STATE : BUSY_STATE);
  strm.adler = (s.wrap === 2) ?
    0  // crc32(0, Z_NULL, 0)
  :
    1; // adler32(0, Z_NULL, 0)
  s.last_flush = Z_NO_FLUSH;
  trees._tr_init(s);
  return Z_OK;
}


function deflateReset(strm) {
  var ret = deflateResetKeep(strm);
  if (ret === Z_OK) {
    lm_init(strm.state);
  }
  return ret;
}


function deflateSetHeader(strm, head) {
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  if (strm.state.wrap !== 2) { return Z_STREAM_ERROR; }
  strm.state.gzhead = head;
  return Z_OK;
}


function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
  if (!strm) { // === Z_NULL
    return Z_STREAM_ERROR;
  }
  var wrap = 1;

  if (level === Z_DEFAULT_COMPRESSION) {
    level = 6;
  }

  if (windowBits < 0) { /* suppress zlib wrapper */
    wrap = 0;
    windowBits = -windowBits;
  }

  else if (windowBits > 15) {
    wrap = 2;           /* write gzip wrapper instead */
    windowBits -= 16;
  }


  if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED ||
    windowBits < 8 || windowBits > 15 || level < 0 || level > 9 ||
    strategy < 0 || strategy > Z_FIXED) {
    return err(strm, Z_STREAM_ERROR);
  }


  if (windowBits === 8) {
    windowBits = 9;
  }
  /* until 256-byte window bug fixed */

  var s = new DeflateState();

  strm.state = s;
  s.strm = strm;

  s.wrap = wrap;
  s.gzhead = null;
  s.w_bits = windowBits;
  s.w_size = 1 << s.w_bits;
  s.w_mask = s.w_size - 1;

  s.hash_bits = memLevel + 7;
  s.hash_size = 1 << s.hash_bits;
  s.hash_mask = s.hash_size - 1;
  s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);

  s.window = new utils.Buf8(s.w_size * 2);
  s.head = new utils.Buf16(s.hash_size);
  s.prev = new utils.Buf16(s.w_size);

  // Don't need mem init magic for JS.
  //s.high_water = 0;  /* nothing written to s->window yet */

  s.lit_bufsize = 1 << (memLevel + 6); /* 16K elements by default */

  s.pending_buf_size = s.lit_bufsize * 4;

  //overlay = (ushf *) ZALLOC(strm, s->lit_bufsize, sizeof(ush)+2);
  //s->pending_buf = (uchf *) overlay;
  s.pending_buf = new utils.Buf8(s.pending_buf_size);

  // It is offset from `s.pending_buf` (size is `s.lit_bufsize * 2`)
  //s->d_buf = overlay + s->lit_bufsize/sizeof(ush);
  s.d_buf = 1 * s.lit_bufsize;

  //s->l_buf = s->pending_buf + (1+sizeof(ush))*s->lit_bufsize;
  s.l_buf = (1 + 2) * s.lit_bufsize;

  s.level = level;
  s.strategy = strategy;
  s.method = method;

  return deflateReset(strm);
}

function deflateInit(strm, level) {
  return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY);
}


function deflate(strm, flush) {
  var old_flush, s;
  var beg, val; // for gzip header write only

  if (!strm || !strm.state ||
    flush > Z_BLOCK || flush < 0) {
    return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
  }

  s = strm.state;

  if (!strm.output ||
      (!strm.input && strm.avail_in !== 0) ||
      (s.status === FINISH_STATE && flush !== Z_FINISH)) {
    return err(strm, (strm.avail_out === 0) ? Z_BUF_ERROR : Z_STREAM_ERROR);
  }

  s.strm = strm; /* just in case */
  old_flush = s.last_flush;
  s.last_flush = flush;

  /* Write the header */
  if (s.status === INIT_STATE) {

    if (s.wrap === 2) { // GZIP header
      strm.adler = 0;  //crc32(0L, Z_NULL, 0);
      put_byte(s, 31);
      put_byte(s, 139);
      put_byte(s, 8);
      if (!s.gzhead) { // s->gzhead == Z_NULL
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, s.level === 9 ? 2 :
                    (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                     4 : 0));
        put_byte(s, OS_CODE);
        s.status = BUSY_STATE;
      }
      else {
        put_byte(s, (s.gzhead.text ? 1 : 0) +
                    (s.gzhead.hcrc ? 2 : 0) +
                    (!s.gzhead.extra ? 0 : 4) +
                    (!s.gzhead.name ? 0 : 8) +
                    (!s.gzhead.comment ? 0 : 16)
                );
        put_byte(s, s.gzhead.time & 0xff);
        put_byte(s, (s.gzhead.time >> 8) & 0xff);
        put_byte(s, (s.gzhead.time >> 16) & 0xff);
        put_byte(s, (s.gzhead.time >> 24) & 0xff);
        put_byte(s, s.level === 9 ? 2 :
                    (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                     4 : 0));
        put_byte(s, s.gzhead.os & 0xff);
        if (s.gzhead.extra && s.gzhead.extra.length) {
          put_byte(s, s.gzhead.extra.length & 0xff);
          put_byte(s, (s.gzhead.extra.length >> 8) & 0xff);
        }
        if (s.gzhead.hcrc) {
          strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
        }
        s.gzindex = 0;
        s.status = EXTRA_STATE;
      }
    }
    else // DEFLATE header
    {
      var header = (Z_DEFLATED + ((s.w_bits - 8) << 4)) << 8;
      var level_flags = -1;

      if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
        level_flags = 0;
      } else if (s.level < 6) {
        level_flags = 1;
      } else if (s.level === 6) {
        level_flags = 2;
      } else {
        level_flags = 3;
      }
      header |= (level_flags << 6);
      if (s.strstart !== 0) { header |= PRESET_DICT; }
      header += 31 - (header % 31);

      s.status = BUSY_STATE;
      putShortMSB(s, header);

      /* Save the adler32 of the preset dictionary: */
      if (s.strstart !== 0) {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 0xffff);
      }
      strm.adler = 1; // adler32(0L, Z_NULL, 0);
    }
  }

//#ifdef GZIP
  if (s.status === EXTRA_STATE) {
    if (s.gzhead.extra/* != Z_NULL*/) {
      beg = s.pending;  /* start of bytes to update crc */

      while (s.gzindex < (s.gzhead.extra.length & 0xffff)) {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            break;
          }
        }
        put_byte(s, s.gzhead.extra[s.gzindex] & 0xff);
        s.gzindex++;
      }
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (s.gzindex === s.gzhead.extra.length) {
        s.gzindex = 0;
        s.status = NAME_STATE;
      }
    }
    else {
      s.status = NAME_STATE;
    }
  }
  if (s.status === NAME_STATE) {
    if (s.gzhead.name/* != Z_NULL*/) {
      beg = s.pending;  /* start of bytes to update crc */
      //int val;

      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            val = 1;
            break;
          }
        }
        // JS specific: little magic to add zero terminator to end of string
        if (s.gzindex < s.gzhead.name.length) {
          val = s.gzhead.name.charCodeAt(s.gzindex++) & 0xff;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);

      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (val === 0) {
        s.gzindex = 0;
        s.status = COMMENT_STATE;
      }
    }
    else {
      s.status = COMMENT_STATE;
    }
  }
  if (s.status === COMMENT_STATE) {
    if (s.gzhead.comment/* != Z_NULL*/) {
      beg = s.pending;  /* start of bytes to update crc */
      //int val;

      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            val = 1;
            break;
          }
        }
        // JS specific: little magic to add zero terminator to end of string
        if (s.gzindex < s.gzhead.comment.length) {
          val = s.gzhead.comment.charCodeAt(s.gzindex++) & 0xff;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);

      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (val === 0) {
        s.status = HCRC_STATE;
      }
    }
    else {
      s.status = HCRC_STATE;
    }
  }
  if (s.status === HCRC_STATE) {
    if (s.gzhead.hcrc) {
      if (s.pending + 2 > s.pending_buf_size) {
        flush_pending(strm);
      }
      if (s.pending + 2 <= s.pending_buf_size) {
        put_byte(s, strm.adler & 0xff);
        put_byte(s, (strm.adler >> 8) & 0xff);
        strm.adler = 0; //crc32(0L, Z_NULL, 0);
        s.status = BUSY_STATE;
      }
    }
    else {
      s.status = BUSY_STATE;
    }
  }
//#endif

  /* Flush as much pending output as possible */
  if (s.pending !== 0) {
    flush_pending(strm);
    if (strm.avail_out === 0) {
      /* Since avail_out is 0, deflate will be called again with
       * more output space, but possibly with both pending and
       * avail_in equal to zero. There won't be anything to do,
       * but this is not an error situation so make sure we
       * return OK instead of BUF_ERROR at next call of deflate:
       */
      s.last_flush = -1;
      return Z_OK;
    }

    /* Make sure there is something to do and avoid duplicate consecutive
     * flushes. For repeated and useless calls with Z_FINISH, we keep
     * returning Z_STREAM_END instead of Z_BUF_ERROR.
     */
  } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) &&
    flush !== Z_FINISH) {
    return err(strm, Z_BUF_ERROR);
  }

  /* User must not provide more input after the first FINISH: */
  if (s.status === FINISH_STATE && strm.avail_in !== 0) {
    return err(strm, Z_BUF_ERROR);
  }

  /* Start a new block or continue the current one.
   */
  if (strm.avail_in !== 0 || s.lookahead !== 0 ||
    (flush !== Z_NO_FLUSH && s.status !== FINISH_STATE)) {
    var bstate = (s.strategy === Z_HUFFMAN_ONLY) ? deflate_huff(s, flush) :
      (s.strategy === Z_RLE ? deflate_rle(s, flush) :
        configuration_table[s.level].func(s, flush));

    if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
      s.status = FINISH_STATE;
    }
    if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
      if (strm.avail_out === 0) {
        s.last_flush = -1;
        /* avoid BUF_ERROR next call, see above */
      }
      return Z_OK;
      /* If flush != Z_NO_FLUSH && avail_out == 0, the next call
       * of deflate should use the same flush parameter to make sure
       * that the flush is complete. So we don't have to output an
       * empty block here, this will be done at next call. This also
       * ensures that for a very small output buffer, we emit at most
       * one empty block.
       */
    }
    if (bstate === BS_BLOCK_DONE) {
      if (flush === Z_PARTIAL_FLUSH) {
        trees._tr_align(s);
      }
      else if (flush !== Z_BLOCK) { /* FULL_FLUSH or SYNC_FLUSH */

        trees._tr_stored_block(s, 0, 0, false);
        /* For a full flush, this empty block will be recognized
         * as a special marker by inflate_sync().
         */
        if (flush === Z_FULL_FLUSH) {
          /*** CLEAR_HASH(s); ***/             /* forget history */
          zero(s.head); // Fill with NIL (= 0);

          if (s.lookahead === 0) {
            s.strstart = 0;
            s.block_start = 0;
            s.insert = 0;
          }
        }
      }
      flush_pending(strm);
      if (strm.avail_out === 0) {
        s.last_flush = -1; /* avoid BUF_ERROR at next call, see above */
        return Z_OK;
      }
    }
  }
  //Assert(strm->avail_out > 0, "bug2");
  //if (strm.avail_out <= 0) { throw new Error("bug2");}

  if (flush !== Z_FINISH) { return Z_OK; }
  if (s.wrap <= 0) { return Z_STREAM_END; }

  /* Write the trailer */
  if (s.wrap === 2) {
    put_byte(s, strm.adler & 0xff);
    put_byte(s, (strm.adler >> 8) & 0xff);
    put_byte(s, (strm.adler >> 16) & 0xff);
    put_byte(s, (strm.adler >> 24) & 0xff);
    put_byte(s, strm.total_in & 0xff);
    put_byte(s, (strm.total_in >> 8) & 0xff);
    put_byte(s, (strm.total_in >> 16) & 0xff);
    put_byte(s, (strm.total_in >> 24) & 0xff);
  }
  else
  {
    putShortMSB(s, strm.adler >>> 16);
    putShortMSB(s, strm.adler & 0xffff);
  }

  flush_pending(strm);
  /* If avail_out is zero, the application will call deflate again
   * to flush the rest.
   */
  if (s.wrap > 0) { s.wrap = -s.wrap; }
  /* write the trailer only once! */
  return s.pending !== 0 ? Z_OK : Z_STREAM_END;
}

function deflateEnd(strm) {
  var status;

  if (!strm/*== Z_NULL*/ || !strm.state/*== Z_NULL*/) {
    return Z_STREAM_ERROR;
  }

  status = strm.state.status;
  if (status !== INIT_STATE &&
    status !== EXTRA_STATE &&
    status !== NAME_STATE &&
    status !== COMMENT_STATE &&
    status !== HCRC_STATE &&
    status !== BUSY_STATE &&
    status !== FINISH_STATE
  ) {
    return err(strm, Z_STREAM_ERROR);
  }

  strm.state = null;

  return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK;
}


/* =========================================================================
 * Initializes the compression dictionary from the given byte
 * sequence without producing any compressed output.
 */
function deflateSetDictionary(strm, dictionary) {
  var dictLength = dictionary.length;

  var s;
  var str, n;
  var wrap;
  var avail;
  var next;
  var input;
  var tmpDict;

  if (!strm/*== Z_NULL*/ || !strm.state/*== Z_NULL*/) {
    return Z_STREAM_ERROR;
  }

  s = strm.state;
  wrap = s.wrap;

  if (wrap === 2 || (wrap === 1 && s.status !== INIT_STATE) || s.lookahead) {
    return Z_STREAM_ERROR;
  }

  /* when using zlib wrappers, compute Adler-32 for provided dictionary */
  if (wrap === 1) {
    /* adler32(strm->adler, dictionary, dictLength); */
    strm.adler = adler32(strm.adler, dictionary, dictLength, 0);
  }

  s.wrap = 0;   /* avoid computing Adler-32 in read_buf */

  /* if dictionary would fill window, just replace the history */
  if (dictLength >= s.w_size) {
    if (wrap === 0) {            /* already empty otherwise */
      /*** CLEAR_HASH(s); ***/
      zero(s.head); // Fill with NIL (= 0);
      s.strstart = 0;
      s.block_start = 0;
      s.insert = 0;
    }
    /* use the tail */
    // dictionary = dictionary.slice(dictLength - s.w_size);
    tmpDict = new utils.Buf8(s.w_size);
    utils.arraySet(tmpDict, dictionary, dictLength - s.w_size, s.w_size, 0);
    dictionary = tmpDict;
    dictLength = s.w_size;
  }
  /* insert dictionary into window and hash */
  avail = strm.avail_in;
  next = strm.next_in;
  input = strm.input;
  strm.avail_in = dictLength;
  strm.next_in = 0;
  strm.input = dictionary;
  fill_window(s);
  while (s.lookahead >= MIN_MATCH) {
    str = s.strstart;
    n = s.lookahead - (MIN_MATCH - 1);
    do {
      /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;

      s.prev[str & s.w_mask] = s.head[s.ins_h];

      s.head[s.ins_h] = str;
      str++;
    } while (--n);
    s.strstart = str;
    s.lookahead = MIN_MATCH - 1;
    fill_window(s);
  }
  s.strstart += s.lookahead;
  s.block_start = s.strstart;
  s.insert = s.lookahead;
  s.lookahead = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  strm.next_in = next;
  strm.input = input;
  strm.avail_in = avail;
  s.wrap = wrap;
  return Z_OK;
}


exports.deflateInit = deflateInit;
exports.deflateInit2 = deflateInit2;
exports.deflateReset = deflateReset;
exports.deflateResetKeep = deflateResetKeep;
exports.deflateSetHeader = deflateSetHeader;
exports.deflate = deflate;
exports.deflateEnd = deflateEnd;
exports.deflateSetDictionary = deflateSetDictionary;
exports.deflateInfo = 'pako deflate (from Nodeca project)';

/* Not implemented
exports.deflateBound = deflateBound;
exports.deflateCopy = deflateCopy;
exports.deflateParams = deflateParams;
exports.deflatePending = deflatePending;
exports.deflatePrime = deflatePrime;
exports.deflateTune = deflateTune;
*/

},{"../utils/common":101,"./adler32":103,"./crc32":105,"./messages":111,"./trees":112}],107:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

function GZheader() {
  /* true if compressed data believed to be text */
  this.text       = 0;
  /* modification time */
  this.time       = 0;
  /* extra flags (not used when writing a gzip file) */
  this.xflags     = 0;
  /* operating system */
  this.os         = 0;
  /* pointer to extra field or Z_NULL if none */
  this.extra      = null;
  /* extra field length (valid if extra != Z_NULL) */
  this.extra_len  = 0; // Actually, we don't need it in JS,
                       // but leave for few code modifications

  //
  // Setup limits is not necessary because in js we should not preallocate memory
  // for inflate use constant limit in 65536 bytes
  //

  /* space at extra (only when reading header) */
  // this.extra_max  = 0;
  /* pointer to zero-terminated file name or Z_NULL */
  this.name       = '';
  /* space at name (only when reading header) */
  // this.name_max   = 0;
  /* pointer to zero-terminated comment or Z_NULL */
  this.comment    = '';
  /* space at comment (only when reading header) */
  // this.comm_max   = 0;
  /* true if there was or will be a header crc */
  this.hcrc       = 0;
  /* true when done reading gzip header (not used when writing a gzip file) */
  this.done       = false;
}

module.exports = GZheader;

},{}],108:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

// See state defs from inflate.js
var BAD = 30;       /* got a data error -- remain here until reset */
var TYPE = 12;      /* i: waiting for type bits, including last-flag bit */

/*
   Decode literal, length, and distance codes and write out the resulting
   literal and match bytes until either not enough input or output is
   available, an end-of-block is encountered, or a data error is encountered.
   When large enough input and output buffers are supplied to inflate(), for
   example, a 16K input buffer and a 64K output buffer, more than 95% of the
   inflate execution time is spent in this routine.

   Entry assumptions:

        state.mode === LEN
        strm.avail_in >= 6
        strm.avail_out >= 258
        start >= strm.avail_out
        state.bits < 8

   On return, state.mode is one of:

        LEN -- ran out of enough output space or enough available input
        TYPE -- reached end of block code, inflate() to interpret next block
        BAD -- error in block data

   Notes:

    - The maximum input bits used by a length/distance pair is 15 bits for the
      length code, 5 bits for the length extra, 15 bits for the distance code,
      and 13 bits for the distance extra.  This totals 48 bits, or six bytes.
      Therefore if strm.avail_in >= 6, then there is enough input to avoid
      checking for available input while decoding.

    - The maximum bytes that a single length/distance pair can output is 258
      bytes, which is the maximum length that can be coded.  inflate_fast()
      requires strm.avail_out >= 258 for each loop to avoid checking for
      output space.
 */
module.exports = function inflate_fast(strm, start) {
  var state;
  var _in;                    /* local strm.input */
  var last;                   /* have enough input while in < last */
  var _out;                   /* local strm.output */
  var beg;                    /* inflate()'s initial strm.output */
  var end;                    /* while out < end, enough space available */
//#ifdef INFLATE_STRICT
  var dmax;                   /* maximum distance from zlib header */
//#endif
  var wsize;                  /* window size or zero if not using window */
  var whave;                  /* valid bytes in the window */
  var wnext;                  /* window write index */
  // Use `s_window` instead `window`, avoid conflict with instrumentation tools
  var s_window;               /* allocated sliding window, if wsize != 0 */
  var hold;                   /* local strm.hold */
  var bits;                   /* local strm.bits */
  var lcode;                  /* local strm.lencode */
  var dcode;                  /* local strm.distcode */
  var lmask;                  /* mask for first level of length codes */
  var dmask;                  /* mask for first level of distance codes */
  var here;                   /* retrieved table entry */
  var op;                     /* code bits, operation, extra bits, or */
                              /*  window position, window bytes to copy */
  var len;                    /* match length, unused bytes */
  var dist;                   /* match distance */
  var from;                   /* where to copy match from */
  var from_source;


  var input, output; // JS specific, because we have no pointers

  /* copy state to local variables */
  state = strm.state;
  //here = state.here;
  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257);
//#ifdef INFLATE_STRICT
  dmax = state.dmax;
//#endif
  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  s_window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;


  /* decode literals and length/distances until end-of-block or not enough
     input data or output space */

  top:
  do {
    if (bits < 15) {
      hold += input[_in++] << bits;
      bits += 8;
      hold += input[_in++] << bits;
      bits += 8;
    }

    here = lcode[hold & lmask];

    dolen:
    for (;;) { // Goto emulation
      op = here >>> 24/*here.bits*/;
      hold >>>= op;
      bits -= op;
      op = (here >>> 16) & 0xff/*here.op*/;
      if (op === 0) {                          /* literal */
        //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
        //        "inflate:         literal '%c'\n" :
        //        "inflate:         literal 0x%02x\n", here.val));
        output[_out++] = here & 0xffff/*here.val*/;
      }
      else if (op & 16) {                     /* length base */
        len = here & 0xffff/*here.val*/;
        op &= 15;                           /* number of extra bits */
        if (op) {
          if (bits < op) {
            hold += input[_in++] << bits;
            bits += 8;
          }
          len += hold & ((1 << op) - 1);
          hold >>>= op;
          bits -= op;
        }
        //Tracevv((stderr, "inflate:         length %u\n", len));
        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }
        here = dcode[hold & dmask];

        dodist:
        for (;;) { // goto emulation
          op = here >>> 24/*here.bits*/;
          hold >>>= op;
          bits -= op;
          op = (here >>> 16) & 0xff/*here.op*/;

          if (op & 16) {                      /* distance base */
            dist = here & 0xffff/*here.val*/;
            op &= 15;                       /* number of extra bits */
            if (bits < op) {
              hold += input[_in++] << bits;
              bits += 8;
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
            }
            dist += hold & ((1 << op) - 1);
//#ifdef INFLATE_STRICT
            if (dist > dmax) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD;
              break top;
            }
//#endif
            hold >>>= op;
            bits -= op;
            //Tracevv((stderr, "inflate:         distance %u\n", dist));
            op = _out - beg;                /* max distance in output */
            if (dist > op) {                /* see if copy from window */
              op = dist - op;               /* distance back in window */
              if (op > whave) {
                if (state.sane) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD;
                  break top;
                }

// (!) This block is disabled in zlib defaults,
// don't enable it for binary compatibility
//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
//                if (len <= op - whave) {
//                  do {
//                    output[_out++] = 0;
//                  } while (--len);
//                  continue top;
//                }
//                len -= op - whave;
//                do {
//                  output[_out++] = 0;
//                } while (--op > whave);
//                if (op === 0) {
//                  from = _out - dist;
//                  do {
//                    output[_out++] = output[from++];
//                  } while (--len);
//                  continue top;
//                }
//#endif
              }
              from = 0; // window index
              from_source = s_window;
              if (wnext === 0) {           /* very common case */
                from += wsize - op;
                if (op < len) {         /* some from window */
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = _out - dist;  /* rest from output */
                  from_source = output;
                }
              }
              else if (wnext < op) {      /* wrap around window */
                from += wsize + wnext - op;
                op -= wnext;
                if (op < len) {         /* some from end of window */
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = 0;
                  if (wnext < len) {  /* some from start of window */
                    op = wnext;
                    len -= op;
                    do {
                      output[_out++] = s_window[from++];
                    } while (--op);
                    from = _out - dist;      /* rest from output */
                    from_source = output;
                  }
                }
              }
              else {                      /* contiguous in window */
                from += wnext - op;
                if (op < len) {         /* some from window */
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = _out - dist;  /* rest from output */
                  from_source = output;
                }
              }
              while (len > 2) {
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                len -= 3;
              }
              if (len) {
                output[_out++] = from_source[from++];
                if (len > 1) {
                  output[_out++] = from_source[from++];
                }
              }
            }
            else {
              from = _out - dist;          /* copy direct from output */
              do {                        /* minimum length is three */
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                len -= 3;
              } while (len > 2);
              if (len) {
                output[_out++] = output[from++];
                if (len > 1) {
                  output[_out++] = output[from++];
                }
              }
            }
          }
          else if ((op & 64) === 0) {          /* 2nd level distance code */
            here = dcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
            continue dodist;
          }
          else {
            strm.msg = 'invalid distance code';
            state.mode = BAD;
            break top;
          }

          break; // need to emulate goto via "continue"
        }
      }
      else if ((op & 64) === 0) {              /* 2nd level length code */
        here = lcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
        continue dolen;
      }
      else if (op & 32) {                     /* end-of-block */
        //Tracevv((stderr, "inflate:         end of block\n"));
        state.mode = TYPE;
        break top;
      }
      else {
        strm.msg = 'invalid literal/length code';
        state.mode = BAD;
        break top;
      }

      break; // need to emulate goto via "continue"
    }
  } while (_in < last && _out < end);

  /* return unused bytes (on entry, bits < 8, so in won't go too far back) */
  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;

  /* update state and return */
  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
  strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
  state.hold = hold;
  state.bits = bits;
  return;
};

},{}],109:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

var utils         = require('../utils/common');
var adler32       = require('./adler32');
var crc32         = require('./crc32');
var inflate_fast  = require('./inffast');
var inflate_table = require('./inftrees');

var CODES = 0;
var LENS = 1;
var DISTS = 2;

/* Public constants ==========================================================*/
/* ===========================================================================*/


/* Allowed flush values; see deflate() and inflate() below for details */
//var Z_NO_FLUSH      = 0;
//var Z_PARTIAL_FLUSH = 1;
//var Z_SYNC_FLUSH    = 2;
//var Z_FULL_FLUSH    = 3;
var Z_FINISH        = 4;
var Z_BLOCK         = 5;
var Z_TREES         = 6;


/* Return codes for the compression/decompression functions. Negative values
 * are errors, positive values are used for special but normal events.
 */
var Z_OK            = 0;
var Z_STREAM_END    = 1;
var Z_NEED_DICT     = 2;
//var Z_ERRNO         = -1;
var Z_STREAM_ERROR  = -2;
var Z_DATA_ERROR    = -3;
var Z_MEM_ERROR     = -4;
var Z_BUF_ERROR     = -5;
//var Z_VERSION_ERROR = -6;

/* The deflate compression method */
var Z_DEFLATED  = 8;


/* STATES ====================================================================*/
/* ===========================================================================*/


var    HEAD = 1;       /* i: waiting for magic header */
var    FLAGS = 2;      /* i: waiting for method and flags (gzip) */
var    TIME = 3;       /* i: waiting for modification time (gzip) */
var    OS = 4;         /* i: waiting for extra flags and operating system (gzip) */
var    EXLEN = 5;      /* i: waiting for extra length (gzip) */
var    EXTRA = 6;      /* i: waiting for extra bytes (gzip) */
var    NAME = 7;       /* i: waiting for end of file name (gzip) */
var    COMMENT = 8;    /* i: waiting for end of comment (gzip) */
var    HCRC = 9;       /* i: waiting for header crc (gzip) */
var    DICTID = 10;    /* i: waiting for dictionary check value */
var    DICT = 11;      /* waiting for inflateSetDictionary() call */
var        TYPE = 12;      /* i: waiting for type bits, including last-flag bit */
var        TYPEDO = 13;    /* i: same, but skip check to exit inflate on new block */
var        STORED = 14;    /* i: waiting for stored size (length and complement) */
var        COPY_ = 15;     /* i/o: same as COPY below, but only first time in */
var        COPY = 16;      /* i/o: waiting for input or output to copy stored block */
var        TABLE = 17;     /* i: waiting for dynamic block table lengths */
var        LENLENS = 18;   /* i: waiting for code length code lengths */
var        CODELENS = 19;  /* i: waiting for length/lit and distance code lengths */
var            LEN_ = 20;      /* i: same as LEN below, but only first time in */
var            LEN = 21;       /* i: waiting for length/lit/eob code */
var            LENEXT = 22;    /* i: waiting for length extra bits */
var            DIST = 23;      /* i: waiting for distance code */
var            DISTEXT = 24;   /* i: waiting for distance extra bits */
var            MATCH = 25;     /* o: waiting for output space to copy string */
var            LIT = 26;       /* o: waiting for output space to write literal */
var    CHECK = 27;     /* i: waiting for 32-bit check value */
var    LENGTH = 28;    /* i: waiting for 32-bit length (gzip) */
var    DONE = 29;      /* finished check, done -- remain here until reset */
var    BAD = 30;       /* got a data error -- remain here until reset */
var    MEM = 31;       /* got an inflate() memory error -- remain here until reset */
var    SYNC = 32;      /* looking for synchronization bytes to restart inflate() */

/* ===========================================================================*/



var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592;
//var ENOUGH =  (ENOUGH_LENS+ENOUGH_DISTS);

var MAX_WBITS = 15;
/* 32K LZ77 window */
var DEF_WBITS = MAX_WBITS;


function zswap32(q) {
  return  (((q >>> 24) & 0xff) +
          ((q >>> 8) & 0xff00) +
          ((q & 0xff00) << 8) +
          ((q & 0xff) << 24));
}


function InflateState() {
  this.mode = 0;             /* current inflate mode */
  this.last = false;          /* true if processing last block */
  this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
  this.havedict = false;      /* true if dictionary provided */
  this.flags = 0;             /* gzip header method and flags (0 if zlib) */
  this.dmax = 0;              /* zlib header max distance (INFLATE_STRICT) */
  this.check = 0;             /* protected copy of check value */
  this.total = 0;             /* protected copy of output count */
  // TODO: may be {}
  this.head = null;           /* where to save gzip header information */

  /* sliding window */
  this.wbits = 0;             /* log base 2 of requested window size */
  this.wsize = 0;             /* window size or zero if not using window */
  this.whave = 0;             /* valid bytes in the window */
  this.wnext = 0;             /* window write index */
  this.window = null;         /* allocated sliding window, if needed */

  /* bit accumulator */
  this.hold = 0;              /* input bit accumulator */
  this.bits = 0;              /* number of bits in "in" */

  /* for string and stored block copying */
  this.length = 0;            /* literal or length of data to copy */
  this.offset = 0;            /* distance back to copy string from */

  /* for table and code decoding */
  this.extra = 0;             /* extra bits needed */

  /* fixed and dynamic code tables */
  this.lencode = null;          /* starting table for length/literal codes */
  this.distcode = null;         /* starting table for distance codes */
  this.lenbits = 0;           /* index bits for lencode */
  this.distbits = 0;          /* index bits for distcode */

  /* dynamic table building */
  this.ncode = 0;             /* number of code length code lengths */
  this.nlen = 0;              /* number of length code lengths */
  this.ndist = 0;             /* number of distance code lengths */
  this.have = 0;              /* number of code lengths in lens[] */
  this.next = null;              /* next available space in codes[] */

  this.lens = new utils.Buf16(320); /* temporary storage for code lengths */
  this.work = new utils.Buf16(288); /* work area for code table building */

  /*
   because we don't have pointers in js, we use lencode and distcode directly
   as buffers so we don't need codes
  */
  //this.codes = new utils.Buf32(ENOUGH);       /* space for code tables */
  this.lendyn = null;              /* dynamic table for length/literal codes (JS specific) */
  this.distdyn = null;             /* dynamic table for distance codes (JS specific) */
  this.sane = 0;                   /* if false, allow invalid distance too far */
  this.back = 0;                   /* bits back of last unprocessed length/lit */
  this.was = 0;                    /* initial length of match */
}

function inflateResetKeep(strm) {
  var state;

  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = ''; /*Z_NULL*/
  if (state.wrap) {       /* to support ill-conceived Java test suite */
    strm.adler = state.wrap & 1;
  }
  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.dmax = 32768;
  state.head = null/*Z_NULL*/;
  state.hold = 0;
  state.bits = 0;
  //state.lencode = state.distcode = state.next = state.codes;
  state.lencode = state.lendyn = new utils.Buf32(ENOUGH_LENS);
  state.distcode = state.distdyn = new utils.Buf32(ENOUGH_DISTS);

  state.sane = 1;
  state.back = -1;
  //Tracev((stderr, "inflate: reset\n"));
  return Z_OK;
}

function inflateReset(strm) {
  var state;

  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);

}

function inflateReset2(strm, windowBits) {
  var wrap;
  var state;

  /* get the state */
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;

  /* extract wrap request from windowBits parameter */
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  }
  else {
    wrap = (windowBits >> 4) + 1;
    if (windowBits < 48) {
      windowBits &= 15;
    }
  }

  /* set number of window bits, free window if different */
  if (windowBits && (windowBits < 8 || windowBits > 15)) {
    return Z_STREAM_ERROR;
  }
  if (state.window !== null && state.wbits !== windowBits) {
    state.window = null;
  }

  /* update state and reset the rest of it */
  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
}

function inflateInit2(strm, windowBits) {
  var ret;
  var state;

  if (!strm) { return Z_STREAM_ERROR; }
  //strm.msg = Z_NULL;                 /* in case we return an error */

  state = new InflateState();

  //if (state === Z_NULL) return Z_MEM_ERROR;
  //Tracev((stderr, "inflate: allocated\n"));
  strm.state = state;
  state.window = null/*Z_NULL*/;
  ret = inflateReset2(strm, windowBits);
  if (ret !== Z_OK) {
    strm.state = null/*Z_NULL*/;
  }
  return ret;
}

function inflateInit(strm) {
  return inflateInit2(strm, DEF_WBITS);
}


/*
 Return state with length and distance decoding tables and index sizes set to
 fixed code decoding.  Normally this returns fixed tables from inffixed.h.
 If BUILDFIXED is defined, then instead this routine builds the tables the
 first time it's called, and returns those tables the first time and
 thereafter.  This reduces the size of the code by about 2K bytes, in
 exchange for a little execution time.  However, BUILDFIXED should not be
 used for threaded applications, since the rewriting of the tables and virgin
 may not be thread-safe.
 */
var virgin = true;

var lenfix, distfix; // We have no pointers in JS, so keep tables separate

function fixedtables(state) {
  /* build fixed huffman tables if first call (may not be thread safe) */
  if (virgin) {
    var sym;

    lenfix = new utils.Buf32(512);
    distfix = new utils.Buf32(32);

    /* literal/length table */
    sym = 0;
    while (sym < 144) { state.lens[sym++] = 8; }
    while (sym < 256) { state.lens[sym++] = 9; }
    while (sym < 280) { state.lens[sym++] = 7; }
    while (sym < 288) { state.lens[sym++] = 8; }

    inflate_table(LENS,  state.lens, 0, 288, lenfix,   0, state.work, { bits: 9 });

    /* distance table */
    sym = 0;
    while (sym < 32) { state.lens[sym++] = 5; }

    inflate_table(DISTS, state.lens, 0, 32,   distfix, 0, state.work, { bits: 5 });

    /* do this just once */
    virgin = false;
  }

  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
}


/*
 Update the window with the last wsize (normally 32K) bytes written before
 returning.  If window does not exist yet, create it.  This is only called
 when a window is already in use, or when output has been written during this
 inflate call, but the end of the deflate stream has not been reached yet.
 It is also called to create a window for dictionary data when a dictionary
 is loaded.

 Providing output buffers larger than 32K to inflate() should provide a speed
 advantage, since only the last 32K of output is copied to the sliding window
 upon return from inflate(), and since all distances after the first 32K of
 output will fall in the output data, making match copies simpler and faster.
 The advantage may be dependent on the size of the processor's data caches.
 */
function updatewindow(strm, src, end, copy) {
  var dist;
  var state = strm.state;

  /* if it hasn't been done already, allocate space for the window */
  if (state.window === null) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;

    state.window = new utils.Buf8(state.wsize);
  }

  /* copy state->wsize or less output bytes into the circular window */
  if (copy >= state.wsize) {
    utils.arraySet(state.window, src, end - state.wsize, state.wsize, 0);
    state.wnext = 0;
    state.whave = state.wsize;
  }
  else {
    dist = state.wsize - state.wnext;
    if (dist > copy) {
      dist = copy;
    }
    //zmemcpy(state->window + state->wnext, end - copy, dist);
    utils.arraySet(state.window, src, end - copy, dist, state.wnext);
    copy -= dist;
    if (copy) {
      //zmemcpy(state->window, end - copy, copy);
      utils.arraySet(state.window, src, end - copy, copy, 0);
      state.wnext = copy;
      state.whave = state.wsize;
    }
    else {
      state.wnext += dist;
      if (state.wnext === state.wsize) { state.wnext = 0; }
      if (state.whave < state.wsize) { state.whave += dist; }
    }
  }
  return 0;
}

function inflate(strm, flush) {
  var state;
  var input, output;          // input/output buffers
  var next;                   /* next input INDEX */
  var put;                    /* next output INDEX */
  var have, left;             /* available input and output */
  var hold;                   /* bit buffer */
  var bits;                   /* bits in bit buffer */
  var _in, _out;              /* save starting available input and output */
  var copy;                   /* number of stored or match bytes to copy */
  var from;                   /* where to copy match bytes from */
  var from_source;
  var here = 0;               /* current decoding table entry */
  var here_bits, here_op, here_val; // paked "here" denormalized (JS specific)
  //var last;                   /* parent table entry */
  var last_bits, last_op, last_val; // paked "last" denormalized (JS specific)
  var len;                    /* length to copy for repeats, bits to drop */
  var ret;                    /* return code */
  var hbuf = new utils.Buf8(4);    /* buffer for gzip header crc calculation */
  var opts;

  var n; // temporary var for NEED_BITS

  var order = /* permutation of code lengths */
    [ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ];


  if (!strm || !strm.state || !strm.output ||
      (!strm.input && strm.avail_in !== 0)) {
    return Z_STREAM_ERROR;
  }

  state = strm.state;
  if (state.mode === TYPE) { state.mode = TYPEDO; }    /* skip check */


  //--- LOAD() ---
  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits;
  //---

  _in = have;
  _out = left;
  ret = Z_OK;

  inf_leave: // goto emulation
  for (;;) {
    switch (state.mode) {
      case HEAD:
        if (state.wrap === 0) {
          state.mode = TYPEDO;
          break;
        }
        //=== NEEDBITS(16);
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if ((state.wrap & 2) && hold === 0x8b1f) {  /* gzip header */
          state.check = 0/*crc32(0L, Z_NULL, 0)*/;
          //=== CRC2(state.check, hold);
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          state.check = crc32(state.check, hbuf, 2, 0);
          //===//

          //=== INITBITS();
          hold = 0;
          bits = 0;
          //===//
          state.mode = FLAGS;
          break;
        }
        state.flags = 0;           /* expect zlib header */
        if (state.head) {
          state.head.done = false;
        }
        if (!(state.wrap & 1) ||   /* check if zlib header allowed */
          (((hold & 0xff)/*BITS(8)*/ << 8) + (hold >> 8)) % 31) {
          strm.msg = 'incorrect header check';
          state.mode = BAD;
          break;
        }
        if ((hold & 0x0f)/*BITS(4)*/ !== Z_DEFLATED) {
          strm.msg = 'unknown compression method';
          state.mode = BAD;
          break;
        }
        //--- DROPBITS(4) ---//
        hold >>>= 4;
        bits -= 4;
        //---//
        len = (hold & 0x0f)/*BITS(4)*/ + 8;
        if (state.wbits === 0) {
          state.wbits = len;
        }
        else if (len > state.wbits) {
          strm.msg = 'invalid window size';
          state.mode = BAD;
          break;
        }
        state.dmax = 1 << len;
        //Tracev((stderr, "inflate:   zlib header ok\n"));
        strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
        state.mode = hold & 0x200 ? DICTID : TYPE;
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        break;
      case FLAGS:
        //=== NEEDBITS(16); */
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.flags = hold;
        if ((state.flags & 0xff) !== Z_DEFLATED) {
          strm.msg = 'unknown compression method';
          state.mode = BAD;
          break;
        }
        if (state.flags & 0xe000) {
          strm.msg = 'unknown header flags set';
          state.mode = BAD;
          break;
        }
        if (state.head) {
          state.head.text = ((hold >> 8) & 1);
        }
        if (state.flags & 0x0200) {
          //=== CRC2(state.check, hold);
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          state.check = crc32(state.check, hbuf, 2, 0);
          //===//
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        state.mode = TIME;
        /* falls through */
      case TIME:
        //=== NEEDBITS(32); */
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if (state.head) {
          state.head.time = hold;
        }
        if (state.flags & 0x0200) {
          //=== CRC4(state.check, hold)
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          hbuf[2] = (hold >>> 16) & 0xff;
          hbuf[3] = (hold >>> 24) & 0xff;
          state.check = crc32(state.check, hbuf, 4, 0);
          //===
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        state.mode = OS;
        /* falls through */
      case OS:
        //=== NEEDBITS(16); */
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if (state.head) {
          state.head.xflags = (hold & 0xff);
          state.head.os = (hold >> 8);
        }
        if (state.flags & 0x0200) {
          //=== CRC2(state.check, hold);
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          state.check = crc32(state.check, hbuf, 2, 0);
          //===//
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        state.mode = EXLEN;
        /* falls through */
      case EXLEN:
        if (state.flags & 0x0400) {
          //=== NEEDBITS(16); */
          while (bits < 16) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          //===//
          state.length = hold;
          if (state.head) {
            state.head.extra_len = hold;
          }
          if (state.flags & 0x0200) {
            //=== CRC2(state.check, hold);
            hbuf[0] = hold & 0xff;
            hbuf[1] = (hold >>> 8) & 0xff;
            state.check = crc32(state.check, hbuf, 2, 0);
            //===//
          }
          //=== INITBITS();
          hold = 0;
          bits = 0;
          //===//
        }
        else if (state.head) {
          state.head.extra = null/*Z_NULL*/;
        }
        state.mode = EXTRA;
        /* falls through */
      case EXTRA:
        if (state.flags & 0x0400) {
          copy = state.length;
          if (copy > have) { copy = have; }
          if (copy) {
            if (state.head) {
              len = state.head.extra_len - state.length;
              if (!state.head.extra) {
                // Use untyped array for more convenient processing later
                state.head.extra = new Array(state.head.extra_len);
              }
              utils.arraySet(
                state.head.extra,
                input,
                next,
                // extra field is limited to 65536 bytes
                // - no need for additional size check
                copy,
                /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
                len
              );
              //zmemcpy(state.head.extra + len, next,
              //        len + copy > state.head.extra_max ?
              //        state.head.extra_max - len : copy);
            }
            if (state.flags & 0x0200) {
              state.check = crc32(state.check, input, copy, next);
            }
            have -= copy;
            next += copy;
            state.length -= copy;
          }
          if (state.length) { break inf_leave; }
        }
        state.length = 0;
        state.mode = NAME;
        /* falls through */
      case NAME:
        if (state.flags & 0x0800) {
          if (have === 0) { break inf_leave; }
          copy = 0;
          do {
            // TODO: 2 or 1 bytes?
            len = input[next + copy++];
            /* use constant limit because in js we should not preallocate memory */
            if (state.head && len &&
                (state.length < 65536 /*state.head.name_max*/)) {
              state.head.name += String.fromCharCode(len);
            }
          } while (len && copy < have);

          if (state.flags & 0x0200) {
            state.check = crc32(state.check, input, copy, next);
          }
          have -= copy;
          next += copy;
          if (len) { break inf_leave; }
        }
        else if (state.head) {
          state.head.name = null;
        }
        state.length = 0;
        state.mode = COMMENT;
        /* falls through */
      case COMMENT:
        if (state.flags & 0x1000) {
          if (have === 0) { break inf_leave; }
          copy = 0;
          do {
            len = input[next + copy++];
            /* use constant limit because in js we should not preallocate memory */
            if (state.head && len &&
                (state.length < 65536 /*state.head.comm_max*/)) {
              state.head.comment += String.fromCharCode(len);
            }
          } while (len && copy < have);
          if (state.flags & 0x0200) {
            state.check = crc32(state.check, input, copy, next);
          }
          have -= copy;
          next += copy;
          if (len) { break inf_leave; }
        }
        else if (state.head) {
          state.head.comment = null;
        }
        state.mode = HCRC;
        /* falls through */
      case HCRC:
        if (state.flags & 0x0200) {
          //=== NEEDBITS(16); */
          while (bits < 16) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          //===//
          if (hold !== (state.check & 0xffff)) {
            strm.msg = 'header crc mismatch';
            state.mode = BAD;
            break;
          }
          //=== INITBITS();
          hold = 0;
          bits = 0;
          //===//
        }
        if (state.head) {
          state.head.hcrc = ((state.flags >> 9) & 1);
          state.head.done = true;
        }
        strm.adler = state.check = 0;
        state.mode = TYPE;
        break;
      case DICTID:
        //=== NEEDBITS(32); */
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        strm.adler = state.check = zswap32(hold);
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        state.mode = DICT;
        /* falls through */
      case DICT:
        if (state.havedict === 0) {
          //--- RESTORE() ---
          strm.next_out = put;
          strm.avail_out = left;
          strm.next_in = next;
          strm.avail_in = have;
          state.hold = hold;
          state.bits = bits;
          //---
          return Z_NEED_DICT;
        }
        strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
        state.mode = TYPE;
        /* falls through */
      case TYPE:
        if (flush === Z_BLOCK || flush === Z_TREES) { break inf_leave; }
        /* falls through */
      case TYPEDO:
        if (state.last) {
          //--- BYTEBITS() ---//
          hold >>>= bits & 7;
          bits -= bits & 7;
          //---//
          state.mode = CHECK;
          break;
        }
        //=== NEEDBITS(3); */
        while (bits < 3) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.last = (hold & 0x01)/*BITS(1)*/;
        //--- DROPBITS(1) ---//
        hold >>>= 1;
        bits -= 1;
        //---//

        switch ((hold & 0x03)/*BITS(2)*/) {
          case 0:                             /* stored block */
            //Tracev((stderr, "inflate:     stored block%s\n",
            //        state.last ? " (last)" : ""));
            state.mode = STORED;
            break;
          case 1:                             /* fixed block */
            fixedtables(state);
            //Tracev((stderr, "inflate:     fixed codes block%s\n",
            //        state.last ? " (last)" : ""));
            state.mode = LEN_;             /* decode codes */
            if (flush === Z_TREES) {
              //--- DROPBITS(2) ---//
              hold >>>= 2;
              bits -= 2;
              //---//
              break inf_leave;
            }
            break;
          case 2:                             /* dynamic block */
            //Tracev((stderr, "inflate:     dynamic codes block%s\n",
            //        state.last ? " (last)" : ""));
            state.mode = TABLE;
            break;
          case 3:
            strm.msg = 'invalid block type';
            state.mode = BAD;
        }
        //--- DROPBITS(2) ---//
        hold >>>= 2;
        bits -= 2;
        //---//
        break;
      case STORED:
        //--- BYTEBITS() ---// /* go to byte boundary */
        hold >>>= bits & 7;
        bits -= bits & 7;
        //---//
        //=== NEEDBITS(32); */
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if ((hold & 0xffff) !== ((hold >>> 16) ^ 0xffff)) {
          strm.msg = 'invalid stored block lengths';
          state.mode = BAD;
          break;
        }
        state.length = hold & 0xffff;
        //Tracev((stderr, "inflate:       stored length %u\n",
        //        state.length));
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        state.mode = COPY_;
        if (flush === Z_TREES) { break inf_leave; }
        /* falls through */
      case COPY_:
        state.mode = COPY;
        /* falls through */
      case COPY:
        copy = state.length;
        if (copy) {
          if (copy > have) { copy = have; }
          if (copy > left) { copy = left; }
          if (copy === 0) { break inf_leave; }
          //--- zmemcpy(put, next, copy); ---
          utils.arraySet(output, input, next, copy, put);
          //---//
          have -= copy;
          next += copy;
          left -= copy;
          put += copy;
          state.length -= copy;
          break;
        }
        //Tracev((stderr, "inflate:       stored end\n"));
        state.mode = TYPE;
        break;
      case TABLE:
        //=== NEEDBITS(14); */
        while (bits < 14) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.nlen = (hold & 0x1f)/*BITS(5)*/ + 257;
        //--- DROPBITS(5) ---//
        hold >>>= 5;
        bits -= 5;
        //---//
        state.ndist = (hold & 0x1f)/*BITS(5)*/ + 1;
        //--- DROPBITS(5) ---//
        hold >>>= 5;
        bits -= 5;
        //---//
        state.ncode = (hold & 0x0f)/*BITS(4)*/ + 4;
        //--- DROPBITS(4) ---//
        hold >>>= 4;
        bits -= 4;
        //---//
//#ifndef PKZIP_BUG_WORKAROUND
        if (state.nlen > 286 || state.ndist > 30) {
          strm.msg = 'too many length or distance symbols';
          state.mode = BAD;
          break;
        }
//#endif
        //Tracev((stderr, "inflate:       table sizes ok\n"));
        state.have = 0;
        state.mode = LENLENS;
        /* falls through */
      case LENLENS:
        while (state.have < state.ncode) {
          //=== NEEDBITS(3);
          while (bits < 3) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          //===//
          state.lens[order[state.have++]] = (hold & 0x07);//BITS(3);
          //--- DROPBITS(3) ---//
          hold >>>= 3;
          bits -= 3;
          //---//
        }
        while (state.have < 19) {
          state.lens[order[state.have++]] = 0;
        }
        // We have separate tables & no pointers. 2 commented lines below not needed.
        //state.next = state.codes;
        //state.lencode = state.next;
        // Switch to use dynamic table
        state.lencode = state.lendyn;
        state.lenbits = 7;

        opts = { bits: state.lenbits };
        ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
        state.lenbits = opts.bits;

        if (ret) {
          strm.msg = 'invalid code lengths set';
          state.mode = BAD;
          break;
        }
        //Tracev((stderr, "inflate:       code lengths ok\n"));
        state.have = 0;
        state.mode = CODELENS;
        /* falls through */
      case CODELENS:
        while (state.have < state.nlen + state.ndist) {
          for (;;) {
            here = state.lencode[hold & ((1 << state.lenbits) - 1)];/*BITS(state.lenbits)*/
            here_bits = here >>> 24;
            here_op = (here >>> 16) & 0xff;
            here_val = here & 0xffff;

            if ((here_bits) <= bits) { break; }
            //--- PULLBYTE() ---//
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
            //---//
          }
          if (here_val < 16) {
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            state.lens[state.have++] = here_val;
          }
          else {
            if (here_val === 16) {
              //=== NEEDBITS(here.bits + 2);
              n = here_bits + 2;
              while (bits < n) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              //--- DROPBITS(here.bits) ---//
              hold >>>= here_bits;
              bits -= here_bits;
              //---//
              if (state.have === 0) {
                strm.msg = 'invalid bit length repeat';
                state.mode = BAD;
                break;
              }
              len = state.lens[state.have - 1];
              copy = 3 + (hold & 0x03);//BITS(2);
              //--- DROPBITS(2) ---//
              hold >>>= 2;
              bits -= 2;
              //---//
            }
            else if (here_val === 17) {
              //=== NEEDBITS(here.bits + 3);
              n = here_bits + 3;
              while (bits < n) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              //--- DROPBITS(here.bits) ---//
              hold >>>= here_bits;
              bits -= here_bits;
              //---//
              len = 0;
              copy = 3 + (hold & 0x07);//BITS(3);
              //--- DROPBITS(3) ---//
              hold >>>= 3;
              bits -= 3;
              //---//
            }
            else {
              //=== NEEDBITS(here.bits + 7);
              n = here_bits + 7;
              while (bits < n) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              //--- DROPBITS(here.bits) ---//
              hold >>>= here_bits;
              bits -= here_bits;
              //---//
              len = 0;
              copy = 11 + (hold & 0x7f);//BITS(7);
              //--- DROPBITS(7) ---//
              hold >>>= 7;
              bits -= 7;
              //---//
            }
            if (state.have + copy > state.nlen + state.ndist) {
              strm.msg = 'invalid bit length repeat';
              state.mode = BAD;
              break;
            }
            while (copy--) {
              state.lens[state.have++] = len;
            }
          }
        }

        /* handle error breaks in while */
        if (state.mode === BAD) { break; }

        /* check for end-of-block code (better have one) */
        if (state.lens[256] === 0) {
          strm.msg = 'invalid code -- missing end-of-block';
          state.mode = BAD;
          break;
        }

        /* build code tables -- note: do not change the lenbits or distbits
           values here (9 and 6) without reading the comments in inftrees.h
           concerning the ENOUGH constants, which depend on those values */
        state.lenbits = 9;

        opts = { bits: state.lenbits };
        ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
        // We have separate tables & no pointers. 2 commented lines below not needed.
        // state.next_index = opts.table_index;
        state.lenbits = opts.bits;
        // state.lencode = state.next;

        if (ret) {
          strm.msg = 'invalid literal/lengths set';
          state.mode = BAD;
          break;
        }

        state.distbits = 6;
        //state.distcode.copy(state.codes);
        // Switch to use dynamic table
        state.distcode = state.distdyn;
        opts = { bits: state.distbits };
        ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
        // We have separate tables & no pointers. 2 commented lines below not needed.
        // state.next_index = opts.table_index;
        state.distbits = opts.bits;
        // state.distcode = state.next;

        if (ret) {
          strm.msg = 'invalid distances set';
          state.mode = BAD;
          break;
        }
        //Tracev((stderr, 'inflate:       codes ok\n'));
        state.mode = LEN_;
        if (flush === Z_TREES) { break inf_leave; }
        /* falls through */
      case LEN_:
        state.mode = LEN;
        /* falls through */
      case LEN:
        if (have >= 6 && left >= 258) {
          //--- RESTORE() ---
          strm.next_out = put;
          strm.avail_out = left;
          strm.next_in = next;
          strm.avail_in = have;
          state.hold = hold;
          state.bits = bits;
          //---
          inflate_fast(strm, _out);
          //--- LOAD() ---
          put = strm.next_out;
          output = strm.output;
          left = strm.avail_out;
          next = strm.next_in;
          input = strm.input;
          have = strm.avail_in;
          hold = state.hold;
          bits = state.bits;
          //---

          if (state.mode === TYPE) {
            state.back = -1;
          }
          break;
        }
        state.back = 0;
        for (;;) {
          here = state.lencode[hold & ((1 << state.lenbits) - 1)];  /*BITS(state.lenbits)*/
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if (here_bits <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        if (here_op && (here_op & 0xf0) === 0) {
          last_bits = here_bits;
          last_op = here_op;
          last_val = here_val;
          for (;;) {
            here = state.lencode[last_val +
                    ((hold & ((1 << (last_bits + last_op)) - 1))/*BITS(last.bits + last.op)*/ >> last_bits)];
            here_bits = here >>> 24;
            here_op = (here >>> 16) & 0xff;
            here_val = here & 0xffff;

            if ((last_bits + here_bits) <= bits) { break; }
            //--- PULLBYTE() ---//
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
            //---//
          }
          //--- DROPBITS(last.bits) ---//
          hold >>>= last_bits;
          bits -= last_bits;
          //---//
          state.back += last_bits;
        }
        //--- DROPBITS(here.bits) ---//
        hold >>>= here_bits;
        bits -= here_bits;
        //---//
        state.back += here_bits;
        state.length = here_val;
        if (here_op === 0) {
          //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
          //        "inflate:         literal '%c'\n" :
          //        "inflate:         literal 0x%02x\n", here.val));
          state.mode = LIT;
          break;
        }
        if (here_op & 32) {
          //Tracevv((stderr, "inflate:         end of block\n"));
          state.back = -1;
          state.mode = TYPE;
          break;
        }
        if (here_op & 64) {
          strm.msg = 'invalid literal/length code';
          state.mode = BAD;
          break;
        }
        state.extra = here_op & 15;
        state.mode = LENEXT;
        /* falls through */
      case LENEXT:
        if (state.extra) {
          //=== NEEDBITS(state.extra);
          n = state.extra;
          while (bits < n) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          //===//
          state.length += hold & ((1 << state.extra) - 1)/*BITS(state.extra)*/;
          //--- DROPBITS(state.extra) ---//
          hold >>>= state.extra;
          bits -= state.extra;
          //---//
          state.back += state.extra;
        }
        //Tracevv((stderr, "inflate:         length %u\n", state.length));
        state.was = state.length;
        state.mode = DIST;
        /* falls through */
      case DIST:
        for (;;) {
          here = state.distcode[hold & ((1 << state.distbits) - 1)];/*BITS(state.distbits)*/
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((here_bits) <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        if ((here_op & 0xf0) === 0) {
          last_bits = here_bits;
          last_op = here_op;
          last_val = here_val;
          for (;;) {
            here = state.distcode[last_val +
                    ((hold & ((1 << (last_bits + last_op)) - 1))/*BITS(last.bits + last.op)*/ >> last_bits)];
            here_bits = here >>> 24;
            here_op = (here >>> 16) & 0xff;
            here_val = here & 0xffff;

            if ((last_bits + here_bits) <= bits) { break; }
            //--- PULLBYTE() ---//
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
            //---//
          }
          //--- DROPBITS(last.bits) ---//
          hold >>>= last_bits;
          bits -= last_bits;
          //---//
          state.back += last_bits;
        }
        //--- DROPBITS(here.bits) ---//
        hold >>>= here_bits;
        bits -= here_bits;
        //---//
        state.back += here_bits;
        if (here_op & 64) {
          strm.msg = 'invalid distance code';
          state.mode = BAD;
          break;
        }
        state.offset = here_val;
        state.extra = (here_op) & 15;
        state.mode = DISTEXT;
        /* falls through */
      case DISTEXT:
        if (state.extra) {
          //=== NEEDBITS(state.extra);
          n = state.extra;
          while (bits < n) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          //===//
          state.offset += hold & ((1 << state.extra) - 1)/*BITS(state.extra)*/;
          //--- DROPBITS(state.extra) ---//
          hold >>>= state.extra;
          bits -= state.extra;
          //---//
          state.back += state.extra;
        }
//#ifdef INFLATE_STRICT
        if (state.offset > state.dmax) {
          strm.msg = 'invalid distance too far back';
          state.mode = BAD;
          break;
        }
//#endif
        //Tracevv((stderr, "inflate:         distance %u\n", state.offset));
        state.mode = MATCH;
        /* falls through */
      case MATCH:
        if (left === 0) { break inf_leave; }
        copy = _out - left;
        if (state.offset > copy) {         /* copy from window */
          copy = state.offset - copy;
          if (copy > state.whave) {
            if (state.sane) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD;
              break;
            }
// (!) This block is disabled in zlib defaults,
// don't enable it for binary compatibility
//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
//          Trace((stderr, "inflate.c too far\n"));
//          copy -= state.whave;
//          if (copy > state.length) { copy = state.length; }
//          if (copy > left) { copy = left; }
//          left -= copy;
//          state.length -= copy;
//          do {
//            output[put++] = 0;
//          } while (--copy);
//          if (state.length === 0) { state.mode = LEN; }
//          break;
//#endif
          }
          if (copy > state.wnext) {
            copy -= state.wnext;
            from = state.wsize - copy;
          }
          else {
            from = state.wnext - copy;
          }
          if (copy > state.length) { copy = state.length; }
          from_source = state.window;
        }
        else {                              /* copy from output */
          from_source = output;
          from = put - state.offset;
          copy = state.length;
        }
        if (copy > left) { copy = left; }
        left -= copy;
        state.length -= copy;
        do {
          output[put++] = from_source[from++];
        } while (--copy);
        if (state.length === 0) { state.mode = LEN; }
        break;
      case LIT:
        if (left === 0) { break inf_leave; }
        output[put++] = state.length;
        left--;
        state.mode = LEN;
        break;
      case CHECK:
        if (state.wrap) {
          //=== NEEDBITS(32);
          while (bits < 32) {
            if (have === 0) { break inf_leave; }
            have--;
            // Use '|' instead of '+' to make sure that result is signed
            hold |= input[next++] << bits;
            bits += 8;
          }
          //===//
          _out -= left;
          strm.total_out += _out;
          state.total += _out;
          if (_out) {
            strm.adler = state.check =
                /*UPDATE(state.check, put - _out, _out);*/
                (state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out));

          }
          _out = left;
          // NB: crc32 stored as signed 32-bit int, zswap32 returns signed too
          if ((state.flags ? hold : zswap32(hold)) !== state.check) {
            strm.msg = 'incorrect data check';
            state.mode = BAD;
            break;
          }
          //=== INITBITS();
          hold = 0;
          bits = 0;
          //===//
          //Tracev((stderr, "inflate:   check matches trailer\n"));
        }
        state.mode = LENGTH;
        /* falls through */
      case LENGTH:
        if (state.wrap && state.flags) {
          //=== NEEDBITS(32);
          while (bits < 32) {
            if (have === 0) { break inf_leave; }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          //===//
          if (hold !== (state.total & 0xffffffff)) {
            strm.msg = 'incorrect length check';
            state.mode = BAD;
            break;
          }
          //=== INITBITS();
          hold = 0;
          bits = 0;
          //===//
          //Tracev((stderr, "inflate:   length matches trailer\n"));
        }
        state.mode = DONE;
        /* falls through */
      case DONE:
        ret = Z_STREAM_END;
        break inf_leave;
      case BAD:
        ret = Z_DATA_ERROR;
        break inf_leave;
      case MEM:
        return Z_MEM_ERROR;
      case SYNC:
        /* falls through */
      default:
        return Z_STREAM_ERROR;
    }
  }

  // inf_leave <- here is real place for "goto inf_leave", emulated via "break inf_leave"

  /*
     Return from inflate(), updating the total counts and the check value.
     If there was no progress during the inflate() call, return a buffer
     error.  Call updatewindow() to create and/or update the window state.
     Note: a memory error from inflate() is non-recoverable.
   */

  //--- RESTORE() ---
  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits;
  //---

  if (state.wsize || (_out !== strm.avail_out && state.mode < BAD &&
                      (state.mode < CHECK || flush !== Z_FINISH))) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
      state.mode = MEM;
      return Z_MEM_ERROR;
    }
  }
  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;
  if (state.wrap && _out) {
    strm.adler = state.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
      (state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out));
  }
  strm.data_type = state.bits + (state.last ? 64 : 0) +
                    (state.mode === TYPE ? 128 : 0) +
                    (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
  if (((_in === 0 && _out === 0) || flush === Z_FINISH) && ret === Z_OK) {
    ret = Z_BUF_ERROR;
  }
  return ret;
}

function inflateEnd(strm) {

  if (!strm || !strm.state /*|| strm->zfree == (free_func)0*/) {
    return Z_STREAM_ERROR;
  }

  var state = strm.state;
  if (state.window) {
    state.window = null;
  }
  strm.state = null;
  return Z_OK;
}

function inflateGetHeader(strm, head) {
  var state;

  /* check state */
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;
  if ((state.wrap & 2) === 0) { return Z_STREAM_ERROR; }

  /* save header structure */
  state.head = head;
  head.done = false;
  return Z_OK;
}

function inflateSetDictionary(strm, dictionary) {
  var dictLength = dictionary.length;

  var state;
  var dictid;
  var ret;

  /* check state */
  if (!strm /* == Z_NULL */ || !strm.state /* == Z_NULL */) { return Z_STREAM_ERROR; }
  state = strm.state;

  if (state.wrap !== 0 && state.mode !== DICT) {
    return Z_STREAM_ERROR;
  }

  /* check for correct dictionary identifier */
  if (state.mode === DICT) {
    dictid = 1; /* adler32(0, null, 0)*/
    /* dictid = adler32(dictid, dictionary, dictLength); */
    dictid = adler32(dictid, dictionary, dictLength, 0);
    if (dictid !== state.check) {
      return Z_DATA_ERROR;
    }
  }
  /* copy dictionary to window using updatewindow(), which will amend the
   existing dictionary if appropriate */
  ret = updatewindow(strm, dictionary, dictLength, dictLength);
  if (ret) {
    state.mode = MEM;
    return Z_MEM_ERROR;
  }
  state.havedict = 1;
  // Tracev((stderr, "inflate:   dictionary set\n"));
  return Z_OK;
}

exports.inflateReset = inflateReset;
exports.inflateReset2 = inflateReset2;
exports.inflateResetKeep = inflateResetKeep;
exports.inflateInit = inflateInit;
exports.inflateInit2 = inflateInit2;
exports.inflate = inflate;
exports.inflateEnd = inflateEnd;
exports.inflateGetHeader = inflateGetHeader;
exports.inflateSetDictionary = inflateSetDictionary;
exports.inflateInfo = 'pako inflate (from Nodeca project)';

/* Not implemented
exports.inflateCopy = inflateCopy;
exports.inflateGetDictionary = inflateGetDictionary;
exports.inflateMark = inflateMark;
exports.inflatePrime = inflatePrime;
exports.inflateSync = inflateSync;
exports.inflateSyncPoint = inflateSyncPoint;
exports.inflateUndermine = inflateUndermine;
*/

},{"../utils/common":101,"./adler32":103,"./crc32":105,"./inffast":108,"./inftrees":110}],110:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

var utils = require('../utils/common');

var MAXBITS = 15;
var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592;
//var ENOUGH = (ENOUGH_LENS+ENOUGH_DISTS);

var CODES = 0;
var LENS = 1;
var DISTS = 2;

var lbase = [ /* Length codes 257..285 base */
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
  35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
];

var lext = [ /* Length codes 257..285 extra */
  16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18,
  19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78
];

var dbase = [ /* Distance codes 0..29 base */
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
  257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577, 0, 0
];

var dext = [ /* Distance codes 0..29 extra */
  16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22,
  23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
  28, 28, 29, 29, 64, 64
];

module.exports = function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts)
{
  var bits = opts.bits;
      //here = opts.here; /* table entry for duplication */

  var len = 0;               /* a code's length in bits */
  var sym = 0;               /* index of code symbols */
  var min = 0, max = 0;          /* minimum and maximum code lengths */
  var root = 0;              /* number of index bits for root table */
  var curr = 0;              /* number of index bits for current table */
  var drop = 0;              /* code bits to drop for sub-table */
  var left = 0;                   /* number of prefix codes available */
  var used = 0;              /* code entries in table used */
  var huff = 0;              /* Huffman code */
  var incr;              /* for incrementing code, index */
  var fill;              /* index for replicating entries */
  var low;               /* low bits for current root entry */
  var mask;              /* mask for low root bits */
  var next;             /* next available space in table */
  var base = null;     /* base value table to use */
  var base_index = 0;
//  var shoextra;    /* extra bits table to use */
  var end;                    /* use base and extra for symbol > end */
  var count = new utils.Buf16(MAXBITS + 1); //[MAXBITS+1];    /* number of codes of each length */
  var offs = new utils.Buf16(MAXBITS + 1); //[MAXBITS+1];     /* offsets in table for each length */
  var extra = null;
  var extra_index = 0;

  var here_bits, here_op, here_val;

  /*
   Process a set of code lengths to create a canonical Huffman code.  The
   code lengths are lens[0..codes-1].  Each length corresponds to the
   symbols 0..codes-1.  The Huffman code is generated by first sorting the
   symbols by length from short to long, and retaining the symbol order
   for codes with equal lengths.  Then the code starts with all zero bits
   for the first code of the shortest length, and the codes are integer
   increments for the same length, and zeros are appended as the length
   increases.  For the deflate format, these bits are stored backwards
   from their more natural integer increment ordering, and so when the
   decoding tables are built in the large loop below, the integer codes
   are incremented backwards.

   This routine assumes, but does not check, that all of the entries in
   lens[] are in the range 0..MAXBITS.  The caller must assure this.
   1..MAXBITS is interpreted as that code length.  zero means that that
   symbol does not occur in this code.

   The codes are sorted by computing a count of codes for each length,
   creating from that a table of starting indices for each length in the
   sorted table, and then entering the symbols in order in the sorted
   table.  The sorted table is work[], with that space being provided by
   the caller.

   The length counts are used for other purposes as well, i.e. finding
   the minimum and maximum length codes, determining if there are any
   codes at all, checking for a valid set of lengths, and looking ahead
   at length counts to determine sub-table sizes when building the
   decoding tables.
   */

  /* accumulate lengths for codes (assumes lens[] all in 0..MAXBITS) */
  for (len = 0; len <= MAXBITS; len++) {
    count[len] = 0;
  }
  for (sym = 0; sym < codes; sym++) {
    count[lens[lens_index + sym]]++;
  }

  /* bound code lengths, force root to be within code lengths */
  root = bits;
  for (max = MAXBITS; max >= 1; max--) {
    if (count[max] !== 0) { break; }
  }
  if (root > max) {
    root = max;
  }
  if (max === 0) {                     /* no symbols to code at all */
    //table.op[opts.table_index] = 64;  //here.op = (var char)64;    /* invalid code marker */
    //table.bits[opts.table_index] = 1;   //here.bits = (var char)1;
    //table.val[opts.table_index++] = 0;   //here.val = (var short)0;
    table[table_index++] = (1 << 24) | (64 << 16) | 0;


    //table.op[opts.table_index] = 64;
    //table.bits[opts.table_index] = 1;
    //table.val[opts.table_index++] = 0;
    table[table_index++] = (1 << 24) | (64 << 16) | 0;

    opts.bits = 1;
    return 0;     /* no symbols, but wait for decoding to report error */
  }
  for (min = 1; min < max; min++) {
    if (count[min] !== 0) { break; }
  }
  if (root < min) {
    root = min;
  }

  /* check for an over-subscribed or incomplete set of lengths */
  left = 1;
  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];
    if (left < 0) {
      return -1;
    }        /* over-subscribed */
  }
  if (left > 0 && (type === CODES || max !== 1)) {
    return -1;                      /* incomplete set */
  }

  /* generate offsets into symbol table for each length for sorting */
  offs[1] = 0;
  for (len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }

  /* sort symbols by length, by symbol order within each length */
  for (sym = 0; sym < codes; sym++) {
    if (lens[lens_index + sym] !== 0) {
      work[offs[lens[lens_index + sym]]++] = sym;
    }
  }

  /*
   Create and fill in decoding tables.  In this loop, the table being
   filled is at next and has curr index bits.  The code being used is huff
   with length len.  That code is converted to an index by dropping drop
   bits off of the bottom.  For codes where len is less than drop + curr,
   those top drop + curr - len bits are incremented through all values to
   fill the table with replicated entries.

   root is the number of index bits for the root table.  When len exceeds
   root, sub-tables are created pointed to by the root entry with an index
   of the low root bits of huff.  This is saved in low to check for when a
   new sub-table should be started.  drop is zero when the root table is
   being filled, and drop is root when sub-tables are being filled.

   When a new sub-table is needed, it is necessary to look ahead in the
   code lengths to determine what size sub-table is needed.  The length
   counts are used for this, and so count[] is decremented as codes are
   entered in the tables.

   used keeps track of how many table entries have been allocated from the
   provided *table space.  It is checked for LENS and DIST tables against
   the constants ENOUGH_LENS and ENOUGH_DISTS to guard against changes in
   the initial root table size constants.  See the comments in inftrees.h
   for more information.

   sym increments through all symbols, and the loop terminates when
   all codes of length max, i.e. all codes, have been processed.  This
   routine permits incomplete codes, so another loop after this one fills
   in the rest of the decoding tables with invalid code markers.
   */

  /* set up for code type */
  // poor man optimization - use if-else instead of switch,
  // to avoid deopts in old v8
  if (type === CODES) {
    base = extra = work;    /* dummy value--not used */
    end = 19;

  } else if (type === LENS) {
    base = lbase;
    base_index -= 257;
    extra = lext;
    extra_index -= 257;
    end = 256;

  } else {                    /* DISTS */
    base = dbase;
    extra = dext;
    end = -1;
  }

  /* initialize opts for loop */
  huff = 0;                   /* starting code */
  sym = 0;                    /* starting code symbol */
  len = min;                  /* starting code length */
  next = table_index;              /* current table to fill in */
  curr = root;                /* current table index bits */
  drop = 0;                   /* current bits to drop from code for index */
  low = -1;                   /* trigger new sub-table when len > root */
  used = 1 << root;          /* use root table entries */
  mask = used - 1;            /* mask for comparing low */

  /* check available table space */
  if ((type === LENS && used > ENOUGH_LENS) ||
    (type === DISTS && used > ENOUGH_DISTS)) {
    return 1;
  }

  /* process all codes and make table entries */
  for (;;) {
    /* create table entry */
    here_bits = len - drop;
    if (work[sym] < end) {
      here_op = 0;
      here_val = work[sym];
    }
    else if (work[sym] > end) {
      here_op = extra[extra_index + work[sym]];
      here_val = base[base_index + work[sym]];
    }
    else {
      here_op = 32 + 64;         /* end of block */
      here_val = 0;
    }

    /* replicate for those indices with low len bits equal to huff */
    incr = 1 << (len - drop);
    fill = 1 << curr;
    min = fill;                 /* save offset to next table */
    do {
      fill -= incr;
      table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val |0;
    } while (fill !== 0);

    /* backwards increment the len-bit code huff */
    incr = 1 << (len - 1);
    while (huff & incr) {
      incr >>= 1;
    }
    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else {
      huff = 0;
    }

    /* go to next symbol, update count, len */
    sym++;
    if (--count[len] === 0) {
      if (len === max) { break; }
      len = lens[lens_index + work[sym]];
    }

    /* create new sub-table if needed */
    if (len > root && (huff & mask) !== low) {
      /* if first time, transition to sub-tables */
      if (drop === 0) {
        drop = root;
      }

      /* increment past last table */
      next += min;            /* here min is 1 << curr */

      /* determine length of next table */
      curr = len - drop;
      left = 1 << curr;
      while (curr + drop < max) {
        left -= count[curr + drop];
        if (left <= 0) { break; }
        curr++;
        left <<= 1;
      }

      /* check for enough space */
      used += 1 << curr;
      if ((type === LENS && used > ENOUGH_LENS) ||
        (type === DISTS && used > ENOUGH_DISTS)) {
        return 1;
      }

      /* point entry in root table to sub-table */
      low = huff & mask;
      /*table.op[low] = curr;
      table.bits[low] = root;
      table.val[low] = next - opts.table_index;*/
      table[low] = (root << 24) | (curr << 16) | (next - table_index) |0;
    }
  }

  /* fill in remaining table entry if code is incomplete (guaranteed to have
   at most one remaining entry, since if the code is incomplete, the
   maximum code length that was allowed to get this far is one bit) */
  if (huff !== 0) {
    //table.op[next + huff] = 64;            /* invalid code marker */
    //table.bits[next + huff] = len - drop;
    //table.val[next + huff] = 0;
    table[next + huff] = ((len - drop) << 24) | (64 << 16) |0;
  }

  /* set return parameters */
  //opts.table_index += used;
  opts.bits = root;
  return 0;
};

},{"../utils/common":101}],111:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

module.exports = {
  2:      'need dictionary',     /* Z_NEED_DICT       2  */
  1:      'stream end',          /* Z_STREAM_END      1  */
  0:      '',                    /* Z_OK              0  */
  '-1':   'file error',          /* Z_ERRNO         (-1) */
  '-2':   'stream error',        /* Z_STREAM_ERROR  (-2) */
  '-3':   'data error',          /* Z_DATA_ERROR    (-3) */
  '-4':   'insufficient memory', /* Z_MEM_ERROR     (-4) */
  '-5':   'buffer error',        /* Z_BUF_ERROR     (-5) */
  '-6':   'incompatible version' /* Z_VERSION_ERROR (-6) */
};

},{}],112:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

var utils = require('../utils/common');

/* Public constants ==========================================================*/
/* ===========================================================================*/


//var Z_FILTERED          = 1;
//var Z_HUFFMAN_ONLY      = 2;
//var Z_RLE               = 3;
var Z_FIXED               = 4;
//var Z_DEFAULT_STRATEGY  = 0;

/* Possible values of the data_type field (though see inflate()) */
var Z_BINARY              = 0;
var Z_TEXT                = 1;
//var Z_ASCII             = 1; // = Z_TEXT
var Z_UNKNOWN             = 2;

/*============================================================================*/


function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }

// From zutil.h

var STORED_BLOCK = 0;
var STATIC_TREES = 1;
var DYN_TREES    = 2;
/* The three kinds of block type */

var MIN_MATCH    = 3;
var MAX_MATCH    = 258;
/* The minimum and maximum match lengths */

// From deflate.h
/* ===========================================================================
 * Internal compression state.
 */

var LENGTH_CODES  = 29;
/* number of length codes, not counting the special END_BLOCK code */

var LITERALS      = 256;
/* number of literal bytes 0..255 */

var L_CODES       = LITERALS + 1 + LENGTH_CODES;
/* number of Literal or Length codes, including the END_BLOCK code */

var D_CODES       = 30;
/* number of distance codes */

var BL_CODES      = 19;
/* number of codes used to transfer the bit lengths */

var HEAP_SIZE     = 2 * L_CODES + 1;
/* maximum heap size */

var MAX_BITS      = 15;
/* All codes must not exceed MAX_BITS bits */

var Buf_size      = 16;
/* size of bit buffer in bi_buf */


/* ===========================================================================
 * Constants
 */

var MAX_BL_BITS = 7;
/* Bit length codes must not exceed MAX_BL_BITS bits */

var END_BLOCK   = 256;
/* end of block literal code */

var REP_3_6     = 16;
/* repeat previous bit length 3-6 times (2 bits of repeat count) */

var REPZ_3_10   = 17;
/* repeat a zero length 3-10 times  (3 bits of repeat count) */

var REPZ_11_138 = 18;
/* repeat a zero length 11-138 times  (7 bits of repeat count) */

/* eslint-disable comma-spacing,array-bracket-spacing */
var extra_lbits =   /* extra bits for each length code */
  [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];

var extra_dbits =   /* extra bits for each distance code */
  [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];

var extra_blbits =  /* extra bits for each bit length code */
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7];

var bl_order =
  [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
/* eslint-enable comma-spacing,array-bracket-spacing */

/* The lengths of the bit length codes are sent in order of decreasing
 * probability, to avoid transmitting the lengths for unused bit length codes.
 */

/* ===========================================================================
 * Local data. These are initialized only once.
 */

// We pre-fill arrays with 0 to avoid uninitialized gaps

var DIST_CODE_LEN = 512; /* see definition of array dist_code below */

// !!!! Use flat array instead of structure, Freq = i*2, Len = i*2+1
var static_ltree  = new Array((L_CODES + 2) * 2);
zero(static_ltree);
/* The static literal tree. Since the bit lengths are imposed, there is no
 * need for the L_CODES extra codes used during heap construction. However
 * The codes 286 and 287 are needed to build a canonical tree (see _tr_init
 * below).
 */

var static_dtree  = new Array(D_CODES * 2);
zero(static_dtree);
/* The static distance tree. (Actually a trivial tree since all codes use
 * 5 bits.)
 */

var _dist_code    = new Array(DIST_CODE_LEN);
zero(_dist_code);
/* Distance codes. The first 256 values correspond to the distances
 * 3 .. 258, the last 256 values correspond to the top 8 bits of
 * the 15 bit distances.
 */

var _length_code  = new Array(MAX_MATCH - MIN_MATCH + 1);
zero(_length_code);
/* length code for each normalized match length (0 == MIN_MATCH) */

var base_length   = new Array(LENGTH_CODES);
zero(base_length);
/* First normalized length for each code (0 = MIN_MATCH) */

var base_dist     = new Array(D_CODES);
zero(base_dist);
/* First normalized distance for each code (0 = distance of 1) */


function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {

  this.static_tree  = static_tree;  /* static tree or NULL */
  this.extra_bits   = extra_bits;   /* extra bits for each code or NULL */
  this.extra_base   = extra_base;   /* base index for extra_bits */
  this.elems        = elems;        /* max number of elements in the tree */
  this.max_length   = max_length;   /* max bit length for the codes */

  // show if `static_tree` has data or dummy - needed for monomorphic objects
  this.has_stree    = static_tree && static_tree.length;
}


var static_l_desc;
var static_d_desc;
var static_bl_desc;


function TreeDesc(dyn_tree, stat_desc) {
  this.dyn_tree = dyn_tree;     /* the dynamic tree */
  this.max_code = 0;            /* largest code with non zero frequency */
  this.stat_desc = stat_desc;   /* the corresponding static tree */
}



function d_code(dist) {
  return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
}


/* ===========================================================================
 * Output a short LSB first on the stream.
 * IN assertion: there is enough room in pendingBuf.
 */
function put_short(s, w) {
//    put_byte(s, (uch)((w) & 0xff));
//    put_byte(s, (uch)((ush)(w) >> 8));
  s.pending_buf[s.pending++] = (w) & 0xff;
  s.pending_buf[s.pending++] = (w >>> 8) & 0xff;
}


/* ===========================================================================
 * Send a value on a given number of bits.
 * IN assertion: length <= 16 and value fits in length bits.
 */
function send_bits(s, value, length) {
  if (s.bi_valid > (Buf_size - length)) {
    s.bi_buf |= (value << s.bi_valid) & 0xffff;
    put_short(s, s.bi_buf);
    s.bi_buf = value >> (Buf_size - s.bi_valid);
    s.bi_valid += length - Buf_size;
  } else {
    s.bi_buf |= (value << s.bi_valid) & 0xffff;
    s.bi_valid += length;
  }
}


function send_code(s, c, tree) {
  send_bits(s, tree[c * 2]/*.Code*/, tree[c * 2 + 1]/*.Len*/);
}


/* ===========================================================================
 * Reverse the first len bits of a code, using straightforward code (a faster
 * method would use a table)
 * IN assertion: 1 <= len <= 15
 */
function bi_reverse(code, len) {
  var res = 0;
  do {
    res |= code & 1;
    code >>>= 1;
    res <<= 1;
  } while (--len > 0);
  return res >>> 1;
}


/* ===========================================================================
 * Flush the bit buffer, keeping at most 7 bits in it.
 */
function bi_flush(s) {
  if (s.bi_valid === 16) {
    put_short(s, s.bi_buf);
    s.bi_buf = 0;
    s.bi_valid = 0;

  } else if (s.bi_valid >= 8) {
    s.pending_buf[s.pending++] = s.bi_buf & 0xff;
    s.bi_buf >>= 8;
    s.bi_valid -= 8;
  }
}


/* ===========================================================================
 * Compute the optimal bit lengths for a tree and update the total bit length
 * for the current block.
 * IN assertion: the fields freq and dad are set, heap[heap_max] and
 *    above are the tree nodes sorted by increasing frequency.
 * OUT assertions: the field len is set to the optimal bit length, the
 *     array bl_count contains the frequencies for each bit length.
 *     The length opt_len is updated; static_len is also updated if stree is
 *     not null.
 */
function gen_bitlen(s, desc)
//    deflate_state *s;
//    tree_desc *desc;    /* the tree descriptor */
{
  var tree            = desc.dyn_tree;
  var max_code        = desc.max_code;
  var stree           = desc.stat_desc.static_tree;
  var has_stree       = desc.stat_desc.has_stree;
  var extra           = desc.stat_desc.extra_bits;
  var base            = desc.stat_desc.extra_base;
  var max_length      = desc.stat_desc.max_length;
  var h;              /* heap index */
  var n, m;           /* iterate over the tree elements */
  var bits;           /* bit length */
  var xbits;          /* extra bits */
  var f;              /* frequency */
  var overflow = 0;   /* number of elements with bit length too large */

  for (bits = 0; bits <= MAX_BITS; bits++) {
    s.bl_count[bits] = 0;
  }

  /* In a first pass, compute the optimal bit lengths (which may
   * overflow in the case of the bit length tree).
   */
  tree[s.heap[s.heap_max] * 2 + 1]/*.Len*/ = 0; /* root of the heap */

  for (h = s.heap_max + 1; h < HEAP_SIZE; h++) {
    n = s.heap[h];
    bits = tree[tree[n * 2 + 1]/*.Dad*/ * 2 + 1]/*.Len*/ + 1;
    if (bits > max_length) {
      bits = max_length;
      overflow++;
    }
    tree[n * 2 + 1]/*.Len*/ = bits;
    /* We overwrite tree[n].Dad which is no longer needed */

    if (n > max_code) { continue; } /* not a leaf node */

    s.bl_count[bits]++;
    xbits = 0;
    if (n >= base) {
      xbits = extra[n - base];
    }
    f = tree[n * 2]/*.Freq*/;
    s.opt_len += f * (bits + xbits);
    if (has_stree) {
      s.static_len += f * (stree[n * 2 + 1]/*.Len*/ + xbits);
    }
  }
  if (overflow === 0) { return; }

  // Trace((stderr,"\nbit length overflow\n"));
  /* This happens for example on obj2 and pic of the Calgary corpus */

  /* Find the first bit length which could increase: */
  do {
    bits = max_length - 1;
    while (s.bl_count[bits] === 0) { bits--; }
    s.bl_count[bits]--;      /* move one leaf down the tree */
    s.bl_count[bits + 1] += 2; /* move one overflow item as its brother */
    s.bl_count[max_length]--;
    /* The brother of the overflow item also moves one step up,
     * but this does not affect bl_count[max_length]
     */
    overflow -= 2;
  } while (overflow > 0);

  /* Now recompute all bit lengths, scanning in increasing frequency.
   * h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
   * lengths instead of fixing only the wrong ones. This idea is taken
   * from 'ar' written by Haruhiko Okumura.)
   */
  for (bits = max_length; bits !== 0; bits--) {
    n = s.bl_count[bits];
    while (n !== 0) {
      m = s.heap[--h];
      if (m > max_code) { continue; }
      if (tree[m * 2 + 1]/*.Len*/ !== bits) {
        // Trace((stderr,"code %d bits %d->%d\n", m, tree[m].Len, bits));
        s.opt_len += (bits - tree[m * 2 + 1]/*.Len*/) * tree[m * 2]/*.Freq*/;
        tree[m * 2 + 1]/*.Len*/ = bits;
      }
      n--;
    }
  }
}


/* ===========================================================================
 * Generate the codes for a given tree and bit counts (which need not be
 * optimal).
 * IN assertion: the array bl_count contains the bit length statistics for
 * the given tree and the field len is set for all tree elements.
 * OUT assertion: the field code is set for all tree elements of non
 *     zero code length.
 */
function gen_codes(tree, max_code, bl_count)
//    ct_data *tree;             /* the tree to decorate */
//    int max_code;              /* largest code with non zero frequency */
//    ushf *bl_count;            /* number of codes at each bit length */
{
  var next_code = new Array(MAX_BITS + 1); /* next code value for each bit length */
  var code = 0;              /* running code value */
  var bits;                  /* bit index */
  var n;                     /* code index */

  /* The distribution counts are first used to generate the code values
   * without bit reversal.
   */
  for (bits = 1; bits <= MAX_BITS; bits++) {
    next_code[bits] = code = (code + bl_count[bits - 1]) << 1;
  }
  /* Check that the bit counts in bl_count are consistent. The last code
   * must be all ones.
   */
  //Assert (code + bl_count[MAX_BITS]-1 == (1<<MAX_BITS)-1,
  //        "inconsistent bit counts");
  //Tracev((stderr,"\ngen_codes: max_code %d ", max_code));

  for (n = 0;  n <= max_code; n++) {
    var len = tree[n * 2 + 1]/*.Len*/;
    if (len === 0) { continue; }
    /* Now reverse the bits */
    tree[n * 2]/*.Code*/ = bi_reverse(next_code[len]++, len);

    //Tracecv(tree != static_ltree, (stderr,"\nn %3d %c l %2d c %4x (%x) ",
    //     n, (isgraph(n) ? n : ' '), len, tree[n].Code, next_code[len]-1));
  }
}


/* ===========================================================================
 * Initialize the various 'constant' tables.
 */
function tr_static_init() {
  var n;        /* iterates over tree elements */
  var bits;     /* bit counter */
  var length;   /* length value */
  var code;     /* code value */
  var dist;     /* distance index */
  var bl_count = new Array(MAX_BITS + 1);
  /* number of codes at each bit length for an optimal tree */

  // do check in _tr_init()
  //if (static_init_done) return;

  /* For some embedded targets, global variables are not initialized: */
/*#ifdef NO_INIT_GLOBAL_POINTERS
  static_l_desc.static_tree = static_ltree;
  static_l_desc.extra_bits = extra_lbits;
  static_d_desc.static_tree = static_dtree;
  static_d_desc.extra_bits = extra_dbits;
  static_bl_desc.extra_bits = extra_blbits;
#endif*/

  /* Initialize the mapping length (0..255) -> length code (0..28) */
  length = 0;
  for (code = 0; code < LENGTH_CODES - 1; code++) {
    base_length[code] = length;
    for (n = 0; n < (1 << extra_lbits[code]); n++) {
      _length_code[length++] = code;
    }
  }
  //Assert (length == 256, "tr_static_init: length != 256");
  /* Note that the length 255 (match length 258) can be represented
   * in two different ways: code 284 + 5 bits or code 285, so we
   * overwrite length_code[255] to use the best encoding:
   */
  _length_code[length - 1] = code;

  /* Initialize the mapping dist (0..32K) -> dist code (0..29) */
  dist = 0;
  for (code = 0; code < 16; code++) {
    base_dist[code] = dist;
    for (n = 0; n < (1 << extra_dbits[code]); n++) {
      _dist_code[dist++] = code;
    }
  }
  //Assert (dist == 256, "tr_static_init: dist != 256");
  dist >>= 7; /* from now on, all distances are divided by 128 */
  for (; code < D_CODES; code++) {
    base_dist[code] = dist << 7;
    for (n = 0; n < (1 << (extra_dbits[code] - 7)); n++) {
      _dist_code[256 + dist++] = code;
    }
  }
  //Assert (dist == 256, "tr_static_init: 256+dist != 512");

  /* Construct the codes of the static literal tree */
  for (bits = 0; bits <= MAX_BITS; bits++) {
    bl_count[bits] = 0;
  }

  n = 0;
  while (n <= 143) {
    static_ltree[n * 2 + 1]/*.Len*/ = 8;
    n++;
    bl_count[8]++;
  }
  while (n <= 255) {
    static_ltree[n * 2 + 1]/*.Len*/ = 9;
    n++;
    bl_count[9]++;
  }
  while (n <= 279) {
    static_ltree[n * 2 + 1]/*.Len*/ = 7;
    n++;
    bl_count[7]++;
  }
  while (n <= 287) {
    static_ltree[n * 2 + 1]/*.Len*/ = 8;
    n++;
    bl_count[8]++;
  }
  /* Codes 286 and 287 do not exist, but we must include them in the
   * tree construction to get a canonical Huffman tree (longest code
   * all ones)
   */
  gen_codes(static_ltree, L_CODES + 1, bl_count);

  /* The static distance tree is trivial: */
  for (n = 0; n < D_CODES; n++) {
    static_dtree[n * 2 + 1]/*.Len*/ = 5;
    static_dtree[n * 2]/*.Code*/ = bi_reverse(n, 5);
  }

  // Now data ready and we can init static trees
  static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS + 1, L_CODES, MAX_BITS);
  static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0,          D_CODES, MAX_BITS);
  static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0,         BL_CODES, MAX_BL_BITS);

  //static_init_done = true;
}


/* ===========================================================================
 * Initialize a new block.
 */
function init_block(s) {
  var n; /* iterates over tree elements */

  /* Initialize the trees. */
  for (n = 0; n < L_CODES;  n++) { s.dyn_ltree[n * 2]/*.Freq*/ = 0; }
  for (n = 0; n < D_CODES;  n++) { s.dyn_dtree[n * 2]/*.Freq*/ = 0; }
  for (n = 0; n < BL_CODES; n++) { s.bl_tree[n * 2]/*.Freq*/ = 0; }

  s.dyn_ltree[END_BLOCK * 2]/*.Freq*/ = 1;
  s.opt_len = s.static_len = 0;
  s.last_lit = s.matches = 0;
}


/* ===========================================================================
 * Flush the bit buffer and align the output on a byte boundary
 */
function bi_windup(s)
{
  if (s.bi_valid > 8) {
    put_short(s, s.bi_buf);
  } else if (s.bi_valid > 0) {
    //put_byte(s, (Byte)s->bi_buf);
    s.pending_buf[s.pending++] = s.bi_buf;
  }
  s.bi_buf = 0;
  s.bi_valid = 0;
}

/* ===========================================================================
 * Copy a stored block, storing first the length and its
 * one's complement if requested.
 */
function copy_block(s, buf, len, header)
//DeflateState *s;
//charf    *buf;    /* the input data */
//unsigned len;     /* its length */
//int      header;  /* true if block header must be written */
{
  bi_windup(s);        /* align on byte boundary */

  if (header) {
    put_short(s, len);
    put_short(s, ~len);
  }
//  while (len--) {
//    put_byte(s, *buf++);
//  }
  utils.arraySet(s.pending_buf, s.window, buf, len, s.pending);
  s.pending += len;
}

/* ===========================================================================
 * Compares to subtrees, using the tree depth as tie breaker when
 * the subtrees have equal frequency. This minimizes the worst case length.
 */
function smaller(tree, n, m, depth) {
  var _n2 = n * 2;
  var _m2 = m * 2;
  return (tree[_n2]/*.Freq*/ < tree[_m2]/*.Freq*/ ||
         (tree[_n2]/*.Freq*/ === tree[_m2]/*.Freq*/ && depth[n] <= depth[m]));
}

/* ===========================================================================
 * Restore the heap property by moving down the tree starting at node k,
 * exchanging a node with the smallest of its two sons if necessary, stopping
 * when the heap property is re-established (each father smaller than its
 * two sons).
 */
function pqdownheap(s, tree, k)
//    deflate_state *s;
//    ct_data *tree;  /* the tree to restore */
//    int k;               /* node to move down */
{
  var v = s.heap[k];
  var j = k << 1;  /* left son of k */
  while (j <= s.heap_len) {
    /* Set j to the smallest of the two sons: */
    if (j < s.heap_len &&
      smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
      j++;
    }
    /* Exit if v is smaller than both sons */
    if (smaller(tree, v, s.heap[j], s.depth)) { break; }

    /* Exchange v with the smallest son */
    s.heap[k] = s.heap[j];
    k = j;

    /* And continue down the tree, setting j to the left son of k */
    j <<= 1;
  }
  s.heap[k] = v;
}


// inlined manually
// var SMALLEST = 1;

/* ===========================================================================
 * Send the block data compressed using the given Huffman trees
 */
function compress_block(s, ltree, dtree)
//    deflate_state *s;
//    const ct_data *ltree; /* literal tree */
//    const ct_data *dtree; /* distance tree */
{
  var dist;           /* distance of matched string */
  var lc;             /* match length or unmatched char (if dist == 0) */
  var lx = 0;         /* running index in l_buf */
  var code;           /* the code to send */
  var extra;          /* number of extra bits to send */

  if (s.last_lit !== 0) {
    do {
      dist = (s.pending_buf[s.d_buf + lx * 2] << 8) | (s.pending_buf[s.d_buf + lx * 2 + 1]);
      lc = s.pending_buf[s.l_buf + lx];
      lx++;

      if (dist === 0) {
        send_code(s, lc, ltree); /* send a literal byte */
        //Tracecv(isgraph(lc), (stderr," '%c' ", lc));
      } else {
        /* Here, lc is the match length - MIN_MATCH */
        code = _length_code[lc];
        send_code(s, code + LITERALS + 1, ltree); /* send the length code */
        extra = extra_lbits[code];
        if (extra !== 0) {
          lc -= base_length[code];
          send_bits(s, lc, extra);       /* send the extra length bits */
        }
        dist--; /* dist is now the match distance - 1 */
        code = d_code(dist);
        //Assert (code < D_CODES, "bad d_code");

        send_code(s, code, dtree);       /* send the distance code */
        extra = extra_dbits[code];
        if (extra !== 0) {
          dist -= base_dist[code];
          send_bits(s, dist, extra);   /* send the extra distance bits */
        }
      } /* literal or match pair ? */

      /* Check that the overlay between pending_buf and d_buf+l_buf is ok: */
      //Assert((uInt)(s->pending) < s->lit_bufsize + 2*lx,
      //       "pendingBuf overflow");

    } while (lx < s.last_lit);
  }

  send_code(s, END_BLOCK, ltree);
}


/* ===========================================================================
 * Construct one Huffman tree and assigns the code bit strings and lengths.
 * Update the total bit length for the current block.
 * IN assertion: the field freq is set for all tree elements.
 * OUT assertions: the fields len and code are set to the optimal bit length
 *     and corresponding code. The length opt_len is updated; static_len is
 *     also updated if stree is not null. The field max_code is set.
 */
function build_tree(s, desc)
//    deflate_state *s;
//    tree_desc *desc; /* the tree descriptor */
{
  var tree     = desc.dyn_tree;
  var stree    = desc.stat_desc.static_tree;
  var has_stree = desc.stat_desc.has_stree;
  var elems    = desc.stat_desc.elems;
  var n, m;          /* iterate over heap elements */
  var max_code = -1; /* largest code with non zero frequency */
  var node;          /* new node being created */

  /* Construct the initial heap, with least frequent element in
   * heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
   * heap[0] is not used.
   */
  s.heap_len = 0;
  s.heap_max = HEAP_SIZE;

  for (n = 0; n < elems; n++) {
    if (tree[n * 2]/*.Freq*/ !== 0) {
      s.heap[++s.heap_len] = max_code = n;
      s.depth[n] = 0;

    } else {
      tree[n * 2 + 1]/*.Len*/ = 0;
    }
  }

  /* The pkzip format requires that at least one distance code exists,
   * and that at least one bit should be sent even if there is only one
   * possible code. So to avoid special checks later on we force at least
   * two codes of non zero frequency.
   */
  while (s.heap_len < 2) {
    node = s.heap[++s.heap_len] = (max_code < 2 ? ++max_code : 0);
    tree[node * 2]/*.Freq*/ = 1;
    s.depth[node] = 0;
    s.opt_len--;

    if (has_stree) {
      s.static_len -= stree[node * 2 + 1]/*.Len*/;
    }
    /* node is 0 or 1 so it does not have extra bits */
  }
  desc.max_code = max_code;

  /* The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
   * establish sub-heaps of increasing lengths:
   */
  for (n = (s.heap_len >> 1/*int /2*/); n >= 1; n--) { pqdownheap(s, tree, n); }

  /* Construct the Huffman tree by repeatedly combining the least two
   * frequent nodes.
   */
  node = elems;              /* next internal node of the tree */
  do {
    //pqremove(s, tree, n);  /* n = node of least frequency */
    /*** pqremove ***/
    n = s.heap[1/*SMALLEST*/];
    s.heap[1/*SMALLEST*/] = s.heap[s.heap_len--];
    pqdownheap(s, tree, 1/*SMALLEST*/);
    /***/

    m = s.heap[1/*SMALLEST*/]; /* m = node of next least frequency */

    s.heap[--s.heap_max] = n; /* keep the nodes sorted by frequency */
    s.heap[--s.heap_max] = m;

    /* Create a new node father of n and m */
    tree[node * 2]/*.Freq*/ = tree[n * 2]/*.Freq*/ + tree[m * 2]/*.Freq*/;
    s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
    tree[n * 2 + 1]/*.Dad*/ = tree[m * 2 + 1]/*.Dad*/ = node;

    /* and insert the new node in the heap */
    s.heap[1/*SMALLEST*/] = node++;
    pqdownheap(s, tree, 1/*SMALLEST*/);

  } while (s.heap_len >= 2);

  s.heap[--s.heap_max] = s.heap[1/*SMALLEST*/];

  /* At this point, the fields freq and dad are set. We can now
   * generate the bit lengths.
   */
  gen_bitlen(s, desc);

  /* The field len is now set, we can generate the bit codes */
  gen_codes(tree, max_code, s.bl_count);
}


/* ===========================================================================
 * Scan a literal or distance tree to determine the frequencies of the codes
 * in the bit length tree.
 */
function scan_tree(s, tree, max_code)
//    deflate_state *s;
//    ct_data *tree;   /* the tree to be scanned */
//    int max_code;    /* and its largest code of non zero frequency */
{
  var n;                     /* iterates over all tree elements */
  var prevlen = -1;          /* last emitted length */
  var curlen;                /* length of current code */

  var nextlen = tree[0 * 2 + 1]/*.Len*/; /* length of next code */

  var count = 0;             /* repeat count of the current code */
  var max_count = 7;         /* max repeat count */
  var min_count = 4;         /* min repeat count */

  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  tree[(max_code + 1) * 2 + 1]/*.Len*/ = 0xffff; /* guard */

  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1]/*.Len*/;

    if (++count < max_count && curlen === nextlen) {
      continue;

    } else if (count < min_count) {
      s.bl_tree[curlen * 2]/*.Freq*/ += count;

    } else if (curlen !== 0) {

      if (curlen !== prevlen) { s.bl_tree[curlen * 2]/*.Freq*/++; }
      s.bl_tree[REP_3_6 * 2]/*.Freq*/++;

    } else if (count <= 10) {
      s.bl_tree[REPZ_3_10 * 2]/*.Freq*/++;

    } else {
      s.bl_tree[REPZ_11_138 * 2]/*.Freq*/++;
    }

    count = 0;
    prevlen = curlen;

    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;

    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;

    } else {
      max_count = 7;
      min_count = 4;
    }
  }
}


/* ===========================================================================
 * Send a literal or distance tree in compressed form, using the codes in
 * bl_tree.
 */
function send_tree(s, tree, max_code)
//    deflate_state *s;
//    ct_data *tree; /* the tree to be scanned */
//    int max_code;       /* and its largest code of non zero frequency */
{
  var n;                     /* iterates over all tree elements */
  var prevlen = -1;          /* last emitted length */
  var curlen;                /* length of current code */

  var nextlen = tree[0 * 2 + 1]/*.Len*/; /* length of next code */

  var count = 0;             /* repeat count of the current code */
  var max_count = 7;         /* max repeat count */
  var min_count = 4;         /* min repeat count */

  /* tree[max_code+1].Len = -1; */  /* guard already set */
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }

  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1]/*.Len*/;

    if (++count < max_count && curlen === nextlen) {
      continue;

    } else if (count < min_count) {
      do { send_code(s, curlen, s.bl_tree); } while (--count !== 0);

    } else if (curlen !== 0) {
      if (curlen !== prevlen) {
        send_code(s, curlen, s.bl_tree);
        count--;
      }
      //Assert(count >= 3 && count <= 6, " 3_6?");
      send_code(s, REP_3_6, s.bl_tree);
      send_bits(s, count - 3, 2);

    } else if (count <= 10) {
      send_code(s, REPZ_3_10, s.bl_tree);
      send_bits(s, count - 3, 3);

    } else {
      send_code(s, REPZ_11_138, s.bl_tree);
      send_bits(s, count - 11, 7);
    }

    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;

    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;

    } else {
      max_count = 7;
      min_count = 4;
    }
  }
}


/* ===========================================================================
 * Construct the Huffman tree for the bit lengths and return the index in
 * bl_order of the last bit length code to send.
 */
function build_bl_tree(s) {
  var max_blindex;  /* index of last bit length code of non zero freq */

  /* Determine the bit length frequencies for literal and distance trees */
  scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
  scan_tree(s, s.dyn_dtree, s.d_desc.max_code);

  /* Build the bit length tree: */
  build_tree(s, s.bl_desc);
  /* opt_len now includes the length of the tree representations, except
   * the lengths of the bit lengths codes and the 5+5+4 bits for the counts.
   */

  /* Determine the number of bit length codes to send. The pkzip format
   * requires that at least 4 bit length codes be sent. (appnote.txt says
   * 3 but the actual value used is 4.)
   */
  for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
    if (s.bl_tree[bl_order[max_blindex] * 2 + 1]/*.Len*/ !== 0) {
      break;
    }
  }
  /* Update opt_len to include the bit length tree and counts */
  s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
  //Tracev((stderr, "\ndyn trees: dyn %ld, stat %ld",
  //        s->opt_len, s->static_len));

  return max_blindex;
}


/* ===========================================================================
 * Send the header for a block using dynamic Huffman trees: the counts, the
 * lengths of the bit length codes, the literal tree and the distance tree.
 * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
 */
function send_all_trees(s, lcodes, dcodes, blcodes)
//    deflate_state *s;
//    int lcodes, dcodes, blcodes; /* number of codes for each tree */
{
  var rank;                    /* index in bl_order */

  //Assert (lcodes >= 257 && dcodes >= 1 && blcodes >= 4, "not enough codes");
  //Assert (lcodes <= L_CODES && dcodes <= D_CODES && blcodes <= BL_CODES,
  //        "too many codes");
  //Tracev((stderr, "\nbl counts: "));
  send_bits(s, lcodes - 257, 5); /* not +255 as stated in appnote.txt */
  send_bits(s, dcodes - 1,   5);
  send_bits(s, blcodes - 4,  4); /* not -3 as stated in appnote.txt */
  for (rank = 0; rank < blcodes; rank++) {
    //Tracev((stderr, "\nbl code %2d ", bl_order[rank]));
    send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1]/*.Len*/, 3);
  }
  //Tracev((stderr, "\nbl tree: sent %ld", s->bits_sent));

  send_tree(s, s.dyn_ltree, lcodes - 1); /* literal tree */
  //Tracev((stderr, "\nlit tree: sent %ld", s->bits_sent));

  send_tree(s, s.dyn_dtree, dcodes - 1); /* distance tree */
  //Tracev((stderr, "\ndist tree: sent %ld", s->bits_sent));
}


/* ===========================================================================
 * Check if the data type is TEXT or BINARY, using the following algorithm:
 * - TEXT if the two conditions below are satisfied:
 *    a) There are no non-portable control characters belonging to the
 *       "black list" (0..6, 14..25, 28..31).
 *    b) There is at least one printable character belonging to the
 *       "white list" (9 {TAB}, 10 {LF}, 13 {CR}, 32..255).
 * - BINARY otherwise.
 * - The following partially-portable control characters form a
 *   "gray list" that is ignored in this detection algorithm:
 *   (7 {BEL}, 8 {BS}, 11 {VT}, 12 {FF}, 26 {SUB}, 27 {ESC}).
 * IN assertion: the fields Freq of dyn_ltree are set.
 */
function detect_data_type(s) {
  /* black_mask is the bit mask of black-listed bytes
   * set bits 0..6, 14..25, and 28..31
   * 0xf3ffc07f = binary 11110011111111111100000001111111
   */
  var black_mask = 0xf3ffc07f;
  var n;

  /* Check for non-textual ("black-listed") bytes. */
  for (n = 0; n <= 31; n++, black_mask >>>= 1) {
    if ((black_mask & 1) && (s.dyn_ltree[n * 2]/*.Freq*/ !== 0)) {
      return Z_BINARY;
    }
  }

  /* Check for textual ("white-listed") bytes. */
  if (s.dyn_ltree[9 * 2]/*.Freq*/ !== 0 || s.dyn_ltree[10 * 2]/*.Freq*/ !== 0 ||
      s.dyn_ltree[13 * 2]/*.Freq*/ !== 0) {
    return Z_TEXT;
  }
  for (n = 32; n < LITERALS; n++) {
    if (s.dyn_ltree[n * 2]/*.Freq*/ !== 0) {
      return Z_TEXT;
    }
  }

  /* There are no "black-listed" or "white-listed" bytes:
   * this stream either is empty or has tolerated ("gray-listed") bytes only.
   */
  return Z_BINARY;
}


var static_init_done = false;

/* ===========================================================================
 * Initialize the tree data structures for a new zlib stream.
 */
function _tr_init(s)
{

  if (!static_init_done) {
    tr_static_init();
    static_init_done = true;
  }

  s.l_desc  = new TreeDesc(s.dyn_ltree, static_l_desc);
  s.d_desc  = new TreeDesc(s.dyn_dtree, static_d_desc);
  s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);

  s.bi_buf = 0;
  s.bi_valid = 0;

  /* Initialize the first block of the first file: */
  init_block(s);
}


/* ===========================================================================
 * Send a stored block
 */
function _tr_stored_block(s, buf, stored_len, last)
//DeflateState *s;
//charf *buf;       /* input block */
//ulg stored_len;   /* length of input block */
//int last;         /* one if this is the last block for a file */
{
  send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);    /* send block type */
  copy_block(s, buf, stored_len, true); /* with header */
}


/* ===========================================================================
 * Send one empty static block to give enough lookahead for inflate.
 * This takes 10 bits, of which 7 may remain in the bit buffer.
 */
function _tr_align(s) {
  send_bits(s, STATIC_TREES << 1, 3);
  send_code(s, END_BLOCK, static_ltree);
  bi_flush(s);
}


/* ===========================================================================
 * Determine the best encoding for the current block: dynamic trees, static
 * trees or store, and output the encoded block to the zip file.
 */
function _tr_flush_block(s, buf, stored_len, last)
//DeflateState *s;
//charf *buf;       /* input block, or NULL if too old */
//ulg stored_len;   /* length of input block */
//int last;         /* one if this is the last block for a file */
{
  var opt_lenb, static_lenb;  /* opt_len and static_len in bytes */
  var max_blindex = 0;        /* index of last bit length code of non zero freq */

  /* Build the Huffman trees unless a stored block is forced */
  if (s.level > 0) {

    /* Check if the file is binary or text */
    if (s.strm.data_type === Z_UNKNOWN) {
      s.strm.data_type = detect_data_type(s);
    }

    /* Construct the literal and distance trees */
    build_tree(s, s.l_desc);
    // Tracev((stderr, "\nlit data: dyn %ld, stat %ld", s->opt_len,
    //        s->static_len));

    build_tree(s, s.d_desc);
    // Tracev((stderr, "\ndist data: dyn %ld, stat %ld", s->opt_len,
    //        s->static_len));
    /* At this point, opt_len and static_len are the total bit lengths of
     * the compressed block data, excluding the tree representations.
     */

    /* Build the bit length tree for the above two trees, and get the index
     * in bl_order of the last bit length code to send.
     */
    max_blindex = build_bl_tree(s);

    /* Determine the best encoding. Compute the block lengths in bytes. */
    opt_lenb = (s.opt_len + 3 + 7) >>> 3;
    static_lenb = (s.static_len + 3 + 7) >>> 3;

    // Tracev((stderr, "\nopt %lu(%lu) stat %lu(%lu) stored %lu lit %u ",
    //        opt_lenb, s->opt_len, static_lenb, s->static_len, stored_len,
    //        s->last_lit));

    if (static_lenb <= opt_lenb) { opt_lenb = static_lenb; }

  } else {
    // Assert(buf != (char*)0, "lost buf");
    opt_lenb = static_lenb = stored_len + 5; /* force a stored block */
  }

  if ((stored_len + 4 <= opt_lenb) && (buf !== -1)) {
    /* 4: two words for the lengths */

    /* The test buf != NULL is only necessary if LIT_BUFSIZE > WSIZE.
     * Otherwise we can't have processed more than WSIZE input bytes since
     * the last block flush, because compression would have been
     * successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
     * transform a block into a stored block.
     */
    _tr_stored_block(s, buf, stored_len, last);

  } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {

    send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
    compress_block(s, static_ltree, static_dtree);

  } else {
    send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
    send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
    compress_block(s, s.dyn_ltree, s.dyn_dtree);
  }
  // Assert (s->compressed_len == s->bits_sent, "bad compressed size");
  /* The above check is made mod 2^32, for files larger than 512 MB
   * and uLong implemented on 32 bits.
   */
  init_block(s);

  if (last) {
    bi_windup(s);
  }
  // Tracev((stderr,"\ncomprlen %lu(%lu) ", s->compressed_len>>3,
  //       s->compressed_len-7*last));
}

/* ===========================================================================
 * Save the match info and tally the frequency counts. Return true if
 * the current block must be flushed.
 */
function _tr_tally(s, dist, lc)
//    deflate_state *s;
//    unsigned dist;  /* distance of matched string */
//    unsigned lc;    /* match length-MIN_MATCH or unmatched char (if dist==0) */
{
  //var out_length, in_length, dcode;

  s.pending_buf[s.d_buf + s.last_lit * 2]     = (dist >>> 8) & 0xff;
  s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 0xff;

  s.pending_buf[s.l_buf + s.last_lit] = lc & 0xff;
  s.last_lit++;

  if (dist === 0) {
    /* lc is the unmatched char */
    s.dyn_ltree[lc * 2]/*.Freq*/++;
  } else {
    s.matches++;
    /* Here, lc is the match length - MIN_MATCH */
    dist--;             /* dist = match distance - 1 */
    //Assert((ush)dist < (ush)MAX_DIST(s) &&
    //       (ush)lc <= (ush)(MAX_MATCH-MIN_MATCH) &&
    //       (ush)d_code(dist) < (ush)D_CODES,  "_tr_tally: bad match");

    s.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]/*.Freq*/++;
    s.dyn_dtree[d_code(dist) * 2]/*.Freq*/++;
  }

// (!) This block is disabled in zlib defaults,
// don't enable it for binary compatibility

//#ifdef TRUNCATE_BLOCK
//  /* Try to guess if it is profitable to stop the current block here */
//  if ((s.last_lit & 0x1fff) === 0 && s.level > 2) {
//    /* Compute an upper bound for the compressed length */
//    out_length = s.last_lit*8;
//    in_length = s.strstart - s.block_start;
//
//    for (dcode = 0; dcode < D_CODES; dcode++) {
//      out_length += s.dyn_dtree[dcode*2]/*.Freq*/ * (5 + extra_dbits[dcode]);
//    }
//    out_length >>>= 3;
//    //Tracev((stderr,"\nlast_lit %u, in %ld, out ~%ld(%ld%%) ",
//    //       s->last_lit, in_length, out_length,
//    //       100L - out_length*100L/in_length));
//    if (s.matches < (s.last_lit>>1)/*int /2*/ && out_length < (in_length>>1)/*int /2*/) {
//      return true;
//    }
//  }
//#endif

  return (s.last_lit === s.lit_bufsize - 1);
  /* We avoid equality with lit_bufsize because of wraparound at 64K
   * on 16 bit machines and because stored blocks are restricted to
   * 64K-1 bytes.
   */
}

exports._tr_init  = _tr_init;
exports._tr_stored_block = _tr_stored_block;
exports._tr_flush_block  = _tr_flush_block;
exports._tr_tally = _tr_tally;
exports._tr_align = _tr_align;

},{"../utils/common":101}],113:[function(require,module,exports){
'use strict';

// (C) 1995-2013 Jean-loup Gailly and Mark Adler
// (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
//
// This software is provided 'as-is', without any express or implied
// warranty. In no event will the authors be held liable for any damages
// arising from the use of this software.
//
// Permission is granted to anyone to use this software for any purpose,
// including commercial applications, and to alter it and redistribute it
// freely, subject to the following restrictions:
//
// 1. The origin of this software must not be misrepresented; you must not
//   claim that you wrote the original software. If you use this software
//   in a product, an acknowledgment in the product documentation would be
//   appreciated but is not required.
// 2. Altered source versions must be plainly marked as such, and must not be
//   misrepresented as being the original software.
// 3. This notice may not be removed or altered from any source distribution.

function ZStream() {
  /* next input byte */
  this.input = null; // JS specific, because we have no pointers
  this.next_in = 0;
  /* number of bytes available at input */
  this.avail_in = 0;
  /* total number of input bytes read so far */
  this.total_in = 0;
  /* next output byte should be put there */
  this.output = null; // JS specific, because we have no pointers
  this.next_out = 0;
  /* remaining free space at output */
  this.avail_out = 0;
  /* total number of bytes output so far */
  this.total_out = 0;
  /* last error message, NULL if no error */
  this.msg = ''/*Z_NULL*/;
  /* not visible by applications */
  this.state = null;
  /* best guess about the data type: binary or text */
  this.data_type = 2/*Z_UNKNOWN*/;
  /* adler32 value of the uncompressed data */
  this.adler = 0;
}

module.exports = ZStream;

},{}]},{},[36]);
