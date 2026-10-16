const fs = require('node:fs');
const crypto = require('node:crypto');
const files = ['assets/images/icon.png', 'assets/images/favicon.png'];
const result = files.map(file => {
  const bytes = fs.readFileSync(file);
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Expected original PNG.');
  const chunks = []; let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    if (offset + 12 + length > bytes.length) throw new Error('Malformed PNG chunk.');
    chunks.push({ type, bytes: length }); offset += length + 12;
    if (type === 'IEND') break;
  }
  return { path: file, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
    width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), chunks,
    metadataChunks: chunks.filter(c => ['tEXt', 'zTXt', 'iTXt', 'eXIf'].includes(c.type)), trailingBytes: bytes.length - offset,
    visualInspection: file.endsWith('/icon.png') ? 'Generic gray grid/circle placeholder; no apparent personal subject.' : 'Small cube mark; no apparent personal subject.',
    authorship: 'Unverified', redistributionRights: 'Unverified; no blanket MIT license asserted',
    requiredBeforePublication: 'Independent parent visual, privacy, provenance and license review; absence of metadata is not provenance proof.' };
});
fs.writeFileSync('docs/evidence/assets.json', JSON.stringify({ date: new Date().toISOString(), files: result }, null, 2) + '\n');
console.log('Recorded hashes, PNG structure and limited visual observations for both retained original assets. Rights remain unverified.');
