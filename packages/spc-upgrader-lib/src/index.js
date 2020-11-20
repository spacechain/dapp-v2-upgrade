'use strict'

const createSpcLib = require('spc-lib')
const EventEmitter = require('events')

const createEstimateGasAndSend = require('./estimate-and-send')

function createSpcUpgrader(web3, from) {
  const spcLib = createSpcLib(web3)

  const getInfo = () =>
    Promise.all([
      spcLib.spcv1.methods.balanceOf(from).call(),
      spcLib.spcv2.methods.balanceOf(from).call(),
      spcLib.spcv2.methods.tokenUpgrader(from).call(),
    ])
      .then(([spcv1Balance, spcv2Balance, tokenUpgraderAddress]) =>
        tokenUpgraderAddress
          ? spcLib.spcv1.methods
              .balanceOf(tokenUpgraderAddress)
              .call()
              .then((tokenUpgraderBalance) => [
                spcv1Balance,
                spcv2Balance,
                tokenUpgraderAddress,
                tokenUpgraderBalance,
              ])
          : [spcv1Balance, spcv2Balance, null, '0']
      )
      .then(
        ([
          spcv1Balance,
          spcv2Balance,
          tokenUpgraderAddress,
          tokenUpgraderBalance,
        ]) => ({
          spcv1Balance,
          spcv2Balance,
          tokenUpgraderAddress,
          tokenUpgraderBalance,
        })
      )

  function createUpgrader(transactionOptions) {
    const emitter = new EventEmitter()

    const estimateGasAndSend = createEstimateGasAndSend(web3, emitter)

    const promise = estimateGasAndSend(
      spcLib.spcv2.methods.createUpgrader(),
      { from, ...transactionOptions },
      'craete-upgrader'
    )

    return {
      emitter,
      promise,
    }
  }

  function migrateTokens(amount, transactionOptions) {
    const emitter = new EventEmitter()

    const estimateGasAndSend = createEstimateGasAndSend(web3, emitter)

    const promise = getInfo()
      .then(([spcv1Balance, tokenUpgraderAddress]) =>
        estimateGasAndSend(
          spcLib.spcv1.methods.transfer(
            tokenUpgraderAddress,
            amount || spcv1Balance
          ),
          { from, ...transactionOptions },
          'transfer-spcv1'
        )
      )
      .then((transferReceipt) =>
        estimateGasAndSend(
          spcLib.spcv2.methods.migrateV1tokens(),
          { from, ...transactionOptions },
          'migrate-spcv1'
        ).then((migrationReceipt) => [transferReceipt, migrationReceipt])
      )

    return {
      emitter,
      promise,
    }
  }

  return {
    getInfo,
    createUpgrader,
    migrateTokens,
  }
}

module.exports = createSpcUpgrader
