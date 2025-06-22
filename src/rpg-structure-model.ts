/*
	Christian Larsen, 2025
	"RPG structure"
	rpg-structure-model.ts
*/

export interface Header {
	name : string;
	type : string;
	dimension : number;
};

export interface Field {
	idNumber : number;
	name : string;
	type : string;
	length? : string;
	init? : string;
	isStructure : boolean;
	fields : Field[];
};

export let fields : Field[] = [];
export let header : Header = {
	name : "",
	type : "",
	dimension : 0
};