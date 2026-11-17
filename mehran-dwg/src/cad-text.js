export function normalizeCadText(value) {
  let text = String(value ?? '')
    .replace(/\\U\+([0-9a-fA-F]{4,6})/g, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
    })
    .replace(/%%[dD]/g, '°').replace(/%%[pP]/g, '±').replace(/%%[cC]/g, '⌀')
    .replace(/\\P/g, '\n').replace(/\\~/g, ' ')
    .replace(/[{}]/g, '');

  // Some CAD readers expose UTF-8 bytes as Latin-1 characters.
  if (/[ØÙ][\u0080-\u00ff]/.test(text) && Array.from(text).every(ch => ch.codePointAt(0) <= 255)) {
    const bytes = Uint8Array.from(Array.from(text, ch => ch.charCodeAt(0)));
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
  const match = header.match(/\$DWGCODEPAGE\s*\r?\n\s*3\s*\r?\n\s*([^\r\n]+)/i);
  const codepage = match?.[1]?.trim().toUpperCase() || '';
  if (codepage === 'UTF-8' || codepage === 'UTF8') return new TextDecoder('utf-8').decode(bytes);
  const windows = codepage.match(/^ANSI_(\d{3,5})$/);
  if (windows) {
    try { return new TextDecoder('windows-' + windows[1]).decode(bytes); }
    catch { /* fall through to UTF-8 */ }
  }
  return new TextDecoder('utf-8').decode(bytes);
}
