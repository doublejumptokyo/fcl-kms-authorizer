import AWS from 'aws-sdk';

import { parseSignature, parsePublicKey } from './asn1-parser';
import { SHA3 } from 'sha3';
import * as rlp from '@onflow/rlp';

export class Signer {
  private readonly kms: AWS.KMS;
  private readonly keyId: string;

  public constructor(region: string, keyId: string) {
    this.keyId = keyId;
    this.kms = new AWS.KMS({ region });
  }

  public async sign(message: string): Promise<string> {
    const digest = this._hashMessage(message);
    const asn1Signature = await this._sign(digest);
    const { r, s } = parseSignature(asn1Signature);
    return Buffer.concat([r, s]).toString('hex');
  }

  public async getPublicKey(): Promise<string> {
    const asn1PublicKey = await this._getPublicKey();
    const publicKey = parsePublicKey(asn1PublicKey);
    return publicKey.toString('hex').replace(/^04/, '');
  }

  public async getFlowPublicKey(): Promise<string> {
    const asn1PublicKey = await this._getPublicKey();
    const publicKey = parsePublicKey(asn1PublicKey);

    // ref. https://github.com/onflow/flow/blob/f678a4/docs/content/concepts/accounts-and-keys.md#supported-signature--hash-algorithms
    return rlp.encode([
      Buffer.from(publicKey.toString('hex').replace(/^04/, ''), 'hex'),
      3, // Signature Algorithm: ECDSA_secp256k1
      3, // Hash Algorithm: SHA3-256
      1000, // Weight
    ]).toString('hex');
  }

  private _hashMessage(message: string): Buffer {
    const sha = new SHA3(256);
    sha.update(Buffer.from(message, 'hex'));
    return sha.digest();
  }

  private async _getPublicKey(): Promise<Buffer> {
    const response = await this.kms
      .getPublicKey({
        KeyId: this.keyId
      })
      .promise();
    if (!Buffer.isBuffer(response.PublicKey)) {
      throw new TypeError('PublicKey is not Buffer');
    }
    return response.PublicKey;
  }

  private async _sign(digest: Buffer) {
    const response = await this.kms
      .sign({
        KeyId: this.keyId,
        Message: digest,
        MessageType: 'DIGEST',
        SigningAlgorithm: 'ECDSA_SHA_256',
      })
      .promise();
    if (!Buffer.isBuffer(response.Signature)) {
      throw new TypeError('Signature is not Buffer');
    }
    return response.Signature;
  }
}
