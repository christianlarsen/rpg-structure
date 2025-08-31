# Changelog

All notable changes to this project will be documented in this file.  
This project follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.2.0] - 2025-08-31
### Added
- Ability to add a dimension to a field.
- Ability to import a structure from the list of structures available in the code.

## [1.1.0] - 2025-08-30
### Added
- Ability to import a structure from code (cursor position).

## [1.0.0] - 2025-08-24
### Added
- First stable release.
- Support for structures, templates, and dimensional types.
- Ability to add substructures and subfields.
- Configuration window to choose preferred format (`Dcl-ds`, `dcl-ds`, `DCL-DS`).
- Control over field names, lengths, and initialization values.
- Export structures into RPGLE and SQLRPGLE sources at any cursor position.
- New extension icon.

### Fixed
- Various bug fixes, including issues with NaN dimension generation and SQLRPGLE syntax highlighting.

---

## [0.0.11] - 2025-08-20
### Fixed
- Error fixes (NaN dimension generation).

## [0.0.10] - 2025-08-15
### Added
- Support for declaring dimensional types.

## [0.0.9] - 2025-08-10
### Added
- New type of structure: templates.
- Configuration window to save preferred structure format.

## [0.0.8] - 2025-08-05
### Fixed
- Fixed problem with code highlighting in SQLRPGLE sources.

## [0.0.7] - 2025-08-01
### Added
- More data types.
- Control over field names and lengths.
- Ability to create substructures (with or without length).
- Ability to add fields inside substructures.

## [0.0.5] & [0.0.6] - 2025-07-28
### Fixed
- Minor changes and bug corrections.

## [0.0.4] - 2025-07-25
### Changed
- Extension interface redesigned: now appears in a panel when clicking the activity bar icon.
- Structure header data (name, type, dimension) can be modified or reset anytime.
- Fields can be added with name, type, size, and optional initialization.
- Structures can be exported multiple times at any location in the code.
- Structure data remains after export (header data can be modified).
- New extension icon.

## [0.0.3] - 2025-07-22
### Added
- Extension added to the activity bar.

## [0.0.2] - 2025-07-20
### Changed
- Code insertion improved: now works from the execution point, even if not at the first column.
