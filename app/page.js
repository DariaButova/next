"use client";
import Head from 'next/head'
import "../flow/config";
import { useState, useEffect } from "react";
import * as fcl from "@onflow/fcl";
import styles from './page.module.css'

export default function Home() {

  const [user, setUser] = useState({loggedIn: null})
  const [name, setName] = useState('')
  const [transactionStatus, setTransactionStatus] = useState(null)

  useEffect(() => fcl.currentUser.subscribe(setUser), [])

  const sendQuery = async () => {
    const profile = await fcl.query({
      cadence: `
        import Profile from 0xProfile

        pub fun main(address: Address): Profile.ReadOnly? {
          return Profile.read(address)
        }
      `,
      args: (arg, t) => [arg(user.addr, t.Address)]
    })

    setName(profile?.name ?? 'No Profile')
  }

  const initAccount = async () => {
    const transactionId = await fcl.mutate({
      cadence: `
        import Profile from 0xProfile

        transaction {
          prepare(account: AuthAccount) {
            // Only initialize the account if it hasn't already been initialized
            if (!Profile.check(account.address)) {
              // This creates and stores the profile in the user's account
              account.save(<- Profile.new(), to: Profile.privatePath)

              // This creates the public capability that lets applications read the profile's info
              account.link<&Profile.Base{Profile.Public}>(Profile.publicPath, target: Profile.privatePath)
            }
          }
        }
      `,
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 50
    })

    const transaction = await fcl.tx(transactionId).onceSealed()
    console.log(transaction)
  }

  const executeTransaction = async () => {
    const transactionId = await fcl.mutate({
      cadence: `
        import Profile from 0xProfile

        transaction(name: String) {
          prepare(account: AuthAccount) {
            account
              .borrow<&Profile.Base{Profile.Owner}>(from: Profile.privatePath)!
              .setName(name)
          }
        }
      `,
      args: (arg, t) => [arg("Flow Developer!", t.String)],
      payer: fcl.authz,
      proposer: fcl.authz,
      authorizations: [fcl.authz],
      limit: 50
    })

    fcl.tx(transactionId).subscribe(res => setTransactionStatus(res.status))
  }

  const AuthedState = () => {
    return (
      <div className={styles.card}>
        <div className={styles.description}>Address: {user?.addr ?? "No Address"}</div>
        <div className={styles.description}>Profile Name: {name ?? "--"}</div>
        <div className={styles.description}>Transaction Status: {transactionStatus ?? "--"}</div>
        <div>
            <button onClick={sendQuery}>Send Query</button>
            <button onClick={initAccount}>Init Account</button>
            <button onClick={executeTransaction}>Execute Transaction</button>
            <button onClick={fcl.unauthenticate}>Log Out</button>          
        </div>  
      </div>
    )
  }

  const UnauthenticatedState = () => {
    return (
      <div className={styles.card}>
        <button onClick={fcl.logIn}>Log In</button>
        <button onClick={fcl.signUp}>Sign Up</button>
      </div>
    )
  }


  return (
    <div>
      <Head>
        <title>Next App</title>
        <meta name="description" content="Next App" />
        <link rel="icon" href="/favicon.png" />
      </Head>

      <main className={styles.main}>
      <img src="next.png" alt="Next Logo" width="500"/>
        {user.loggedIn
          ? <AuthedState />
          : <UnauthenticatedState />
        }
    </main>
    </div>
  )
}
