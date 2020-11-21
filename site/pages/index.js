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

function TokenUpgrader({ address, balance, createUpgrader, disabled }) {
  return address === ZERO_ADDRESS ? (
    <div>
      <button disabled={disabled} onClick={createUpgrader}>
        Create Upgrader
      </button>
    </div>
  ) : (
    <div>
      <div>Token Upgrader: {address}</div>
      <div>Balance: {utils.fromWei(balance)} SPC v1</div>
    </div>
  )
}

function MigrateControl({ disabled, migrateTokens }) {
  return (
    <button disabled={disabled} onClick={migrateTokens}>
      Migrate All Tokens
    </button>
  )
}

function SpcUpgrader() {
  const { account, active, library } = useWeb3React()

  const [spcInfo, setSpcInfo] = useState()
  const [spcUpgrader, setSpcUpgrader] = useState()
  const [creatingUpgrader, setCreatingUpgrader] = useState(false)
  const [migratingTokens, setMigratingTokens] = useState(false)

  useEffect(
    function () {
      if (active) {
        setSpcUpgrader(createSpcUpgrader(library, account))
      } else {
        setSpcUpgrader(null)
      }
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
    [creatingUpgrader, migratingTokens, spcUpgrader]
  )

  const createUpgrader = function () {
    setCreatingUpgrader(true)
    spcUpgrader.createUpgrader().promise.finally(function () {
      setCreatingUpgrader(false)
    })
  }

  const migrateTokens = function () {
    setMigratingTokens(true)
    spcUpgrader.migrateTokens().promise.finally(function () {
      setMigratingTokens(false)
    })
  }

  const haveSpcv1Balance =
    spcInfo &&
    (spcInfo.spcv1Balance !== '0' || spcInfo.tokenUpgraderBalance !== '0')

  return spcInfo ? (
    <div>
      <div>Balances:</div>
      <div>{utils.fromWei(spcInfo.spcv1Balance)} SPC v1</div>
      <div>{utils.fromWei(spcInfo.spcv2Balance)} SPC v2</div>
      <TokenUpgrader
        address={spcInfo.tokenUpgraderAddress}
        balance={spcInfo.tokenUpgraderBalance}
        createUpgrader={createUpgrader}
        disabled={creatingUpgrader}
      />
      {spcInfo.tokenUpgraderAddress !== ZERO_ADDRESS && (
        <MigrateControl
          disabled={migratingTokens || !haveSpcv1Balance}
          migrateTokens={migrateTokens}
        />
      )}
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
