/*
	Christian Larsen, 2025
	"RPG structure"
	rpg-structure.utils.ts
*/

import * as vscode from 'vscode';
import { generateRpgCode } from './rpg-structure.code';
import { fields, header, Field } from './rpg-structure.model';
import { FieldItem, FieldsTreeDataProvider } from './rpg-structure.providers';
import { RpgStructureParser } from './rpg-structure.parser';

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

// Groups of field types whose length/init values are compatible with one another,
// so editing between them can keep proposing the original length and init value.
const COMPATIBLE_TYPE_GROUPS: FieldType[][] = [
    ['char', 'varchar'],
    ['zoned', 'packed']
];

/**
 * Checks whether two field types are compatible enough to reuse the same length/init value
 * @param typeA - First field type
 * @param typeB - Second field type
 * @returns True if the types are identical or belong to the same compatibility group
 */
function areTypesCompatible(typeA: string, typeB: string): boolean {
    const a = typeA.trim().toLowerCase();
    const b = typeB.trim().toLowerCase();

    if (a === b) return true;

    return COMPATIBLE_TYPE_GROUPS.some(group => group.includes(a as FieldType) && group.includes(b as FieldType));
};

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
 * Validates position input for a field: either a positive integer (pos(N)) or the
 * name of another existing sibling field (samepos(name))
 * @param input - Position input string
 * @param siblings - Sibling fields the position can reference via samepos
 * @param selfName - Name of the field being edited (cannot reference itself)
 * @returns Validation result
 */
function validatePosition(input: string, siblings: Field[], selfName: string): ValidationResult {
    const trimmed = input.trim();

    if (trimmed === '') {
        return { isValid: true }; // Empty is allowed (removes position)
    };

    if (INTEGER_REGEX.test(trimmed)) {
        const value = parseInt(trimmed, 10);
        if (value <= 0) {
            return { isValid: false, errorMessage: 'Position must be greater than 0.' };
        };
        return { isValid: true };
    };

    const nameValidation = validateFieldName(trimmed);
    if (!nameValidation.isValid) {
        return { isValid: false, errorMessage: 'Enter a positive integer or the name of an existing field.' };
    };

    if (trimmed.toLowerCase() === selfName.toLowerCase()) {
        return { isValid: false, errorMessage: 'A field cannot reference itself for samepos.' };
    };

    const referenced = siblings.find(
        field => field.name.toLowerCase() === trimmed.toLowerCase() && !field.isStructure
    );
    if (!referenced) {
        return { isValid: false, errorMessage: `Field "${trimmed}" not found among sibling fields.` };
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

        if (!name) return; 

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
            }
        }

        // Get initialization value (optional) - NO DIMENSION PROMPT HERE
        const init = await vscode.window.showInputBox({
            prompt: 'Init value (optional)',
            placeHolder: getInitPlaceholder(type),
            validateInput: (input) => {
                const validation = validateInitValue(type, input, length);
                return validation.isValid ? undefined : validation.errorMessage;
            }
        });

        // Create and add the field WITHOUT dimension
        const newId = getNextIdNumber(fields);
        const newField = new FieldItem(newId, name, type, length, init?.trim(), undefined, undefined, false, []); // dim = undefined, pos = undefined

        if (!isSubstructure) {
            provider.addFieldBefore(newField, position);
        } else {
            provider.addFieldStructure(fields, newField, position);
        };

        updateFieldsContext();

        // Optional: Ask if user wants to add dimension immediately
        const addDimensionNow = await vscode.window.showInformationMessage(
            `Field "${name}" created successfully. Do you want to add a dimension now?`,
            'Yes', 'No'
        );

        if (addDimensionNow === 'Yes') {
            await addDimensionToField(newField.idNumber, provider);
        };

    } catch (error) {
        console.error('Error inserting field:', error);
        vscode.window.showErrorMessage(`Failed to create field: ${error instanceof Error ? error.message : String(error)}`);
    };
};

/**
 * Creates a new substructure and adds it either at the root level or nested inside
 * an existing substructure (to any depth).
 * @param provider - Fields tree data provider
 * @param parentId - ID of the parent substructure to nest inside; omit to add at the root level
 */
