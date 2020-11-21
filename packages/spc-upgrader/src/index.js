'use strict'

const createSpcContracts = require('spc-contracts')

const executeCalls = require('./execute-calls')

function createSpcUpgrader(web3, from) {
  const spcLib = createSpcContracts(web3)

  const getInfo = () =>
    spcLib.spcv2.methods
      .tokenUpgrader(from)
      .call()
      .then((tokenUpgraderAddress) =>
        tokenUpgraderAddress
          ? spcLib.spcv1.methods
              .balanceOf(tokenUpgraderAddress)
              .call()
              .then((tokenUpgraderBalance) => [
                tokenUpgraderAddress,
                tokenUpgraderBalance,
              ])
          : [null, '0']
      )
      .then(([tokenUpgraderAddress, tokenUpgraderBalance]) =>
        Promise.all([
          spcLib.spcv1.methods.balanceOf(from).call(),
          spcLib.spcv2.methods.balanceOf(from).call(),
          tokenUpgraderAddress,
          tokenUpgraderBalance,
          spcLib.spcv2.options.address,
          spcLib.spcv2.methods.symbol().call(),
          spcLib.spcv2.methods.decimals().call(),
        ])
      )
      .then(
        ([
          spcv1Balance,
          spcv2Balance,
          tokenUpgraderAddress,
          tokenUpgraderBalance,
          address,
          symbol,
          decimals,
        ]) => ({
          spcv1Balance,
          spcv2Balance,
          tokenUpgraderAddress,
          tokenUpgraderBalance,
          spcv2: { address, symbol, decimals },
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
    const calls = getInfo().then(function ({
      spcv1Balance,
      tokenUpgraderAddress,
    }) {
      const _calls = []
      if (spcv1Balance !== '0') {
        _calls.push({
          method: spcLib.spcv1.methods.transfer(
            tokenUpgraderAddress,
            amount || spcv1Balance
          ),
          transactionOptions,
          suffix: 'transfer-spcv1',
        })
      }
      _calls.push({
        method: spcLib.spcv2.methods.migrateV1tokens(),
        transactionOptions,
        suffix: 'migrate-spcv1',
      })
      return _calls
    })

    return executeCalls(web3, calls, from)
  }

  return {
    getInfo,
    createUpgrader,
    migrateTokens,
  }
}

module.exports = createSpcUpgrader
