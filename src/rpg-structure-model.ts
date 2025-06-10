
export interface Header {
	name : string;
	type : string;
	dimension : number;
};

export interface Field {
	name : string;
	type : string;
	length : string | undefined;
	init : string  | undefined;
};

export let fields: Field[] = [];