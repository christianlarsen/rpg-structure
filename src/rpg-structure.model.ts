/*
	Christian Larsen, 2025
	"RPG structure"
	rpg-structure.model.ts
*/

/**
 * Core model definitions for RPG Structure extension.
 * Contains type definitions, interfaces, constants, and global state management
 * for RPG data structure generation and manipulation.
 */

// TYPE DEFINITIONS

/**
 * Supported RPG structure types for data structure declarations.
 */
export type StructureType = 'Default' | 'template' | '*var' | '*auto';

/**
 * Supported format styles for RPG code generation.
 * Controls the case style of generated RPG keywords.
 */
export type StructureFormat = 'dcl-ds' | 'Dcl-ds' | 'DCL-DS';

/**
 * Map of RPG data types to their string representations.
 * Used for type mapping in different format styles.
 */
export type RpgTypeMap = Record<string, string>;

// CORE INTERFACES

/**
 * Represents the header/declaration section of an RPG data structure.
 * Contains the basic metadata needed to generate the structure declaration.
 */
export interface Header {
    /** The name of the data structure */
    name: string;
    /** The type of structure (Default, template, *var, *auto) */
    type: string;
    /** Optional dimension specification for array structures */
    dimension?: string;
};

/**
 * Represents a field within an RPG data structure.
 * Can be either a simple field or a nested substructure containing other fields.
 */
export interface Field {
    /** Unique identifier number for the field */
    idNumber: number;
    /** The name of the field */
    name: string;
    /** The RPG data type (char, varchar, int, etc.) */
    type: string;
    /** Optional length specification for the field */
    length?: string;
    /** Optional initialization value */
    init?: string;
    /** Optional dimension for array fields */
    dim?: number;
    /** Whether this field is a substructure containing nested fields */
    isStructure: boolean;
    /** Array of nested fields (only used when isStructure is true) */
    fields: Field[];
};

/**
 * Defines the format configuration for generating RPG code.
 * Contains all the keywords and type mappings for a specific format style.
 */
export interface RpgFormat {
    /** Declaration start keyword (dcl-ds, Dcl-ds, DCL-DS) */
    dclds: string;
    /** Declaration end keyword (end-ds, End-ds, END-DS) */
    endds: string;
    /** Template keyword */
    template: string;
    /** Qualified keyword */
    qualified: string;
    /** Variable length keyword (*var, *Var, *VAR) */
    varx: string;
    /** Auto length keyword (*auto, *Auto, *AUTO) */
    autox: string;
    /** Dimension keyword (dim, Dim, DIM) */
    dimx: string;
    /** Initialize keyword (inz, Inz, INZ) */
    inz: string;
    /** Mapping of data types to their format-specific representations */
    typeMap: RpgTypeMap;
};

// COMMAND CONSTANTS

/**
 * VS Code command identifiers used throughout the extension.
 * Centralized to ensure consistency and prevent typos.
 */
export const COMMANDS = {
    /** Command fired when a structure item is clicked */
    ITEM_CLICK: 'rpgStructure.itemClick',
    /** Command to add a new field to the structure */
    ADD_FIELD: 'rpgStructure.addField',
    /** Command to add a new substructure */
    ADD_SUBSTRUCTURE: 'rpgStructure.addSubstructure',
    /** Command to clear/reset the header information */
    CLEAN_HEADER: 'rpgStructure.cleanHeader',
    /** Command to clear all fields from the structure */
    CLEAN_FIELDS: 'rpgStructure.cleanFields',
    /** Command to generate the final RPG code */
    GENERATE: 'rpgStructure.generate',
    /** Command to add a field to an existing substructure */
    ADD_FIELD_TO_SUBSTRUCTURE: 'rpgStructure.addFieldToSubstructure',
    /** Command to delete a field from the structure */
    DELETE_FIELD: 'rpgStructure.deleteField',
    /** Command fired when a configuration item is clicked */
    CONFIG_ITEM_CLICK: 'rpgStructure.configuration.itemClick',
    /** Command import structure from cursor */
    IMPORT_FROM_CURSOR: 'rpgStructure.importFromCursor',
    /** Command import structure from list */
    IMPORT_FROM_LIST: 'rpgStructure.importFromList'
} as const;

/**
 * Context values used for VS Code's when clauses in package.json.
 * These control when certain commands and UI elements are available.
 */
export const CONTEXTS = {
    /** Context indicating that header information exists */
    HAS_HEADER: 'rpgStructure.hasHeader',
    /** Context indicating that field data exists */
    HAS_FIELDS: 'rpgStructure.hasFields'
} as const;

/**
 * Identifiers for tree data providers registered with VS Code.
 * Used to reference specific tree views in the extension.
 */
