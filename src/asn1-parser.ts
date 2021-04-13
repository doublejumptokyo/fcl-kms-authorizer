import { fromBER, Sequence, BitString, Integer } from 'asn1js';

function toArrayBuffer(buffer: Buffer) {
  const ab = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return ab;
}

export function parsePublicKey(buf: Buffer) {
  const { result } = fromBER(toArrayBuffer(buf));
  const values = (result as Sequence).valueBlock.value;

  const value = values[1] as BitString;
  return Buffer.from(value.valueBlock.valueHex.slice(1));
}

export function parseSignature(buf: Buffer) {
  const { result } = fromBER(toArrayBuffer(buf));
  const values = (result as Sequence).valueBlock.value;

  const getHex = (value: Integer) => {
    const buf = Buffer.from(value.valueBlock.valueHex);
    return buf.slice(Math.max(buf.length - 32, 0));
  };

  const r = getHex(values[0] as Integer);
  const s = getHex(values[1] as Integer);
  return { r, s };
}
