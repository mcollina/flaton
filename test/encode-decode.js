'use strict'

var test = require('tape')
var encode = require('..').encode
var decode = require('..').decode

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

test('encode and decode a basic object', function (t) {
  var obj = { hello: 'world', a: 'string' }
  var len = Object.keys(obj).reduce(function (acc, key) {
    return acc + 2 + Buffer.byteLength(key) + 2 + Buffer.byteLength(obj[key]) + 4
  }, 0)
  len += 1 // main obj header
  len += 1 // number of properties
  var buf = encode(obj)
  t.ok(buf instanceof Buffer, 'encode returns a buffer')
  t.equal(buf.length, len, 'len matches')
  var decoded = decode(buf)
  t.equal(decoded.hello, obj.hello, 'decoded hello')
  t.equal(decoded.hello, obj.hello, 'decoded hello')
  t.equal(decoded.a, obj.a, 'decoded string')
  t.end()
})

test.skip('encode and decode a deep object', function (t) {
  var obj = { hello: 'world', another: { w: 'string' } }
  var len = 0
  len += 1 // main obj header
  len += 1 // number of properties
  len += 2 + 5 + 4  // hello
  len += 2 + 5 // world
  len += 2 + 3 + 4  // another
  len += 1 // another obj header
  len += 1 // atnoer obj properties
  len += 2 + 1 + 4  // w
  len += 2 + 6 // string
  var buf = encode(obj)
  t.ok(buf instanceof Buffer, 'encode returns a buffer')
  t.equal(buf.length, len, 'len matches')
  var decoded = decode(buf)
  t.equal(decoded.hello, obj.hello, 'decoded hello')
  t.equal(decoded.another.w, obj.another.w, 'decoded string')
  t.end()
})
