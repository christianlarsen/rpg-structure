# Change Log

## Changed
v0.0.2
- Different structure of the project.
v0.0.3
- Internal changes.
- More information in the README.md.
v0.0.4
- A lot of changes (see "Added" for v0.0.4).
v0.0.5&0.0.6
- Bug corrections.

## Added
v0.0.2
- The code is inserted from the place it was executed (also if the position is not the first column of the code).
v0.0.3
- Added extension to the activity bar.
v0.0.4
- The extension's interface has been completely modified: now, instead of in a webview, it appears in the panel once the activity bar icon is clicked.
- The structure's header data can be modified at any time: name, type, and dimension. They can also be reset at any time.
- Fields can be added to the structure using the "Add" button. Each field has a name, type (which can be selected from a number of predetermined types), size (which must be formatted appropriately), and an initialization (optional, but must be formatted appropriately). Fields can be initialized at any time.
- Once the header data has been established and at least one field has been added, the structure can be exported to our code. It can be exported as many times as necessary, at any location within our code.
- Once the structure has been exported, the structure data remains so that it can be exported again or modified if necessary (for now, only the header data).
- New icon for the extension.
v0.0.5&v0.0.6
- Minor changes and bug corrections.
v0.0.7
- More data types added.
- Control over the name of fields, and length of the different types.
- You can now create substructures (with a length or not).
- You can now add fields to substructures.
v0.0.8
- Fixed problem with code hightlight in SQLRPGLE sources.
v0.0.9
- New type of structure: templates.
- New "configuration window":
    You can save your preferred structure format (DCL-DS, Dcl-ds, dcl-ds).
