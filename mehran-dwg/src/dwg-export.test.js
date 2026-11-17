import test from 'node:test';
import assert from 'node:assert/strict';
import { entitiesToDXF, resolveDwgEngineUrl } from './dwg-export.js';
import { decodeDxfBuffer, normalizeCadText } from './cad-text.js';

test('DWG engine URL resolves from the app document base, not the emitted JS chunk', () => {
  assert.equal(
    resolveDwgEngineUrl('./', 'https://localhost/'),
    'https://localhost/dwg-engine/engine.js'
  );
  assert.equal(
    resolveDwgEngineUrl('./', 'https://example.test/cad/index.html'),
    'https://example.test/cad/dwg-engine/engine.js'
  );
  assert.equal(
    resolveDwgEngineUrl('/cad/', 'https://example.test/cad/index.html'),
    'https://example.test/cad/dwg-engine/engine.js'
  );
});

test('DWG engine URL rejects missing base information', () => {
  assert.throws(() => resolveDwgEngineUrl('./', undefined), TypeError);
});

test('DXF bridge serializes supported editable entities and layers', () => {
  const dxf = entitiesToDXF([
    { type: 'LINE', start: { x: 0, y: 0 }, end: { x: 10, y: 5 }, layer: 'WALL' },
    { type: 'CIRCLE', center: { x: 5, y: 5 }, radius: 2, layer: 'GRID' }
  ], [{ name: 'WALL' }, { name: 'GRID' }]);
  assert.ok(dxf.includes('$ACADVER\\r\\n1\\r\\nAC1015'));
  assert.match(dxf, /WALL/);
  assert.match(dxf, /GRID/);
  assert.match(dxf, /LINE/);
  assert.match(dxf, /CIRCLE/);
  assert.ok(dxf.endsWith('ENDSEC\\r\\n0\\r\\nEOF\\r\\n'));
});

test('CAD text normalizer repairs UTF-8 bytes misread as Latin-1', () => {
  const expected = 'مهران';
  const mojibake = Array.from(new TextEncoder().encode(expected), byte => String.fromCharCode(byte)).join('');
  assert.equal(normalizeCadText(mojibake), expected);
});

test('CAD text normalizer expands Unicode and MTEXT controls', () => {
  assert.equal(normalizeCadText('A\\U+0628\\P B %%d'), 'Aب\n B °');
});

test('DXF reader honors the declared Windows-1256 codepage', () => {
  const prefix = new TextEncoder().encode('0\r\nSECTION\r\n9\r\n$DWGCODEPAGE\r\n3\r\nANSI_1256\r\n1\r\n');
  const bytes = new Uint8Array(prefix.length + 1);
  bytes.set(prefix);
  bytes[bytes.length - 1] = 0xe3;
  assert.ok(decodeDxfBuffer(bytes.buffer).endsWith('م'));
});
