'use strict'

const constants = require('./constants')

const ShortString = constants.ShortString
const ShortMap = constants.ShortMap
const Null = constants.Null

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
    case ShortMap:
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

const Props = Symbol('props')
const Buf = Symbol('buf')
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

module.exports = decode
