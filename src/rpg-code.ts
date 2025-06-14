
// Generates the RPG code for the data-structure
export function generateRpgCode(name: string, type: string, dimension: string, fields: { name: string, type: string, length: string, init?: string }[], position : number): string {
	// Creates the "header" of the structure, always in lowecase, qualified
	let header = `dcl-ds ${name} qualified`;
	if (dimension.trim() && type.trim()) {
		if (type.trim() === 'Default') {
			header += ` dim(${dimension.trim()})`;
		} else {
			header += ` dim(${type.toLowerCase().trim()}:${dimension.trim()})`;
		};
	};
	header += ';';

	// To every line, I have to add "position" spaces before ...
	const tab : string = ' '.repeat(position);

	// Creates the "body"
	const body = fields.map(f => {
		let line = tab + `   ${f.name} ${f.type}`;
		if (f.length?.trim()) {
			line += `(${f.length})`;
		};
		if (f.init?.trim()) {
			line += ` inz(${f.init.trim()})`;
		};
		return line + ';';
	});

	// Returns the structure ending with "end-ds"
	return [header, ...body, tab + 'end-ds;'].join('\n');
    
};