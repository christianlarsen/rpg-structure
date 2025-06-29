# RPG-structure

This is an extension that can be used for generating full free RPG qualified data structures, with *auto, *var, or default type, with the subfields you need.

## Features

The extension allows you to insert a name for the structure, a dimension, a type (*auto, *var, or default). For the fields, you can insert the name, the type, and size (these three fields are required), and a possible init value.
The code of the structure in free RPG is inserted in the place of the code where you execute the extension.

## How to use

Once active, if you have a RPGLE or SQLRPGLE active editor, you can press the icon (if visible) on the activity bar.
Then you can add your structure data ("header"), and the different fields ("fields"). Then you can press the button to insert the structure on your code, in the place you need.

## Requirements

The extension requires version 1.75 of VSCode.

## Known Issues

None at the moment.

## To Do

- (TODO) Add support for comments on structures and structure fields.
- (TODO) Add a configuration option to define the number of characters used for indentation.
- (TODO) Add a configuration option to define the list of available data types.

### 0.0.9
v0.0.9
- New type of structures: template.
- New configuracion window: you can now save your preferred structure format (DCL-DS, Dcl-ds, dcl-ds).
  (if you select DCL-DS, then DCL-DS, END-DS, QUALIFIED, TEMPLATE ... will be used; in case you select Dcl-ds, then Dcl-ds, End-ds, Qualified, Template ... will be used)

**Please leave a comment, and Enjoy!**