export const TREE_DATA_PROVIDERS = {
    /** Header tree view provider identifier */
    HEADER: 'rpg-structure-header',
    /** Fields tree view provider identifier */
    FIELDS: 'rpg-structure-fields',
    /** Configuration tree view provider identifier */
    CONFIGURATION: 'rpg-structure-configuration'
} as const;

// RPG FORMAT DEFINITIONS

/**
 * Comprehensive mapping of RPG format styles to their respective keywords and type mappings.
 * Supports three case styles: lowercase, title case, and uppercase.
 */
export const FORMAT_MAP: Readonly<Record<StructureFormat, RpgFormat>> = {
	// "lowercase"
    'dcl-ds': {
        dclds: 'dcl-ds',
        endds: 'end-ds',
        template: 'template',
        qualified: 'qualified',
        varx: '*var',
        autox: '*auto',
        dimx: 'dim',
        inz: 'inz',
        typeMap: {
            char: 'char',
            varchar: 'varchar',
            int: 'int',
            packed: 'packed',
            zoned: 'zoned',
            uns: 'uns',
            date: 'date',
            time: 'time',
            timestamp: 'timestamp',
            bin: 'bin',
            ind: 'ind',
            pointer: 'pointer'
        }
    },
	// "titlecase"
    'Dcl-ds': {
        dclds: 'Dcl-ds',
        endds: 'End-ds',
        template: 'Template',
        qualified: 'Qualified',
        varx: '*Var',
        autox: '*Auto',
        dimx: 'Dim',
        inz: 'Inz',
        typeMap: {
            char: 'Char',
            varchar: 'Varchar',
            int: 'Int',
            packed: 'Packed',
            zoned: 'Zoned',
            uns: 'Uns',
            date: 'Date',
            time: 'Time',
            timestamp: 'Timestamp',
            bin: 'Bin',
            ind: 'Ind',
            pointer: 'Pointer'
        }
    },
	// "uppercase"
    'DCL-DS': {
        dclds: 'DCL-DS',
        endds: 'END-DS',
        template: 'TEMPLATE',
        qualified: 'QUALIFIED',
        varx: '*VAR',
        autox: '*AUTO',
        dimx: 'DIM',
        inz: 'INZ',
        typeMap: {
            char: 'CHAR',
            varchar: 'VARCHAR',
            int: 'INT',
            packed: 'PACKED',
            zoned: 'ZONED',
            uns: 'UNS',
            date: 'DATE',
            time: 'TIME',
            timestamp: 'TIMESTAMP',
            bin: 'BIN',
            ind: 'IND',
            pointer: 'POINTER'
        }
    }
} as const;

// GLOBAL STATE

/**
 * Global array containing all fields defined in the current structure.
 * This represents the main data structure being built by the user.
 */
export let fields: Field[] = [];

/**
 * Global header object containing the structure's metadata.
 * Initialized with empty values that must be filled by the user.
 */
export let header: Header = {
    name: '',
    type: '',
    dimension: '0'
};

// UTILITY FUNCTIONS

/**
 * Resets the global fields array to an empty state.
 * Useful for clearing the structure and starting over.
 */
export function clearFields(): void {
    fields.length = 0;
};

/**
 * Resets the global header to its initial empty state.
 * Useful for clearing the header and starting over.
 */
export function clearHeader(): void {
    header.name = '';
    header.type = '';
    header.dimension = '0';
};

/**
 * Creates a new field with default values.
 * Provides a factory function for creating field objects with proper structure.
 * 
 * @param idNumber Unique identifier for the field
 * @param name Name of the field
 * @param type RPG data type
 * @param isStructure Whether this field is a substructure
 * @returns A new Field object with default values
 */
export function createField(
    idNumber: number,
    name: string,
    type: string,
    isStructure: boolean = false
): Field {
    return {
        idNumber,
        name,
        type,
        length: undefined,
        init: undefined,
        dim: undefined,
        isStructure,
        fields: []
    };
};

/**
 * Validates that a structure format is supported.
 * 
 * @param format The format string to validate
 * @returns True if the format is valid and supported
 */
export function isValidStructureFormat(format: string): format is StructureFormat {
    return Object.prototype.hasOwnProperty.call(FORMAT_MAP, format);
};

/**
 * Gets the format configuration for a given structure format.
 * 
 * @param format The structure format to get configuration for
 * @returns The RpgFormat configuration object
 * @throws Error if the format is not supported
 */
export function getFormatConfig(format: StructureFormat): RpgFormat {
    const config = FORMAT_MAP[format];
    if (!config) {
        throw new Error(`Unsupported structure format: ${format}`);
    };
    return config;
};

/**
 * Checks if the current header contains all required information.
 * 
 * @returns True if header has both name and type filled
 */
export function hasValidHeader(): boolean {
    return Boolean(header.name && header.type);
};

/**
 * Checks if there are any fields defined in the structure.
 * 
 * @returns True if at least one field exists
 */
export function hasFields(): boolean {
    return fields.length > 0;
};
