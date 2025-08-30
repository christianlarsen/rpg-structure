/*
	Christian Larsen, 2025
	"RPG structure"
	rpg-structure.parser.ts
*/

import { Field, Header, StructureFormat, FORMAT_MAP, isValidStructureFormat } from './rpg-structure.model';

/**
 * Interface for parsed RPG structure data
 */
export interface ParsedStructure {
    header: Header;
    fields: Field[];
    format: StructureFormat;
    success: boolean;
    errors: string[];
}

/**
 * Parser class for extracting RPG structures from source code
 */
export class RpgStructureParser {
    private static readonly STRUCTURE_START_PATTERNS = [
        /^\s*(dcl-ds|Dcl-ds|DCL-DS)\s+([a-zA-Z_][a-zA-Z0-9_@#]*)\s*(.*?);/i,
    ];

    private static readonly STRUCTURE_END_PATTERNS = [
        /^\s*(end-ds|End-ds|END-DS)\s*;/i,
    ];

    private static readonly FIELD_PATTERN = 
        /^\s*([a-zA-Z_][a-zA-Z0-9_@#]*)\s+([a-zA-Z]+)(?:\(([^)]+)\))?\s*(?:(inz|Inz|INZ)\(([^)]+)\))?\s*(?:(dim|Dim|DIM)\(([^)]+)\))?\s*;/i;

    private static readonly SUBSTRUCTURE_START_PATTERN = 
        /^\s*([a-zA-Z_][a-zA-Z0-9_@#]*)\s+(likeds|LikeDs|LIKEDS|template|Template|TEMPLATE)\s*(?:\(([^)]+)\))?\s*;/i;

    /**
     * Parses RPG structure from text content at specified cursor position
     */
    public static parseStructureAtCursor(content: string, cursorLine: number): ParsedStructure {
        const lines = content.split('\n');
        const result: ParsedStructure = {
            header: { name: '', type: '', dimension: '0' },
            fields: [],
            format: 'dcl-ds',
            success: false,
            errors: []
        };

        try {
            // Find structure boundaries
            const boundaries = this.findStructureBoundaries(lines, cursorLine);
            if (!boundaries) {
                result.errors.push('No RPG structure found at cursor position');
                return result;
            }

            const { startLine, endLine, headerMatch } = boundaries;

            // Parse header
            result.header = this.parseHeader(headerMatch);
            result.format = this.detectFormat(headerMatch[1]);

            // Parse fields
            const structureLines = lines.slice(startLine + 1, endLine);
            result.fields = this.parseFields(structureLines, result.format);

            result.success = true;
            return result;

        } catch (error) {
            result.errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
            return result;
        }
    }

    /**
     * Finds the start and end boundaries of a structure containing the cursor line
     */
    private static findStructureBoundaries(lines: string[], cursorLine: number): {
        startLine: number;
        endLine: number;
        headerMatch: RegExpMatchArray;
    } | null {
        // Find all structure boundaries in the document
        const structures: Array<{
            startLine: number;
            endLine: number;
            headerMatch: RegExpMatchArray;
            level: number;
        }> = [];
        
        const structureStack: Array<{
            startLine: number;
            headerMatch: RegExpMatchArray;
            level: number;
        }> = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for structure start
            for (const pattern of this.STRUCTURE_START_PATTERNS) {
                const match = line.match(pattern);
                if (match) {
                    structureStack.push({
                        startLine: i,
                        headerMatch: match,
                        level: structureStack.length
                    });
                    break;
                }
            }
            
            // Check for structure end
            for (const pattern of this.STRUCTURE_END_PATTERNS) {
                if (pattern.test(line)) {
                    if (structureStack.length > 0) {
                        const structureInfo = structureStack.pop()!;
                        structures.push({
                            startLine: structureInfo.startLine,
                            endLine: i,
                            headerMatch: structureInfo.headerMatch,
                            level: structureInfo.level
                        });
                    }
                    break;
                }
            }
        }
        
        // Find the structure that contains the cursor line
        // If cursor is on dcl-ds or end-ds line, prefer the structure that starts/ends on that line
        // Otherwise, prefer the most nested structure that contains the cursor
        let bestMatch: typeof structures[0] | null = null;
        
        for (const structure of structures) {
            if (cursorLine >= structure.startLine && cursorLine <= structure.endLine) {
                // If cursor is on the start line, always prefer this structure
                if (cursorLine === structure.startLine) {
                    if (!bestMatch || structure.level < bestMatch.level) {
                        bestMatch = structure;
                    }
                }
                // If cursor is on the end line, prefer less nested structures
                else if (cursorLine === structure.endLine) {
                    if (!bestMatch || structure.level < bestMatch.level) {
                        bestMatch = structure;
                    }
                }
                // For cursor inside the structure, prefer the most nested
                else {
                    if (!bestMatch || structure.level > bestMatch.level) {
                        bestMatch = structure;
                    }
                }
            }
        }
        
        if (!bestMatch) {
            return null;
        }
        
        return {
            startLine: bestMatch.startLine,
            endLine: bestMatch.endLine,
            headerMatch: bestMatch.headerMatch
        };
    }

    /**
     * Parses the structure header from regex match
     */
    private static parseHeader(match: RegExpMatchArray): Header {
        const name = match[2].trim();
        const modifiers = match[3] || '';
        
        let type = 'Default';
        let dimension = '0';

        // Parse modifiers
        if (modifiers.includes('template') || modifiers.includes('Template') || modifiers.includes('TEMPLATE')) {
            type = 'template';
        }

        // Parse dimension
        const dimMatch = modifiers.match(/dim\s*\(\s*([^)]+)\s*\)/i);
        if (dimMatch) {
            const dimValue = dimMatch[1].trim();
            if (dimValue.startsWith('*var:') || dimValue.startsWith('*Var:') || dimValue.startsWith('*VAR:')) {
                type = '*var';
                dimension = dimValue.substring(5);
            } else if (dimValue.startsWith('*auto:') || dimValue.startsWith('*Auto:') || dimValue.startsWith('*AUTO:')) {
                type = '*auto';
                dimension = dimValue.substring(6);
            } else {
                dimension = dimValue;
            }
        }

        return { name, type, dimension };
    }

    /**
     * Detects the format style from the declaration keyword
     */
    private static detectFormat(keyword: string): StructureFormat {
        if (keyword === 'dcl-ds') return 'dcl-ds';
        if (keyword === 'Dcl-ds') return 'Dcl-ds';
        if (keyword === 'DCL-DS') return 'DCL-DS';
        return 'dcl-ds'; // default fallback
    }

    /**
     * Parses fields from structure content lines
     */
    private static parseFields(lines: string[], format: StructureFormat): Field[] {
        const fields: Field[] = [];
        let idCounter = 0;
        let i = 0;

        while (i < lines.length) {
            const line = lines[i].trim();
            
            if (!line || line.startsWith('//')) {
                i++;
                continue;
            }

            // Check for nested structure (dcl-ds inside another structure)
            const nestedStructMatch = line.match(/^\s*(dcl-ds|Dcl-ds|DCL-DS)\s+([a-zA-Z_][a-zA-Z0-9_@#]*)\s*(.*?);/i);
            if (nestedStructMatch) {
                const nestedStruct = this.parseNestedStructure(lines, i, idCounter++, format);
                if (nestedStruct.field) {
                    fields.push(nestedStruct.field);
                    i = nestedStruct.nextLine;
                } else {
                    i++;
                }
                continue;
            }

            // Check for substructure (likeds/template without dcl-ds)
            const subStructMatch = line.match(this.SUBSTRUCTURE_START_PATTERN);
            if (subStructMatch) {
                const subStruct = this.parseSubstructure(lines, i, idCounter++, format);
                if (subStruct.field) {
                    fields.push(subStruct.field);
                    i = subStruct.nextLine;
                } else {
                    i++;
                }
                continue;
            }

            // Parse regular field
            const fieldMatch = line.match(this.FIELD_PATTERN);
            if (fieldMatch) {
                const field = this.parseFieldFromMatch(fieldMatch, idCounter++, format);
                fields.push(field);
            }

            i++;
        }

        return fields;
    }

    /**
     * Parses a nested structure (dcl-ds within another structure) and its fields
     */
    private static parseNestedStructure(
        lines: string[], 
        startIndex: number, 
        id: number, 
        format: StructureFormat
    ): { field: Field | null; nextLine: number } {
        const line = lines[startIndex];
        const match = line.match(/^\s*(dcl-ds|Dcl-ds|DCL-DS)\s+([a-zA-Z_][a-zA-Z0-9_@#]*)\s*(.*?);/i);
        
        if (!match) {
            return { field: null, nextLine: startIndex + 1 };
        }

        const name = match[2].trim();
        const modifiers = match[3] || '';
        
        // Parse dimension from modifiers
        let dimension: string | undefined;
        const dimMatch = modifiers.match(/dim\s*\(\s*([^)]+)\s*\)/i);
        if (dimMatch) {
            dimension = dimMatch[1].trim();
        }

        // Find the matching end-ds for this nested structure
        let endIndex = -1;
        let nestedLevel = 0;
        let baseIndent = this.getIndentLevel(line);
        
        for (let i = startIndex + 1; i < lines.length; i++) {
            const currentLine = lines[i];
            const trimmedLine = currentLine.trim();
            
            if (!trimmedLine || trimmedLine.startsWith('//')) continue;
            
            // Check for nested dcl-ds (increase level)
            if (/^\s*(dcl-ds|Dcl-ds|DCL-DS)\s+/i.test(currentLine)) {
                nestedLevel++;
                continue;
            }
            
            // Check for end-ds
            if (this.STRUCTURE_END_PATTERNS.some(p => p.test(trimmedLine))) {
                if (nestedLevel === 0) {
                    // This is our matching end-ds
                    endIndex = i;
                    break;
                } else {
                    // This end-ds belongs to a nested structure
                    nestedLevel--;
                }
            }
        }

        if (endIndex === -1) {
            // No matching end-ds found
            return { field: null, nextLine: startIndex + 1 };
        }

        // Parse fields between dcl-ds and end-ds
        const structureLines = lines.slice(startIndex + 1, endIndex);
        const nestedFields = this.parseFields(structureLines, format);

        const field: Field = {
            idNumber: id,
            name,
            type: '',
            length: dimension,
            init: undefined,
            dim: undefined,
            isStructure: true,
            fields: nestedFields
        };

        return { field, nextLine: endIndex + 1 };
    }

    /**
     * Parses a substructure and its nested fields
     */
    private static parseSubstructure(
        lines: string[], 
        startIndex: number, 
        id: number, 
        format: StructureFormat
    ): { field: Field | null; nextLine: number } {
        const line = lines[startIndex];
        const match = line.match(this.SUBSTRUCTURE_START_PATTERN);
        
        if (!match) {
            return { field: null, nextLine: startIndex + 1 };
        }

        const name = match[1].trim();
        const dimension = match[3] ? match[3].trim() : undefined;
        const baseIndent = this.getIndentLevel(line);

        // For simple substructures (likeds/template), look for fields with deeper indentation
        // until we find a field at the same level or shallower, or another structure declaration
        let endIndex = startIndex + 1;
        
        for (let i = startIndex + 1; i < lines.length; i++) {
            const currentLine = lines[i];
            const trimmedLine = currentLine.trim();
            
            if (!trimmedLine || trimmedLine.startsWith('//')) continue;
            
            const currentIndent = this.getIndentLevel(currentLine);
            
            // If we find a line at the same or lesser indentation that looks like a field or structure
            if (currentIndent <= baseIndent) {
                const isField = this.FIELD_PATTERN.test(trimmedLine);
                const isStructure = this.SUBSTRUCTURE_START_PATTERN.test(trimmedLine) || 
                                  /^\s*(dcl-ds|Dcl-ds|DCL-DS)\s+/i.test(trimmedLine);
                const isEndDs = this.STRUCTURE_END_PATTERNS.some(p => p.test(trimmedLine));
                
                if (isField || isStructure || isEndDs) {
                    endIndex = i;
                    break;
                }
            }
        }

        // Parse nested fields (everything between start and end with deeper indentation)
        const subLines = lines.slice(startIndex + 1, endIndex);
        const nestedFields = this.parseFields(subLines, format);

        const field: Field = {
            idNumber: id,
            name,
            type: '',
            length: dimension,
            init: undefined,
            dim: undefined,
            isStructure: true,
            fields: nestedFields
        };

        return { field, nextLine: endIndex };
    }

    /**
     * Parses a field from regex match
     */
    private static parseFieldFromMatch(match: RegExpMatchArray, id: number, format: StructureFormat): Field {
        const name = match[1].trim();
        const type = match[2].trim();
        const length = match[3] ? match[3].trim() : undefined;
        const init = match[5] ? match[5].trim() : undefined;
        const dimStr = match[7] ? match[7].trim() : undefined;
        const dim = dimStr ? parseInt(dimStr, 10) : undefined;

        // Reverse map type from format-specific to generic
        const formatConfig = FORMAT_MAP[format];
        let genericType = type;
        
        if (formatConfig?.typeMap) {
            // Find generic type by looking up the value in typeMap
            for (const [generic, formatted] of Object.entries(formatConfig.typeMap)) {
                if (formatted.toLowerCase() === type.toLowerCase()) {
                    genericType = generic;
                    break;
                }
            }
        }

        return {
            idNumber: id,
            name,
            type: genericType,
            length,
            init,
            dim,
            isStructure: false,
            fields: []
        };
    }

    /**
     * Gets the indentation level of a line
     */
    private static getIndentLevel(line: string): number {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
    }

    /**
     * Extracts all structures from the entire document
     */
    public static extractAllStructures(content: string): ParsedStructure[] {
        const lines = content.split('\n');
        const structures: ParsedStructure[] = [];
        
        // Find all structure boundaries first
        const allBoundaries = this.findAllStructureBoundaries(lines);
        
        // Parse only top-level structures to avoid duplicates
        const topLevelBoundaries = allBoundaries.filter(boundary => boundary.level === 0);
        
        for (const boundary of topLevelBoundaries) {
            try {
                const result: ParsedStructure = {
                    header: this.parseHeader(boundary.headerMatch),
                    fields: [],
                    format: this.detectFormat(boundary.headerMatch[1]),
                    success: false,
                    errors: []
                };

                // Parse fields
                const structureLines = lines.slice(boundary.startLine + 1, boundary.endLine);
                result.fields = this.parseFields(structureLines, result.format);
                result.success = true;
                
                structures.push(result);
            } catch (error) {
                console.warn(`Failed to parse structure starting at line ${boundary.startLine}:`, error);
            }
        }
        
        return structures;
    }

    /**
     * Finds all structure boundaries in the document
     */
    private static findAllStructureBoundaries(lines: string[]): Array<{
        startLine: number;
        endLine: number;
        headerMatch: RegExpMatchArray;
        level: number;
    }> {
        const structures: Array<{
            startLine: number;
            endLine: number;
            headerMatch: RegExpMatchArray;
            level: number;
        }> = [];
        
        const structureStack: Array<{
            startLine: number;
            headerMatch: RegExpMatchArray;
            level: number;
        }> = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for structure start
            for (const pattern of this.STRUCTURE_START_PATTERNS) {
                const match = line.match(pattern);
                if (match) {
                    structureStack.push({
                        startLine: i,
                        headerMatch: match,
                        level: structureStack.length
                    });
                    break;
                }
            }
            
            // Check for structure end
            for (const pattern of this.STRUCTURE_END_PATTERNS) {
                if (pattern.test(line)) {
                    if (structureStack.length > 0) {
                        const structureInfo = structureStack.pop()!;
                        structures.push({
                            startLine: structureInfo.startLine,
                            endLine: i,
                            headerMatch: structureInfo.headerMatch,
                            level: structureInfo.level
                        });
                    }
                    break;
                }
            }
        }
        
        return structures;
    }

    /**
     * Validates if the parsed structure is complete and valid
     */
    public static validateParsedStructure(parsed: ParsedStructure): boolean {
        if (!parsed.success) return false;
        if (!parsed.header.name || !parsed.header.type) return false;
        if (!isValidStructureFormat(parsed.format)) return false;
        
        // Validate fields have required properties
        return this.validateFields(parsed.fields);
    }

    private static validateFields(fields: Field[]): boolean {
        for (const field of fields) {
            if (!field.name) return false;
            if (!field.isStructure && !field.type) return false;
            if (field.isStructure && !this.validateFields(field.fields)) return false;
        }
        return true;
    }
}