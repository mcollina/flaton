'use strict'

var test = require('tape')
var encode = require('.').encode
var decode = require('.').decode

test('encode and decode a string', function (t) {
  var str = 'hello'
  var len = Buffer.byteLength(str)
  var buf = encode(str)
  t.ok(buf instanceof Buffer, 'encode returns a buffer')
  t.equal(buf.length, len + 2, 'one byte of length, one byte of type')
  t.equal(decode(buf), str, 'decode works')
  t.end()
})

test('encode and decode null', function (t) {
  var buf = encode(null)
  t.ok(buf instanceof Buffer, 'encode returns a buffer')
  t.equal(buf.length, 1, 'one byte of type')
  t.equal(decode(buf), null, 'decode works')
  t.end()
})
