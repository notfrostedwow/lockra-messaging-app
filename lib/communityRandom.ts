/** Existing coinflip/dice commands only; never use this for keys, tokens or identifiers. */
export function randomCommandValue(limit: number, random = Math.random) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Roll limit must be a positive safe integer.');
  const sample = random();
  if (sample < 0 || sample >= 1 || !Number.isFinite(sample)) throw new Error('Invalid random command sample.');
  return 1 + Math.floor(sample * limit);
}
