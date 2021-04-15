import { mocked } from 'ts-jest/utils';
import { KMS } from 'aws-sdk';
import { KmsWallet } from '../src/index';
import { Signer } from '../src/signer';
import { Util } from './util';

const apiUrl = 'http://localhost:8080';
jest.mock('aws-sdk');

describe('KmsWallet', () => {
  test('should success', async () => {
    mocked(KMS).mockImplementation((): any => {
      return {
        getPublicKey: (_param: any, callback: any) => { return { promise: () => '' }; },
        sign: (_param: any, callback: any) => { return { promise: () => '' }; },
      };
    });
    jest.spyOn(Signer.prototype, 'sign').mockImplementation((message: string): any => util.signWithKey(privateKey, message));
    jest.spyOn(Signer.prototype, 'getPublicKey').mockImplementation((): any => publicKey);
    jest.spyOn(Signer.prototype, 'getFlowPublicKey').mockImplementation((): any => flowPublicKey);

    const flowPublicKey = 'f847b8400a335b0aa7b9f359b0be89e0efc12bfd1696270e2329e49d9954f231e230be8ade7fa562afe569903c994da2ede0b9a8f98cb55ead22ea99ff851644fac93f3e03038203e8';
    const publicKey = '0a335b0aa7b9f359b0be89e0efc12bfd1696270e2329e49d9954f231e230be8ade7fa562afe569903c994da2ede0b9a8f98cb55ead22ea99ff851644fac93f3e';
    const privateKey = '2b974604c0e314ed165bc753e27b33316106355448658f20edf618772538e47d';

    const util = new Util(apiUrl);
    const address = await util.createFlowAccount(flowPublicKey);
    const keyIndex = 0;

    const wallet = new KmsWallet({}, '');

    expect(await wallet.getPublicKey()).toBe(publicKey);
    expect(await wallet.getFlowPublicKey()).toBe(flowPublicKey);

    const authorization = wallet.authorize(address, keyIndex);
    expect(typeof authorization).toBe('function');
  });
})
