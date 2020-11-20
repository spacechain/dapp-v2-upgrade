'use srict'

const debug = require('debug')('spc-upgrader')
const pTap = require('p-tap')

const createEstimateGasAndSend = (web3, emitter, overestimation = 1.25) =>
  function (method, transactionOptions, suffix) {
    const suffixed = (event) => `${event}${suffix ? `-${suffix}` : ''}`

    let hash
    let transactionPromise

    const estimateGas = function () {
      debug('Estimating gas')
      return method
        .estimateGas(transactionOptions)
        .then(
          pTap(function (gas) {
            debug('Gas needed is %d (x%s)', gas, overestimation.toFixed(2))
          })
        )
        .then((gas) => Math.ceil(gas * overestimation))
        .then(function (gas) {
          emitter.emit(suffixed('estimatedGas'), gas)
          return gas
        })
    }

    const getTransaction = function () {
      if (!transactionPromise) {
        debug('Getting transaction %s', hash)
        transactionPromise = web3.eth.getTransaction(hash)
      }
      return transactionPromise
    }

    return Promise.resolve(transactionOptions.gas || estimateGas())
      .then(function (gas) {
        debug(
          'Sending transaction to %s',
          transactionOptions.to || method._parent.options.address
        )

        const promiEvent = method.send({ ...transactionOptions, gas })
        
        promiEvent.on('transactionHash', function (_hash) {
          hash = _hash
          debug('Transaction hash is %s', _hash)
          emitter.emit(suffixed('transactionHash'), _hash)
        })
        
        promiEvent.on('receipt', function (receipt) {
          debug('Transaction %s %s', receipt.status ? 'mined' : 'failed', hash)
          getTransaction()
            .then(function (transaction) {
              emitter.emit(suffixed('receipt'), { transaction, receipt })
            })
            .catch(function (err) {
              promiEvent.emit('error', err)
            })
        })
        
        promiEvent.on('error', function (err) {
          debug('Transaction failed %s: %s', hash || '?', err.message)
          if (!emitter.listenerCount('error')) {
            return
          }
          emitter.emit('error', err)
        })

        return promiEvent
      })
      .then((receipt) =>
        getTransaction().then((transaction) => ({ transaction, receipt }))
      )
  }

module.exports = createEstimateGasAndSend
