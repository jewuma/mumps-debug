import * as vscode from 'vscode';
import { MumpsConnect, MumpsGlobal } from './mumpsConnect';

export class MumpsGlobalProvider implements vscode.TreeDataProvider<GlobalNode> {
	private static instance: MumpsGlobalProvider;
	private static _onDidChangeTreeData: vscode.EventEmitter<GlobalNode | undefined | void> = new vscode.EventEmitter<GlobalNode | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<GlobalNode | undefined | void> = MumpsGlobalProvider._onDidChangeTreeData.event;
	private static _mconnect: MumpsConnect | null = null;
	private constructor() {
	}
	static getInstance() {
		if (!MumpsGlobalProvider.instance) {
			MumpsGlobalProvider.instance = new MumpsGlobalProvider();
		}
		return MumpsGlobalProvider.instance;
	}
	static refresh(): void {
		this._onDidChangeTreeData.fire();
	}
	async search(node?: GlobalNode) {
		let searchFor: string | undefined = undefined
		if (node) {
			const globalName = node.id?.split("(")[0] || ""
			searchFor = await vscode.window.showInputBox({
				title: "Search inside Global" + globalName,
				placeHolder: 'Type the text to search'
			});
			if (searchFor) {
				const searchNode = new GlobalNode(globalName, searchFor, vscode.TreeItemCollapsibleState.None, "search")
				this.getChildren(searchNode)
			}
		} else {
			searchFor = await vscode.window.showInputBox({
				title: "Search for global key",
				placeHolder: 'Type the global key to show'
			});
			if (searchFor) {
				if (searchFor.length) {
					if (searchFor[0] !== "^") searchFor = "^" + searchFor
					if (searchFor.indexOf("(") !== -1) {
						let trailingPara = false
						if (searchFor.slice(-1) === ")") {
							trailingPara = true
							searchFor = searchFor.slice(0, -1)
						}
						const keys = searchFor.split("(")[1].split(",");
						keys.forEach((key, index) => {
							if (index === keys.length - 1 && key.slice(-1) === ")") key = key.slice(0, -1)
							if (isNaN(parseFloat(key))) {
								if (key[0] !== '"' || key.slice(-1) !== '"') {
									key = '"' + key + '"'
									keys[index] = key
								}
							}
						})
						const ending = trailingPara ? ")" : ""
						searchFor = searchFor.split("(")[0] + "(" + keys.join(",") + ending
					}
				}
				const node = new GlobalNode(searchFor, "", vscode.TreeItemCollapsibleState.Expanded, "")
				this.getChildren(node);
			}
		}
		MumpsGlobalProvider.refresh();
	}
	setMconnect(mconnect: MumpsConnect) {
		MumpsGlobalProvider._mconnect = mconnect
	}
	getTreeItem(element: GlobalNode): vscode.TreeItem {
		return element;
	}
	async getMoreNodes(node: GlobalNode) {
		if (node !== undefined && node.id) {
			node.id = node.id.slice(0, -1)
			this.getChildren(node)
			MumpsGlobalProvider.refresh();
		}
	}
	async getChildren(element?: GlobalNode): Promise<GlobalNode[]> {
		const globalNodes: GlobalNode[] = [];
		let id = ""
		if (element !== undefined && element.id) {
			id = element.id
		}
		let nodes: MumpsGlobal | undefined = undefined
		if (element?.contextValue === "search") {
			const searchFor: string = element.description as string
			nodes = await MumpsGlobalProvider._mconnect?.getGlobals(searchFor, id)
		} else {
			nodes = await MumpsGlobalProvider._mconnect?.getGlobals(id)
		}
		for (const key in nodes) {
			const variable = nodes[key];
			// Now you can access the properties of the variable
			const value = variable.value;
			//const isDefined = variable.isDefined;
			const isCollapsed = variable.hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
			const context = variable.moreToFollow ? "moreToCome" : "";
			globalNodes.push(new GlobalNode(key, value, isCollapsed, context))
		}
		return Promise.resolve(globalNodes);
	}
}

export class GlobalNode extends vscode.TreeItem {

	constructor(id: string, value: string, collapsibleState: vscode.TreeItemCollapsibleState, context: string) {
		super(value, collapsibleState);
		this.id = id
		this.label = id;
		this.description = value;
		if (context !== "") this.contextValue = context
		return this;
	}

	// iconPath = {
	// 	light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
	// 	dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	// };

	contextValue = 'globalnode';
}
