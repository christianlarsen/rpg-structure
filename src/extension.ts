import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('rpg-structure.generator', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showWarningMessage('No active editor found.');
				return;
			}

			const fileName = editor.document.fileName.toLowerCase();
			const langId = editor.document.languageId;
			const isRpg = fileName.endsWith('.rpgle') || fileName.endsWith('.sqlrpgle') || langId === 'rpgle' || langId === 'sqlrpgle';

			if (!isRpg) {
				vscode.window.showWarningMessage('This command only works in RPGLE or SQLRPGLE source files.');
				return;
			}

			const insertPosition = editor.selection.active;

			// Create Webview
			const panel = vscode.window.createWebviewPanel(
				'rpgStructureWizard',
				'RPG Structure Wizard',
				vscode.ViewColumn.One,
				{ enableScripts: true, retainContextWhenHidden: true }
			);
			const nonce = getNonce();
			panel.webview.html = getWebviewContent(panel.webview, nonce);

			// Handle messages from the webview
			panel.webview.onDidReceiveMessage(message => {
				switch (message.command) {
					case 'insert':
						handleInsert(editor, insertPosition, message.structureName, message.structureType, message.dimension, message.fields);
						panel.dispose();
						break;

					case 'cancel':
						panel.dispose();
						break;
				}
			});
		})
	);
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getWebviewContent(webview : vscode.Webview, nonce : string) : string {
	return /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>RPG Structure Generator</title>
	<style nonce="${nonce}">
		body {
			font-family: sans-serif;
			padding: 16px;
			background-color: #1e1e1e;
			color: #d4d4d4;
		}
		input, select, button {
			margin: 4px 4px 4px 0;
			padding: 4px;
			font-size: 14px;
			border-radius: 4px;
			border: 1px solid #555;
			background-color: #2d2d2d;
			color: #d4d4d4;
		}
		button {
			cursor: pointer;
			background-color: #0e639c;
			color: white;
			border: none;
		}
		button:disabled {
			background-color: #555;
			cursor: not-allowed;
		}
		label {
			display: inline-block;
			margin-bottom: 4px;
		}
		.inline {
			margin-right: 10px;
		}
		.field {
			cursor: pointer;
			display: block;
			padding: 2px;
		}
		.field:hover {
			background-color: #333;
		}
		.section {
			margin-bottom: 12px;
		}
		#summaryBox {
			border: 1px solid #444;
			border-radius: 8px;
			padding: 10px;
			margin-top: 6px;
		}
	</style>
</head>
<body>
	<h2>Define RPG Structure</h2>

	<div class="section">
		<label class="inline">Structure Name*:
			<input id="structureName" type="text" maxlength="50" style="width:200px;">
		</label>
		<label class="inline">Type*:
			<select id="structureType" style="width:130px;">
				<option value="">default</option>
				<option value="*AUTO">*AUTO</option>
				<option value="*VAR">*VAR</option>
			</select>
		</label>
		<label class="inline">Dimension*:
			<input id="dimension" type="text" maxlength="6" style="width:100px;" placeholder="e.g., 100">
		</label>
	</div>

	<h3>Add Fields</h3>
	<div class="section">
		<label class="inline">Name*:
			<input id="fieldName" type="text" maxlength="50" style="width:160px;">
		</label>
		<label class="inline">Type*:
			<input id="fieldType" type="text" maxlength="20" style="width:100px;">
		</label>
		<label class="inline">Length*:
			<input id="fieldLength" type="text" maxlength="10" style="width:80px;">
		</label>
		<label class="inline">Init:
			<input id="fieldInit" type="text" maxlength="10" style="width:80px;">
		</label>
		<button id="addFieldBtn">Add Field</button>
	</div>

	<h3>Summary</h3>
	<div id="summaryBox">
		<div id="summary"></div>
	</div>

	<br>
	<button id="insertBtn" disabled>Insert Structure</button>
	<button id="cancelBtn">Cancel</button>

	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		let structureName = '', structureType = '', dimension = '';
		const fields = [];
		const summaryEl = document.getElementById('summary');
		const insertBtn = document.getElementById('insertBtn');

		function updateSummary() {
			let summaryText = '<strong>Structure:</strong> ' + (structureName || '(not set)') + '<br>';
			summaryText += '<strong>Type:</strong> ' + (structureType || '(default)') + '<br>';
			summaryText += '<strong>Dimension:</strong> ' + (dimension || '(none)') + '<br><br><strong>Fields:</strong><br>';
			summaryText += fields.length
				? fields.map((f, i) =>
					\`<span class="field" data-index="\${i}">- \${f.name}: \${f.type}(\${f.length})\${f.init ? ' inz(' + f.init + ')' : ''}</span>\`
				  ).join('<br>')
				: '(no fields added yet)';
			summaryEl.innerHTML = summaryText;
			insertBtn.disabled = !(structureName && dimension && fields.length);
		}

		document.getElementById('structureName').addEventListener('input', e => {
			structureName = e.target.value;
			updateSummary();
		});
		document.getElementById('structureType').addEventListener('change', e => {
			structureType = e.target.value;
			updateSummary();
		});
		document.getElementById('dimension').addEventListener('input', e => {
			dimension = e.target.value;
			updateSummary();
		});
		document.getElementById('addFieldBtn').addEventListener('click', () => {
			const name = document.getElementById('fieldName').value.trim();
			const type = document.getElementById('fieldType').value.trim();
			const length = document.getElementById('fieldLength').value.trim();
			const init = document.getElementById('fieldInit').value.trim();
			if (!name || !type || !length) {
				alert('Field name, type and length are required.');
				return;
			}
			fields.push({ name, type, length, init: init || undefined });
			document.getElementById('fieldName').value = '';
			document.getElementById('fieldType').value = '';
			document.getElementById('fieldLength').value = '';
			document.getElementById('fieldInit').value = '';
			updateSummary();
		});
		insertBtn.addEventListener('click', () => {
			vscode.postMessage({ command: 'insert', structureName, structureType, dimension, fields });
		});
		document.getElementById('cancelBtn').addEventListener('click', () => {
			vscode.postMessage({ command: 'cancel' });
		});

		summaryEl.addEventListener('click', e => {
			if (e.target.classList.contains('field')) {
				const index = +e.target.dataset.index;
				const field = fields[index];

				console.log("Clicked field", field);
				const confirmedText = "Remove field " + field.name + "?";


				const confirmed = confirm(confirmedText);
				console.log("Confirm result:", confirmed);

				if (confirmed) {
					fields.splice(index, 1);
					updateSummary();
				}
			}
		});

		updateSummary();
	</script>
</body>
</html>`;
}


function generateRpgCode(name: string, type: string, dimension: string, fields: { name: string, type: string, length: string, init?: string }[]): string {
	let header = `dcl-ds ${name} qualified`;
	if (dimension.trim()) {
		header += ` dim(*auto:${dimension.trim()})`;
	}
	header += ';';

	const body = fields.map(f => {
		let line = `   ${f.name} ${f.type}(${f.length})`;
		if (f.init?.trim()) {
			line += ` inz(${f.init.trim()})`;
		}
		return line + ';';
	});

	return [header, ...body, 'end-ds;'].join('\n');
}

function handleInsert(editor: vscode.TextEditor, position: vscode.Position, structureName: string, structureType: string, dimension: string, fields: any[]) {
	const code = generateRpgCode(structureName, structureType, dimension, fields);
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
}

export function deactivate() {}
