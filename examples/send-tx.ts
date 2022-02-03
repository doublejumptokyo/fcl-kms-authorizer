import * as fcl from '@onflow/fcl';
import { KmsAuthorizer } from '../src/authorizer';
import { fromEnv } from '@aws-sdk/credential-providers';

const region = 'ap-northeast-1';
const keyIds = ["xxxxx-xxxx-xxxx-xxxx-xxxxxxxx"];
const apiUrl = 'http://localhost:8080';

fcl.config().put('accessNode.api', apiUrl);

async function main() {

  // Create an instance of the authorizer
  const authorizer = new KmsAuthorizer(
    // The first argument can be the same as the option for AWS client.
    {
      credentials: fromEnv(), // see. https://github.com/aws/aws-sdk-js-v3/tree/main/packages/credential-providers#fromenv
      region,
    },
    keyIds
  );

  // Sign and send transactions with KMS
  //

  // `address` and `keyIndex` obtained when the account was created.
  const address = '01cf0e2f2f715450';
  const keyIndexes = [0];

  const authorization = authorizer.authorize(address, keyIndexes);

  const response = await fcl.send([
    fcl.transaction`
      transaction {
        prepare(signer: AuthAccount) {
          log("Test transaction signed by fcl-kms-authorizer")
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

  console.log('Transaction Succeeded');
}

main().catch(e => console.error(e));
