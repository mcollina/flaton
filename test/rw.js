'use strict'

const test = require('tape')
const RW = require('../lib/rw')

test('encode and decode a string', (t) => {
  const w = RW()
  const str = 'hello world'
  w.writeString(str)

  t.ok(w.asBuffer() instanceof Buffer, 'asBuffer returns a buffer')
  t.ok(w.asUint8Array() instanceof Uint8Array, 'asBuffer returns a buffer')

  t.equal(w.asBuffer().length, Buffer.byteLength(str) + 4, 'Buffer length matches')
  t.equal(w.asUint8Array().length, str.length + 4, 'Uint8Array length matches')

  const r = RW(w.asBuffer())
  t.equal(r.read(), str)

  t.end()
})
