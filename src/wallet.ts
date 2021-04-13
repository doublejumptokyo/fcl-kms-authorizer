import * as fcl from '@onflow/fcl';
import { Signer } from './signer';

export interface KmsOptions {
  region: string;
  keyId: string;
}

export class KmsWallet {
  private readonly signer: Signer;

  public constructor(kmsOptions: KmsOptions) {
    this.signer = new Signer(kmsOptions.region, kmsOptions.keyId);
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
