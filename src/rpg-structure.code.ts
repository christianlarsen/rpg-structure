/*
	Christian Larsen, 2025
	"RPG structure"
	rpg-structure.code.ts
*/

import { currentConfiguration } from './rpg-structure.configuration';
import { Field, FORMAT_MAP, StructureFormat } from './rpg-structure.model';

// Types
type StructureType = 'Default' | 'template' | '*var' | '*auto';

// Constants
const DEFAULT_TAB_SIZE = 3;
const DEFAULT_TAB_CHAR = ' ';

/**
 * Configuration for code generation indentation
 */
interface IndentationConfig {
    tab: string;
    headIndent: string;
    subIndent: string;
};

/**
 * Parameters for RPG code generation
 */
interface RpgCodeParams {
    name: string;
    type: StructureType;
    dimension?: string;
    fields: Field[];
    line: number;
    level: number;
    baseIndent: string;
};

/**
 * Validates input parameters for RPG code generation
 * @param params - The parameters to validate
 * @throws Error if validation fails
 */
function validateRpgCodeParams(params: RpgCodeParams): void {
    const { name, type, fields, line, level, baseIndent } = params;
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
        throw new Error('Structure name is required and must be a non-empty string');
    };
    
    if (!type || typeof type !== 'string') {
        throw new Error('Structure type is required and must be a string');
    };
    
    if (!Array.isArray(fields)) {
        throw new Error('Fields must be an array');
    };
    
    if (typeof line !== 'number' || line < 0) {
        throw new Error('Line number must be a non-negative number');
    };
    
    if (typeof level !== 'number' || level < 0) {
        throw new Error('Level must be a non-negative number');
    };
    
    if (typeof baseIndent !== 'string') {
        throw new Error('Base indent must be a string');
    };
};

/**
 * Calculates the appropriate indentation for different levels of nesting
 * @param line - Current line number
 * @param level - Current nesting level
 * @param baseIndent - Base indentation string
 * @returns Indentation configuration object
 */
function calculateIndentation(line: number, level: number, baseIndent: string): IndentationConfig {
    // Determine tab character based on configuration
    const tab = currentConfiguration.indentation 
        ? DEFAULT_TAB_CHAR.repeat(currentConfiguration.indentation)
        : DEFAULT_TAB_CHAR.repeat(DEFAULT_TAB_SIZE);
    
    let headIndent: string;
    let subIndent: string;
    
    // Calculate indentation based on line and level
    if (line === 0 || level === 0) {
        headIndent = baseIndent;
        subIndent = baseIndent + tab;
    } else {
        headIndent = baseIndent + tab.repeat(level);
        subIndent = baseIndent + tab.repeat(level + 1);
    };
    
    return { tab, headIndent, subIndent };
};

/**
 * Generates the header line for RPG structure declaration
 * @param name - Structure name
 * @param type - Structure type
 * @param dimension - Structure dimension (optional)
 * @param level - Current nesting level
 * @param line - Current line number
 * @param headIndent - Header indentation string
 * @returns Generated header string
 */
function generateStructureHeader(
    name: string, 
    type: StructureType, 
    dimension: string | undefined, 
    level: number, 
    line: number, 
    headIndent: string
): string {

    const format = FORMAT_MAP[currentConfiguration.structureFormat as StructureFormat];
    
    if (!format) {
        throw new Error(`Unknown structure format: ${currentConfiguration.structureFormat}`);
    };
    
    // Start building the header
    let header = `${headIndent}${format.dclds} ${name.trim()}`;
    
    // Add qualified keyword for top-level structures
    if (level === 0) {
        header += ` ${format.qualified}`;
    };
    
    // Add dimension information if provided
    header += generateDimensionClause(type, dimension, format);
    
    // Add template keyword for template structures at top level
    if (type === 'template' && line === 0 && level === 0) {
        header += ` ${format.template}`;
    };
    
    return header + ';';
};

/**
 * Generates the dimension clause for structure headers
 * @param type - Structure type
 * @param dimension - Dimension value
 * @param format - Format configuration object
 * @returns Dimension clause string (may be empty)
 */
function generateDimensionClause(type: StructureType, dimension: string | undefined, format: any): string {
    if (!dimension || !dimension.toString().trim() || !type.trim()) {
        return '';
    };
    
    const dimensionValue = dimension.toString().trim();
    
    switch (type) {
        case 'Default':
            return ` ${format.dimx}(${dimensionValue})`;
        case '*var':
            return ` ${format.dimx}(${format.varx}:${dimensionValue})`;
        case '*auto':
            return ` ${format.dimx}(${format.autox}:${dimensionValue})`;
        case 'template':
            // Template structures typically don't have dimensions
            return '';
        default:
            console.warn(`Unknown structure type for dimension: ${type}`);
            return '';
    };
};

