'use strict'

var ShortString = 0x0001

function encode (obj) {
  var pos = 0
  var isStr = typeof obj === 'string'
  var len = 1
  var buf = null
  var blen = 0
  if (isStr) {
    blen = Buffer.byteLength(obj) // max 256 length
    len += 1 + blen
    buf = Buffer.allocUnsafe(len)
    pos = buf.writeUInt16BE((ShortString << 8 | blen), pos)
    buf.write(obj, pos)
  } else {
    throw new Error('unable to encode')
  }

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
    default:
      throw new Error('unable to decode')
  }
}

module.exports = {
  encode: encode,
  decode: decode
}
