import { InjectedConnector } from '@web3-react/injected-connector'
import { useEffect, useState } from 'react'
import { useWeb3React } from '@web3-react/core'
import { utils } from 'web3'
import createSpcUpgrader from 'spc-upgrader'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

function ConnectButton() {
  const { active, activate, deactivate } = useWeb3React()

  const injected = new InjectedConnector({ supportedChainIds: [1, 1337] })
  const activateConnector = () => activate(injected)
  const deactivateConnector = () => deactivate()

  return active ? (
    <button onClick={deactivateConnector}>Disconnect Wallet</button>
  ) : (
    <button onClick={activateConnector}>Connect Wallet</button>
  )
}

function Account() {
  const { account } = useWeb3React()

  return <div>Account: {account || '-'}</div>
}

function CreateUpgraderButton({ disabled, createUpgrader }) {
  return (
    <button disabled={disabled} onClick={createUpgrader}>
      Create Upgrader
    </button>
  )
}

function TransferButton({ disabled, transferTokens }) {
  return (
    <button disabled={disabled} onClick={transferTokens}>
      Transfer All Tokens
    </button>
  )
}

function MigrateButton({ disabled, migrateTokens }) {
  return (
    <button disabled={disabled} onClick={migrateTokens}>
      Migrate All Tokens
    </button>
  )
}

function TokenUpgrader({
  address,
  balance,
  createUpgrader,
  creatingUpgrader,
  migrateTokens,
  migratingTokens,
}) {
  return (
    <div>
      <h3>Token Upgrader</h3>
      {address === ZERO_ADDRESS ? (
        <CreateUpgraderButton
          disabled={creatingUpgrader}
          createUpgrader={createUpgrader}
        />
      ) : (
        <div>
          <div>Token Upgrader: {address}</div>
          <div>Balance: {utils.fromWei(balance)} SPC</div>
          <MigrateButton
            disabled={balance === '0' || migratingTokens}
            migrateTokens={migrateTokens}
          />
        </div>
      )}
    </div>
  )
}

function SpcUpgrader() {
  const { account, active, library } = useWeb3React()

  const [spcInfo, setSpcInfo] = useState()
  const [spcUpgrader, setSpcUpgrader] = useState()
  const [creatingUpgrader, setCreatingUpgrader] = useState(false)
  const [transferingTokens, setTransferingTokens] = useState(false)
  const [migratingTokens, setMigratingTokens] = useState(false)

  useEffect(
    function () {
      setSpcUpgrader(active ? createSpcUpgrader(library, account) : null)
    },
    [account, active, library]
  )

  useEffect(
    function () {
      if (spcUpgrader) {
        spcUpgrader.getInfo().then(setSpcInfo)
      } else {
        setSpcInfo(null)
      }
    },
    [creatingUpgrader, transferingTokens, migratingTokens, spcUpgrader]
  )

  const createUpgrader = function () {
    setCreatingUpgrader(true)
    spcUpgrader.createUpgrader().promise.finally(function () {
      setCreatingUpgrader(false)
    })
  }

  const transferTokens = function () {
    setTransferingTokens(true)
    spcUpgrader.transferTokens().promise.finally(function () {
      setTransferingTokens(false)
    })
  }

  const migrateTokens = function () {
    setMigratingTokens(true)
    spcUpgrader.migrateTokens().promise.finally(function () {
      setMigratingTokens(false)
    })
  }

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

  return spcInfo ? (
    <div>
      <h3>SPC v1</h3>
      <div>Balance: {utils.fromWei(spcInfo.spcv1Balance)} SPC</div>
      {spcInfo.tokenUpgraderAddress !== ZERO_ADDRESS && (
        <TransferButton
          disabled={spcInfo.spcv1Balance === '0' || transferingTokens}
          transferTokens={transferTokens}
        />
      )}
      <TokenUpgrader
        address={spcInfo.tokenUpgraderAddress}
        balance={spcInfo.tokenUpgraderBalance}
        createUpgrader={createUpgrader}
        creatingUpgrader={creatingUpgrader}
        migrateTokens={migrateTokens}
        migratingTokens={migratingTokens}
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
      <ConnectButton />
      <Account />
      <SpcUpgrader />
    </div>
  )
}

export default HomePage
