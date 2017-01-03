'use strict'

var ShortString = 0x0001
var Null = 0x0000
var NullBuf = Buffer.from([Null])

function encode (obj) {
  var isStr = typeof obj === 'string'
  if (isStr) {
    return encodeShortString(obj)
  } else if (obj === null) {
    return NullBuf
  } else {
    throw new Error('unable to encode')
  }
}

function encodeShortString (obj) {
  var blen = Buffer.byteLength(obj) // max 256 length
  var len = 2 + blen
  var buf = Buffer.allocUnsafe(len)
  var pos = 0

  pos = buf.writeUInt16BE((ShortString << 8 | blen), pos)
  buf.write(obj, pos)

  return buf
}

function decode (buf) {
  var pos = 0
  var first = buf.readUInt8(pos++)
  var len = 0
  switch (first) {
    case ShortString:
      len = buf.readUInt8(pos++)
      return buf.toString('utf8', pos, pos + len)
    case Null:
      return null
    default:
      throw new Error('unable to decode')
  }
}

module.exports = {
  encode: encode,
  decode: decode
}
