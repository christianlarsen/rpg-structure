/*
	Christian Larsen, 2025
	"RPG structure"
	rpg-structure.utils.ts
*/

import * as vscode from 'vscode';
import { generateRpgCode } from './rpg-structure.code';
import { fields, Field } from './rpg-structure.model';
import { FieldItem, FieldsTreeDataProvider } from './rpg-structure.providers';

// Types
type FieldType = 
	'char' | 
	'varchar' | 
	'int' | 
	'packed' | 
	'zoned' | 
	'uns' | 
    'date' | 
	'time' | 
	'timestamp' | 
	'bin' | 
	'ind' | 
	'pointer';

type StructureType = 
	'Default' | 
	'template' | 
	'*var' | 
	'*auto';

// Constants
const FIELD_TYPES: FieldType[] = [
    'char', 'varchar', 'int', 'packed', 'zoned', 'uns',
    'date', 'time', 'timestamp', 'bin', 'ind', 'pointer'
];

const CONTEXT_COMMANDS = {
    SHOW_CONTAINER: 'rpgstructure.showContainer',
    HAS_FIELDS: 'rpgStructure.hasFields'
} as const;

const SUPPORTED_LANGUAGES = ['rpgle', 'sqlrpgle'] as const;

// Regular expressions for validation
const FIELD_NAME_REGEX = /^[a-zA-ZÑñ_][a-zA-ZÑñ0-9_@#]*$/;
const INTEGER_REGEX = /^\d+$/;
const DECIMAL_REGEX = /^\d+:\d+$/;
const NUMERIC_VALUE_REGEX = /^\d+(\.\d+)?$/;
const QUOTED_STRING_REGEX = /^'.*'$/;

/**
 * Interface for field creation parameters
 */
interface FieldCreationParams {
    name: string;
    type: FieldType;
    length?: string;
    init?: string;
    dim?: number;
    isSubstructure?: boolean;
    position?: number;
};

/**
 * Validation result interface
 */
interface ValidationResult {
    isValid: boolean;
    errorMessage?: string;
};

/**
 * Handles the insertion of generated RPG code into the active editor
 * @param editor - The VS Code text editor
 * @param position - Position where to insert the code
 * @param structureName - Name of the structure
 * @param structureType - Type of the structure
 * @param dimension - Dimension of the structure (optional)
 * @param fields - Array of field objects
 */
export function handleInsert(
    editor: vscode.TextEditor,
    position: vscode.Position,
    structureName: string,
    structureType: string,
    dimension: string | undefined,
    fields: Field[]
): void {
    try {
        // Calculate base indentation from current line
        const insertPosition = editor.selection.active;
        const lineText = editor.document.lineAt(insertPosition.line).text;
        const indentMatch = lineText.match(/^(\s*)/);
        const baseIndent = indentMatch ? indentMatch[1] : '';

        // Generate RPG code using the new interface
        const code = generateRpgCode({
            name: structureName,
            type: structureType as StructureType,
            dimension,
            fields,
            line: 0,
            level: 0,
            baseIndent
        });

        // Get document info
        const uri = editor.document.uri;
        const viewColumn = editor.viewColumn ?? vscode.ViewColumn.One;

        // Insert the code
        vscode.window.showTextDocument(uri, { viewColumn, preserveFocus: false }).then(
            (docEditor) => {
                docEditor.edit((editBuilder) => {
                    const lineRange = editor.document.lineAt(position.line).range;
                    editBuilder.replace(lineRange, code);
                }).then(
                    (success) => {
                        if (!success) {
                            vscode.window.showErrorMessage('Failed to insert the RPG structure code.');
                        } else {
                            vscode.window.showInformationMessage('RPG structure inserted successfully!');
                        };
                    },
                    (error) => {
                        console.error('Error during code insertion:', error);
                        vscode.window.showErrorMessage(`Error during insertion: ${error}`);
                    }
                );
            },
            (error) => {
                console.error('Failed to show text document:', error);
                vscode.window.showErrorMessage('Failed to open document for code insertion.');
            }
        );
    } catch (error) {
        console.error('Error in handleInsert:', error);
        vscode.window.showErrorMessage(`Failed to generate or insert code: ${error instanceof Error ? error.message : String(error)}`);
    };
};

/**
 * Returns placeholder text for different field types to help users with initialization values
 * @param type - The field type
 * @returns Placeholder string for the given type
 */
export function getInitPlaceholder(type: FieldType): string {
    const placeholders: Record<FieldType, string> = {
        'char': "'ABC'",
        'varchar': "'ABC'",
        'ind': "1, 0, *on, *off",
        'zoned': "123 or 45.67",
        'packed': "123 or 45.67",
        'int': "123",
        'uns': "123",
        'bin': "123",
        'date': "",
        'time': "",
        'timestamp': "",
        'pointer': ""
    };

    return placeholders[type] || "";
};

/**
 * Updates the VS Code context to show/hide extension UI based on current language
 * @param editor - The currently active text editor (optional)
 */
export function updateContext(editor: vscode.TextEditor | undefined): void {
    const isRpgle = editor?.document.languageId ? 
        SUPPORTED_LANGUAGES.includes(editor.document.languageId as typeof SUPPORTED_LANGUAGES[number]) : 
        false;
    
    vscode.commands.executeCommand('setContext', CONTEXT_COMMANDS.SHOW_CONTAINER, isRpgle);
};

/**
 * Validates field name according to RPG naming conventions
 * @param name - Field name to validate
 * @returns Validation result
 */
function validateFieldName(name: string): ValidationResult {
    if (!name || name.trim() === '') {
        return { isValid: false, errorMessage: 'Field name is required.' };
    };

    if (!FIELD_NAME_REGEX.test(name)) {
        return { 
            isValid: false, 
            errorMessage: 'Invalid name. Must start with letter/underscore and contain only alphanumeric characters, underscores, @, or #.' 
        };
    };

    return { isValid: true };
};

/**
 * Validates field length based on field type
 * @param type - Field type
 * @param length - Length string to validate
 * @returns Validation result
 */
function validateFieldLength(type: FieldType, length: string): ValidationResult {
    if (!length || length.trim() === '') {
        return { isValid: false, errorMessage: 'Length is required for this field type.' };
    };

    const trimmedLength = length.trim();

    // Simple integer validation
    if (INTEGER_REGEX.test(trimmedLength)) {
        return { isValid: true };
    };

    // Format N:N validation for zoned/packed only
    if ((type === 'packed' || type === 'zoned') && DECIMAL_REGEX.test(trimmedLength)) {
        const [whole, decimal] = trimmedLength.split(':').map(Number);
        if (decimal >= whole) {
            return { 
                isValid: false, 
                errorMessage: 'Decimal part must be smaller than total length.' 
            };
        };
        return { isValid: true };
    };

    return { isValid: false, errorMessage: 'Invalid format. Use integer or N:N format for packed/zoned.' };
};

/**
 * Validates dimension input
 * @param input - Dimension input string
 * @returns Validation result
 */
function validateDimension(input: string): ValidationResult {
    const trimmed = input.trim();

    if (trimmed === '') {
        return { isValid: true }; // Empty is allowed
    };

    if (!INTEGER_REGEX.test(trimmed)) {
        return { isValid: false, errorMessage: 'Please enter a positive integer.' };
    };

    const value = parseInt(trimmed, 10);
    if (value <= 0) {
        return { isValid: false, errorMessage: 'Dimension must be greater than 0.' };
    };

    return { isValid: true };
};

/**
 * Validates initialization value based on field type
 * @param type - Field type
 * @param init - Initialization value
 * @param length - Field length (for validation)
 * @returns Validation result
 */
function validateInitValue(type: FieldType, init: string, length?: string): ValidationResult {
    if (!init || init.trim() === '') {
        return { isValid: true }; // Empty is allowed
    };

    const trimmedInit = init.trim();

    switch (type) {
        case 'char':
        case 'varchar':
            if (!QUOTED_STRING_REGEX.test(trimmedInit)) {
                return { isValid: false, errorMessage: 'String must be enclosed in single quotes.' };
            };
            
            if (length) {
                const content = trimmedInit.slice(1, -1); // Remove quotes
                const maxLength = parseInt(length.split(':')[0], 10);
                if (content.length > maxLength) {
                    return { isValid: false, errorMessage: `String too long (max ${maxLength} chars).` };
                };
            };
            return { isValid: true };

        case 'ind':
            const validIndValues = ['1', '0', '*on', '*off'];
            if (!validIndValues.includes(trimmedInit.toLowerCase())) {
                return { isValid: false, errorMessage: "Must be '1', '0', '*on', or '*off'." };
            };
            return { isValid: true };

        case 'zoned':
        case 'packed':
            if (!NUMERIC_VALUE_REGEX.test(trimmedInit)) {
                return { isValid: false, errorMessage: 'Must be a numeric value (e.g., 42 or 13.5).' };
            };
            return { isValid: true };

        case 'uns':
        case 'int':
        case 'bin':
            if (!INTEGER_REGEX.test(trimmedInit)) {
                return { isValid: false, errorMessage: 'Must be a whole number (e.g., 10).' };
            };
            return { isValid: true };

        default:
            return { isValid: true };
    };
};

/**
 * Checks if a field name already exists in the fields array
 * @param name - Field name to check
 * @param fieldList - List of fields to search in (defaults to global fields)
 * @returns True if name exists, false otherwise
 */
function fieldNameExists(name: string, fieldList: Field[] = fields): boolean {
    return fieldList.some(field => field.name.toLowerCase() === name.toLowerCase());
};

/**
 * Updates the fields context in VS Code
 */
function updateFieldsContext(): void {
    vscode.commands.executeCommand('setContext', CONTEXT_COMMANDS.HAS_FIELDS, fields.length > 0);
};

/**
 * Prompts user for field information and creates a new field
 * @param isSubstructure - Whether this field is being added to a substructure
 * @param position - Position where to insert the field
 * @param provider - Fields tree data provider
 */
export async function insertField(
    isSubstructure: boolean,
    position: number,
    provider: FieldsTreeDataProvider
): Promise<void> {
    try {
        // Get field name
        const name = await vscode.window.showInputBox({
            prompt: 'Field name',
            validateInput: (value: string) => {
                const validation = validateFieldName(value);
                return validation.isValid ? undefined : validation.errorMessage;
            }
        });

        if (!name) return; // User cancelled

        // Check for duplicate names
        // TODO: If a field exists in other substructure, is correct...
        // Now this is not working fine.  
//        if (fieldNameExists(name)) {
//            vscode.window.showErrorMessage(`A field named "${name}" already exists.`);
//            return;
//        };

        // Get field type
        const typeSelected = await vscode.window.showQuickPick(FIELD_TYPES, {
            placeHolder: 'Choose field type'
        });
        if (!typeSelected) return; // User cancelled

		const type = typeSelected as FieldType;

        // Get field length (if required)
        let length: string | undefined;
        const lengthRequiredTypes: FieldType[] = ['char', 'varchar', 'int', 'packed', 'zoned', 'uns', 'bin'];
        
        if (lengthRequiredTypes.includes(type)) {
            const lengthInput = await vscode.window.showInputBox({
                prompt: 'Field length',
                placeHolder: type === 'packed' || type === 'zoned' ? 'e.g. 5 or 13:2' : 'e.g. 10',
                validateInput: (input) => {
                    const validation = validateFieldLength(type, input);
                    return validation.isValid ? undefined : validation.errorMessage;
                }
            });

            if (lengthInput !== undefined) {
                length = lengthInput.trim();
            };
        };

        // Get dimension (optional)
        let dim: number | undefined;
        const dimInput = await vscode.window.showInputBox({
            prompt: 'Dimension length (optional)',
            placeHolder: 'e.g. 100',
            validateInput: (input) => {
                const validation = validateDimension(input);
                return validation.isValid ? undefined : validation.errorMessage;
            }
        });

        if (dimInput && dimInput.trim() !== '') {
            const parsed = parseInt(dimInput.trim(), 10);
            if (!isNaN(parsed) && parsed > 0) {
                dim = parsed;
            };
        };

        // Get initialization value (optional)
        const init = await vscode.window.showInputBox({
            prompt: 'Init value (optional)',
            placeHolder: getInitPlaceholder(type),
            validateInput: (input) => {
                const validation = validateInitValue(type, input, length);
                return validation.isValid ? undefined : validation.errorMessage;
            }
        });

        // Create and add the field
        const newId = getNextIdNumber(fields);
        const newField = new FieldItem(newId, name, type, length, init?.trim(), dim, false, []);

        if (!isSubstructure) {
            provider.addFieldBefore(newField, position);
        } else {
            provider.addFieldStructure(fields, newField, position);
        };

        updateFieldsContext();

    } catch (error) {
        console.error('Error inserting field:', error);
        vscode.window.showErrorMessage(`Failed to create field: ${error instanceof Error ? error.message : String(error)}`);
    };
};

/**
 * Creates a new substructure and adds it to the fields
 * @param provider - Fields tree data provider
 */
export async function insertSubstructure(provider: FieldsTreeDataProvider): Promise<void> {
    try {
        // Get substructure name
        const name = await vscode.window.showInputBox({
            prompt: 'Substructure name',
            validateInput: (value: string) => {
                const validation = validateFieldName(value);
                if (!validation.isValid) {
                    return validation.errorMessage;
                };
                
                if (fieldNameExists(value)) {
                    return `A field named "${value}" already exists.`;
                };
                
                return undefined;
            }
        });

        if (!name) return; // User cancelled

        // Get structure length (optional)
        let length: string | undefined;
        const lengthInput = await vscode.window.showInputBox({
            prompt: 'Structure length (optional)',
            placeHolder: 'e.g. 100',
            validateInput: (input) => {
                if (!input || input.trim() === '') {
                    return undefined; // Empty is allowed
                };
                
                if (INTEGER_REGEX.test(input.trim())) {
                    return undefined;
                };
                
                return 'Invalid format: must be a number or empty.';
            }
        });

        if (lengthInput && lengthInput.trim() !== '') {
            length = lengthInput.trim();
        };

        // Create and add the substructure
        const newId = getNextIdNumber(fields);
        const newField = new FieldItem(newId, name, '', length, undefined, undefined, true, []);
        provider.addField(newField);

        updateFieldsContext();

    } catch (error) {
        console.error('Error inserting substructure:', error);
        vscode.window.showErrorMessage(`Failed to create substructure: ${error instanceof Error ? error.message : String(error)}`);
    };
};

/**
 * Inserts a new field into a specific substructure
 * @param idNumber - ID number of the parent substructure
 * @param provider - Fields tree data provider
 */
export function insertFieldSubstructure(idNumber: number, provider: FieldsTreeDataProvider): void {
    insertField(true, idNumber, provider);
};

/**
 * Deletes a field from the fields array
 * @param item - Field item to delete
 * @param provider - Fields tree data provider
 */
export function deleteField(item: Field, provider: FieldsTreeDataProvider): void {
    if (item.isStructure && item.fields.length > 0) {
        // Confirm deletion of structure with subfields
        vscode.window.showWarningMessage(
            `The structure "${item.name}" has ${item.fields.length} subfields. Are you sure you want to delete it?`,
            { modal: true },
            'Delete'
        ).then(selection => {
            if (selection === 'Delete') {
                performDeletion();
            };
        });
    } else {
        performDeletion();
    };

    /**
     * Performs the actual deletion operation
     */
    function performDeletion(): void {
        try {
            const deleteById = (fieldList: Field[]): boolean => {
                for (let i = 0; i < fieldList.length; i++) {
                    if (fieldList[i].idNumber === item.idNumber) {
                        fieldList.splice(i, 1);
                        return true;
                    };
                    if (fieldList[i].isStructure && fieldList[i].fields.length > 0) {
                        const deleted = deleteById(fieldList[i].fields);
                        if (deleted) return true;
                    };
                }
                return false;
            };

            const wasDeleted = deleteById(fields);
            if (wasDeleted) {
                reassignIdNumbers(fields);
                provider.refresh();
                updateFieldsContext();
                vscode.window.showInformationMessage(`Field "${item.name}" deleted successfully.`);
            } else {
                vscode.window.showWarningMessage(`Field "${item.name}" not found for deletion.`);
            };
        } catch (error) {
            console.error('Error deleting field:', error);
            vscode.window.showErrorMessage(`Failed to delete field: ${error instanceof Error ? error.message : String(error)}`);
        };
    };
};

/**
 * Reassigns ID numbers to all fields in sequential order
 * @param fieldList - List of fields to reassign IDs for
 */
export function reassignIdNumbers(fieldList: Field[]): void {
    let idCounter = 0;

    /**
     * Recursively assigns ID numbers to fields and their subfields
     * @param fields - Array of fields to process
     */
    const assignIds = (fields: Field[]): void => {
        for (const field of fields) {
            field.idNumber = idCounter++;
            if (field.isStructure && field.fields.length > 0) {
                assignIds(field.fields);
            };
        };
    };

    assignIds(fieldList);
};

/**
 * Calculates the next available ID number for a new field
 * @param fieldList - List of fields to analyze (defaults to global fields)
 * @returns Next available ID number
 */
export function getNextIdNumber(fieldList: Field[] = fields): number {
    let maxId = -1;

    /**
     * Recursively traverses fields to find the maximum ID
     * @param fields - Array of fields to traverse
     */
    const traverse = (fields: Field[]): void => {
        for (const field of fields) {
            if (field.idNumber > maxId) {
                maxId = field.idNumber;
            };
            if (field.isStructure && field.fields.length > 0) {
                traverse(field.fields);
            };
        }
    };

    traverse(fieldList);
    return maxId + 1;
};

/**
 * Finds a field by its ID number in the fields hierarchy
 * @param fieldList - List of fields to search in (defaults to global fields)
 * @param id - ID number to search for
 * @returns Found field or null if not found
 */
export function findFieldById(fieldList: Field[] = fields, id: number): Field | null {
    for (const field of fieldList) {
        if (field.idNumber === id) {
            return field;
        };
        
        if (field.isStructure && field.fields.length > 0) {
            const found = findFieldById(field.fields, id);
            if (found) {
                return found;
            };
        };
    };
    
    return null;
};

