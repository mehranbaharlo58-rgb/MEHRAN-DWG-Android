use std::io::Cursor;

use acadrust::{DwgReader, DwgWriter, DxfReader};
use wasm_bindgen::prelude::*;

fn js_error(context: &str, error: impl std::fmt::Display) -> JsValue {
    JsValue::from_str(&format!("{context}: {error}"))
}

/// Convert an editable DXF document into a real binary DWG file.
/// The caller must only pass entities that the MEHRAN editor has represented.
#[wasm_bindgen]
pub fn dxf_to_dwg(dxf_bytes: &[u8]) -> Result<Vec<u8>, JsValue> {
    if dxf_bytes.is_empty() {
        return Err(JsValue::from_str("DXF input is empty."));
    }

    let document = DxfReader::from_stream(Cursor::new(dxf_bytes.to_vec()))
        .read()
        .map_err(|e| js_error("DXF parse failed", e))?;

    let expected_entities = document.entities().count();
    if expected_entities == 0 {
        return Err(JsValue::from_str("The DXF contains no writable entities."));
    }

    let output = DwgWriter::write_to_vec(&document)
        .map_err(|e| js_error("DWG encoding failed", e))?;

    // Never return a file merely because the encoder returned bytes.
    let reopened = DwgReader::from_stream(Cursor::new(output.clone()))
        .read()
        .map_err(|e| js_error("DWG self-validation failed", e))?;
    let actual_entities = reopened.entities().count();

    if actual_entities != expected_entities {
        return Err(JsValue::from_str(&format!(
            "DWG validation mismatch: expected {expected_entities} entities, reopened {actual_entities}."
        )));
    }

    Ok(output)
}

/// Reopen a generated DWG and return validation metadata as JSON.
#[wasm_bindgen]
pub fn validate_dwg(dwg_bytes: &[u8]) -> Result<String, JsValue> {
    if dwg_bytes.len() < 6 {
        return Err(JsValue::from_str("DWG file is too small."));
    }

    let document = DwgReader::from_stream(Cursor::new(dwg_bytes.to_vec()))
        .read()
        .map_err(|e| js_error("DWG reopen failed", e))?;

    let metadata = serde_json::json!({
        "valid": true,
        "entityCount": document.entities().count(),
        "format": "DWG",
        "writer": "acadrust"
    });

    serde_json::to_string(&metadata).map_err(|e| js_error("Validation metadata serialization failed", e))
}
