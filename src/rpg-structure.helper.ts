/*
	Christian Larsen, 2025
	"RPG structure"
	rpg-structure.helper.ts
*/

import vscode from 'vscode';
import { header, fields, CONTEXTS } from './rpg-structure.model';

/**
 * Validates if a string represents a positive integer
 * @param value - String to validate
 * @returns true if the string is a positive integer, false otherwise
 */
export function isPositiveInteger(value: string): boolean {
    return /^\d+$/.test(value) && parseInt(value, 10) > 0;
};

/**
 * Validates the header structure completeness
 * @returns true if header has all required fields, false otherwise
 */
export function isHeaderValid(): boolean {
    const hasBasicFields = header.name !== '' && header.type !== '';
    
    if (header.type === 'template') {
        return hasBasicFields && (!header.dimension || header.dimension === '0');
    };
    
    return hasBasicFields && 
           typeof header.dimension === 'string' && 
           header.dimension.length > 0;
};

/**
 * Updates the context for header validation
 */
export function updateHeaderContext(): void {
    vscode.commands.executeCommand('setContext', CONTEXTS.HAS_HEADER, isHeaderValid());
};

/**
 * Updates the context for fields validation
 */
export function updateFieldsContext(): void {
    vscode.commands.executeCommand('setContext', CONTEXTS.HAS_FIELDS, fields.length > 0);
};



