import * as vscode from 'vscode';
import { Field, fields } from './rpg-structure-model';

// Provider class for "Header" (structure data)
export class HeaderTreeDataProvider implements vscode.TreeDataProvider<StructureItem> {
    private items: StructureItem[] = [
        new StructureItem('NAME: (Required) ', 'name', 'symbol-text', vscode.TreeItemCollapsibleState.None),
        new StructureItem('TYPE: (Required)', 'type', 'symbol-type-parameter', vscode.TreeItemCollapsibleState.None),
        new StructureItem('DIMENSION: (Required)', 'dimension', 'symbol-unit', vscode.TreeItemCollapsibleState.None)
    ];

    private _onDidChangeTreeData: vscode.EventEmitter<StructureItem | undefined> = new vscode.EventEmitter<StructureItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<StructureItem | undefined> = this._onDidChangeTreeData.event;

    getTreeItem(element: StructureItem): vscode.TreeItem {
        return element;
    };

    getChildren(): Thenable<StructureItem[]> {
        return Promise.resolve(this.items);
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
    private fields: FieldItem[] = [];

    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    };

    getChildren(): Thenable<vscode.TreeItem[]> {

        const items: vscode.TreeItem[] = [];

        // Button for adding fields
        const addButton = new vscode.TreeItem('Add Field', vscode.TreeItemCollapsibleState.None);
        addButton.iconPath = new vscode.ThemeIcon('add');
        addButton.command = {
            command: 'rpgStructure.addField',
            title: 'Add Field'
        };
        items.push(addButton);
        // Add fields
        items.push(...this.fields);

        // Button for creating structure
        if (this.fields.length > 0) {
            const generateStructure = new vscode.TreeItem('Generate Structure', vscode.TreeItemCollapsibleState.None);
            generateStructure.iconPath = new vscode.ThemeIcon('check');
            generateStructure.command = {
                command : 'rpgStructure.generate',
                title : 'Generate RPG Structure'
            };
            items.push(generateStructure);
        };

        return Promise.resolve(items);
    };

    addField(field: FieldItem) {
        this.fields.push(field);
        this.refresh();
    };

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    };
};

// Class for the field data
export class FieldItem extends vscode.TreeItem {
    constructor(
        public name: string,
        public type: string,
        public length: string | undefined,
        public init: string | undefined
    ) {
        // Shows the information of the field added
        super(`${name}, type: ${type}${length ? `(${length})` : ''}, init: ${init}`, vscode.TreeItemCollapsibleState.None);

        // Adds the field to my fields structure
        const field: Field = {
            name: name,
            type: type,
            length: length,
            init: init
        };
        fields.push(field);
    };
};
