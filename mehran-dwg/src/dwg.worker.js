/*
 * MEHRAN DWG LibreDWG parser worker
 * LibreDWG WebAssembly is GPL-3.0. Keep this parser isolated in a worker.
 */
import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web';

let enginePromise;
function getEngine() {
  if (!enginePromise) {
    const wasmDirectory = new URL('/libredwg/', self.location.origin).href;
    enginePromise = LibreDwg.create(wasmDirectory);
  }
  return enginePromise;
}

const point = (p) => ({
  x: Number(p?.x ?? p?.X ?? 0),
  y: Number(p?.y ?? p?.Y ?? 0),
  z: Number(p?.z ?? p?.Z ?? 0)
});
const colorHex = (value) => {
  if (!Number.isFinite(value)) return undefined;
  return '#' + (Number(value) & 0xffffff).toString(16).padStart(6, '0');
};

function toViewerEntity(entity) {
  const base = { layer: entity.layer || '0', handle: entity.handle, color: colorHex(entity.color) };
  switch (String(entity.type || '').toUpperCase()) {
    case 'LINE':
      return { ...base, type: 'LINE', start: point(entity.startPoint), end: point(entity.endPoint) };
    case 'CIRCLE':
      return { ...base, type: 'CIRCLE', center: point(entity.center), radius: Number(entity.radius || 0) };
    case 'POINT':
      return { ...base, type: 'POINT', point: point(entity.position || entity.point || entity.location) };
    case 'TEXT':
    case 'MTEXT':
      return { ...base, type: 'TEXT', point: point(entity.insertionPoint || entity.position), text: String(entity.text || entity.defaultText || '') };
    case 'LWPOLYLINE':
    case 'POLYLINE2D':
    case 'POLYLINE3D': {
      const vertices = entity.vertices || entity.points || [];
      return { ...base, type: 'LWPOLYLINE', points: vertices.map(v => point(v.location || v.point || v)), closed: Boolean(entity.closed || entity.isClosed) };
    }
    default:
      return null;
  }
}

self.onmessage = async (event) => {
  const { id, buffer, fileName } = event.data || {};
  let engine;
  let parsed;
  try {
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 6) throw new Error('فایل DWG معتبر یا کامل نیست.');
    engine = await getEngine();
    parsed = engine.dwg_read_data(new Uint8Array(buffer), Dwg_File_Type.DWG);
    if (!parsed) throw new Error('LibreDWG نتوانست فایل را باز کند.');
    const database = engine.convert(parsed);
    if (!database || !Array.isArray(database.entities)) throw new Error('ساختار نقشه توسط موتور قابل تبدیل نبود.');
    const entities = database.entities.map(toViewerEntity).filter(Boolean);
    const layers = [...new Set(database.entities.map(e => e.layer || '0'))].map(name => ({ name, visible: true }));
    const nativeDatabase = JSON.parse(JSON.stringify(database));
    engine.dwg_free(parsed);
    parsed = null;
    self.postMessage({ id, ok: true, fileName, entities, layers, nativeDatabase,
      totalEntities: database.entities.length, renderedEntities: entities.length,
      unsupportedEntities: database.entities.length - entities.length });
  } catch (error) {
    if (parsed && engine?.dwg_free) {
      try { engine.dwg_free(parsed); } catch { /* release best-effort */ }
    }
    self.postMessage({ id, ok: false, error: error?.message || String(error) });
  }
};
