import { KMSClient, KMSClientConfig, GetPublicKeyCommand, SignCommand } from '@aws-sdk/client-kms';

import { parseSignature, parsePublicKey } from './asn1-parser';
import { SHA3 } from 'sha3';
import * as rlp from '@onflow/rlp';

export class Signer {
  private readonly kms: KMSClient;
  private readonly keyId: string;

  public constructor(kmsOptions: KMSClientConfig, keyId: string) {
    this.keyId = keyId;
    this.kms = new KMSClient(kmsOptions);
  }

  public async sign(message: string): Promise<string> {
    const digest = this._hashMessage(message);
    const asn1Signature = await this._sign(digest);
    const { r, s } = parseSignature(asn1Signature);
    return Buffer.concat([this._pad32(r), this._pad32(s)]).toString('hex');
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
    const response = await this.kms.send(
      new GetPublicKeyCommand({
        KeyId: this.keyId
      })
    );
    if (!(response.PublicKey instanceof Uint8Array)) {
      throw new TypeError('PublicKey is not Uint8Array');
    }
    return Buffer.from(response.PublicKey!);
  }

  private async _sign(digest: Buffer) {
    const response = await this.kms.send(
      new SignCommand({
        KeyId: this.keyId,
        Message: digest,
        MessageType: 'DIGEST',
        SigningAlgorithm: 'ECDSA_SHA_256',
      })
    );
    return Buffer.from(response.Signature!);
  }

  private _pad32(buf: Buffer): Buffer {
    const paddedBuf = Buffer.alloc(32);
    buf.copy(paddedBuf, paddedBuf.length - buf.length);
    return paddedBuf;
  }
}
