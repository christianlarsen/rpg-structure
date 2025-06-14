/*
	Christian Larsen, 2025
*/

import * as vscode from 'vscode';
import { handleInsert, getInitPlaceholder, updateContext } from './extension-util';
import { header, fields } from './rpg-structure-model';
import { HeaderTreeDataProvider, StructureItem, FieldsTreeDataProvider, FieldItem } from './extension-providers';

// Function that activates the extension
export function activate(context: vscode.ExtensionContext) {

	updateContext(vscode.window.activeTextEditor);
	vscode.window.onDidChangeActiveTextEditor(editor => {
		updateContext(editor);
	});

	// Editor and position to insert the code
	let editor = vscode.window.activeTextEditor;
	const insertPosition = editor?.selection.active;

	// "Header" provider
	const provider = new HeaderTreeDataProvider();
	vscode.window.registerTreeDataProvider('rpg-structure-header', provider);

	// "Fields" provider
	const fieldsProvider = new FieldsTreeDataProvider();
	vscode.window.registerTreeDataProvider('rpg-structure-fields', fieldsProvider)

	// Check if the editor has been changed, so maybe I have to remove the extension from the activity bar
	vscode.window.onDidChangeActiveTextEditor(editor => {
		const isRpgle = editor?.document.languageId === 'rpgle' || editor?.document.languageId === 'sqlrpgle';
		// ???? vscode.commands.executeCommand('setContext', 'rpgstructure.showContainer', isRpgle);
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
			};
			vscode.commands.executeCommand('setContext', 'rpgStructure.hasHeader',
				(header.name !== '') && (header.dimension !== 0) && (header.type !== ''));

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

				const lenStr = await vscode.window.showInputBox({
					prompt: 'Field length',
					placeHolder: type === 'zoned' || type === 'packed' ? 'e.g. 5 or 13:2' : 'e.g. 10',
					validateInput: (input) => {
						if (!input) return 'Length is required';

						// Simple integer
						if (/^\d+$/.test(input)) return undefined;

						// Format N:N for zoned/packed only
						if ((type === 'zoned' || type === 'packed') && /^\d+:\d+$/.test(input)) {
							const [whole, decimal] = input.split(':').map(Number);
							if (decimal >= whole) return 'Decimal part must be smaller than total length';
							return undefined;
						};

						return 'Invalid format';
					}
				});
				length = lenStr;
			};

			const init = await vscode.window.showInputBox({
				prompt: 'Init value (optional)',
				placeHolder: getInitPlaceholder(type),
				validateInput: (input) => {
					if (!input) return undefined; // opcional

					if (type === 'char' || type === 'varchar') {
						if (!/^'.*'$/.test(input)) return 'String must be enclosed in single quotes';
						const content = input.slice(1, -1); // remove quotes
						const maxLength = length ? parseInt(length.split(':')[0]) : 0;
						if (content.length > maxLength) return `String too long (max ${maxLength} chars)`;
						return undefined;
					};
					if (type === 'ind') {
						const validValues = ['1', '0', '*on', '*off'];
						if (!validValues.includes(input.toLowerCase()))
							return "Must be '1', '0', '*on', or '*off'";
						return undefined;
					};
					if (type === 'zoned' || type === 'packed') {
						if (!/^\d+(\.\d+)?$/.test(input))
							return 'Must be a numeric value (e.g., 42 or 13.5)';
						return undefined;
					};
					return undefined;
				}
			});

			const newField = new FieldItem(name, type, length, init);
			fieldsProvider.addField(newField);

			vscode.commands.executeCommand('setContext', 'rpgStructure.hasFields', fields.length > 0);

		}),

		// Clean Header ======================================================================================
		vscode.commands.registerCommand('rpgStructure.cleanHeader', () => {

			// Clean the header structure
			header.name = '';
			header.type = '';
			header.dimension = 0;

			// Refresh the provider
			provider.refresh();

			vscode.commands.executeCommand('setContext', 'rpgStructure.hasHeader',
				(header.name !== '') && (header.dimension !== 0) && (header.type !== ''));

		}),

		// Clean Fields ======================================================================================
		vscode.commands.registerCommand('rpgStructure.cleanFields', () => {

			// Clean the fields
			fields.length = 0;

			// Clear the provider
			fieldsProvider.refresh();

			vscode.commands.executeCommand('setContext', 'rpgStructure.hasFields', fields.length > 0);

		}),

		// Create Structure ===============================================================================
		vscode.commands.registerCommand('rpgStructure.generate', () => {

			const editor = vscode.window.activeTextEditor;
			const insertPosition = editor?.selection.active;

			// Inserts the structure code
			if (editor && insertPosition) {
				handleInsert(editor, insertPosition, header.name, header.type, header.dimension.toString(), fields);
			};
		})
	);
};

// Deactivates the extension
export function deactivate() {

};
