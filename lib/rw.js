'use strict'

const constants = require('../constants')
const hashlru = require('hashlru')

const LRU = hashlru(1000)

const ShortString = constants.ShortString
// const ShortMap = constants.ShortMap
// const Null = constants.Null

const maxString = Math.pow(2, 24)

function byteLength (str) {
  var len = LRU.get(str)

  if (!len) {
    len = Buffer.byteLength(str)
    LRU.set(str, len)
  }

  return len
}

function RW (size) {
  if (!(this instanceof RW)) {
    return new RW(size)
  }

  if (size instanceof Uint8Array) {
    this._bytes = size
    this._pos = 0
  } else {
    size = +size || 1024

    this._bytes = Buffer.allocUnsafe(size)
    this._pos = size // we write backwards
  }
}

function strByteLength (s) {
  var chars = LRU.get(s) || 0

  if (chars) {
    return chars
  }

  var i = 0
  var codePoint = 0
  var a = ''
  var b = ''
  var l = s.length

  while (i < l) {
    // Decode UTF-16
    a = s.charCodeAt(i++)
    if (a < 0xD800 || a >= 0xDC00) {
      codePoint = a
    } else {
      b = s.charCodeAt(i++)
      codePoint = (a << 10) + b + (0x10000 - (0xD800 << 10) - 0xDC00)
    }

    (codePoint & 0x10000) && chars++
    (codePoint & 0x800) && chars++
    (codePoint & 0x80) && chars++
    chars++
  }

  LRU.set(s, chars)

  return chars
}

function asUtf8Array (y, p, s) {
  var i = 0, c = 0
  var a = '', b = ''

  while (i < s.length) {
a = s.charCodeAt(i++)
if (a < 0xD800 || a >= 0xDC00) { c = a } else {
b = s.charCodeAt(i++)
c = (a << 10) + b + (0x10000 - (0xD800 << 10) - 0xDC00)
}
if (c < 0x80) { y[p++] = c } else {
if (c < 0x800) {
y[p++] = ((c >> 6) & 0x1F) | 0xC0
} else {
if (c < 0x10000) {
y[p++] = ((c >> 12) & 0x0F) | 0xE0
} else {
y[p++] = ((c >> 18) & 0x07) | 0xF0
y[p++] = ((c >> 12) & 0x3F) | 0x80
}
y[p++] = ((c >> 6) & 0x3F) | 0x80
}
y[p++] = (c & 0x3F) | 0x80
}
}

  return p
}

RW.prototype.writeString = function (s) {
  var bytes = this._bytes
  var length = byteLength(s)

  if (length > maxString) {
    throw new Error('strings bigger than 16777216 not supported')
  }

  var multiplier = 0
  var target = this._pos - length - 4

  while (target + (bytes.length * multiplier++) < 0) {}
  if (multiplier > 1) {
    this.grow(multiplier)
    bytes = this._bytes
  }

  var pos = this._pos - length - 4

  bytes[pos++] = ShortString
  bytes[pos++] = length // little endian encoding
  bytes[pos++] = length >> 8
  bytes[pos++] = length >> 16

  pos = asUtf8Array(bytes, pos, s)

  this._pos -= length + 4

  return this._pos
}

RW.prototype.grow = function (multiplier) {
  var bytes = this._bytes
  var pos = this._pos

  var nb = Buffer.allocUnsafe(bytes.length * multiplier)
  nb.set(bytes, bytes.length + pos)
  this._pos = bytes.length * (multiplier - 1) + pos
  this._bytes = nb

  return this._pos
}

RW.prototype.read = function () {
  var pos = this._pos
  var buf = this._bytes
  var first = buf[pos++]
  var len = buf[pos++] +
            (buf[pos++] << 8) +
            (buf[pos++] << 16)

  this._pos = pos

  switch (first) {
    case ShortString:
      return readString(this, len)
    default:
      throw new Error('unable to decode')
  }
}

function readString (that, len) {
  var buf = that._bytes
  var pos = that._pos
  var to = pos + len
  var codePoint
  var str = ''
  var a = ''
  var b = ''
  var c = ''
  var d = ''

  while (pos < to) {
    // Decode UTF-8
    a = buf[pos++]
    if (a < 0xC0) {
      codePoint = a
    } else {
      b = buf[pos++]
      if (a < 0xE0) {
        codePoint =
          ((a & 0x1F) << 6) |
          (b & 0x3F)
      } else {
        c = buf[pos++]
        if (a < 0xF0) {
          codePoint =
            ((a & 0x0F) << 12) |
            ((b & 0x3F) << 6) |
            (c & 0x3F)
        } else {
          d = buf[pos++]
          codePoint =
            ((a & 0x07) << 18) |
            ((b & 0x3F) << 12) |
            ((c & 0x3F) << 6) |
            (d & 0x3F)
        }
      }
    }

    // Encode UTF-16
    if (codePoint < 0x10000) {
      str += String.fromCharCode(codePoint)
    } else {
      codePoint -= 0x10000
      str += String.fromCharCode(
        (codePoint >> 10) + 0xD800,
        (codePoint & ((1 << 10) - 1)) + 0xDC00)
    }
  }

  that._pos += len

  return str
}

RW.prototype.asBuffer = function () {
  if (Buffer && this._bytes instanceof Buffer) {
    return this._bytes.slice(this._pos)
  }
  return Buffer.from(this.asUint8Array())
}

RW.prototype.asUint8Array = function () {
  return this._bytes.subarray(this._pos)
}

module.exports = RW
