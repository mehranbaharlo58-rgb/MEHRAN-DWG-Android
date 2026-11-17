let enginePromise;

export function resolveDwgEngineUrl(baseUrl, documentBaseUrl) {
  if (typeof baseUrl !== 'string' || typeof documentBaseUrl !== 'string') {
    throw new TypeError('DWG engine URL requires the Vite base URL and document base URL.');
  }
  return new URL(`${baseUrl}dwg-engine/engine.js`, documentBaseUrl).href;
}

async function getEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const engineUrl = resolveDwgEngineUrl(import.meta.env.BASE_URL, document.baseURI);
      const engine = await import(/* @vite-ignore */ engineUrl);
      await engine.default();
      return engine;
    })();
  }
  return enginePromise;
}

function pair(code, value) {
  return [String(code), String(value)];
}

export function entitiesToDXF(entities, layers = []) {
  const names = new Set(['0', ...layers.map(layer => layer.name), ...entities.map(entity => entity.layer || '0')]);
  const out = [
    ...pair(0, 'SECTION'), ...pair(2, 'HEADER'),
    ...pair(9, '$ACADVER'), ...pair(1, 'AC1015'),
    ...pair(0, 'ENDSEC'),
    ...pair(0, 'SECTION'), ...pair(2, 'TABLES'),
    ...pair(0, 'TABLE'), ...pair(2, 'LAYER'), ...pair(70, names.size)
  ];

  for (const name of names) {
    out.push(...pair(0, 'LAYER'), ...pair(2, name), ...pair(70, 0), ...pair(62, 7), ...pair(6, 'CONTINUOUS'));
  }
  out.push(...pair(0, 'ENDTAB'), ...pair(0, 'ENDSEC'), ...pair(0, 'SECTION'), ...pair(2, 'ENTITIES'));

  for (const entity of entities) {
    const layer = entity.layer || '0';
    const z = point => Number(point?.z || 0);
    if (entity.type === 'LINE') {
      out.push(...pair(0, 'LINE'), ...pair(8, layer),
        ...pair(10, entity.start.x), ...pair(20, entity.start.y), ...pair(30, z(entity.start)),
        ...pair(11, entity.end.x), ...pair(21, entity.end.y), ...pair(31, z(entity.end)));
    } else if (entity.type === 'CIRCLE') {
      out.push(...pair(0, 'CIRCLE'), ...pair(8, layer),
        ...pair(10, entity.center.x), ...pair(20, entity.center.y), ...pair(30, z(entity.center)),
        ...pair(40, entity.radius));
    } else if (entity.type === 'ARC') {
      out.push(...pair(0, 'ARC'), ...pair(8, layer),
        ...pair(10, entity.center.x), ...pair(20, entity.center.y), ...pair(30, z(entity.center)),
        ...pair(40, entity.radius), ...pair(50, entity.startAngle || 0), ...pair(51, entity.endAngle ?? 360));
    } else if (entity.type === 'ELLIPSE') {
      const rotation = Number(entity.rotation || 0);
      const major = Number(entity.majorAxis || 0);
      out.push(...pair(0, 'ELLIPSE'), ...pair(8, layer),
        ...pair(10, entity.center.x), ...pair(20, entity.center.y), ...pair(30, z(entity.center)),
        ...pair(11, Math.cos(rotation) * major), ...pair(21, Math.sin(rotation) * major), ...pair(31, 0),
        ...pair(40, Number(entity.minorAxis || 0) / (major || 1)), ...pair(41, 0), ...pair(42, Math.PI * 2));
    } else if (entity.type === 'POINT') {
      out.push(...pair(0, 'POINT'), ...pair(8, layer),
        ...pair(10, entity.point.x), ...pair(20, entity.point.y), ...pair(30, z(entity.point)));
    } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
      out.push(...pair(0, 'LWPOLYLINE'), ...pair(8, layer),
        ...pair(90, entity.points.length), ...pair(70, entity.closed ? 1 : 0));
      for (const vertex of entity.points) out.push(...pair(10, vertex.x), ...pair(20, vertex.y));
    } else if (entity.type === 'TEXT') {
      out.push(...pair(0, 'TEXT'), ...pair(8, layer),
        ...pair(10, entity.point.x), ...pair(20, entity.point.y), ...pair(30, z(entity.point)),
        ...pair(40, entity.height || 2.5), ...pair(1, entity.text || ''));
    } else {
      throw new Error('موجودیت پشتیبانی‌نشده برای خروجی DWG: ' + entity.type);
    }
  }

  out.push(...pair(0, 'ENDSEC'), ...pair(0, 'EOF'));
  return out.join('\r\n') + '\r\n';
}

export async function saveEntitiesAsDwg(entities, layers = []) {
  const dxf = entitiesToDXF(entities, layers);
  const engine = await getEngine();
  const bytes = engine.dxf_to_dwg(new TextEncoder().encode(dxf));
  const validation = JSON.parse(engine.validate_dwg(bytes));
  if (!validation.valid || validation.entityCount !== entities.length) {
    throw new Error('اعتبارسنجی DWG ناموفق بود؛ فایل تحویل داده نشد.');
  }
  return { bytes, validation };
}
