/*
	Christian Larsen, 2025
	"RPG structure"
	rpg-structure.configuration.ts
*/

import * as vscode from 'vscode';

/**
 * Configuration interface for the RPG Structure extension.
 * Contains all configurable settings that users can modify.
 */
export interface Configuration {
    /** The format used for generating RPG structures (e.g., 'dcl-ds', 'dcl-pr') */
    structureFormat: string;
    /** Number of spaces used for indentation in generated code */
    indentation?: number;
};

/**
 * Default configuration values used when no saved configuration exists
 * or when resetting to defaults.
 */
const DEFAULT_CONFIGURATION: Readonly<Configuration> = {
    structureFormat: 'dcl-ds',
    indentation: 3
} as const;

/**
 * Global storage key used for persisting configuration in VS Code's global state.
 */
const CONFIGURATION_STORAGE_KEY = 'rpgStructure.config' as const;

/**
 * Current active configuration instance.
 * This is updated whenever configuration is loaded or saved.
 */
export let currentConfiguration: Configuration;

/**
 * Loads configuration from VS Code's global state storage.
 * If no saved configuration exists, uses default values and saves them.
 * Ensures backward compatibility by setting missing properties to defaults.
 * 
 * @param context The VS Code extension context for accessing global state
 * @returns The loaded or default configuration
 */
export function loadConfiguration(context: vscode.ExtensionContext): Configuration {
    const savedConfig = context.globalState.get<Configuration>(CONFIGURATION_STORAGE_KEY);
    
    // Use saved config or fallback to defaults
    currentConfiguration = savedConfig ? { ...savedConfig } : { ...DEFAULT_CONFIGURATION };
    
    // Ensure backward compatibility - set missing properties to defaults
    if (currentConfiguration.indentation === undefined) {
        currentConfiguration.indentation = DEFAULT_CONFIGURATION.indentation;
    };
    
    // Save default configuration if none existed
    if (!savedConfig) {
        void context.globalState.update(CONFIGURATION_STORAGE_KEY, currentConfiguration);
    };
    
    return currentConfiguration;
};

/**
 * Saves the provided configuration to VS Code's global state storage
 * and updates the current configuration instance.
 * 
 * @param context The VS Code extension context for accessing global state
 * @param newConfig The new configuration to save
 * @returns Promise that resolves when the configuration is saved
 */
export async function saveConfiguration(
    context: vscode.ExtensionContext, 
    newConfig: Configuration
): Promise<void> {
    // Validate and merge with defaults to ensure completeness
    const validatedConfig: Configuration = {
        structureFormat: newConfig.structureFormat || DEFAULT_CONFIGURATION.structureFormat,
        indentation: newConfig.indentation ?? DEFAULT_CONFIGURATION.indentation
    };
    
    currentConfiguration = validatedConfig;
    
    try {
        await context.globalState.update(CONFIGURATION_STORAGE_KEY, currentConfiguration);
    } catch (error) {
        console.error('Failed to save RPG Structure configuration:', error);
        throw new Error('Failed to save configuration');
    };
};

/**
 * Gets the current active configuration.
 * This should be called after loadConfiguration has been invoked at least once.
 * 
 * @returns The current configuration object
 * @throws Error if configuration hasn't been loaded yet
 */
export function getConfiguration(): Configuration {
    if (!currentConfiguration) {
        throw new Error('Configuration not loaded. Call loadConfiguration() first.');
    };
    return { ...currentConfiguration }; // Return a copy to prevent external mutations
};

/**
 * Resets the configuration to default values.
 * 
 * @param context The VS Code extension context for accessing global state
 * @returns Promise that resolves when the configuration is reset
 */
export async function resetConfiguration(context: vscode.ExtensionContext): Promise<void> {
    await saveConfiguration(context, { ...DEFAULT_CONFIGURATION });
};

/**
 * Updates a specific configuration property while preserving others.
 * 
 * @param context The VS Code extension context for accessing global state
 * @param key The configuration property to update
 * @param value The new value for the property
 * @returns Promise that resolves when the configuration is updated
 */
export async function updateConfigurationProperty<K extends keyof Configuration>(
    context: vscode.ExtensionContext,
    key: K,
    value: Configuration[K]
): Promise<void> {
    const updatedConfig: Configuration = {
        ...currentConfiguration,
        [key]: value
    };
    
    await saveConfiguration(context, updatedConfig);
};

/**
 * Validates if a configuration object has all required properties.
 * 
 * @param config The configuration object to validate
 * @returns True if the configuration is valid, false otherwise
 */
export function validateConfiguration(config: Partial<Configuration>): config is Configuration {
    return (
        typeof config.structureFormat === 'string' &&
        config.structureFormat.length > 0 &&
        (config.indentation === undefined || 
         (typeof config.indentation === 'number' && config.indentation >= 0))
    );
};

/**
 * Gets the default configuration values.
 * Useful for UI components that need to show default values.
 * 
 * @returns A copy of the default configuration
 */
export function getDefaultConfiguration(): Configuration {
    return { ...DEFAULT_CONFIGURATION };
};
