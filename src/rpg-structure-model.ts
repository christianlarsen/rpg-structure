/*
	Christian Larsen, 2025
	"RPG structure"
	rpg-structure-model.ts
*/

export interface Header {
	name : string;
	type : string;
	dimension? : string;
};

export interface Field {
	idNumber : number;
	name : string;
	type : string;
	length? : string;
	init? : string;
	dim? : number;
	isStructure : boolean;
	fields : Field[];
};

export let fields : Field[] = [];
export let header : Header = {
	name : "",
	type : "",
	dimension : '0'
};

export interface RpgFormat {
	dclds: string;
	endds: string;
	template: string;
	qualified: string;
	varx: string;
	autox: string;
	dimx: string;
	inz: string;
	typeMap: Record<string, string>;
};

export const formatMap: Record<string, RpgFormat> = {
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
};

