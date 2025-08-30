/*
	Christian Larsen, 2025
	"RPG structure"
	extension.ts
*/

import * as vscode from 'vscode';
import { handleInsert, updateContext, deleteField, insertField, insertSubstructure, insertFieldSubstructure } from './rpg-structure.utils';
import { HeaderTreeDataProvider, StructureItem, FieldsTreeDataProvider, FieldItem, ConfigProvider, ConfigItem } from './rpg-structure.providers';
import { loadConfiguration, saveConfiguration, currentConfiguration } from './rpg-structure.configuration';
import { header, fields, COMMANDS, TREE_DATA_PROVIDERS, StructureFormat, StructureType } from './rpg-structure.model';
import { isPositiveInteger, updateHeaderContext, updateFieldsContext } from './rpg-structure.helper';
import { RpgStructureParser, ParsedStructure } from './rpg-structure.parser';

/**
 * Main function that activates the extension
 * @param context - VS Code extension context
 */
export function activate(context: vscode.ExtensionContext): void {
    try {
        // Load configuration
        loadConfiguration(context);
        
        // Initialize providers
        const { provider, fieldsProvider, configProvider } = initializeProviders();
        
        // Setup editor listeners
        setupEditorListeners();
        
        // Register all commands
        registerCommands(context, provider, fieldsProvider, configProvider);
        
        // Initialize contexts
        updateHeaderContext();
        updateFieldsContext();
        
    } catch (error) {
        console.error('Failed to activate RPG Structure extension:', error);
        vscode.window.showErrorMessage('Failed to activate RPG Structure extension. Please reload VS Code.');
    };
};

/**
 * Function called when the extension is deactivated
 * Performs cleanup operations if necessary
 */
export function deactivate(): void {
};

/**
 * Initializes tree data providers
 * @returns Object containing all tree data providers
 */
function initializeProviders(): {
    provider: HeaderTreeDataProvider;
    fieldsProvider: FieldsTreeDataProvider;
    configProvider: ConfigProvider;
} {
    const provider = new HeaderTreeDataProvider();
    const fieldsProvider = new FieldsTreeDataProvider();
    const configProvider = new ConfigProvider();
    
    // Register tree data providers
    vscode.window.registerTreeDataProvider(TREE_DATA_PROVIDERS.HEADER, provider);
    vscode.window.registerTreeDataProvider(TREE_DATA_PROVIDERS.FIELDS, fieldsProvider);
    vscode.window.registerTreeDataProvider(TREE_DATA_PROVIDERS.CONFIGURATION, configProvider);
    
    return { provider, fieldsProvider, configProvider };
};

/**
 * Sets up editor change listeners
 */
function setupEditorListeners(): void {
    // Update context when active editor changes
    updateContext(vscode.window.activeTextEditor);
    
    const disposable = vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor | undefined) => {
        updateContext(editor);
    });
    
    // TODO: The disposable should be added to context.subscriptions in the activate function
};

/**
 * Registers all extension commands
 * @param context - VS Code extension context
 * @param provider - Header tree data provider
 * @param fieldsProvider - Fields tree data provider
 * @param configProvider - Configuration tree data provider
 */
