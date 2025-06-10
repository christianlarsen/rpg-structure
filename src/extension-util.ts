import * as vscode from 'vscode';
import { generateRpgCode } from './rpg-code';

// Function that handles the insert of code into the code
export function handleInsert(editor: vscode.TextEditor, position: vscode.Position, structureName: string, structureType: string, dimension: string, fields: any[]) {
	const code = generateRpgCode(structureName, structureType, dimension, fields, position.character);
	const uri = editor.document.uri;
	const viewColumn = editor.viewColumn ?? vscode.ViewColumn.One;

	vscode.window.showTextDocument(uri, { viewColumn, preserveFocus: false }).then(docEditor => {
		docEditor.edit(editBuilder => {
			editBuilder.insert(position, code + '\n\n');
		}).then(success => {
			if (!success) {
				vscode.window.showErrorMessage('Failed to insert the code.');
			}
		}, err => {
			vscode.window.showErrorMessage('Error during insertion: ' + err);
		});
	});
};

