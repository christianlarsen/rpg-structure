# RPG-structure

This is an extension that can be used for generating full free RPG qualified data structures, with *auto, *var, or default type, with the subfields you need.

## Features

The extension allows you to insert a name for the structure, a dimension, a type (*auto, *var, or default). For the fields, you can insert the name, the type, and size (these three fields are required), and a possible init value.
The code of the structure in free RPG is inserted in the place of the code where you execute the extension.
See the "Know issues", to see what is not done at the moment, and what is going to be implemented in the next versions.

## How to use

Once active, press Ctrl+Shift+P or F1, and search for "RPG structure" to easily run the extension. You must have an active editor and the source code must be RPGLE or SQLRPGLE.
You can also add "RPG Structure" to the taskbar and use it by simply clicking the button.

https://github.com/user-attachments/assets/017207c7-86b5-41ce-a190-55ef27e278e1


## Requirements

The extension requires version 1.75 of VSCode.

## Known Issues

- Substructures cannot be defined at the moment (TODO).
- Some data types doesn't need a size, but the extension does not allow to leave that field empty (TODO).

## To Do

- The idea is to change the webview and integrate the extension into the main sidebar, making it easier to use.

### 0.0.3
Read the CHANGELOG.

**Please leave a comment, and Enjoy!**
