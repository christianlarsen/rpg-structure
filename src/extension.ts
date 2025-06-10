/*
	Christian Larsen, 2025
*/

import * as vscode from 'vscode';
import { handleInsert } from './extension-util';
import { Header, fields } from './rpg-structure-model';
import { HeaderTreeDataProvider, StructureItem, FieldsTreeDataProvider, FieldItem } from './extension-providers';

// Function that activates the extension
export function activate(context: vscode.ExtensionContext) {

	// Initialize the structure info
	let header: Header = {
		name: "",
		type: "",
		dimension: 0
	};
	// Editor and position to insert the code
	let editor = vscode.window.activeTextEditor;
	const insertPosition = editor?.selection.active;

	// "Header" provider
	const provider = new HeaderTreeDataProvider();
	vscode.window.registerTreeDataProvider('rpg-structure-header', provider);

	// "Fields" provider
	const fieldsProvider = new FieldsTreeDataProvider();
	vscode.window.registerTreeDataProvider('rpg-structure-fields', fieldsProvider)

	// Activate the activity bar extension if the editor is "rpgle" or "sqlrpgle"
	const isRpgle = editor?.document.languageId === 'rpgle' || 
		editor?.document.languageId === 'sqlrpgle';
  	vscode.commands.executeCommand('setContext', 'rpgStructure.showContainer', isRpgle);

	// Check if the editor has been changed, so maybe I have to remove the extension from the activity bar
	vscode.window.onDidChangeActiveTextEditor(editor => {
		const isRpgle = editor?.document.languageId === 'rpgle' || editor?.document.languageId === 'sqlrpgle';
		vscode.commands.executeCommand('setContext', 'rpgstructure.showContainer', isRpgle);
		editor = vscode.window.activeTextEditor;
	});

	// Subscriptions
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
			}
		}),

		// Add Field ======================================================================================
		vscode.commands.registerCommand('rpgStructure.addField', async () => {
			const name = await vscode.window.showInputBox({ prompt: 'Field name' });
			if (!name) return;

			const type = await vscode.window.showQuickPick(['char', 'varchar', 'zoned', 'dec', 'ind', 'packed'], {
				placeHolder: 'Choose field type'
			});
			if (!type) return;

			let length: string | undefined;
			if (type === 'char' || type === 'varchar' || type === 'zoned' || type === 'dec' || type === 'packed') {
				const lenStr = await vscode.window.showInputBox({ prompt: 'Field length' });
				length = lenStr;
			}
			const init = await vscode.window.showInputBox({ prompt: 'Init value (optional)' });

			const newField = new FieldItem(name, type, length, init);
			fieldsProvider.addField(newField);

		}),

		// Create Structure ===============================================================================
		vscode.commands.registerCommand('rpgStructure.generate', () => {
			
			// Check if the structure can be generated
			// ?????

			// Inserts the structure code
			if (editor && insertPosition) {
				handleInsert(editor, insertPosition, header.name, header.type, header.dimension.toString(), fields);
				
				// Clean data
				header.name = '';
				header.type = '';
				header.dimension = 0;
				fields.length = 0;

				provider.refresh();
				fieldsProvider.refresh();

			};
		})
	);
};

// Deactivates the extension
export function deactivate() { }
