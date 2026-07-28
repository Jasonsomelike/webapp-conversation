const cp866ByteByCharacter = (() => {
  const decoder = new TextDecoder('ibm866')
  const bytes = new Map<string, number>()
  for (let value = 0; value <= 255; value += 1) {
    const character = decoder.decode(Uint8Array.of(value))
    if (!bytes.has(character))
    { bytes.set(character, value) }
  }
  return bytes
})()

const mojibakeMarkerPattern = /[\u0400-\u052f\u2500-\u259f]/u
const cjkPattern = /[\u3400-\u9fff\uf900-\ufaff]/u

/**
 * Repairs the UTF-8 filenames that legacy Info-ZIP decoded as CP866.
 * The conversion is deliberately conservative so valid Cyrillic titles stay unchanged.
 */
export const repairCp866Utf8Mojibake = (value: string) => {
  if (!value || !mojibakeMarkerPattern.test(value) || cjkPattern.test(value))
  { return value }

  const encoded: number[] = []
  for (const character of value) {
    const byte = cp866ByteByCharacter.get(character)
    if (byte === undefined)
    { return value }
    encoded.push(byte)
  }

  try {
    const repaired = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(encoded))
    return cjkPattern.test(repaired) && !repaired.includes('\ufffd') ? repaired : value
  }
  catch {
    return value
  }
}
