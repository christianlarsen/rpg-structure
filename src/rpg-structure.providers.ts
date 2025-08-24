/*
	Christian Larsen, 2025
	"RPG structure"
	rpg-structure.providers.ts
*/

import * as vscode from 'vscode';
import { Field, fields, header } from './rpg-structure.model';
import { reassignIdNumbers, findFieldById } from './rpg-structure.utils';
import { getConfiguration } from './rpg-structure.configuration';

/**
 * Tree data provider for displaying and managing RPG structure header information.
 * Handles the display of structure name, type, and dimension properties.
 */
export class HeaderTreeDataProvider implements vscode.TreeDataProvider<StructureItem> {
    private readonly _onDidChangeTreeData: vscode.EventEmitter<StructureItem | undefined> = 
        new vscode.EventEmitter<StructureItem | undefined>();
    
    readonly onDidChangeTreeData: vscode.Event<StructureItem | undefined> = 
        this._onDidChangeTreeData.event;

    /**
     * Returns the tree item representation of the given element.
     * @param element The structure item to convert to a tree item
     * @returns The tree item representation
     */
    getTreeItem(element: StructureItem): vscode.TreeItem {
        return element;
    };

    /**
     * Gets the children of the header tree (name, type, and dimension).
     * @returns Promise resolving to an array of structure items
     */
    getChildren(): Thenable<StructureItem[]> {
        const items: StructureItem[] = [
            new StructureItem(
                `NAME: ${header.name || '(Required)'}`, 
                'name', 
                'symbol-text', 
                vscode.TreeItemCollapsibleState.None
            ),
            new StructureItem(
                `TYPE: ${header.type || '(Required)'}`, 
                'type', 
                'symbol-type-parameter', 
                vscode.TreeItemCollapsibleState.None
            ),
        ];

        // Determine dimension label based on structure type
        let dimensionLabel: string;
        if (header.type === 'template') {
            dimensionLabel = 'DIMENSION: (None)';
        } else if (typeof header.dimension === 'undefined' || header.dimension === '0') {
            dimensionLabel = 'DIMENSION: (Required)';
        } else {
            dimensionLabel = `DIMENSION: ${header.dimension}`;
        }

        items.push(new StructureItem(
            dimensionLabel, 
            'dimension', 
            'symbol-unit', 
            vscode.TreeItemCollapsibleState.None
        ));

        return Promise.resolve(items);
    };

    /**
     * Refreshes the tree view by firing the change event.
     */
    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    };
};

/**
 * Represents a structure item in the header tree view.
 * Contains information about structure properties like name, type, and dimension.
 */
export class StructureItem extends vscode.TreeItem {
    constructor(
        public label: string,
        public id: string,
        public icon: string,
        public collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        
        this.command = {
            command: 'rpgStructure.itemClick',
            title: 'Structure Clicked',
            arguments: [this]
        };
        this.iconPath = new vscode.ThemeIcon(icon);
    };
};

/**
 * Tree data provider for displaying and managing RPG structure fields.
 * Handles both regular fields and nested structure fields.
 */
export class FieldsTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private readonly _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = 
        new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    /**
     * Returns the tree item representation of the given element.
     * @param element The tree item element
     * @returns The tree item representation
     */
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    };

    /**
     * Gets the children of the specified element or root fields if no element is provided.
     * @param element Optional parent element to get children for
     * @returns Promise resolving to an array of tree items
     */
    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (!element) {
            // Return root level fields
            return Promise.resolve(fields.map(field =>
                new FieldItem(
                    field.idNumber, 
                    field.name, 
                    field.type, 
                    field.length, 
                    field.init, 
                    field.dim, 
                    field.isStructure, 
                    field.fields
                )
            ));
        };

        // Return children of structure fields
        if (element instanceof FieldItem && element.isStructure) {
            const children = element.fields.map(field =>
                new FieldItem(
                    field.idNumber, 
                    field.name, 
                    field.type, 
                    field.length, 
                    field.init, 
                    field.dim, 
                    field.isStructure, 
                    field.fields
                )
            );
            return Promise.resolve(children);
        };

        return Promise.resolve([]);
    };

    /**
     * Adds a new field to the end of the fields array.
     * @param field The field item to add
     */
    addField(field: FieldItem): void {
        fields.push(field);
        this.refresh();
    };

    /**
     * Adds a field at a specific position in the fields array.
     * @param field The field item to add
     * @param before The position to insert the field at (0-based index)
     */
    addFieldBefore(field: FieldItem, before: number): void {
        if (before <= 0) {
            fields.unshift(field);
        } else if (before >= fields.length) {
            fields.push(field);
        } else {
            fields.splice(before, 0, field);
        };

        reassignIdNumbers(fields);
        this.refresh();
    };

    /**
     * Adds a field to a nested structure field.
     * @param fieldsArray The array of fields to search in
     * @param field The field item to add
     * @param targetId The ID of the target structure field
     */
    addFieldStructure(fieldsArray: Field[], field: FieldItem, targetId: number): void {
        const parent = findFieldById(fieldsArray, targetId);

        if (!parent || !parent.isStructure) {
            console.error('Target not found or not a structure');
            return;
        };

        parent.fields.push(field);
        reassignIdNumbers(fieldsArray);
        this.refresh();
    };

    /**
     * Refreshes the tree view by firing the change event.
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    };

    /**
     * Clears all fields from the array and refreshes the view.
     */
    clear(): void {
        fields.length = 0;
        this.refresh();
    };
};

