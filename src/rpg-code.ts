/*
	Christian Larsen, 2025
	"RPG structure"
	rpg-code.ts
*/

import { Field } from './rpg-structure-model';

// Generates the RPG code for the data-structure
export function generateRpgCode(
	name: string,
	type: string,
	dimension: string | undefined,
	fields: Field[],
	line: number,
	level: number,
	baseIndent: string
): string {
	const tab : string = '   ';
	let headIndent: string;
	let subIndent: string;

	if (line === 0 || level === 0) {
		headIndent = baseIndent;
		subIndent = baseIndent + `${tab}`;
	} else {
		headIndent = baseIndent + `${tab}`.repeat(level);
		subIndent = baseIndent + `${tab}`.repeat(level + 1);
	};

	let header = `${headIndent}dcl-ds ${name}${level === 0 ? ' qualified' : ''}`;
	
	if (dimension && dimension.trim() && type.trim()) {
		if (type.trim() === 'Default') {
			header += ` dim(${dimension.trim()})`;
		} else {
			header += ` dim(${type.toLowerCase().trim()}:${dimension.trim()})`;
		};
	};
	header += ';';

	const body = fields.map(f => {
		if (f.isStructure) {
			return generateRpgCode(f.name, 'Default', f.length, f.fields, line + 1, level + 1, baseIndent);
		} else {
			let line = `${subIndent}${f.name} ${f.type}`;
			if (f.length?.trim()) {
				line += `(${f.length})`;
			}
			if (f.init?.trim()) {
				line += ` inz(${f.init.trim()})`;
			}
			return line + ';';
		};
	});

	const footer = `${headIndent}end-ds;`;

	return [header, ...body, footer].join('\n');
}