function registerCommands(
    context: vscode.ExtensionContext,
    provider: HeaderTreeDataProvider,
    fieldsProvider: FieldsTreeDataProvider,
    configProvider: ConfigProvider
): void {
    const commands = [
        // Structure data commands
        vscode.commands.registerCommand(COMMANDS.ITEM_CLICK, async (item: StructureItem) => {
            await handleStructureItemClick(item, provider);
        }),
        
        // Field management commands
        vscode.commands.registerCommand(COMMANDS.ADD_FIELD, async () => {
            insertField(false, fields.length, fieldsProvider);
            updateFieldsContext();
        }),
        
        vscode.commands.registerCommand(COMMANDS.ADD_SUBSTRUCTURE, async () => {
            insertSubstructure(fieldsProvider);
            updateFieldsContext();
        }),
        
        vscode.commands.registerCommand(COMMANDS.ADD_FIELD_TO_SUBSTRUCTURE, (item: FieldItem) => {
            insertFieldSubstructure(item.idNumber, fieldsProvider);
            updateFieldsContext();
        }),
        
        vscode.commands.registerCommand(COMMANDS.DELETE_FIELD, (item: FieldItem) => {
            deleteField(item, fieldsProvider);
            updateFieldsContext();
        }),
        
        // Cleanup commands
        vscode.commands.registerCommand(COMMANDS.CLEAN_HEADER, () => {
            cleanHeader(provider);
        }),
        
        vscode.commands.registerCommand(COMMANDS.CLEAN_FIELDS, () => {
            cleanFields(fieldsProvider);
        }),
        
        // Generation command
        vscode.commands.registerCommand(COMMANDS.GENERATE, () => {
            generateStructure();
        }),
        
        // Configuration commands
        vscode.commands.registerCommand(COMMANDS.CONFIG_ITEM_CLICK, async (item: ConfigItem) => {
            await handleConfigurationItemClick(item, context, configProvider);
        }),

        // Import commands
        vscode.commands.registerCommand(COMMANDS.IMPORT_FROM_CURSOR, async () => {
            await importStructureAtCursor(provider, fieldsProvider);
        }),
        
        vscode.commands.registerCommand(COMMANDS.IMPORT_FROM_LIST, async () => {
            await importFromStructureList(provider, fieldsProvider);
        })
    ];
    
    context.subscriptions.push(...commands);
};

/**
 * Handles the structure item click events (name, dimension, type)
 * @param item - The structure item that was clicked
 * @param provider - The header tree data provider for refreshing
 */
async function handleStructureItemClick(item: StructureItem, provider: HeaderTreeDataProvider): Promise<void> {
    switch (item.id) {
        case 'name':
            await handleNameInput(item, provider);
            break;
        case 'dimension':
            await handleDimensionInput(item, provider);
            break;
        case 'type':
            await handleTypeInput(item, provider);
            break;
        default:
            console.warn(`Unknown structure item id: ${item.id}`);
    };
    
    updateHeaderContext();
};

/**
 * Handles name input for the structure
 * @param item - The structure item
 * @param provider - The header tree data provider
 */
async function handleNameInput(item: StructureItem, provider: HeaderTreeDataProvider): Promise<void> {
    const inputName = await vscode.window.showInputBox({
        prompt: 'Enter a name for the structure',
        placeHolder: 'e.g. structure',
        value: header.name,
        validateInput: (value: string) => {
            if (!value || value.trim() === '') {
                return 'Name is required and cannot be empty';
            }
            return null;
        }
    });
    
    if (inputName === undefined) {
        return; // User cancelled
    };
    
    if (inputName.trim() === '') {
        vscode.window.showErrorMessage('The name is required.');
        return;
    };
    
    header.name = inputName.trim();
    item.label = `NAME: ${header.name}`;
    provider.refresh();
};

/**
 * Handles dimension input for the structure
 * @param item - The structure item
 * @param provider - The header tree data provider
 */
async function handleDimensionInput(item: StructureItem, provider: HeaderTreeDataProvider): Promise<void> {
    if (header.type === 'template') {
        vscode.window.showWarningMessage('A template structure cannot have a dimension.');
        return;
    };
    
    const inputDimension = await vscode.window.showInputBox({
        prompt: 'Enter dimension for the structure',
        placeHolder: 'e.g. 10000',
        value: header.dimension ?? '',
        validateInput: (value: string) => {
            if (!value || value.trim() === '') {
                return 'Dimension is required';
            };
            if (!isPositiveInteger(value.trim())) {
                return 'Dimension must be a positive integer';
            };
            return null;
        }
    });
    
    if (inputDimension === undefined) {
        return; // User cancelled
    };
    
    if (inputDimension.trim() === '') {
        vscode.window.showErrorMessage('The dimension is required.');
        return;
    };
    
    if (!isPositiveInteger(inputDimension.trim())) {
        vscode.window.showErrorMessage('Dimension must be a positive integer.');
        return;
    };
    
    header.dimension = inputDimension.trim();
    item.label = `DIMENSION: ${inputDimension.trim()}`;
    provider.refresh();
};

