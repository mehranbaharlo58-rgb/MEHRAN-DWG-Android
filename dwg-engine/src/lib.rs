use std::io::Cursor;

use acadrust::{DwgReader, DwgWriter, DxfReader};
use wasm_bindgen::prelude::*;

fn fail(context: &str, error: impl std::fmt::Display) -> JsValue {
    JsValue::from_str(&format!("{context}: {error}"))
}

#[wasm_bindgen]
pub fn dxf_to_dwg(dxf_bytes: &[u8]) -> Result<Vec<u8>, JsValue> {
    if dxf_bytes.is_empty() {
        return Err(JsValue::from_str("DXF input is empty"));
    }

    let mut reader = DxfReader::from_reader(Cursor::new(dxf_bytes.to_vec()))
        .map_err(|e| fail("DXF reader initialization failed", e))?;
    let document = reader.read().map_err(|e| fail("DXF parse failed", e))?;
    let expected = document.entity_count();
    if expected == 0 {
        return Err(JsValue::from_str("No editable entities found in DXF"));
    }

    let bytes = DwgWriter::write_to_vec(&document)
        .map_err(|e| fail("DWG write failed", e))?;

    let mut verify = DwgReader::from_stream(Cursor::new(bytes.clone()));
    let reopened = verify.read().map_err(|e| fail("DWG reopen failed", e))?;
    let actual = reopened.entity_count();
    if actual != expected {
        return Err(JsValue::from_str(&format!(
            "DWG round-trip mismatch: {expected} entities in, {actual} entities out"
        )));
    }
    if bytes.len() < 200 || !bytes.starts_with(b"AC10") {
        return Err(JsValue::from_str("DWG output header or length is invalid"));
    }
    Ok(bytes)
}

#[wasm_bindgen]
pub fn validate_dwg(bytes: &[u8]) -> Result<String, JsValue> {
    if bytes.len() < 200 || !bytes.starts_with(b"AC10") {
        return Err(JsValue::from_str("Invalid DWG header"));
    }
    let mut reader = DwgReader::from_stream(Cursor::new(bytes.to_vec()));
    let document = reader.read().map_err(|e| fail("DWG validation failed", e))?;
    Ok(serde_json::json!({
        "valid": true,
        "entityCount": document.entity_count(),
        "version": std::str::from_utf8(&bytes[..6]).unwrap_or("unknown"),
        "bytes": bytes.len()
    }).to_string())
}
