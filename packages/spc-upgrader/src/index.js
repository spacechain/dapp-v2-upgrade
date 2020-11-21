'use strict'

const createSpcContracts = require('spc-contracts')

const executeCalls = require('./execute-calls')

function createSpcUpgrader(web3, from) {
  const spcLib = createSpcContracts(web3)

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
    const calls = [
      {
        method: spcLib.spcv2.methods.createUpgrader(),
        transactionOptions,
        suffix: 'craete-upgrader',
      },
    ]

    return executeCalls(web3, calls, from)
  }

  function migrateTokens(amount, transactionOptions) {
    const calls = getInfo().then(({ spcv1Balance, tokenUpgraderAddress }) => [
      {
        method: spcLib.spcv1.methods.transfer(
          tokenUpgraderAddress,
          amount || spcv1Balance
        ),
        transactionOptions,
        suffix: 'transfer-spcv1',
      },
      {
        method: spcLib.spcv2.methods.migrateV1tokens(),
        transactionOptions,
        suffix: 'migrate-spcv1',
      },
    ])

    return executeCalls(web3, calls, from)
  }

  return {
    getInfo,
    createUpgrader,
    migrateTokens,
  }
}

module.exports = createSpcUpgrader
