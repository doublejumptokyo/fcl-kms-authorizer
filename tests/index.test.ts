import 'isomorphic-fetch';
import { mocked } from 'jest-mock';
import { KMSClient } from '@aws-sdk/client-kms';
import { KmsAuthorizer } from '../src/index';
import { Signer } from '../src/signer';
import { Util } from './util';
import * as fcl from '@onflow/fcl';
import { send as httpSend } from '@onflow/transport-http';

const apiUrl = 'http://localhost:8888';
// TODO: Change 'P256' -> 'secp256k1'
// const publicKey = '0a335b0aa7b9f359b0be89e0efc12bfd1696270e2329e49d9954f231e230be8ade7fa562afe569903c994da2ede0b9a8f98cb55ead22ea99ff851644fac93f3e';
// const flowPublicKey = 'f847b8400a335b0aa7b9f359b0be89e0efc12bfd1696270e2329e49d9954f231e230be8ade7fa562afe569903c994da2ede0b9a8f98cb55ead22ea99ff851644fac93f3e03038203e8';
// const privateKey = '2b974604c0e314ed165bc753e27b33316106355448658f20edf618772538e47d';
const publicKey = '8adf5d29ec027b64c1737e2cb1206143328c7792b98eb5a25203da20d34f5fa67848ccad9be5e2bc57ea5df3801a9ced02dd2faaa7a6ae902f18fde0d8aaef8a';
const flowPublicKey = 'f847b8408adf5d29ec027b64c1737e2cb1206143328c7792b98eb5a25203da20d34f5fa67848ccad9be5e2bc57ea5df3801a9ced02dd2faaa7a6ae902f18fde0d8aaef8a02038203e8';
const privateKey = 'e912bb5b687eba739da2a36dc8d121746c5809ae0fcab7e42f2562045fdad181';

jest.mock('@aws-sdk/client-kms');

describe('KmsAuthorizer', () => {
  test('should success', async () => {
    mocked(KMSClient).mockImplementation((): any => {
      return {
        getPublicKey: (_param: any, callback: any) => { return { promise: () => '' }; },
        sign: (param: any, callback: any) => { return { promise: () => '' }; },
      };
    });
    jest.spyOn(Signer.prototype, 'sign').mockImplementation((message: string): Promise<string> => { return new Promise((resolve, _reject) => resolve(util.signWithKey(privateKey, message))); });
    jest.spyOn(Signer.prototype, 'getPublicKey').mockImplementation((): any => publicKey);
    jest.spyOn(Signer.prototype, 'getFlowPublicKey').mockImplementation((): any => flowPublicKey);

    const util = new Util(apiUrl);
    const address = await util.createFlowAccount(flowPublicKey);
    const keyIndex = 0;

    const authorizer = new KmsAuthorizer({}, '');

    expect(await authorizer.getPublicKey()).toBe(publicKey);
    expect(await authorizer.getFlowPublicKey()).toBe(flowPublicKey);

    const authorization = authorizer.authorize(address, keyIndex);
    expect(typeof authorization).toBe('function');

    fcl.config().put('accessNode.api', apiUrl).put("sdk.transport", httpSend);
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
    const res = await fcl.tx(response).onceSealed();
    expect(res.statusCode).toBe(0);
  });
})
