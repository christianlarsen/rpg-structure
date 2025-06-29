/*
	Christian Larsen, 2025
	"RPG structure"
	extension-util.ts
*/

import * as vscode from 'vscode';
import { generateRpgCode } from './rpg-code';
import { fields, Field } from './rpg-structure-model';
import { FieldItem, FieldsTreeDataProvider } from './extension-providers';

// Function that handles the insert of code into the code
export function handleInsert(editor: vscode.TextEditor, position: vscode.Position, structureName: string, structureType: string, dimension: number|undefined, fields: any[]) {
	
	const insertPosition = editor.selection.active;  
	const lineText = editor.document.lineAt(insertPosition.line).text;
	const indentMatch = lineText.match(/^(\s*)/);
	const baseIndent = indentMatch ? indentMatch[1] : '';
	
	const code = generateRpgCode(structureName, structureType, dimension, fields, 0, 0, baseIndent);
	const uri = editor.document.uri;
	const viewColumn = editor.viewColumn ?? vscode.ViewColumn.One;

	vscode.window.showTextDocument(uri, { viewColumn, preserveFocus: false }).then(docEditor => {
		docEditor.edit(editBuilder => {
			const lineRange = editor.document.lineAt(position.line).range;
			editBuilder.replace(lineRange, code);
		}).then(success => {
			if (!success) {
				vscode.window.showErrorMessage('Failed to insert the code.');
			}
		}, err => {
			vscode.window.showErrorMessage('Error during insertion: ' + err);
		});
	});
};

// Function that returns "place holder" for different types
export function getInitPlaceholder(type: string): string {
	switch (type) {
		case 'char':
		case 'varchar':
			return "'ABC'";
		case 'ind':
			return "1, 0, *on, *off";
		case 'zoned':
		case 'packed':
			return "123 or 45.67";
		default:
			return "";
	};
};

// Function that updates context
export function updateContext(editor: vscode.TextEditor | undefined) {
	const isRpgle = editor?.document.languageId === 'rpgle' || editor?.document.languageId === 'sqlrpgle';
	vscode.commands.executeCommand('setContext', 'rpgstructure.showContainer', isRpgle);
};

