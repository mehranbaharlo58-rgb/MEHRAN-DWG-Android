import test from 'node:test';
import assert from 'node:assert/strict';
import { entitiesToDXF } from './dwg-export.js';

test('DXF bridge serializes supported editable entities and layers', () => {
  const dxf = entitiesToDXF([
    { type: 'LINE', start: { x: 0, y: 0 }, end: { x: 10, y: 5 }, layer: 'WALL' },
    { type: 'CIRCLE', center: { x: 5, y: 5 }, radius: 2, layer: 'GRID' }
  ], [{ name: 'WALL' }, { name: 'GRID' }]);
  assert.match(dxf, /\$ACADVER\r\n1\r\nAC1015/);
  assert.match(dxf, /WALL/);
  assert.match(dxf, /GRID/);
  assert.match(dxf, /LINE/);
  assert.match(dxf, /CIRCLE/);
  assert.match(dxf, /ENDSEC\r\n0\r\nEOF/);
});