/**
 * Handles type input for the structure
 * @param item - The structure item
 * @param provider - The header tree data provider
 */
async function handleTypeInput(item: StructureItem, provider: HeaderTreeDataProvider): Promise<void> {
    const structureTypes: StructureType[] = ['Default', 'template', '*var', '*auto'];
    
    const inputType = await vscode.window.showQuickPick(structureTypes, {
        placeHolder: 'Select type for the structure'
    });
    
    if (!inputType) {
        return; // User cancelled
    };
    
    header.type = inputType;
    item.label = `TYPE: ${header.type}`;
    
    // If type is "template", then dimension must be removed
    if (inputType === 'template') {
        header.dimension = undefined;
    };
    
    provider.refresh();
};

/**
 * Handles configuration item click events
 * @param item - The configuration item that was clicked
 * @param context - VS Code extension context
 * @param configProvider - The configuration tree data provider
 */
async function handleConfigurationItemClick(
    item: ConfigItem, 
    context: vscode.ExtensionContext, 
    configProvider: ConfigProvider
): Promise<void> {
    switch (item.id) {
        case 'structureFormat':
            await handleStructureFormatConfig(context);
            break;
        case 'structureIndentation':
            await handleIndentationConfig(context);
            break;
        default:
            console.warn(`Unknown configuration item id: ${item.id}`);
    };
    
    configProvider.refresh();
};

/**
 * Handles structure format configuration
 * @param context - VS Code extension context
 */
async function handleStructureFormatConfig(context: vscode.ExtensionContext): Promise<void> {
    const formatOptions: StructureFormat[] = ['Dcl-ds', 'DCL-DS', 'dcl-ds'];
    
    const format = await vscode.window.showQuickPick(formatOptions, {
        placeHolder: 'Select structure format'
    });
    
    if (format) {
        currentConfiguration.structureFormat = format;
        saveConfiguration(context, currentConfiguration);
    };
};

/**
 * Handles indentation configuration
 * @param context - VS Code extension context
 */
async function handleIndentationConfig(context: vscode.ExtensionContext): Promise<void> {
    const indentation = await vscode.window.showInputBox({
        placeHolder: 'Enter number of spaces for indentation (1–10)',
        prompt: 'Choose how many spaces to use for indentation',
        validateInput: (value: string) => {
            if (!/^\d+$/.test(value)) {
                return 'Only numbers are allowed';
            };
            const num = Number(value);
            if (num < 1 || num > 10) {
                return 'Please enter a number between 1 and 10';
            };
            return null;
        }
    });
    
    if (indentation) {
        currentConfiguration.indentation = Number(indentation);
        saveConfiguration(context, currentConfiguration);
    };
};

/**
 * Cleans the header structure and refreshes the UI
 * @param provider - The header tree data provider
 */
function cleanHeader(provider: HeaderTreeDataProvider): void {
    header.name = '';
    header.type = '';
    header.dimension = '0';
    
    provider.refresh();
    updateHeaderContext();
};

/**
 * Cleans all fields and refreshes the UI
 * @param fieldsProvider - The fields tree data provider
 */
function cleanFields(fieldsProvider: FieldsTreeDataProvider): void {
    fields.length = 0;
    fieldsProvider.refresh();
    updateFieldsContext();
};

/**
 * Generates the RPG structure code at the current cursor position
 */
