'use strict'

const constants = require('../constants')

const ShortString = constants.ShortString
// const ShortMap = constants.ShortMap
// const Null = constants.Null

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

RW.prototype.writeString = function (s) {
  var utf8 = []
  var i = 0

  while (i < s.length) {
    var codePoint

    // Decode UTF-16
    var a = s.charCodeAt(i++)
    if (a < 0xD800 || a >= 0xDC00) {
      codePoint = a
    } else {
      var b = s.charCodeAt(i++)
      codePoint = (a << 10) + b + (0x10000 - (0xD800 << 10) - 0xDC00)
    }

    // Encode UTF-8
    if (codePoint < 0x80) {
      utf8.push(codePoint)
    } else {
      if (codePoint < 0x800) {
        utf8.push(((codePoint >> 6) & 0x1F) | 0xC0)
      } else {
        if (codePoint < 0x10000) {
          utf8.push(((codePoint >> 12) & 0x0F) | 0xE0)
        } else {
          utf8.push(
            ((codePoint >> 18) & 0x07) | 0xF0,
            ((codePoint >> 12) & 0x3F) | 0x80)
        }
        utf8.push(((codePoint >> 6) & 0x3F) | 0x80)
      }
      utf8.push((codePoint & 0x3F) | 0x80)
    }
  }

  if (utf8.length > Math.pow(2, 24)) {
    throw new Error('strings bigger than 16777216 not supported')
  }

  var length = utf8.length

  this.grow(length + 4)

  var pos = this._pos - length - 4
  var bytes = this._bytes

  bytes[pos++] = ShortString
  bytes[pos++] = length // little endian encoding
  bytes[pos++] = length >> 8
  bytes[pos++] = length >> 16

  for (i = 0; i < utf8.length; i++) {
    bytes[pos++] = utf8[i]
  }

  this._pos -= length + 4

  return this._pos
}

RW.prototype.grow = function (size) {
  var needed = 0
  var multiplier = 0
  var nb = null
  var length = this._bytes.length

  do {
    needed = this._pos - size + length * multiplier
    multiplier++
  } while (needed < 0)

  if (multiplier > 1) {
    nb = Buffer.allocUnsafe(this._bytes.length * multiplier)
    nb.set(this._bytes, this._bytes.length + this._pos)
    this._pos = this._bytes.length * (multiplier - 1) + this._pos
    this._bytes = nb
  }

  return this
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
      return this._readString(len)
    default:
      throw new Error('unable to decode')
  }
}

RW.prototype._readString = function (len) {
  var buf = this._bytes
  var pos = this._pos
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

  this._pos += len

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
