import test from 'node:test';
import assert from 'node:assert/strict';
import { ENGINE_DESCRIPTOR, EngineCapabilityError, requireEngineCapability } from '../src/engine/contract.js';

test('current LibreDWG engine is explicitly read-only for native DWG', () => {
  assert.equal(ENGINE_DESCRIPTOR.capabilities.readDwg, true);
  assert.equal(ENGINE_DESCRIPTOR.capabilities.nativeDwgWrite, false);
  assert.equal(ENGINE_DESCRIPTOR.capabilities.losslessRoundTrip, false);
});

test('native DWG write is blocked with a typed capability error', () => {
  assert.throws(
    () => requireEngineCapability(ENGINE_DESCRIPTOR, 'nativeDwgWrite'),
    error => error instanceof EngineCapabilityError && error.code === 'ENGINE_CAPABILITY_UNAVAILABLE' && error.capability === 'nativeDwgWrite'
  );
});

test('a future validated provider can enable native DWG write', () => {
  const descriptor = { capabilities: { nativeDwgWrite: true } };
  assert.equal(requireEngineCapability(descriptor, 'nativeDwgWrite'), true);
});
