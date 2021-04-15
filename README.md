# flow-kms-wallet

AWS KMS wallet for the Flow blockchain.

## Install
```bash
$ npm install https://github.com/doublejumptokyo/flow-kms-wallet.git '@onflow/fcl'@'0.0.66' aws-sdk
```

## Examples
See [send-eth.ts](https://github.com/doublejumptokyo/flow-kms-wallet/blob/main/examples/send-tx.ts).

```ts
import * as fcl from '@onflow/fcl';
import { KmsWallet } from 'flow-kms-wallet';

const region = 'us-east-1';
const keyId = 'xxxxx-xxxx-xxxx-xxxx-xxxxxxxx';
const apiUrl = 'http://localhost:8080';

async function main() {

  // Create an instance of the wallet
  const wallet = new KmsWallet({ region, keyId });

  // Get the public key
  //
  // The Flow blockchain requires you to create an account with this public key in advance.
  // Once the account is created, the address and key index are determined.
  const publicKey = await wallet.getPublicKey();

  // If you are using an emulator environment,
  // you can create an account using the Flow CLI command or Flow JavaScript SDK (@onflow/fcl).
  //
  // Example of Flow CLI command:
  //   $ flow accounts create \
  //       --results \
  //       --sig-algo ECDSA_secp256k1 \
  //       --key a4e58eac80de2e8c37fea02a1b898623a73e729878d449649e68c7485c94d887b607439d94d6cad68134681443dd9b83d87312d08b6d6cf3f08e7f7fbd5f782e
  //
  // If you use Flow JavaScript SDK (@onflow/fcl),
  // you need to use Flow-specified public key instead of this public key.
  // Flow-specified public key can be get as follows:
  //
  // const flowPublicKey = await wallet.getFlowPublicKey();
  //    -> e.g. f847b840a4e58eac80de2e8c37fea02a1b898623a73e729878d449649e68c7485c94d887b607439d94d6cad68134681443dd9b83d87312d08b6d6cf3f08e7f7fbd5f782e03038203e8
  //


  // Sign and send transactions with KMS
  //

  fcl.config().put('accessNode.api', apiUrl);

  // `address` and `keyIndex` obtained when the account was created.
  const address = '01cf0e2f2f715450';
  const keyIndex = 0;

  const authorization = wallet.authorize(address, keyIndex);

  const response = await fcl.send([
    fcl.transaction`
      transaction {
        prepare(signer: AuthAccount) {
          log("Test transaction signed by flow-kms-wallet")
        }
      }
    `,
    fcl.args([]),
    fcl.proposer(authorization),
    fcl.authorizations([authorization]),
    fcl.payer(authorization),
    fcl.limit(9999),
  ]);
  await fcl.tx(response).onceSealed();

  console.log('Transaction Suceeded');
}

main().catch(e => console.error(e));
```