// Function that inserts a new field
export async function insertField(insubtructure: boolean, position: number, provider: FieldsTreeDataProvider) {

	const name = await vscode.window.showInputBox({
		prompt: 'Field name',
		validateInput : (value: string) => {
			if (!/^[a-zA-ZÑñ_][a-zA-ZÑñ0-9_@#]*$/.test(value)) {
				return 'Invalid name.';
			}
			return undefined;
		}		
	});
	if (!name) return;

	const type = await vscode.window.showQuickPick(
		['char', 'varchar', 'int', 'packed', 'zoned', 'uns',
		'date', 'time', 'timestamp', 'bin', 'ind', 'pointer'], 
		{
			placeHolder: 'Choose field type'
		});
	if (!type) return;

	let length: number | undefined;
	if (['char', 'varchar', 'int', 'packed', 'zoned', 'uns', 'bin'].includes(type)) {
		const lenStr = await vscode.window.showInputBox({
			prompt: 'Field length',
			placeHolder: type == 'packed' || type === 'zoned' ? 'e.g. 5 or 13:2' : 'e.g. 10',
			validateInput: (input) => {
				if (!input) return 'Length is required';

				// Simple integer
				if (/^\d+$/.test(input)) return undefined;

				// Format N:N for zoned/packed only
				if ((type === 'packed' || type === 'zoned') && /^\d+:\d+$/.test(input)) {
					const [whole, decimal] = input.split(':').map(Number);
					if (decimal >= whole) return 'Decimal part must be smaller than total length';
					return undefined;
				};

				return 'Invalid format';
			}
		});
		length = Number(lenStr);
	};

	const init = await vscode.window.showInputBox({
		prompt: 'Init value (optional)',
		placeHolder: getInitPlaceholder(type),
		validateInput: (input) => {
			if (!input) return undefined; // opcional

			if (type === 'char' || type === 'varchar') {
				if (!/^'.*'$/.test(input)) return 'String must be enclosed in single quotes';
				const content = input.slice(1, -1); // remove quotes
				const maxLength = length ? parseInt(length.toString().split(':')[0]) : 0;
				if (content.length > maxLength) return `String too long (max ${maxLength} chars)`;
				return undefined;
			};
			if (type === 'ind') {
				const validValues = ['1', '0', '*on', '*off'];
				if (!validValues.includes(input.toLowerCase()))
					return "Must be '1', '0', *on, or *off";
				return undefined;
			};
			if (type === 'zoned' || type === 'packed') {
				if (!/^\d+(\.\d+)?$/.test(input))
					return 'Must be a numeric value (e.g., 42 or 13.5)';
				return undefined;
			};
			if (type === 'uns' || type === 'int') {
				if (!/^\d+$/.test(input)) {
					return 'Must be a whole number (e.g., 10)';
				}
				return undefined;
			};
			return undefined;
		}
	});

	if (!insubtructure) {
		const newId = getNextIdNumber(fields);
		const newField = new FieldItem(newId, name, type, length, init, false, []);
		provider.addFieldBefore(newField, position);
	} else {
		const newId = getNextIdNumber(fields);
		const newField = new FieldItem(newId, name, type, length, init, false, []);
		provider.addFieldStructure(fields, newField, position);
	};

	vscode.commands.executeCommand('setContext', 'rpgStructure.hasFields', fields.length > 0);

};

// Function that inserts a new substructure
export async function insertSubstructure(provider: FieldsTreeDataProvider) {

	// Asks for the "substructure" information 
	// - Substructure name
	const name = await vscode.window.showInputBox({ prompt: 'Substructure name' });
	if (!name) return;

	// - Checks if the name already exists
	const nameExists = fields.some(f => f.name.toLowerCase() === name.toLowerCase());
	if (nameExists) {
		vscode.window.showErrorMessage(`Another field named "${name}" already exists.`);
		return;
	};

	let length: number | undefined;
	const lenStr = await vscode.window.showInputBox({
		prompt: 'Structure length',
		placeHolder: 'e.g. 100',
		validateInput: (input) => {
			// Allows empty (undefined)
			if (!input) return undefined;

			// Check that is a valid number
			if (/^\d+$/.test(input)) return undefined;

			return 'Invalid format: must be a number or empty';
		}
	});
	if (lenStr) {
		length = Number(lenStr);
	} else {
		length = undefined;
	};

	// Adds the "substructure" as a new field (marked as structure)
	const newId = getNextIdNumber(fields);
	const newField = new FieldItem(newId, name, '', length, undefined, true, []);
	provider.addField(newField);

	vscode.commands.executeCommand('setContext', 'rpgStructure.hasFields', fields.length > 0);

};

// Function that inserts a new field on a "substructure"
export function insertFieldSubstructure(idNumber: number, provider: FieldsTreeDataProvider) {
	insertField(true, idNumber, provider);
};

// Function that deletes a field
export function deleteField(item: Field, provider: FieldsTreeDataProvider) {

	if (item.isStructure && item.fields.length > 0) {
		vscode.window.showWarningMessage(
			`The structure "${item.name}" has ${item.fields.length} subfields. Are you sure you want to delete it?`,
			{ modal: true },
			'Delete'
		).then(selection => {
			if (selection === 'Delete') {
				performDeletion();
			}
		});
	} else {
		performDeletion();
	};

	function performDeletion() {
		const deleteById = (fieldList: Field[]): boolean => {
			for (let i = 0; i < fieldList.length; i++) {
				if (fieldList[i].idNumber === item.idNumber) {
					fieldList.splice(i, 1);
					return true;
				}
				if (fieldList[i].isStructure && fieldList[i].fields.length > 0) {
					const deleted = deleteById(fieldList[i].fields);
					if (deleted) return true;
				}
			}
			return false;
		};

		deleteById(fields);
		reassignIdNumbers(fields);
		provider.refresh();
	};
};

export function reassignIdNumbers(fieldList: Field[]) {
	let idCounter = 0;

	// Recursive function that reassigns id numbers of fields
	const assign = (fields: Field[]) => {
		for (const field of fields) {
			field.idNumber = idCounter++;
			if (field.isStructure && field.fields.length > 0) {
				assign(field.fields);
			};
		};
	};
	assign(fieldList);
};

// Function that calculates the "next" id number for a field
export function getNextIdNumber(fields: Field[]): number {
	let maxId = -1;

	const traverse = (fieldList: Field[]) => {
		for (const field of fieldList) {
			if (field.idNumber > maxId) {
				maxId = field.idNumber;
			};
			if (field.isStructure && field.fields.length > 0) {
				traverse(field.fields);
			};
		};
	};
	traverse(fields);

	return maxId + 1;
};

// Function that finds a "field" by IdNumber
export function findFieldById(fields: Field[], id: number): Field | null {
	for (const field of fields) {
		if (field.idNumber === id) return field;
		if (field.isStructure) {
			const found = findFieldById(field.fields, id);
			if (found) return found;
		};
	};
	return null;
};
