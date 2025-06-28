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
- (TODO) Add a configuration option to choose the formatting style for the dcl-ds, end-ds, etc. keywords (e.g., DCL-DS, Dcl-ds, dcl-ds, End-ds, Qualified, qualified, ...).
- (TODO) Add a configuration option to define the list of available data types.

### 0.0.8
v0.0.8
- It seems that the code hightlight was deactivated when using a SQLRPGLE source. It has been fixed.

**Please leave a comment, and Enjoy!**
