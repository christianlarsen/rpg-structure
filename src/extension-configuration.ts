/*
	Christian Larsen, 2025
	"RPG structure"
	extension-configuration.ts
*/

import * as vscode from 'vscode';

export type Configuration = {
	structureFormat: string;
};

const defaultConfiguration: Configuration = {
	structureFormat: 'dcl-ds'
};

export let currentConfiguration: Configuration;

export function loadConfiguration(context: vscode.ExtensionContext): Configuration {
	const saved = context.globalState.get<Configuration>('rpgStructure.config');
	currentConfiguration = saved || defaultConfiguration;

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

