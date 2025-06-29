/*
	Christian Larsen, 2025
	"RPG structure"
	rpg-code.ts
*/

import { currentConfiguration } from './extension-configuration';
import { Field, formatMap } from './rpg-structure-model';

// Generates the RPG code for the data-structure
export function generateRpgCode(name: string, type: string, dimension: number | undefined,
	fields: Field[], line: number, level: number,baseIndent: string) : string {

	const format = formatMap[currentConfiguration.structureFormat];
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

	let header = `${headIndent}${format.dclds} ${name}${level === 0 ? ` ${format.qualified}` : ''}`;
	
	if (dimension && dimension.toString().trim() && type.trim()) {
		if (type.trim() === 'Default') {
			header += ` dim(${dimension.toString().trim()})`;
		} else {
			switch(type) {
				case '*var' :
					header += ` ${format.dimx}(${format.varx}:${dimension.toString().trim()})`;
					break;
				case '*auto' :
					header += ` ${format.dimx}(${format.autox}:${dimension.toString().trim()})`;
					break;
			};
		};
	};
	if (type === 'template' && line === 0 && level === 0) {
		header += ` ${format.template}`;
	};
	header += ';';

	const body = fields.map(f => {
		if (f.isStructure) {
			return generateRpgCode(f.name, 'Default', f.length, f.fields, line + 1, level + 1, baseIndent);
		} else {
			const typeUsed = format.typeMap[f.type] ?? f.type;
			let line = `${subIndent}${f.name} ${typeUsed}`;
			if (f.length?.toString().trim()) {
				line += `(${f.length})`;
			}
			if (f.init?.trim()) {
				line += ` ${format.inz}(${f.init.trim()})`;
			}
			return line + ';';
		};
	});

	const footer = `${headIndent}${format.endds};`;

	return [header, ...body, footer].join('\n');
}
