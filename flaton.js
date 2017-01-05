'use strict'

var hashlru = require('hashlru')
var LRU = hashlru(1000)
var ShortString = 0x0001
var MapId = 0x0002
var Null = 0x0000
var NullBuf = Buffer.from([Null])

function byteLength (str) {
  var len = LRU.get(str)

  if (!len) {
    len = Buffer.byteLength(str)
    LRU.set(str, len)
  }

  return len
}

// Code partially lifted and adapted from
// https://github.com/google/flatbuffers/blob/master/js/flatbuffers.js
function writeString (buf, s, pos) {
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
      buf[pos++] = codePoint
    } else {
      if (codePoint < 0x800) {
        buf[pos++] = ((codePoint >> 6) & 0x1F) | 0xC0
      } else {
        if (codePoint < 0x10000) {
          buf[pos++] = ((codePoint >> 12) & 0x0F) | 0xE0
        } else {
          buf[pos++] = ((codePoint >> 18) & 0x07) | 0xF0
          buf[pos++] = ((codePoint >> 12) & 0x3F) | 0x80
        }
        buf[pos++] = ((codePoint >> 6) & 0x3F) | 0x80
      }
      buf[pos++] = (codePoint & 0x3F) | 0x80
    }
  }
  return pos
}

function encode (obj) {
  var blen = 0
  var buf = null
  if (typeof obj === 'string') { // max 256 length
    blen = byteLength(obj)
    buf = Buffer.allocUnsafe(blen + 2)
    encodeShortString(obj, buf, 0, blen)
    return buf
  } else if (obj === null) {
    return NullBuf
  } else if (typeof obj === 'object') {
    return encodeObject(obj)
  } else {
    throw new Error('unable to encode')
  }
}

function encodeShortString (obj, buf, pos, blen) {
  buf[pos++] = ShortString
  buf[pos++] = blen
  return writeString(buf, obj, pos)
}

function encodeObject (obj) {
  var meta = calcObjectMeta(obj)
  var len = meta.len + 1 + 1
  var buf = Buffer.allocUnsafe(len)
  var props = meta.props
  var pos = 0
  var valPos = meta.totalKeysLen + 2
  var prop = null

  buf[pos++] = MapId
  buf[pos++] = props.length

  for (var i = 0; i < props.length; i++) {
    prop = props[i]
    pos = encodeShortString(prop.key, buf, pos, prop.keyLen)
    pos = buf.writeUInt32BE(valPos, pos)
    valPos = encodeShortString(prop.value, buf, valPos, prop.valLen)
  }

  pos = valPos

  return buf
}

function calcObjectMeta (obj) {
  var len = 0
  var keys = Object.keys(obj)
  var props = new Array(keys.length)
  var keyLen = 0
  var valLen = 0
  var key = null
  var totalKeysLen = 0
  var value = null

  for (var i = 0; i < keys.length; i++) {
    key = keys[i]
    value = obj[key]
    keyLen = byteLength(key)
    valLen = byteLength(value)
    len += 2 + keyLen + 2 + valLen + 4
    totalKeysLen += 2 + keyLen + 4
    props[i] = {
      key,
      value,
      keyLen,
      valLen
    }
  }

  return {
    len,
    totalKeysLen,
    props
  }
}

var pos = 0

function decode (buf, p) {
  pos = p || 0
  return _decode(buf)
}

function _decode (buf) {
  var first = buf.readUInt8(pos++)
  switch (first) {
    case ShortString:
      return decodeString(buf)
    case MapId:
      return decodeObject(buf)
    case Null:
      return null
    default:
      throw new Error('unable to decode')
  }
}

// Code partially lifted and adapted from
// https://github.com/google/flatbuffers/blob/master/js/flatbuffers.js
function decodeString (buf) {
  var len = buf[pos++]
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

  pos = to

  return str
}

var Props = Symbol('props')
var Buf = Symbol('buf')
var proxyHolder = {
  get: get
}

function decodeObject (buf) {
  var target = {}
  var obj = new Proxy(target, proxyHolder)
  var numProps = buf[pos++]
  var key = null
  var pointer = 0

  var props = {}

  target[Props] = props
  target[Buf] = buf

  for (var i = 0; i < numProps; i++) {
    pos++
    key = decodeString(buf)
    pointer = buf.readUInt32BE(pos)
    pos += 4
    props[key] = pointer
  }

  return obj
}

function get (target, name) {
  var buf = target[Buf]
  var props = target[Props]
  var val = decode(buf, props[name])
  target[name] = val
  return val
}

module.exports = {
  encode: encode,
  decode: decode
}
