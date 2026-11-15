use std::io::Cursor;
use acadrust::{DwgReader, DwgWriter, DxfReader};

const DXF: &str = "0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nLINE\n8\n0\n10\n0.0\n20\n0.0\n30\n0.0\n11\n100.0\n21\n50.0\n31\n0.0\n0\nENDSEC\n0\nEOF\n";

#[test]
fn dxf_edits_export_to_real_reopenable_dwg() {
    let mut reader = DxfReader::from_reader(Cursor::new(DXF.as_bytes().to_vec())).expect("DXF reader initializes");
    let document = reader.read().expect("DXF parses");
    assert_eq!(document.entity_count(), 1);

    let bytes = DwgWriter::write_to_vec(&document).expect("DWG writes");
    assert!(bytes.starts_with(b"AC10"));
    assert!(bytes.len() > 200);

    let mut reopened = DwgReader::from_stream(Cursor::new(bytes));
    let restored = reopened.read().expect("DWG reopens");
    assert_eq!(restored.entity_count(), 1);
}
