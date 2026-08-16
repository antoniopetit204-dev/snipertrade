// Dependency-free RSA PKCS#1 v1.5 encryption for Safaricom Security Credentials.
// Deno's WebCrypto cannot import X.509 certs nor do PKCS1-v1.5 encryption, and
// pulling node-forge from a CDN was the source of intermittent boot failures,
// so we parse the certificate DER and do the modular exponentiation ourselves.

const RSA_OID = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01];

export function pemOrBase64ToDer(input: string): Uint8Array {
  const b64 = String(input || '')
    .replace(/-----[A-Z ]+-----/g, '')
    .replace(/\s+/g, '');
  if (!b64 || !/^[A-Za-z0-9+/=]+$/.test(b64)) {
    throw new Error('Certificate is empty or not valid base64. Paste the full .cer file contents.');
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  if (out.length < 100) throw new Error('Certificate is too short to be valid.');
  return out;
}

interface TLV { tag: number; start: number; contentStart: number; length: number; end: number }

function readTLV(buf: Uint8Array, pos: number): TLV {
  const tag = buf[pos];
  let i = pos + 1;
  let length = buf[i++];
  if (length & 0x80) {
    const n = length & 0x7f;
    if (n === 0 || n > 4) throw new Error('Unsupported ASN.1 length encoding.');
    length = 0;
    for (let k = 0; k < n; k++) length = (length << 8) | buf[i++];
  }
  return { tag, start: pos, contentStart: i, length, end: i + length };
}

/** Finds the rsaEncryption OID and walks back to the enclosing SPKI SEQUENCE. */
function findRsaPublicKeyBits(der: Uint8Array): Uint8Array {
  for (let i = 0; i + RSA_OID.length + 2 < der.length; i++) {
    if (der[i] !== 0x06 || der[i + 1] !== 0x09) continue;
    let match = true;
    for (let k = 0; k < RSA_OID.length; k++) {
      if (der[i + 2 + k] !== RSA_OID[k]) { match = false; break; }
    }
    if (!match) continue;

    // AlgorithmIdentifier SEQUENCE header sits immediately before the OID.
    let algStart = -1;
    for (let back = 2; back <= 6 && i - back >= 0; back++) {
      if (der[i - back] === 0x30) { algStart = i - back; break; }
    }
    if (algStart < 0) continue;
    const alg = readTLV(der, algStart);

    // The BIT STRING with the RSAPublicKey follows the AlgorithmIdentifier.
    const bitPos = alg.end;
    if (der[bitPos] !== 0x03) continue;
    const bits = readTLV(der, bitPos);
    // First content byte = number of unused bits (always 0 here).
    return der.slice(bits.contentStart + 1, bits.end);
  }
  throw new Error('No RSA public key found in the certificate.');
}

function derIntToBigInt(buf: Uint8Array, tlv: TLV): bigint {
  let hex = '';
  for (let i = tlv.contentStart; i < tlv.end; i++) hex += buf[i].toString(16).padStart(2, '0');
  return BigInt('0x' + hex);
}

export function parseCertPublicKey(certInput: string): { n: bigint; e: bigint; k: number } {
  const der = pemOrBase64ToDer(certInput);
  const keyDer = findRsaPublicKeyBits(der);
  const seq = readTLV(keyDer, 0);
  if (seq.tag !== 0x30) throw new Error('Malformed RSA public key structure.');
  const modTlv = readTLV(keyDer, seq.contentStart);
  const expTlv = readTLV(keyDer, modTlv.end);
  const n = derIntToBigInt(keyDer, modTlv);
  const e = derIntToBigInt(keyDer, expTlv);
  const k = Math.ceil(n.toString(16).replace(/^0+/, '').length / 2);
  if (k < 64) throw new Error('RSA key is too small — certificate is likely corrupt.');
  return { n, e, k };
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return result;
}

/** RSAES-PKCS1-v1_5 encrypt → base64, exactly what Daraja expects. */
export function encryptSecurityCredential(plaintext: string, certInput: string): string {
  const { n, e, k } = parseCertPublicKey(certInput);
  const msg = new TextEncoder().encode(plaintext);
  if (msg.length > k - 11) throw new Error('Initiator password is too long for this key.');

  const em = new Uint8Array(k);
  em[0] = 0x00;
  em[1] = 0x02;
  const psLen = k - msg.length - 3;
  const rand = new Uint8Array(psLen);
  crypto.getRandomValues(rand);
  for (let i = 0; i < psLen; i++) em[2 + i] = rand[i] === 0 ? 1 + (rand[i] % 254) : rand[i];
  em[2 + psLen] = 0x00;
  em.set(msg, 3 + psLen);

  let hex = '';
  for (const b of em) hex += b.toString(16).padStart(2, '0');
  const c = modPow(BigInt('0x' + hex), e, n);

  let outHex = c.toString(16);
  if (outHex.length % 2) outHex = '0' + outHex;
  outHex = outHex.padStart(k * 2, '0');
  const bytes = new Uint8Array(k);
  for (let i = 0; i < k; i++) bytes[i] = parseInt(outHex.slice(i * 2, i * 2 + 2), 16);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
