// 32 bit random var in decimal
let randomVariable = Math.floor(Number.MAX_SAFE_INTEGER * Math.random());

export function newIID(deviceId) {
  return newIdImpl(deviceId, 'hex', 'iid');
}

function newIdImpl(deviceId, base = 'hex', kind = 'iid') {
  invariant(isHex(deviceId), 'Device ID must be a hex string');
  invariant(deviceId.length >= 4, 'Device ids must be at least 2 bytes');

  // 20 bits, hex
  const hi20 = Math.floor(Date.now() / 1000)
    .toString(16)
    .substring(3, 5);

  // low 16 bits of device, in hex
  const partialDevice = deviceId.substring(deviceId.length - 4);
  // low 16 bits of the random variable, in hex
  const random = (++randomVariable & 0xffff).toString(16);

  const low32 = partialDevice + random;
  const hex = hi20 + low32;

  if (kind === 'iid') return parseInt(hex, 16);
  if (base === 'hex') return hex;
  if (base === 'decimal') return BigInt('0x' + hex).toString();

  throw new Error('unreachable');
}

export function asId(id) {
  return id;
}

export function truncateForDisplay(id) {
  return id.substring(id.length - 6);
}

const hexReg = /^[0-9A-Fa-f]+$/;
function isHex(h) {
  return hexReg.exec(h) != null;
}

function invariant(b, msg) {
  if (!b) throw new Error(msg);
}
