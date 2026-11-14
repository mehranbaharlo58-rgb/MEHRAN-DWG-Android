/*
 * MEHRAN DWG parser worker.
 * LibreDWG WebAssembly assets are bundled locally for offline use.
 */
import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web';

let enginePromise;
function getEngine() {
  if (!enginePromise) {
    // LibreDwg.create() appends the WASM filename to this directory.
    const wasmDirectory = new URL('/libredwg/', self.location.origin).href.replace(/\/+$/, '');
    enginePromise = LibreDwg.create(wasmDirectory);
  }
  return enginePromise;
}

const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const point = (p) => ({
  x: num(p?.x ?? p?.X),
  y: num(p?.y ?? p?.Y),
  z: num(p?.z ?? p?.Z)
});
const colorHex = (value) => {
  if (!Number.isFinite(Number(value))) return undefined;
  return '#' + (Number(value) & 0xffffff).toString(16).padStart(6, '0');
};
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

const verticesOf = (entity) => {
  const vertices = entity.vertices || entity.points || [];
  return Array.isArray(vertices) ? vertices.map(v => point(v.location || v.point || v)) : [];
};

function toViewerEntity(entity) {
  const type = String(entity.type || '').toUpperCase();
  const base = {
    layer: entity.layer || '0',
    handle: entity.handle,
    color: colorHex(entity.color)
  };

  switch (type) {
    case 'LINE':
      return {
        ...base, type,
        start: point(entity.startPoint || entity.start),
        end: point(entity.endPoint || entity.end)
      };
    case 'CIRCLE':
      return { ...base, type, center: point(entity.center), radius: num(entity.radius) };
    case 'ARC':
      return {
        ...base, type,
        center: point(entity.center),
        radius: num(entity.radius),
        // LibreDWG exposes ARC angles in radians.
        startAngle: num(entity.startAngle) * 180 / Math.PI,
        endAngle: num(entity.endAngle) * 180 / Math.PI
      };
    case 'ELLIPSE': {
      const center = point(entity.center);
      const axisEnd = point(entity.majorAxisEndPoint || entity.majorAxis || {});
      const majorX = axisEnd.x - center.x;
      const majorY = axisEnd.y - center.y;
      const majorAxis = Math.hypot(majorX, majorY);
      return {
        ...base, type,
        center,
        majorAxis,
        minorAxis: majorAxis * num(entity.axisRatio, 1),
        rotation: Math.atan2(majorY, majorX),
        startAngle: num(entity.startAngle),
        endAngle: num(entity.endAngle)
      };
    }
    case 'POINT':
      return { ...base, type, point: point(entity.position || entity.point || entity.location) };
    case 'TEXT':
      return {
        ...base, type,
        point: point(entity.startPoint || entity.insertionPoint || entity.position),
        text: String(entity.text || entity.defaultText || '')
      };
    case 'MTEXT':
      return {
        ...base, type: 'TEXT',
        point: point(entity.insertionPoint || entity.startPoint || entity.position),
        text: String(entity.text || '')
      };
    case 'LWPOLYLINE': {
      const points = verticesOf(entity);
      return { ...base, type, points, closed: (num(entity.flag) & 1) !== 0 || Boolean(entity.closed || entity.isClosed) };
    }
    case 'POLYLINE2D':
    case 'POLYLINE3D': {
      const points = verticesOf(entity);
      return { ...base, type: 'LWPOLYLINE', points, closed: Boolean(entity.closed || entity.isClosed) };
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
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 6) {
      throw new Error('فایل DWG معتبر یا کامل نیست.');
    }

    engine = await getEngine();
    dwgPointer = engine.dwg_read_data(buffer, Dwg_File_Type.DWG);
    if (!dwgPointer) {
      throw new Error('موتور LibreDWG نتوانست فایل را بخواند. ممکن است نسخه فایل یا خود فایل پشتیبانی نشود.');
    }

    const converted = typeof engine.convertEx === 'function'
      ? engine.convertEx(dwgPointer)
      : { database: engine.convert(dwgPointer), stats: { unknownEntityCount: 0 } };
    const database = converted?.database;

    if (!database || !Array.isArray(database.entities)) {
      throw new Error('فایل خوانده شد اما ساختار موجودیت‌های نقشه قابل تبدیل نبود.');
    }

    let svg = '';
    try {
      svg = engine.dwg_to_svg(database) || '';
    } catch (error) {
      console.warn('SVG preview unavailable', error);
    }

    const entities = database.entities.map(toViewerEntity).filter(Boolean);
    const layers = [...new Set(database.entities.map(e => e.layer || '0'))]
      .map(name => ({ name, visible: true }));
    const totalEntities = database.entities.length;
    const unsupportedEntities = totalEntities - entities.length;

    // DwgDatabase is a converted JS model, not a writable native DWG database.
    // Preserve source data only in the app's local drawing store; do not stringify cyclic native structures.
    engine.dwg_free(dwgPointer);
    dwgPointer = null;

    self.postMessage({
      id, ok: true, fileName, entities, layers, nativeDatabase: null, svg,
      sourceDwgBase64: bufferToBase64(buffer),
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
