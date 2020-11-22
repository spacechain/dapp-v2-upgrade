'use-strict'

require('chai').should()
require('dotenv').config()

const createSpcContracts = require('spc-contracts')
const HDWalletProvider = require('@truffle/hdwallet-provider')
const Web3 = require('web3')

const createSpcUpgrader = require('..')

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const hdProvider = new HDWalletProvider({
  addressIndex: Number.parseInt(process.env.ACCOUNT || '0'),
  mnemonic: process.env.MNEMONIC,
  numberOfAddresses: 1,
  providerOrUrl: process.env.NODE_URL,
})
const from = Web3.utils.toChecksumAddress(hdProvider.getAddress(0))
const web3 = new Web3(hdProvider)

describe('End-to-end', function () {
  before(function () {
    this.timeout(5000)

    const _web3 = new Web3(process.env.NODE_URL)
    const spcContracts = createSpcContracts(_web3)
    return spcContracts.spcv1.methods
      .transfer(from, 100)
      .send({ from: process.env.SPC_TOKENS_HOLDER })
  })

  it('should get info', function () {
    this.timeout(5000)

    const spcUpgrader = createSpcUpgrader(web3, from)
    return spcUpgrader.getInfo().then(function (info) {
      info.should.have
        .property('spcv1Balance')
        .that.is.a('string')
        .that.match(/^[0-9]+$/)
      info.should.have
        .property('spcv2Balance')
        .that.is.a('string')
        .that.match(/^[0-9]+$/)
      info.should.have
        .property('tokenUpgraderAddress')
        .that.is.a('string')
        .that.match(/^0x[0-9a-fA-F]{40}$/)
      info.should.have
        .property('tokenUpgraderBalance')
        .that.is.a('string')
        .that.match(/^[0-9]+$/)
    })
  })

  it('should create an upgrader', function () {
    this.timeout(5000)

    const self = this

    const spcUpgrader = createSpcUpgrader(web3, from)
    return spcUpgrader
      .getInfo()
      .then(function (info) {
        if (info.tokenUpgraderAddress !== ZERO_ADDRESS) {
          self.skip()
          return
        }

        return spcUpgrader.createUpgrader().promise
      })
      .then(function (result) {
        result.status.should.equal(true)
        return spcUpgrader.getInfo()
      })
      .then(function (info) {
        info.tokenUpgraderAddress.should.be
          .a('string')
          .that.match(/^0x[0-9a-fA-F]{40}$/)
        info.tokenUpgraderAddress.should.not.equal(ZERO_ADDRESS)
      })
  })

  it('should migrate all tokens', function () {
    this.timeout(10000)

    let balance

    const spcUpgrader = createSpcUpgrader(web3, from)
    return spcUpgrader
      .getInfo()
      .then(function (info) {
        const BN = web3.utils.BN

        balance = new BN(info.spcv1Balance)
          .add(new BN(info.tokenUpgraderBalance))
          .add(new BN(info.spcv2Balance))
          .toString()

        return (
          info.tokenUpgraderAddress === ZERO_ADDRESS &&
          spcUpgrader.createUpgrader().promise
        )
      })
      .then(function () {
        return spcUpgrader.transferTokens().promise
      })
      .then(function () {
        return spcUpgrader.migrateTokens().promise
      })
      .then(function () {
        return spcUpgrader.getInfo()
      })
      .then(function (info) {
        info.spcv1Balance.should.equal('0')
        info.spcv2Balance.should.equal(balance)
        info.tokenUpgraderBalance.should.equal('0')
      })
  })
})
