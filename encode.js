'use strict'

const hashlru = require('hashlru')
const constants = require('./constants')

const ShortString = constants.ShortString
const ShortMap = constants.ShortMap
const Null = constants.Null

const NullBuf = Buffer.from([Null])

const LRU = hashlru(1000)

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

  buf[pos++] = ShortMap
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

module.exports = encode
