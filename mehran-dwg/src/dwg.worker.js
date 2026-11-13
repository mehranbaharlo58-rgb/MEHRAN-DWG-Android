/*
 * MEHRAN DWG parser worker.
 * LibreDWG WebAssembly assets are bundled locally for offline use.
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
      return { ...base, type: 'LINE', start: point(entity.startPoint || entity.start), end: point(entity.endPoint || entity.end) };
    case 'CIRCLE':
      return { ...base, type: 'CIRCLE', center: point(entity.center), radius: Number(entity.radius || 0) };
    case 'ARC':
      return { ...base, type: 'ARC', center: point(entity.center), radius: Number(entity.radius || 0), startAngle: Number(entity.startAngle || 0), endAngle: Number(entity.endAngle || 0) };
    case 'ELLIPSE':
      return { ...base, type: 'ELLIPSE', center: point(entity.center), majorAxis: Number(entity.majorAxis?.x ? Math.hypot(entity.majorAxis.x, entity.majorAxis.y) : entity.majorAxis || 0), minorAxis: Number(entity.minorAxis || entity.minorRadius || 0), rotation: Number(entity.rotation || 0) };
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
  let dwgPointer;
  try {
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 6) throw new Error('فایل DWG معتبر یا کامل نیست.');
    engine = await getEngine();
    dwgPointer = engine.dwg_read_data(buffer, Dwg_File_Type.DWG);
    if (!dwgPointer) throw new Error('موتور LibreDWG نتوانست فایل را بخواند. ممکن است نسخه فایل یا خود فایل پشتیبانی نشود.');
    const converted = typeof engine.convertEx === 'function'
      ? engine.convertEx(dwgPointer)
      : { database: engine.convert(dwgPointer), stats: { unknownEntityCount: 0 } };
    const database = converted?.database;
    if (!database || !Array.isArray(database.entities)) throw new Error('فایل خوانده شد اما ساختار موجودیت‌های نقشه قابل تبدیل نبود.');
    let svg = '';
    try { svg = engine.dwg_to_svg(database) || ''; } catch (e) { console.warn('SVG preview unavailable', e); }
    const entities = database.entities.map(toViewerEntity).filter(Boolean);
    const layers = [...new Set(database.entities.map(e => e.layer || '0'))].map(name => ({ name, visible: true }));
    const nativeDatabase = JSON.parse(JSON.stringify(database));
    const totalEntities = database.entities.length;
    const unsupportedEntities = totalEntities - entities.length;
    engine.dwg_free(dwgPointer);
    dwgPointer = null;
    self.postMessage({
      id, ok: true, fileName, entities, layers, nativeDatabase, svg,
      totalEntities, renderedEntities: entities.length, unsupportedEntities,
      unknownEntityCount: converted?.stats?.unknownEntityCount || 0
    });
  } catch (error) {
    if (dwgPointer && engine?.dwg_free) {
      try { engine.dwg_free(dwgPointer); } catch { /* best-effort cleanup */ }
    }
    self.postMessage({ id, ok: false, error: error?.message || String(error) });
  }
};
