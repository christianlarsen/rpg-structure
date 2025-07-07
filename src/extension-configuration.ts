/*
	Christian Larsen, 2025
	"RPG structure"
	extension-configuration.ts
*/

import * as vscode from 'vscode';

export type Configuration = {
	structureFormat: string;
	indentation? : number;
};

const defaultConfiguration: Configuration = {
	structureFormat: 'dcl-ds',
	indentation : 3
};

export let currentConfiguration: Configuration;

export function loadConfiguration(context: vscode.ExtensionContext): Configuration {
	const saved = context.globalState.get<Configuration>('rpgStructure.config');
	currentConfiguration = saved || defaultConfiguration;

	if (currentConfiguration.indentation === undefined) {
		currentConfiguration.indentation = 3;
	};

    if (!saved) {
        context.globalState.update('rpgStructure.config', defaultConfiguration);
    };
	return currentConfiguration;
};

export function saveConfiguration(context: vscode.ExtensionContext, newConfig: Configuration) {
	currentConfiguration = newConfig;
	context.globalState.update('rpgStructure.config', currentConfiguration);
};

export function getConfiguration(): Configuration {
	return currentConfiguration;
};

