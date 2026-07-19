# RPG Structure

**RPG Structure** is a Visual Studio Code extension to generate **free-format RPG qualified data structures** for IBM i.

With RPG Structure, you can quickly design structures, templates, and substructures, then export them directly into your RPGLE or SQLRPGLE code.

---

## ✨ Features

- **Define structure headers** with:
  - Name
  - Type (`default`, `template`, `*auto`, `*var`)
  - Dimension

- **Add fields** with:
  - Name (required)
  - Type (required, chosen from a predefined list)
  - Size (required, properly formatted)
  - Initialization value (optional)

- **Create substructures** and add fields inside them, including substructures nested inside other substructures (at any depth).

- **Edit existing fields** (name, type, length, and initialization value) directly from the tree view.

- **Export your structure** to the active editor at any position.

- **Configuration options**:
  - Preferred format for declarations (`Dcl-ds`, `dcl-ds`, `DCL-DS`).
  - Support for **templates** and **dimensional types**.

- **Import structures**:
  - From code (cursor position).
  - From the list of structures available in the source.

- **Field dimensions** can be added independently (no longer from field creation).

---

## 🚀 How to Use

1. Open a **RPGLE** or **SQLRPGLE** source in the editor.  
2. Click the **RPG Structure** icon in the Activity Bar.  
3. Enter your structure header information (name, type, dimension).  
4. Add fields and optional substructures.  
5. Click **Insert** to export the structure into your code.  

---

## ⚙️ Requirements

- Visual Studio Code **v1.75** or higher.  
- A **RPGLE** or **SQLRPGLE** source open in the editor.  

---

## 🐞 Known Issues

- None at the moment.  

---

## 📝 Roadmap

- [ ] Add support for comments on structures and fields.  
- [ ] Add configuration options to define the list of available data types.  

---

## 📦 Version History
See the full changelog [here](./CHANGELOG.md).

### Latest
**1.3.0** - 2026-07-19
- Fixes: Structures ending with a named `end-ds` (e.g. `end-ds myStructure;`) were not recognized when importing.
- Fixes: Field IDs could collide between different nesting branches, causing actions like "Add substructure" to sometimes target the wrong parent structure.
- Added: Ability to edit an existing field's name, type, length, and initialization value from the tree view (pencil icon).
- Added: Ability to add a substructure inside another substructure, supporting nested substructures at any depth.
- Added: The "Configuration" view now starts collapsed by default, while the other views remain expanded.
- Added: Editing a field now proposes the previous length and init value when switching between compatible types (`char`/`varchar`, `zoned`/`packed`).

---

💬 **Contributing**  
Issues and pull requests are welcome!  
Please open an issue on [GitHub](https://github.com/tuusuario/rpg-structure) with any suggestions or bug reports.  

---

## 📄 License

This extension is licensed under the [MIT License](./LICENSE).  

---

🚀 **Enjoy using RPG Structure!**
