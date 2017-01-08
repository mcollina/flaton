'use strict'

var bench = require('fastbench')
var flaton = require('..')
var RW = require('../lib/rw')
var encodedJSON = Buffer.from(JSON.stringify('hello'))
var encodedFlaton = flaton.encode('hello')

var rw = new RW()
rw.writeString('hello')
var encodedRW = rw.asBuffer()

function decodeJsonShortString (cb) {
  // we bufferize the JSON, because that is coming from the net
  JSON.parse(encodedJSON)
  process.nextTick(cb)
}

function encodeJsonShortString (cb) {
  JSON.stringify('hello')
  process.nextTick(cb)
}

function encodeFlatonShortString (cb) {
  flaton.encode('hello')
  process.nextTick(cb)
}

function decodeFlatonShortString (cb) {
  flaton.decode(encodedFlaton)
  process.nextTick(cb)
}

function encodeRWShortString (cb) {
  var i = new RW(128)
  i.writeString('hello')
  process.nextTick(cb)
}

function decodeRWShortString (cb) {
  var i = new RW(encodedRW)
  i.read()
  process.nextTick(cb)
}

var run = bench([
  encodeJsonShortString,
  decodeJsonShortString,
  encodeFlatonShortString,
  decodeFlatonShortString,
  encodeRWShortString,
  decodeRWShortString
], 1000000)

run(run)
