# RPG-structure

This is an extension that can be used for generating full free RPG qualified data structures. 

The format can be default, template, *auto, or *var, with the subfields and substructures you need.

## Features

The extension allows you to insert a name for the structure, a dimension, a type (default, template, *auto or *var). For the fields, you can insert the name, the type, and size (these three fields are required), and a possible init value.
You can also add a substructure, and fields into it.
Once you have filled the mininum data, you can insert it into your code.
You can set if you want to write the declaration (and other things...), with the format: Dcl-ds, dcl-ds, DCL-DS ... (configuration window).

## How to use

Once active, if you have a RPGLE or SQLRPGLE active editor, you can press the icon (if visible) on the activity bar.
Then you can add your structure data ("header"), and the different fields ("fields"). Then you can press the button to insert the structure on your code, in the place you need.

## Requirements

The extension requires version 1.75 of VSCode.

## Known Issues

None at the moment.

## To Do

- (TODO) Add support for comments on structures and structure fields.
- (TODO) Add a configuration option to define the list of available data types.

### 0.0.10
v0.0.10
- New possibility of declaring dimensional types.
- Bug fixes.

**Please leave a comment, and Enjoy!**
