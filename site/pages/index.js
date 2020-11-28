import { InjectedConnector } from '@web3-react/injected-connector'
import { useEffect, useState } from 'react'
import { useWeb3React } from '@web3-react/core'
import { utils } from 'web3'
import createSpcUpgrader from 'spc-upgrader'
import React from 'react'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

function ConnectWallet() {
  const { account, active, activate, deactivate, error } = useWeb3React()

  const injected = new InjectedConnector({ supportedChainIds: [1, 1337] })
  const activateConnector = () => activate(injected)
  const deactivateConnector = () => deactivate()

  return !active && !error ? (
    <button onClick={activateConnector}>Connect Wallet</button>
  ) : active ? (
    <div>
      <button onClick={deactivateConnector}>Disconnect Wallet</button>
      <div>Account: {account}</div>
    </div>
  ) : (
    <div>
      Error:{' '}
      {error.message.startsWith('Unsupported chain id')
        ? 'You are connected to an unsupported network. Connect to the Ethereum mainnet.'
        : error.message.startsWith('No Ethereum provider')
        ? 'No Ethereum browser extension detected. Install MetaMask on desktop or visit from a dApp browser on mobile.'
        : error.message}
    </div>
  )
}

function TokenUpgrader({
  address,
  balance,
  createUpgrader,
  migrateTokens,
  waitingWallet,
}) {
  return (
    <div>
      <h3>Token Upgrader</h3>
      {address === ZERO_ADDRESS ? (
        <button disabled={waitingWallet} onClick={createUpgrader}>
          Create Upgrader
        </button>
      ) : (
        <div>
          <div>Token Upgrader: {address}</div>
          <div>Balance: {utils.fromWei(balance)} SPC</div>
          <button
            disabled={balance === '0' || waitingWallet}
            onClick={migrateTokens}
          >
            Migrate All Tokens
          </button>
        </div>
      )}
    </div>
  )
}

function SpcUpgrader() {
  const { account, active, error, library } = useWeb3React()

  const [spcInfo, setSpcInfo] = useState()
  const [spcUpgrader, setSpcUpgrader] = useState()
  const [waitingWallet, setWaitingWallet] = useState(false)
  const [blockNumber, setBlockNumber] = useState()

  useEffect(
    function () {
      setSpcUpgrader(
        active && !error ? createSpcUpgrader(library, account) : null
      )
    },
    [account, active, error, library]
  )

  useEffect(
    function () {
      if (spcUpgrader) {
        spcUpgrader.getInfo().then(setSpcInfo)
      } else {
        setSpcInfo(null)
      }
    },
    [blockNumber, waitingWallet, spcUpgrader]
  )

  const spcUpgraderOperation = (op) =>
    function () {
      setWaitingWallet(true)
      spcUpgrader[op]().promise.finally(function () {
        setWaitingWallet(false)
      })
    }

  const createUpgrader = spcUpgraderOperation('createUpgrader')
  const transferTokens = spcUpgraderOperation('transferTokens')
  const migrateTokens = spcUpgraderOperation('migrateTokens')

  useEffect(
    function () {
      if (!spcInfo || spcInfo.spcv2Balance === '0') {
        return
      }

      const key = `SPC-token-registered-${account}`
      if (window.localStorage.getItem(key) === 'true') {
        return
      }

      window.ethereum
        .request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: spcInfo.spcv2,
          },
        })
        .then(function () {
          window.localStorage.setItem(key, 'true')
        })
    },
    [spcInfo]
  )

  useEffect(
    function () {
      if (!active || !library) {
        return
      }

      const subscription = library.eth.subscribe('newBlockHeaders')
      subscription.on('data', function ({ number }) {
        setBlockNumber(number)
      })

      return function () {
        subscription.unsubscribe()
      }
    },
    [active, library]
  )

  return spcInfo ? (
    <div>
      <h3>SPC v1</h3>
      <div>Balance: {utils.fromWei(spcInfo.spcv1Balance)} SPC</div>
      {spcInfo.tokenUpgraderAddress !== ZERO_ADDRESS && (
        <button
          disabled={spcInfo.spcv1Balance === '0' || waitingWallet}
          onClick={transferTokens}
        >
          Transfer All Tokens
        </button>
      )}
      <TokenUpgrader
        address={spcInfo.tokenUpgraderAddress}
        balance={spcInfo.tokenUpgraderBalance}
        createUpgrader={createUpgrader}
        migrateTokens={migrateTokens}
        waitingWallet={waitingWallet}
      />
      <h3>SPC v2</h3>
      <div>Balance: {utils.fromWei(spcInfo.spcv2Balance)} SPC</div>
    </div>
  ) : null
}

function HomePage() {
  return (
    <div>
      <h2>SPC Token Upgrade</h2>
      <ConnectWallet />
      <SpcUpgrader />
    </div>
  )
}

export default HomePage
