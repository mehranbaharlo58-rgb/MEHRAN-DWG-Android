import test from 'node:test';
import assert from 'node:assert/strict';
import { entitiesToDXF, resolveDwgEngineUrl } from './dwg-export.js';

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
  assert.match(dxf, /\\$ACADVER\\r\\n1\\r\\nAC1015/);
  assert.match(dxf, /WALL/);
  assert.match(dxf, /GRID/);
  assert.match(dxf, /LINE/);
  assert.match(dxf, /CIRCLE/);
  assert.match(dxf, /ENDSEC\\r\\n0\\r\\nEOF/);
});
