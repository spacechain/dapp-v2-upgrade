'use-strict'

require('dotenv').config()

const createSpcContracts = require('spc-contracts')
const Web3 = require('web3')

const [to, value] = process.argv.slice(2)

const web3 = new Web3(process.env.NODE_URL)
const spcContracts = createSpcContracts(web3)
return spcContracts.spcv1.methods
  .transfer(to, value)
  .send({ from: process.env.SPC_TOKENS_HOLDER })
  .then(console.log)
  .catch(console.error)
