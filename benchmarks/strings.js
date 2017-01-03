'use strict'

var bench = require('fastbench')
var flaton = require('..')
var encodedJSON = Buffer.from(JSON.stringify('hello'))
var encodedFlaton = flaton.encode('hello')

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

function encodeDecodeJson (cb) {
  JSON.parse(JSON.stringify('hello'))
  process.nextTick(cb)
}

function encodeDecodeFlaton (cb) {
  flaton.decode(flaton.encode('hello'))
  process.nextTick(cb)
}

var run = bench([
  encodeJsonShortString,
  encodeFlatonShortString,
  decodeJsonShortString,
  decodeFlatonShortString,
  encodeDecodeJson,
  encodeDecodeFlaton
], 1000000)

run(run)
