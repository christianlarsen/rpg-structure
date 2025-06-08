import * as vscode from 'vscode';
import { getNonce, getWebviewContent, handleInsert } from './extension-util';
import { Field } from './rpg-structure-model';

// Function that activates the extension
export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		vscode.commands.registerCommand('rpg-structure.generator', async () => {

			// Check if active editor is found
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showWarningMessage('No active editor found.');
				return;
			};

			// Check if the active editor is an RPGLE or SQLRPGLE source file
			const fileName = editor.document.fileName.toLowerCase();
			const langId = editor.document.languageId;
			const isRpg = fileName.endsWith('.rpgle') || fileName.endsWith('.sqlrpgle') || langId === 'rpgle' || langId === 'sqlrpgle';
			if (!isRpg) {
				vscode.window.showWarningMessage('This command only works in RPGLE or SQLRPGLE source files.');
				return;
			}

			// Stores the position to insert code
			const insertPosition = editor.selection.active;

			// Initialize the field info
			let fields : Field[] = [];

			// Create Webview
			const panel = vscode.window.createWebviewPanel(
				'rpgStructureWizard',
				'RPG Structure Wizard',
				vscode.ViewColumn.One,
				{ enableScripts: true, retainContextWhenHidden: true }
			);

			// Retrieves "Nonce" and shows the panel
			const nonce = getNonce();
			panel.webview.html = getWebviewContent(panel.webview, nonce);

			// Handle messages from the webview
			panel.webview.onDidReceiveMessage(message => {
				switch (message.command) {
					// Insert code of the RPG structure
					case 'insert':
						handleInsert(editor, insertPosition, message.structureName, message.structureType, message.dimension, fields);
						panel.dispose();
						break;

					// Cancel process
					case 'cancel':
						panel.dispose();
						break;

					// Show alert
					case 'alert':
						vscode.window.showErrorMessage(message.alert);
						break;

					// Add new field to structure
					case 'newfield':
						
						// Stores the information of the field
						const field : Field = {
							name : message.name,
							type : message.type,
							length : message.length,
							init : message.init
						};
						fields.push(field);
						break;
				};
			});
		})
	);
};

// Deactivates the extension
export function deactivate() {}