/**
 * Represents a field item in the fields tree view.
 * Can be either a regular field or a structure containing nested fields.
 */
export class FieldItem extends vscode.TreeItem {
    constructor(
        public readonly idNumber: number,
        public readonly name: string,
        public readonly type: string,
        public readonly length: string | undefined,
        public readonly init: string | undefined,
        public readonly dim: number | undefined,
        public readonly isStructure: boolean,
        public readonly fields: Field[]
    ) {
        const collapsibleState = isStructure
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;

        super(name, collapsibleState);

        if (isStructure) {
            this.contextValue = 'rpg-structure-structureItem';
            this.iconPath = new vscode.ThemeIcon('symbol-structure');
            this.tooltip = `Substructure: ${name}`;
            this.description = length ? `dim(${length})` : '';
        } else {
            this.contextValue = 'rpg-structure-fieldItem';
            this.iconPath = new vscode.ThemeIcon('symbol-field');
            this.tooltip = `Field: ${name}`;
            
            // Build description with type, length, dimension, and initialization
            let description = type;
            if (length) description += `(${length})`;
            if (dim) description += ` dim(${dim})`;
            if (init) description += ` inz(${init})`;
            
            this.description = description;
        };
    };
};

/**
 * Represents a detail item for field properties.
 * Used for displaying additional field information.
 */
export class FieldDetailItem extends vscode.TreeItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
    };
};

/**
 * Represents a property item for field configuration.
 * Used for displaying editable field properties.
 */
export class FieldPropertyItem extends vscode.TreeItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'fieldProperty';
    };
};

/**
 * Represents a configuration item in the configuration tree view.
 * Contains configuration settings that can be edited.
 */
export class ConfigItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
    ) {
        super(label, collapsibleState);
        
        this.contextValue = 'configItem';
        this.command = {
            command: 'rpgStructure.configuration.itemClick',
            title: 'Edit Configuration Item',
            arguments: [this]
        };
        this.iconPath = new vscode.ThemeIcon('symbol-string');
    };
};

/**
 * Tree data provider for displaying and managing extension configuration settings.
 * Provides a tree view of configurable options like structure format and indentation.
 */
export class ConfigProvider implements vscode.TreeDataProvider<ConfigItem> {
    private readonly _onDidChangeTreeData: vscode.EventEmitter<ConfigItem | undefined | void> = 
        new vscode.EventEmitter<ConfigItem | undefined | void>();
    
    readonly onDidChangeTreeData: vscode.Event<ConfigItem | undefined | void> = 
        this._onDidChangeTreeData.event;

    /**
     * Refreshes the configuration tree view by firing the change event.
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    };

    /**
     * Returns the tree item representation of the given element.
     * @param element The configuration item
     * @returns The tree item representation
     */
    getTreeItem(element: ConfigItem): vscode.TreeItem {
        return element;
    };

    /**
     * Gets the configuration items to display in the tree.
     * @returns Promise resolving to an array of configuration items
     */
    getChildren(): Thenable<ConfigItem[]> {
        const cfg = getConfiguration();

        const items: ConfigItem[] = [
            new ConfigItem(`STRUCTURE FORMAT: ${cfg.structureFormat}`, 'structureFormat'),
            new ConfigItem(`INDENTATION: ${cfg.indentation?.toString()}`, 'structureIndentation')
        ];

        return Promise.resolve(items);
    };
};
