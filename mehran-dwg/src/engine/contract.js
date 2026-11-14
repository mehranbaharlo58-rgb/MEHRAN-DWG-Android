/**
 * MEHRAN DWG engine capability contract.
 * Parsing/rendering must never be mistaken for native DWG write support.
 */
export const ENGINE_DESCRIPTOR = Object.freeze({
  id: 'libredwg-wasm',
  mode: 'read-only',
  status: 'ENGINE_READY_READ_ONLY',
  capabilities: Object.freeze({
    readDwg: true,
    renderSubset: true,
    editCanonicalDatabase: false,
    nativeDwgWrite: false,
    losslessRoundTrip: false,
    dxfExport: false,
    undoTransactions: false
  })
});

export class EngineCapabilityError extends Error {
  constructor(capability, message) {
    super(message || `DWG engine capability is unavailable: ${capability}`);
    this.name = 'EngineCapabilityError';
    this.code = 'ENGINE_CAPABILITY_UNAVAILABLE';
    this.capability = capability;
  }
}

export function requireEngineCapability(descriptor, capability) {
  if (!descriptor?.capabilities?.[capability]) {
    throw new EngineCapabilityError(
      capability,
      capability === 'nativeDwgWrite'
        ? 'ذخیره تغییرات در فایل DWG هنوز توسط موتور فعال پشتیبانی نمی‌شود.'
        : `قابلیت ${capability} در موتور فعال موجود نیست.`
    );
  }
  return true;
}
