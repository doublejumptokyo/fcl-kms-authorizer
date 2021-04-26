import * as fcl from '@onflow/fcl';
import { Signer } from './signer';
import { KMS } from 'aws-sdk';

export class KmsAuthorizer {
  private readonly signer: Signer;

  public constructor(kmsOptions: KMS.Types.ClientConfiguration, keyId: string) {
    this.signer = new Signer(kmsOptions, keyId);
  }

  public async getPublicKey(): Promise<string> {
    return await this.signer.getPublicKey();
  }

  public async getFlowPublicKey(): Promise<string> {
    return await this.signer.getFlowPublicKey();
  }

  public authorize(fromAddress: string, keyIndex: number) {
    return async (account: any = {}) => {
      return {
        ...account,
        tempId: [fromAddress, keyIndex].join("-"),
        addr: fcl.sansPrefix(fromAddress),
        keyId: Number(keyIndex),
        sequenceNum,
        resolve: null,
        signingFunction: async(data: any) => {
          return {
            addr: fcl.withPrefix(fromAddress),
            keyId: Number(keyIndex),
            signature: await this.signer.sign(data.message)
          };
        }
      };
    };
  };

  private async getAccount(address: string) {
    const { account } = await fcl.send([ fcl.getAccount(address) ]);
    return account;
  };
}
