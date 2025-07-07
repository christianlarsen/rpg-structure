/*
	Christian Larsen, 2025
	"RPG structure"
	extension.ts
*/

import * as vscode from 'vscode';
import { handleInsert, updateContext, deleteField, insertField, insertSubstructure, insertFieldSubstructure } from './extension-util';
import { header, fields } from './rpg-structure-model';
import { HeaderTreeDataProvider, StructureItem, FieldsTreeDataProvider, FieldItem, ConfigProvider, ConfigItem } from './extension-providers';
import { loadConfiguration, saveConfiguration, currentConfiguration } from './extension-configuration';

// Function that activates the extension
export function activate(context: vscode.ExtensionContext) {

	loadConfiguration(context);

	updateContext(vscode.window.activeTextEditor);
	vscode.window.onDidChangeActiveTextEditor(editor => {
		updateContext(editor);
	});

	// "Header" provider
	const provider = new HeaderTreeDataProvider();
	vscode.window.registerTreeDataProvider('rpg-structure-header', provider);

	// "Fields" provider
	const fieldsProvider = new FieldsTreeDataProvider();
	vscode.window.registerTreeDataProvider('rpg-structure-fields', fieldsProvider);

	// "Configuration" provider
	const configProvider = new ConfigProvider();
	vscode.window.registerTreeDataProvider('rpg-structure-configuration', configProvider);

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
					if (header.type === "template") {
						vscode.window.showWarningMessage("A template structure cannot have a dimension.");
						break;
					};

					const inputDimension = await vscode.window.showInputBox({
						prompt: "Enter dimension for the structure",
						placeHolder: "e.g. 10000",
						value: header.dimension ?? ""
					});
					if (inputDimension === "") {
						vscode.window.showErrorMessage("The dimension is required.");
						break;
					};
					if (inputDimension !== undefined) {
						if (!/^\d+$/.test(inputDimension)) {
							vscode.window.showErrorMessage("Dimension must be a positive integer.");
							break;
						};
						header.dimension = inputDimension; 
						item.label = "DIMENSION: " + inputDimension;
					};
					provider.refresh();
					break;

				case 'type':
					const inputType = await vscode.window.showQuickPick(
						["Default", "template", "*var", "*auto"],
						{
							placeHolder: "Select type for the structure",
						});
					if (inputType) {
						header.type = inputType;
						item.label = "TYPE: " + header.type;

						// If type is "template", then dim must be removed
						if (inputType === "template") {
							header.dimension = undefined;	
						};
					};
					provider.refresh();
					break;
			};
			vscode.commands.executeCommand('setContext', 'rpgStructure.hasHeader',
				(
					header.name !== '' && header.type !== '' &&
					(
						(header.type === 'template' && (!header.dimension || header.dimension === '0')) ||
						(header.type !== 'template' && typeof header.dimension === 'string' && header.dimension.length > 0)
					)
				)
			);
			
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
			header.dimension = '0';

			// Refresh the provider
			provider.refresh();

			// Sets "rpgStructure.hasHeader" to true or false
			vscode.commands.executeCommand('setContext', 'rpgStructure.hasHeader',
				(header.name !== '') && (header.dimension !== '0') && (header.type !== ''));

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
				handleInsert(editor, insertPosition, header.name, header.type, header.dimension, fields);
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
		}),

		// Configuration ==================================================================================
		vscode.commands.registerCommand('rpgStructure.configuration.itemClick', async (item: ConfigItem) => {
			switch (item.id) {
				case 'structureFormat':
					const format = await vscode.window.showQuickPick(['Dcl-ds', 'DCL-DS', 'dcl-ds'], {
						placeHolder: 'Select structure format'
					});
					if (format) {
						currentConfiguration.structureFormat = format;
						saveConfiguration(context, currentConfiguration);
					};

					break;

				case 'structureIndentation':
					const indentation = await vscode.window.showInputBox({
						placeHolder: 'Enter number of spaces for indentation (1–10)',
						prompt: 'Choose how many spaces to use for indentation',
						validateInput: (value) => {
							const num = Number(value);
							if (!/^\d+$/.test(value)) {
								return 'Only numbers are allowed';
							}
							if (num < 1 || num > 10) {
								return 'Please enter a number between 1 and 10';
							}
							return null;
						}
					});
					if (indentation) {
						currentConfiguration.indentation = Number(indentation);
						saveConfiguration(context, currentConfiguration);
					};
	
					break;
			
			};
			configProvider.refresh();
		})
	);
};

// Deactivates the extension
export function deactivate() {

};