export async function insertSubstructure(provider: FieldsTreeDataProvider, parentId?: number): Promise<void> {
    let siblings: Field[] = fields;

    if (parentId !== undefined) {
        const parent = findFieldById(fields, parentId);
        if (!parent || !parent.isStructure) {
            vscode.window.showErrorMessage('Target substructure not found.');
            return;
        };
        siblings = parent.fields;
    };

    try {
        // Get substructure name
        const name = await vscode.window.showInputBox({
            prompt: 'Substructure name',
            validateInput: (value: string) => {
                const validation = validateFieldName(value);
                if (!validation.isValid) {
                    return validation.errorMessage;
                };

                if (fieldNameExists(value, siblings)) {
                    return `A field named "${value}" already exists at this level.`;
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
        const newField = new FieldItem(newId, name, '', length, undefined, undefined, undefined, true, []);

        if (parentId === undefined) {
            provider.addField(newField);
        } else {
            provider.addFieldStructure(fields, newField, parentId);
        };

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
 * Inserts a new substructure nested inside another substructure (to any depth)
 * @param idNumber - ID number of the parent substructure
 * @param provider - Fields tree data provider
 */
export function insertSubstructureInSubstructure(idNumber: number, provider: FieldsTreeDataProvider): void {
    insertSubstructure(provider, idNumber);
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

/**
 * Finds the sibling array (same nesting level) that contains the field with the given ID
 * @param fieldList - List of fields to search in (defaults to global fields)
 * @param id - ID number to search for
 * @returns The array containing the field, or null if not found
 */
function findSiblingFields(fieldList: Field[] = fields, id: number): Field[] | null {
    for (const field of fieldList) {
        if (field.idNumber === id) {
            return fieldList;
        };

        if (field.isStructure && field.fields.length > 0) {
            const found = findSiblingFields(field.fields, id);
            if (found) {
                return found;
            };
        };
    };

    return null;
};

export async function importStructureAtCursor(): Promise<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return false;
    }

    const document = editor.document;
    const position = editor.selection.active;
    const content = document.getText();
    
    const parsed = RpgStructureParser.parseStructureAtCursor(content, position.line);
    
    if (!parsed.success) {
        vscode.window.showErrorMessage(`Import failed: ${parsed.errors.join(', ')}`);
        return false;
    };
    
    if (!RpgStructureParser.validateParsedStructure(parsed)) {
        vscode.window.showErrorMessage('Invalid structure format found');
        return false;
    };
    
    // Clear existing data and import
    fields.length = 0;
    Object.assign(header, parsed.header);
    fields.push(...parsed.fields);
    
    vscode.window.showInformationMessage(`Structure "${parsed.header.name}" imported successfully`);
    return true;
};

export async function showStructureList(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    
    const structures = RpgStructureParser.extractAllStructures(editor.document.getText());
    
    if (structures.length === 0) {
        vscode.window.showInformationMessage('No RPG structures found in current file');
        return;
    };
    
    const items = structures.map(s => ({
        label: s.header.name,
        description: `${s.header.type} (${s.fields.length} fields)`,
        structure: s
    }));
    
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select structure to import'
    });
    
    if (selected) {
        // Import selected structure
        fields.length = 0;
        Object.assign(header, selected.structure.header);
        fields.push(...selected.structure.fields);
        vscode.window.showInformationMessage(`Structure "${selected.structure.header.name}" imported`);
    };
};

/**
 * Adds or modifies dimension for an existing field
 * @param fieldId - ID of the field to update
 * @param provider - Fields tree data provider 
*/
export async function addDimensionToField(fieldId: number, provider: FieldsTreeDataProvider): Promise<void> {
    const field = findFieldById(fields, fieldId);
    if (!field) {
        vscode.window.showErrorMessage('Field not found.');
        return;
    };

    if (field.pos) {
        vscode.window.showErrorMessage('Dimension cannot be added to a field that already has a position.');
        return;
    };

    try {
        const currentDimension = field.dim ? field.dim.toString() : '';
        const prompt = currentDimension ? 
            `Modify dimension (current: ${currentDimension})` : 
            'Add dimension to field';

        const dimInput = await vscode.window.showInputBox({
            prompt: prompt,
            placeHolder: currentDimension || 'e.g. 100',
            value: currentDimension,
            validateInput: (input) => {
                const validation = validateDimension(input);
                return validation.isValid ? undefined : validation.errorMessage;
            }
        });

        if (dimInput === undefined) return;

        if (dimInput.trim() === '') {
            field.dim = undefined;
            provider.refresh();
            vscode.window.showInformationMessage(`Dimension removed from field "${field.name}".`);
            return;
        };

        const newDimension = parseInt(dimInput.trim(), 10);
        if (!isNaN(newDimension) && newDimension > 0) {
            const oldDimension = field.dim;
            field.dim = newDimension;
            provider.refresh();
            
            const message = oldDimension ? 
                `Dimension for field "${field.name}" changed from ${oldDimension} to ${newDimension}.` :
                `Dimension ${newDimension} added to field "${field.name}".`;
            
            vscode.window.showInformationMessage(message);
        } else {
            vscode.window.showErrorMessage('Invalid dimension value. Please enter a positive integer.');
        };

    } catch (error) {
        console.error('Error adding dimension to field:', error);
        vscode.window.showErrorMessage(`Failed to modify dimension: ${error instanceof Error ? error.message : String(error)}`);
    };
};

/**
 * Adds or modifies the position (pos/samepos) for an existing field.
 * Not allowed on substructures or on fields that already have a dimension.
 * @param fieldId - ID of the field to update
 * @param provider - Fields tree data provider
*/
export async function addPositionToField(fieldId: number, provider: FieldsTreeDataProvider): Promise<void> {
    const field = findFieldById(fields, fieldId);
    if (!field) {
        vscode.window.showErrorMessage('Field not found.');
        return;
    };

    if (field.isStructure) {
        vscode.window.showErrorMessage('Position cannot be added to a substructure.');
        return;
    };

    if (field.dim) {
        vscode.window.showErrorMessage('Position cannot be added to a field that already has a dimension.');
        return;
    };

    const siblings = findSiblingFields(fields, fieldId) ?? fields;

    try {
        const currentPosition = field.pos ?? '';
        const prompt = currentPosition ?
            `Modify position (current: ${currentPosition})` :
            'Add position to field: a number for pos(N), or the name of another field for samepos(name)';

        const posInput = await vscode.window.showInputBox({
            prompt: prompt,
            placeHolder: currentPosition || 'e.g. 5 or fieldName',
            value: currentPosition,
            validateInput: (input) => {
                const validation = validatePosition(input, siblings, field.name);
                return validation.isValid ? undefined : validation.errorMessage;
            }
        });

        if (posInput === undefined) return;

        if (posInput.trim() === '') {
            field.pos = undefined;
            provider.refresh();
            vscode.window.showInformationMessage(`Position removed from field "${field.name}".`);
            return;
        };

        const newPosition = posInput.trim();
        const oldPosition = field.pos;
        field.pos = newPosition;
        provider.refresh();

        const message = oldPosition ?
            `Position for field "${field.name}" changed from ${oldPosition} to ${newPosition}.` :
            `Position ${newPosition} added to field "${field.name}".`;

        vscode.window.showInformationMessage(message);

    } catch (error) {
        console.error('Error adding position to field:', error);
        vscode.window.showErrorMessage(`Failed to modify position: ${error instanceof Error ? error.message : String(error)}`);
    };
};

/**
 * Edits an existing field's name and, for regular fields, its type, length, and init value.
 * Substructures can only have their name edited.
 * @param fieldId - ID of the field to edit
 * @param provider - Fields tree data provider
 */
export async function editField(fieldId: number, provider: FieldsTreeDataProvider): Promise<void> {
    const field = findFieldById(fields, fieldId);
    if (!field) {
        vscode.window.showErrorMessage('Field not found.');
        return;
    };

    try {
        const name = await vscode.window.showInputBox({
            prompt: 'Field name',
            value: field.name,
            validateInput: (value: string) => {
                const validation = validateFieldName(value);
                if (!validation.isValid) return validation.errorMessage;
                if (value.toLowerCase() !== field.name.toLowerCase() && fieldNameExists(value)) {
                    return `A field named "${value}" already exists.`;
                };
                return undefined;
            }
        });

        if (name === undefined) return; // User cancelled

        if (field.isStructure) {
            field.name = name.trim();
            provider.refresh();
            vscode.window.showInformationMessage(`Substructure renamed to "${name.trim()}".`);
            return;
        };

        const typeSelected = await vscode.window.showQuickPick(FIELD_TYPES, {
            placeHolder: 'Choose field type'
        });
        if (!typeSelected) return; // User cancelled

        const type = typeSelected as FieldType;
        const keepsType = areTypesCompatible(field.type, type);

        // Get field length (if required)
        let length: string | undefined;
        const lengthRequiredTypes: FieldType[] = ['char', 'varchar', 'int', 'packed', 'zoned', 'uns', 'bin'];

        if (lengthRequiredTypes.includes(type)) {
            const currentLength = keepsType ? field.length ?? '' : '';
            const lengthInput = await vscode.window.showInputBox({
                prompt: 'Field length',
                placeHolder: type === 'packed' || type === 'zoned' ? 'e.g. 5 or 13:2' : 'e.g. 10',
                value: currentLength,
                valueSelection: [0, currentLength.length],
                validateInput: (input) => {
                    const validation = validateFieldLength(type, input);
                    return validation.isValid ? undefined : validation.errorMessage;
                }
            });

            if (lengthInput === undefined) return; // User cancelled
            length = lengthInput.trim();
        };

        // Get initialization value (optional)
        const currentInit = keepsType ? field.init ?? '' : '';
        const init = await vscode.window.showInputBox({
            prompt: 'Init value (optional)',
            placeHolder: getInitPlaceholder(type),
            value: currentInit,
            valueSelection: [0, currentInit.length],
            validateInput: (input) => {
                const validation = validateInitValue(type, input, length);
                return validation.isValid ? undefined : validation.errorMessage;
            }
        });

        if (init === undefined) return; // User cancelled

        field.name = name.trim();
        field.type = type;
        field.length = length;
        field.init = init.trim() === '' ? undefined : init.trim();

        provider.refresh();
        vscode.window.showInformationMessage(`Field "${name.trim()}" updated.`);

    } catch (error) {
        console.error('Error editing field:', error);
        vscode.window.showErrorMessage(`Failed to edit field: ${error instanceof Error ? error.message : String(error)}`);
    };
};
