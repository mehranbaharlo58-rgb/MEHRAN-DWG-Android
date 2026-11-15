use std::io::Cursor;

use acadrust::{DwgReader, DwgWriter, DxfReader};

const DXF: &str = "0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nLINE\n8\n0\n10\n0.0\n20\n0.0\n30\n0.0\n11\n100.0\n21\n50.0\n31\n0.0\n0\nENDSEC\n0\nEOF\n";

#[test]
fn writes_and_reopens_a_real_dwg() {
    let document = DxfReader::from_stream(Cursor::new(DXF.as_bytes().to_vec()))
        .read()
        .expect("parse test DXF");
    assert_eq!(document.entities().count(), 1);

    let bytes = DwgWriter::write_to_vec(&document).expect("write DWG");
    assert!(bytes.starts_with(b"AC1015"));

    let reopened = DwgReader::from_stream(Cursor::new(bytes))
        .read()
        .expect("reopen DWG");
    assert_eq!(reopened.entities().count(), 1);
}
