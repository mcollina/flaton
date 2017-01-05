'use strict'

var bench = require('fastbench')
var flaton = require('..')
var obj = { hello: 'world' }
var encodedJSON = Buffer.from(JSON.stringify(obj))
var encodedFlaton = flaton.encode(obj)

function decodeJsonObject (cb) {
  // we bufferize the JSON, because that is coming from the net
  JSON.parse(encodedJSON)
  process.nextTick(cb)
}

function encodeJsonObject (cb) {
  JSON.stringify(obj)
  process.nextTick(cb)
}

function encodeFlatonObject (cb) {
  flaton.encode(obj)
  process.nextTick(cb)
}

function decodeFlatonObject (cb) {
  flaton.decode(encodedFlaton)
  process.nextTick(cb)
}

var run = bench([
  encodeJsonObject,
  decodeJsonObject,
  encodeFlatonObject,
  decodeFlatonObject
], 1000000)

run(run)
