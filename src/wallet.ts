import * as fcl from '@onflow/fcl';
import { Signer } from './signer';
import AWS from 'aws-sdk';

export class KmsWallet {
  private readonly signer: Signer;

  public constructor(kmsOptions: AWS.KMS.Types.ClientConfiguration, keyId: string) {
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
      const user = await this.getAccount(fromAddress);
      const key = user.keys[keyIndex];
      let sequenceNum;
      if (account.role.proposer) {
        sequenceNum = key.sequenceNumber;
      }
      const signingFunction = async (data: any) => {
        return {
          addr: user.address,
          keyId: key.index,
          signature: await this.signer.sign(data.message)
        };
      };
      return {
        ...account,
        addr: user.address,
        keyId: key.index,
        sequenceNum,
        signature: account.signature || null,
        signingFunction,
        resolve: null,
        roles: account.roles,
      };
    };
  };

  private async getAccount(address: string) {
    const { account } = await fcl.send([ fcl.getAccount(address) ]);
    return account;
  };
}
