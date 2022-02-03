import * as fcl from '@onflow/fcl';
import { Signer } from './signer';
import { KMSClientConfig } from '@aws-sdk/client-kms';

export class KmsAuthorizer {
  private readonly signer: Signer;

  public constructor(kmsOptions: KMSClientConfig, keyIdOrKeyIds: string | string[]) {
    const keyIds = typeof keyIdOrKeyIds === 'string' ? [keyIdOrKeyIds] : keyIdOrKeyIds;
    this.signer = new Signer(kmsOptions, keyIds);
  }

  public async getPublicKey(): Promise<string> {
    return await this.signer.getPublicKey();
  }

  public async getFlowPublicKey(
    signatureAlgorithm: number = 3, // ECDSA_secp256k1
    hashAlgorithm: number = 3, // SHA3-256
    weights: number[] = [1000],
  ): Promise<string> {
    return await this.signer.getFlowPublicKey(signatureAlgorithm, hashAlgorithm, weights);
  }

  public authorize(fromAddress: string, keyIndexOrKeyIndexes: number | number[]): any | any[] {
    const keyIndexes: number[] = typeof keyIndexOrKeyIndexes === 'number' ? [keyIndexOrKeyIndexes] : keyIndexOrKeyIndexes;
    return async (account: any = {}) => {
      const authzs: any[] = [];
      for (const keyIndex of keyIndexes) {
        authzs.push({
          ...account,
          tempId: [fromAddress, keyIndex].join("-"),
          addr: fcl.sansPrefix(fromAddress),
          keyId: Number(keyIndex),
          resolve: null,
          signingFunction: async(data: any) => {
            return {
              addr: fcl.withPrefix(fromAddress),
              keyId: Number(data.keyId),
              signature: await this.signer.sign(data.message, keyIndex)
            };
          }
        });
      }
      return authzs.length === 1 ? authzs[0] : authzs;
    };
  };

  private async getAccount(address: string) {
    const { account } = await fcl.send([ fcl.getAccount(address) ]);
    return account;
  };
}
