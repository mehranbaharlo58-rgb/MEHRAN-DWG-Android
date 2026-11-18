export function normalizeCadText(value) {
  let text = String(value ?? '')
    // Unicode escape sequences used by CAD text entities.
    .replace(/\\U\\+([0-9a-fA-F]{4,6})/g, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
    })
    // Common DXF/AutoCAD symbols.
    .replace(/%%[dD]/g, '°').replace(/%%[pP]/g, '±').replace(/%%[cC]/g, '⌀')
    // MTEXT paragraph and non-breaking-space controls.
    .replace(/\\P/g, '\n').replace(/\\~/g, '\u00a0')
    // Flatten stacked fractions while retaining their visible numerator/denominator.
    .replace(/\\S([^;]*);/g, (_, value) => value.replace(/[\\^#]/g, '/'))
    // Remove formatting controls (font, height, width, tracking, oblique, color,
    // alignment and paragraph settings) but retain the text that follows them.
    .replace(/\\[ACFHQWcHQTt](?:[^;]*);/g, '')
    .replace(/\\p[^;]*;/gi, '')
    // Toggle controls do not carry visible text.
    .replace(/\\[LlOoKk]/g, '')
    // Escaped braces/backslashes are literal characters.
    .replace(/\\([{}\\])/g, '$1')
    // MTEXT grouping braces are formatting delimiters, not visible glyphs.
    .replace(/[{}]/g, '');

  // Some CAD readers expose UTF-8 bytes as Latin-1 characters.
  const cp1252 = new Map([[0x20ac,0x80],[0x201a,0x82],[0x0192,0x83],[0x201e,0x84],[0x2026,0x85],[0x2020,0x86],[0x2021,0x87],[0x02c6,0x88],[0x2030,0x89],[0x0160,0x8a],[0x2039,0x8b],[0x0152,0x8c],[0x017d,0x8e],[0x2018,0x91],[0x2019,0x92],[0x201c,0x93],[0x201d,0x94],[0x2022,0x95],[0x2013,0x96],[0x2014,0x97],[0x02dc,0x98],[0x2122,0x99],[0x0161,0x9a],[0x203a,0x9b],[0x0153,0x9c],[0x017e,0x9e],[0x0178,0x9f]]);
  const chars = Array.from(text);
  if (/[ØÙ]/.test(text) && chars.every(ch => ch.codePointAt(0) <= 255 || cp1252.has(ch.codePointAt(0)))) {
    const bytes = Uint8Array.from(chars, ch => ch.codePointAt(0) <= 255 ? ch.codePointAt(0) : cp1252.get(ch.codePointAt(0)));
    try {
      const repaired = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (/[\u0600-\u06ff]/.test(repaired)) text = repaired;
    } catch { /* not UTF-8 mojibake */ }
  }
  return text;
}

export function decodeDxfBuffer(buffer) {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  const header = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 262144)));
  const match = header.match(/\\$DWGCODEPAGE\\s*\\r?\\n\\s*3\\s*\\r?\\n\\s*([^\\r\\n]+)/i);
  const codepage = match?.[1]?.trim().toUpperCase() || '';
  if (codepage === 'UTF-8' || codepage === 'UTF8') return new TextDecoder('utf-8').decode(bytes);
  const windows = codepage.match(/^ANSI_(\\d{3,5})$/);
  if (windows) {
    try { return new TextDecoder('windows-' + windows[1]).decode(bytes); }
    catch { /* fall through to UTF-8 */ }
  }
  return new TextDecoder('utf-8').decode(bytes);
}
