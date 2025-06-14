import * as vscode from 'vscode';
import { Field, fields, header } from './rpg-structure-model';

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
            new StructureItem(`DIMENSION: ${header.dimension > 0 ? header.dimension.toString() : '(Required)'}`, 'dimension', 'symbol-unit', vscode.TreeItemCollapsibleState.None)
        ];
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

    //private fields: FieldItem[] = [];

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    };

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (!element) {
            return Promise.resolve(fields.map(f =>
                new FieldItem(f.name, f.type, f.length, f.init)
            ));
        }

        if (element instanceof FieldItem) {
            const children: vscode.TreeItem[] = [];

            children.push(new FieldDetailItem(`Type: ${element.type}`));
            if (element.length) {
                children.push(new FieldDetailItem(`Length: ${element.length}`));
            }
            if (element.init) {
                children.push(new FieldDetailItem(`Init: ${element.init}`));
            }

            return Promise.resolve(children);
        }

        return Promise.resolve([]);
    };

    addField(field: FieldItem) {
        fields.push(field);
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
        public name: string,
        public type: string,
        public length: string | undefined,
        public init: string | undefined
    ) {
        super(name, vscode.TreeItemCollapsibleState.Collapsed);
        this.tooltip = `Field: ${name}`;
        this.description = `${type}${length ? `(${length})` : ''}`;

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


