'use strict'

var benchmark = require('benchmark')
var suite = new benchmark.Suite()

suite.add('Buffer.alloc', () => {
  Buffer.alloc(1024)
})

suite.add('new Uint8Array()', () => {
  new Uint8Array(1024) // eslint-disable-line no-new
})

suite.add('Buffer.allocUnsafe', () => {
  Buffer.allocUnsafe(1024)
})

suite.add('new Buffer()', () => {
  new Buffer(1024) // eslint-disable-line no-new
})

suite.on('cycle', cycle)

suite.run()

function cycle (e) {
  console.log(e.target.toString())
}