function generateStructure(): void {
    const editor = vscode.window.activeTextEditor;
    
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found. Please open a file first.');
        return;
    };
    
    const insertPosition = editor.selection.active;
    
    try {
        handleInsert(editor, insertPosition, header.name, header.type, header.dimension, fields);
    } catch (error) {
        console.error('Error generating structure:', error);
        vscode.window.showErrorMessage('Failed to generate RPG structure. Please try again.');
    };
};

/**
 * Imports RPG structure at cursor position
 * @param provider - Header tree data provider
 * @param fieldsProvider - Fields tree data provider
 */
async function importStructureAtCursor(
    provider: HeaderTreeDataProvider, 
    fieldsProvider: FieldsTreeDataProvider
): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const document = editor.document;
    const position = editor.selection.active;
    const content = document.getText();
    
    try {
        const parsed = RpgStructureParser.parseStructureAtCursor(content, position.line);
        
        if (!parsed.success) {
            vscode.window.showErrorMessage(`Import failed: ${parsed.errors.join(', ')}`);
            return;
        }
        
        if (!RpgStructureParser.validateParsedStructure(parsed)) {
            vscode.window.showErrorMessage('Invalid structure format found');
            return;
        }
        
        // Confirm before overwriting existing data
        if (header.name || fields.length > 0) {
            const overwrite = await vscode.window.showWarningMessage(
                'This will overwrite your current structure. Continue?',
                { modal: true },
                'Yes', 'No'
            );
            
            if (overwrite !== 'Yes') {
                return;
            }
        }
        
        // Clear existing data and import
        cleanHeader(provider);
        cleanFields(fieldsProvider);
        
        Object.assign(header, parsed.header);
        fields.push(...parsed.fields);
        
        // Refresh UI
        provider.refresh();
        fieldsProvider.refresh();
        updateHeaderContext();
        updateFieldsContext();
        
        vscode.window.showInformationMessage(`Structure "${parsed.header.name}" imported successfully`);
        
    } catch (error) {
        console.error('Error importing structure:', error);
        vscode.window.showErrorMessage(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Shows list of all structures in file for import selection
 * @param provider - Header tree data provider  
 * @param fieldsProvider - Fields tree data provider
 */
async function importFromStructureList(
    provider: HeaderTreeDataProvider,
    fieldsProvider: FieldsTreeDataProvider
): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }
    
    try {
        const structures = RpgStructureParser.extractAllStructures(editor.document.getText());
        
        if (structures.length === 0) {
            vscode.window.showInformationMessage('No RPG structures found in current file');
            return;
        }
        
        const items = structures.map(s => ({
            label: s.header.name,
            description: `${s.header.type} (${s.fields.length} fields)`,
            detail: s.header.dimension && s.header.dimension !== '0' ? `Dimension: ${s.header.dimension}` : undefined,
            structure: s
        }));
        
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select structure to import',
            matchOnDescription: true,
            matchOnDetail: true
        });
        
        if (!selected) {
            return; // User cancelled
        }
        
        // Confirm before overwriting existing data
        if (header.name || fields.length > 0) {
            const overwrite = await vscode.window.showWarningMessage(
                `Import "${selected.structure.header.name}"? This will overwrite your current structure.`,
                { modal: true },
                'Import', 'Cancel'
            );
            
            if (overwrite !== 'Import') {
                return;
            }
        }
        
        // Clear existing and import selected structure
        cleanHeader(provider);
        cleanFields(fieldsProvider);
        
        Object.assign(header, selected.structure.header);
        fields.push(...selected.structure.fields);
        
        // Refresh UI
        provider.refresh();
        fieldsProvider.refresh();
        updateHeaderContext();
        updateFieldsContext();
        
        vscode.window.showInformationMessage(`Structure "${selected.structure.header.name}" imported successfully`);
        
    } catch (error) {
        console.error('Error importing from structure list:', error);
        vscode.window.showErrorMessage(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}


