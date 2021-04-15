import { ec as EC } from 'elliptic';
import { SHA3 } from 'sha3';
import * as fcl from '@onflow/fcl';
import * as types from '@onflow/types';

const flowEmulatorConfig = require('../flow.json');
const ec = new EC('p256');
const sha = new SHA3(256);

export class Util {
  constructor(apiUrl: string) {
    fcl.config().put('accessNode.api', apiUrl);
  }

  async createFlowAccount(flowPublicKey: string) {
    const authorization = this.authorize({
      address: flowEmulatorConfig.accounts['emulator-account'].address,
      privateKey: flowEmulatorConfig.accounts['emulator-account'].keys,
      keyIndex: 0
    });
  
    const response = await fcl.send([
      fcl.transaction`
        transaction(publicKey: String) {
          prepare(signer: AuthAccount) {
            let account = AuthAccount(payer: signer)
            account.addPublicKey(publicKey.decodeHex())
            // account.keys.add(
            //   publicKey: key,
            //   signatureAlgorithm: SignatureAlgorithm.ECDSA_secp256k1,
            //   hashAlgorithm: HashAlgorithm.SHA3_256,
            //   weight: 10.0
            // )
          }
        }
      `,
      fcl.args([ fcl.arg(flowPublicKey, types.String) ]),
      fcl.proposer(authorization),
      fcl.authorizations([authorization]),
      fcl.payer(authorization),
    ]);
    const { events } = await fcl.tx(response).onceSealed();
    const accountCreatedEvent = events.find((d: any) => d.type === 'flow.AccountCreated');
    if (!accountCreatedEvent) throw new Error('No flow.AccountCreated found');
    let address = accountCreatedEvent.data.address.replace(/^0x/, '');
    if (!address) throw new Error('An address is required');
    return address;
  }

  authorize({ address, privateKey, keyIndex }: { address: string, privateKey: string, keyIndex: number }) {
    return async (account: any = {}) => {
      const user = await this.getAccount(address);
      const key = user.keys[keyIndex];
      let sequenceNum;
      if (account.role.proposer) {
        sequenceNum = key.sequenceNumber;
      }
      const signingFunction = async (data: any) => {
        return {
          addr: user.address,
          keyId: key.index,
          signature: this.signWithKey(privateKey, data.message),
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

  async getAccount(addr: string) {
    const { account } = await fcl.send([ fcl.getAccount(addr) ]);
    return account;
  };

  signWithKey(privateKey: string, msg: string) {
    const key = ec.keyFromPrivate(Buffer.from(privateKey, 'hex'));
    const sig = key.sign(this.hashMsg(msg));
    const n = 32;
    const r = sig.r.toArrayLike(Buffer, 'be', n);
    const s = sig.s.toArrayLike(Buffer, 'be', n);
    return Buffer.concat([r, s]).toString('hex');
  };

  hashMsg(msg: string) {
    sha.update(Buffer.from(msg, 'hex'));
    return sha.digest();
  };
}
