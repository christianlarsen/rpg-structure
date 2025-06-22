/*
	Christian Larsen, 2025
	"RPG structure"
	extension.ts
*/

import * as vscode from 'vscode';
import { handleInsert, updateContext, deleteField, insertField, insertSubstructure, insertFieldSubstructure } from './extension-util';
import { header, fields } from './rpg-structure-model';
import { HeaderTreeDataProvider, StructureItem, FieldsTreeDataProvider, FieldItem } from './extension-providers';

// Function that activates the extension
export function activate(context: vscode.ExtensionContext) {

	updateContext(vscode.window.activeTextEditor);
	vscode.window.onDidChangeActiveTextEditor(editor => {
		updateContext(editor);
	});

	// "Header" provider
	const provider = new HeaderTreeDataProvider();
	vscode.window.registerTreeDataProvider('rpg-structure-header', provider);

	// "Fields" provider
	const fieldsProvider = new FieldsTreeDataProvider();
	vscode.window.registerTreeDataProvider('rpg-structure-fields', fieldsProvider)

	// Check if the editor has been changed, so maybe I have to remove the extension from the activity bar
	vscode.window.onDidChangeActiveTextEditor(editor => {
		editor = vscode.window.activeTextEditor;
	});

	// Subscriptions (commands)
	context.subscriptions.push(

		// Structure data =================================================================================
		vscode.commands.registerCommand('rpgStructure.itemClick', async (item: StructureItem) => {

			switch (item.id) {
				case 'name':
					const inputName = await vscode.window.showInputBox({
						prompt: "Enter a name for the structure",
						placeHolder: "e.g. structure",
						value: header.name
					});
					if (inputName === "") {
						vscode.window.showErrorMessage("The name is required.");
						break;
					};
					if (inputName !== undefined) {
						header.name = inputName;
						item.label = "NAME: " + header.name;
					};
					provider.refresh();
					break;

				case 'dimension':
					const inputDimension = await vscode.window.showInputBox({
						prompt: "Enter dimension for the structure",
						placeHolder: "e.g. 10000",
						value: header.dimension.toString()
					});
					if (inputDimension === "") {
						vscode.window.showErrorMessage("The dimension is required.");
						break;
					};
					if (inputDimension !== undefined) {
						header.dimension = parseInt(inputDimension);
						item.label = "DIMENSION: " + header.dimension.toString();
					};
					provider.refresh();
					break;

				case 'type':
					const inputType = await vscode.window.showQuickPick(
						["Default", "*VAR", "*AUTO"],
						{
							placeHolder: "Select dimension for the structure",
						});
					if (inputType) {
						header.type = inputType;
						item.label = "TYPE: " + header.type;
					};
					provider.refresh();
					break;
			};
			vscode.commands.executeCommand('setContext', 'rpgStructure.hasHeader',
				(header.name !== '') && (header.dimension !== 0) && (header.type !== ''));

		}),

		// Add Field ======================================================================================
		vscode.commands.registerCommand('rpgStructure.addField', async () => {
			// Adds a field to the "fieldsProvider", in the last position (fields.length)
			insertField(false, fields.length, fieldsProvider);
		}),

		// Add Substructure ===============================================================================
		vscode.commands.registerCommand('rpgStructure.addSubstructure', async () => {
			// Adds a field (marked as "structure") to the "fieldsProvider", always in the last position
			insertSubstructure(fieldsProvider);
		}),

		// Clean Header ===================================================================================
		vscode.commands.registerCommand('rpgStructure.cleanHeader', () => {

			// Cleans the header structure
			header.name = '';
			header.type = '';
			header.dimension = 0;

			// Refresh the provider
			provider.refresh();

			// Sets "rpgStructure.hasHeader" to true or false
			vscode.commands.executeCommand('setContext', 'rpgStructure.hasHeader',
				(header.name !== '') && (header.dimension !== 0) && (header.type !== ''));

		}),

		// Clean Fields ===================================================================================
		vscode.commands.registerCommand('rpgStructure.cleanFields', () => {

			// Clean the fields
			fields.length = 0;

			// Clear the provider
			fieldsProvider.refresh();

			vscode.commands.executeCommand('setContext', 'rpgStructure.hasFields', fields.length > 0);

		}),

		// Create Structure ===============================================================================
		vscode.commands.registerCommand('rpgStructure.generate', () => {

			// Retrieves the editor and the insert position to generate the code
			const editor = vscode.window.activeTextEditor;
			const insertPosition = editor?.selection.active;

			// Inserts the structure code
			if (editor && insertPosition) {
				handleInsert(editor, insertPosition, header.name, header.type, header.dimension.toString(), fields);
			};
		}),

		// Adds Field to Substructure =====================================================================
		vscode.commands.registerCommand('rpgStructure.addFieldToSubstructure', (item: FieldItem) => {
			
			insertFieldSubstructure(item.idNumber, fieldsProvider);
		}),

		// Delete Field ===================================================================================
		vscode.commands.registerCommand('rpgStructure.deleteField', (item: FieldItem) => {
			// Deletes the selected item from the "fieldsProvider"
			deleteField(item, fieldsProvider);
		})
	);
};

// Deactivates the extension
export function deactivate() {

};
