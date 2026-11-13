#pragma once
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace mehran::cad {

enum class EngineState : int {
  EngineNotConfigured = 0,
  EngineReady = 1,
  FileOpenFailed = 2,
  UnsupportedObject = 3,
  SaveValidationFailed = 4
};

enum class EntityKind : int {
  Unknown, Line, Arc, Circle, Polyline, Spline, Point,
  Text, MText, Dimension, BlockReference, Hatch, Leader
};

struct DocumentInfo {
  std::string sourcePath;
  std::string dwgVersion;
  std::string units;
  std::uint64_t entityCount = 0;
  std::uint64_t layerCount = 0;
  std::uint64_t blockCount = 0;
  double minX = 0, minY = 0, maxX = 0, maxY = 0;
};

struct EntitySnapshot {
  std::string stableId;
  EntityKind kind = EntityKind::Unknown;
  std::string layer;
  std::string propertiesJson;
  std::vector<double> geometry;
};

struct EditOperation {
  enum class Type : int { Create, Modify, Erase, Move, Rotate, Scale, SetProperty };
  Type type = Type::Modify;
  std::string entityId;
  std::string payloadJson;
};

struct SaveResult {
  bool success = false;
  std::string outputPath;
  std::string targetVersion;
  std::uint64_t entityCount = 0;
  std::string validationMessage;
};

// Adapter boundary for the licensed native DWG SDK.
// Implementations must operate on the native drawing database; never flatten to raster/DXF.
class DwgEngine {
public:
  virtual ~DwgEngine() = default;
  virtual EngineState state() const = 0;
  virtual bool open(const std::string& path, const std::string& password) = 0;
  virtual DocumentInfo documentInfo() const = 0;
  virtual std::vector<EntitySnapshot> queryEntities(const std::string& filterJson) = 0;
  virtual bool applyTransaction(const std::vector<EditOperation>& operations) = 0;
  virtual bool undo() = 0;
  virtual bool redo() = 0;
  virtual SaveResult saveAs(const std::string& path, const std::string& targetVersion) = 0;
  virtual void close() = 0;
};

std::unique_ptr<DwgEngine> createLicensedDwgEngine();

} // namespace mehran::cad
