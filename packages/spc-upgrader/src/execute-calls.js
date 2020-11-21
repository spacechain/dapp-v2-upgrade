'use strict'

const EventEmitter = require('events')
const pSeries = require('p-series')

const createEstimateGasAndSend = require('./estimate-and-send')

const executeCalls = function (web3, calls, from) {
  const emitter = new EventEmitter()

  const estimateGasAndSend = createEstimateGasAndSend(web3, emitter)

  const promise = Promise.all([
    calls,
    web3.eth.getTransactionCount(from, 'pending'),
  ])
    .then(function ([_calls, count]) {
      emitter.emit('transactions', {
        suffixes: _calls.map(({ suffix }) => suffix),
      })

      return pSeries(
        _calls.map(({ method, transactionOptions, suffix }, i) => () =>
          estimateGasAndSend(
            method,
            { ...transactionOptions, from, nonce: count + i },
            suffix
          )
        )
      )
    })
    .then(function (transactionsData) {
      const result = {
        raw: transactionsData,
        status: transactionsData[transactionsData.length - 1].receipt.status,
      }

      emitter.emit('result', result)

      return result
    })

  return {
    emitter,
    promise,
  }
}

module.exports = executeCalls
