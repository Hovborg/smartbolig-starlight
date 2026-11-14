/** Wraps one PNG in an ICO container (6-byte header + 16-byte entry = 22 bytes). */
export function pngToIco(png, size) {
  const head = Buffer.alloc(22);
  head.writeUInt16LE(0, 0); // reserved
  head.writeUInt16LE(1, 2); // type: icon
  head.writeUInt16LE(1, 4); // one image
  head[6] = size >= 256 ? 0 : size; // width
  head[7] = size >= 256 ? 0 : size; // height
  head[8] = 0; // palette colours
  head[9] = 0; // reserved
  head.writeUInt16LE(1, 10); // colour planes
  head.writeUInt16LE(32, 12); // bits per pixel
  head.writeUInt32LE(png.length, 14); // image size
  head.writeUInt32LE(22, 18); // image offset
  return Buffer.concat([head, png]);
}
