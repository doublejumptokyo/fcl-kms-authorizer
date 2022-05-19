import { KMSClient, KMSClientConfig, GetPublicKeyCommand, SignCommand } from '@aws-sdk/client-kms';

import { parseSignature, parsePublicKey } from './asn1-parser';
import { SHA3 } from 'sha3';
import * as rlp from '@onflow/rlp';

export class Signer {
  private readonly kms: KMSClient;
  private readonly keyIds: string[];

  public constructor(kmsOptions: KMSClientConfig, keyIds: string[]) {
    this.keyIds = keyIds;
    this.kms = new KMSClient(kmsOptions);
  }

  public async sign(
    message: string,
    index: number = 0 // index is the index of the keyIds array, not keyIndex
  ): Promise<string> {
    const digest = this._hashMessage(message);
    const asn1Signature = await this._sign(digest, this.keyIds[index]);
    const { r, s } = parseSignature(asn1Signature);
    return Buffer.concat([this._pad32(r), this._pad32(s)]).toString('hex');
  }

  public async signUserMessage(
    message: string,
    index: number = 0, // index is the index of the keyIds array, not keyIndex
    userTag: string = 'FLOW-V0.0-user'
  ): Promise<string> {
    const digest = this._hashMessageWithUserTag(message, userTag);
    const asn1Signature = await this._sign(digest, this.keyIds[index]);
    const { r, s } = parseSignature(asn1Signature);
    return Buffer.concat([this._pad32(r), this._pad32(s)]).toString('hex');
  }

  public async getPublicKey(): Promise<string> {
    const publicKeys: string[] = [];
    for (const keyId of this.keyIds) {
      const asn1PublicKey = await this._getPublicKey(keyId);
      const publicKey = parsePublicKey(asn1PublicKey);
      publicKeys.push(publicKey.toString('hex').replace(/^04/, ''));
    }
    return publicKeys.join(',');
  }

  public async getFlowPublicKey(
    signatureAlgorithm: number = 3, // ECDSA_secp256k1
    hashAlgorithm: number = 3, // SHA3-256
    weights: number[] = [1000],
  ): Promise<string> {
    const flowPublicKeys: string[] = [];
    for (let i = 0; i < this.keyIds.length; i++) {
      const keyId = this.keyIds[i];
      const asn1PublicKey = await this._getPublicKey(keyId);
      const publicKey = parsePublicKey(asn1PublicKey);

      const weight = weights[i] || 0;
      // ref. https://github.com/onflow/flow/blob/f678a4/docs/content/concepts/accounts-and-keys.md#supported-signature--hash-algorithms
      const flowPublicKey = rlp.encode([
        Buffer.from(publicKey.toString('hex').replace(/^04/, ''), 'hex'),
        signatureAlgorithm,
        hashAlgorithm,
        weight,
      ]).toString('hex');
      flowPublicKeys.push(flowPublicKey);
    }
    return flowPublicKeys.join(',')
  }

  private _hashMessage(message: string): Buffer {
    const sha = new SHA3(256);
    sha.update(Buffer.from(message, 'hex'));
    return sha.digest();
  }

  private _hashMessageWithUserTag(message: string, userTag: string): Buffer {
    const sha = new SHA3(256);
    return sha.update(this._toBytesWithTag(message, userTag)).digest();
  }

  private _toBytesWithTag(str: string, userTag: string) {
    // ref: https://github.com/onflow/flow-go-sdk/blob/9bb50d/sign.go
    const tagBytes = Buffer.alloc(32);
    Buffer.from(userTag).copy(tagBytes);
    const strBytes = Buffer.from(str);
    return Buffer.concat([tagBytes, strBytes]);
  }

  private async _getPublicKey(keyId: string): Promise<Buffer> {
    const response = await this.kms.send(
      new GetPublicKeyCommand({
        KeyId: keyId
      })
    );
    if (!(response.PublicKey instanceof Uint8Array)) {
      throw new TypeError('PublicKey is not Uint8Array');
    }
    return Buffer.from(response.PublicKey!);
  }

  private async _sign(digest: Buffer, keyId: string) {
    const response = await this.kms.send(
      new SignCommand({
        KeyId: keyId,
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
