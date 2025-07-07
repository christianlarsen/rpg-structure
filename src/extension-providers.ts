/*
	Christian Larsen, 2025
	"RPG structure"
	extension-providers.ts
*/

import * as vscode from 'vscode';
import { Field, fields, header } from './rpg-structure-model';
import { reassignIdNumbers, findFieldById } from './extension-util';
import { getConfiguration } from './extension-configuration';

// Provider class for "Header" (structure data)
export class HeaderTreeDataProvider implements vscode.TreeDataProvider<StructureItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<StructureItem | undefined> = new vscode.EventEmitter<StructureItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<StructureItem | undefined> = this._onDidChangeTreeData.event;

    getTreeItem(element: StructureItem): vscode.TreeItem {
        return element;
    };

    getChildren(): Thenable<StructureItem[]> {
        const items: StructureItem[] = [
            new StructureItem(`NAME: ${header.name || '(Required)'}`, 'name', 'symbol-text', vscode.TreeItemCollapsibleState.None),
            new StructureItem(`TYPE: ${header.type || '(Required)'}`, 'type', 'symbol-type-parameter', vscode.TreeItemCollapsibleState.None),
        ];
        let dimensionLabel: string;
        if (header.type === "template") {
            dimensionLabel = "DIMENSION: (None)";
        } else if (typeof header.dimension === "undefined" || header.dimension === '0') {
            dimensionLabel = "DIMENSION: (Required)";
        } else {
            dimensionLabel = `DIMENSION: ${header.dimension}`;
        };
        items.push(new StructureItem(dimensionLabel, 'dimension', 'symbol-unit', vscode.TreeItemCollapsibleState.None));
    
        return Promise.resolve(items);
    };    

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    };
};

// Class for the structure data
export class StructureItem extends vscode.TreeItem {
    constructor(
        public label: string,
        public id: string,
        public icon: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
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

// Provider class for "Fields" (fields data)
export class FieldsTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    };

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (!element) {
            return Promise.resolve(fields.map(f =>
                new FieldItem(f.idNumber, f.name, f.type, f.length, f.init, f.dim, f.isStructure, f.fields)
            ));
        }

        if (element instanceof FieldItem && element.isStructure) {
            
            const children = element.fields.map(f =>
                new FieldItem(f.idNumber, f.name, f.type, f.length, f.init, f.dim, f.isStructure, f.fields)
            );
            return Promise.resolve(children);
        };

        return Promise.resolve([]);
    };

    addField(field: FieldItem) {
        fields.push(field);
        this.refresh();
    };

    addFieldBefore(field: FieldItem, before: number) {
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

    addFieldStructure(fields: Field[], field : FieldItem, targetId: number) {
        const parent = findFieldById(fields, targetId);
    
        if (!parent || !parent.isStructure) {
            console.error("Target not found or not a structure");
            return;
        };
    
        parent.fields.push(field);
    
        reassignIdNumbers(fields); 

        this.refresh();
    };

    refresh(): void {
        this._onDidChangeTreeData.fire();
    };

    clear(): void {
        fields.length = 0;
        this.refresh();
    };
};

// Class for the field data
export class FieldItem extends vscode.TreeItem {
    constructor(
        public idNumber: number,
        public name: string,
        public type: string,
        public length: string | undefined,
        public init: string | undefined,
        public dim: number | undefined,
        public isStructure : boolean,
        public fields: Field[]
    ) {

        const collapsibleState = isStructure
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;

        super(name, collapsibleState);
        if (isStructure) {
            this.contextValue = 'rpg-structure-structureItem';
            this.iconPath = this.iconPath = new vscode.ThemeIcon('symbol-structure');
            this.tooltip = `Substructure: ${name}`;
            this.description = `${length ? `dim(${length})` : ''}`;
        } else {
            this.contextValue = 'rpg-structure-fieldItem';
            this.iconPath = this.iconPath = new vscode.ThemeIcon('symbol-field');
            this.tooltip = `Field: ${name}`;
            this.description = `${type}${length ? `(${length})` : ''}${dim ? ` dim(${dim})` : ``}${init ? ` inz(${init})` : ''}`;
        };
    };
};

export class FieldDetailItem extends vscode.TreeItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
    };
};

export class FieldPropertyItem extends vscode.TreeItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'fieldProperty';
    }
};

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

export class ConfigProvider implements vscode.TreeDataProvider<ConfigItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<ConfigItem | undefined | void> = new vscode.EventEmitter<ConfigItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<ConfigItem | undefined | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	};

	getTreeItem(element: ConfigItem): vscode.TreeItem {
		return element;
	};

	getChildren(): Thenable<ConfigItem[]> {
        const cfg = getConfiguration();

        const items: ConfigItem[] = [
		    new ConfigItem(`STRUCTURE FORMAT: ${cfg.structureFormat}`, 'structureFormat'),
            new ConfigItem(`INDENTATION: ${cfg.indentation?.toString()}`, 'structureIndentation')
	    ];
		return Promise.resolve(items);
	};
};




