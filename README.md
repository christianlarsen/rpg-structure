# RPG Structure

A Visual Studio Code extension to generate **free-format RPG qualified data structures** for IBM i.

With RPG Structure, you can quickly design structures, templates, and substructures, then export them directly into your RPGLE or SQLRPGLE code.

---

## Features

- Define structure headers with:
  - Name
  - Type (`default`, `template`, `*auto`, `*var`)
  - Dimension
- Add fields with:
  - Name (required)
  - Type (required, chosen from a predefined list)
  - Size (required, properly formatted)
  - Initialization value (optional)
- Create **substructures** and add fields inside them.
- Export your structure to the active editor at any position.
- Configure preferred format for declarations (`Dcl-ds`, `dcl-ds`, `DCL-DS`).
- Support for **templates** and **dimensional types**.
- Possibility of structure importation from code.

---

## Installation

1. Open **Visual Studio Code**.
2. Go to **Extensions** (`Ctrl+Shift+X` or `Cmd+Shift+X`).
3. Search for **RPG Structure**.
4. Click **Install**.

---

## Usage

1. Open a **RPGLE** or **SQLRPGLE** source in the editor.
2. Click the **RPG Structure** icon in the Activity Bar.
3. Enter your structure header information (name, type, dimension).
4. Add fields and optional substructures.
5. Click **Insert** to export the structure into your code.

---

## Requirements

- Visual Studio Code **v1.75** or higher.
- A RPGLE or SQLRPGLE source open in the editor.

---

## Known Issues

- None at the moment.

---

## Roadmap

- [ ] Add support for comments on structures and fields.
- [ ] Add configuration options to define the list of available data types.

---

## Release Notes

### [1.1.0] - 2025-08-30
- Possibility of structure importation from code.

See the [Changelog](./CHANGELOG.md) for the complete history.

---

## Contributing

Issues and pull requests are welcome!  
Please open an issue on [GitHub](https://github.com/tuusuario/rpg-structure) with any suggestions or bug reports.

---

## License

This extension is licensed under the [MIT License](./LICENSE).

---

**Enjoy using RPG Structure! 🚀**