/**
 * Generates a single field line in the RPG structure
 * @param field - Field object to generate code for
 * @param subIndent - Indentation for field lines
 * @returns Generated field line string
 */
function generateFieldLine(field: Field, subIndent: string): string {
    const format = FORMAT_MAP[currentConfiguration.structureFormat as StructureFormat];
    
    if (!format) {
        throw new Error(`Unknown structure format: ${currentConfiguration.structureFormat}`);
    };
    
    // Get the appropriate type from the type map or use the original type
    const typeUsed = format.typeMap?.[field.type] ?? field.type;
    
    // Start building the field line
    let line = `${subIndent}${field.name.trim()} ${typeUsed}`;
    
    // Add length specification if provided
    if (field.length?.toString().trim()) {
        line += `(${field.length.toString().trim()})`;
    };
    
    // Add initialization value if provided
    if (field.init?.trim()) {
        line += ` ${format.inz}(${field.init.trim()})`;
    };
    
    // Add dimension specification if provided
    if (field.dim?.toString().trim()) {
        line += ` ${format.dimx}(${field.dim.toString().trim()})`;
    };
    
    return line + ';';
};

/**
 * Generates the body of the RPG structure (all fields)
 * @param fields - Array of field objects
 * @param baseIndent - Base indentation string
 * @param line - Current line number
 * @param level - Current nesting level
 * @param subIndent - Sub-level indentation string
 * @returns Array of generated field lines
 */
function generateStructureBody(
    fields: Field[], 
    baseIndent: string, 
    line: number, 
    level: number, 
    subIndent: string
): string[] {
    return fields.map((field, index) => {
        try {
            if (field.isStructure) {
                // Recursively generate nested structures
                return generateRpgCode({
                    name: field.name,
                    type: 'Default',
                    dimension: field.length,
                    fields: field.fields || [],
                    line: line + index + 1,
                    level: level + 1,
                    baseIndent
                });
            } else {
                // Generate regular field line
                return generateFieldLine(field, subIndent);
            };
        } catch (error) {
            console.error(`Error generating field at index ${index}:`, error);
            // Return a comment indicating the error instead of crashing
            return `${subIndent}// Error generating field: ${field.name}`;
        };
    });
};

/**
 * Generates the footer line for RPG structure declaration
 * @param headIndent - Header indentation string
 * @returns Generated footer string
 */
function generateStructureFooter(headIndent: string): string {
    const format = FORMAT_MAP[currentConfiguration.structureFormat as StructureFormat];
    
    if (!format) {
        throw new Error(`Unknown structure format: ${currentConfiguration.structureFormat}`);
    };
    
    return `${headIndent}${format.endds};`;
};

/**
 * Main function that generates the complete RPG code for a data structure
 * @param params - Parameters for code generation
 * @returns Generated RPG structure code as a string
 * @throws Error if generation fails
 * 
 * @example
 * ```typescript
 * const code = generateRpgCode({
 *     name: 'myStruct',
 *     type: 'Default',
 *     dimension: '100',
 *     fields: [
 *         { name: 'field1', type: 'char', length: '10' }
 *     ],
 *     line: 0,
 *     level: 0,
 *     baseIndent: ''
 * });
 * ```
 */
export function generateRpgCode(params: RpgCodeParams): string {
    const { name, type, dimension, fields, line, level, baseIndent } = params;
    
    try {
        // Validate input parameters
        validateRpgCodeParams(params);
        
        // Calculate indentation
        const { headIndent, subIndent } = calculateIndentation(line, level, baseIndent);
        
        // Generate structure components
        const header = generateStructureHeader(name, type, dimension, level, line, headIndent);
        const body = generateStructureBody(fields, baseIndent, line, level, subIndent);
        const footer = generateStructureFooter(headIndent);
        
        // Combine all parts
        return [header, ...body, footer].join('\n');
        
    } catch (error) {
        console.error('Error generating RPG code:', error);
        throw new Error(`Failed to generate RPG code for structure '${name}': ${error instanceof Error ? error.message : String(error)}`);
    };
};

/**
 * Convenience function for generating RPG code with individual parameters
 * @deprecated Use generateRpgCode with params object instead
 * @param name - Structure name
 * @param type - Structure type
 * @param dimension - Structure dimension
 * @param fields - Array of fields
 * @param line - Line number
 * @param level - Nesting level
 * @param baseIndent - Base indentation
 * @returns Generated RPG code string
 */
export function generateRpgCodeLegacy(
    name: string,
    type: string,
    dimension: string | undefined,
    fields: Field[],
    line: number,
    level: number,
    baseIndent: string
): string {
    console.warn('generateRpgCodeLegacy is deprecated. Use generateRpgCode with params object instead.');
    
    return generateRpgCode({
        name,
        type: type as StructureType,
        dimension,
        fields,
        line,
        level,
        baseIndent
    });
};
