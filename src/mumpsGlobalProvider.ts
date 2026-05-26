/* eslint-disable class-methods-use-this */
import * as vscode from 'vscode';
import { MumpsConnect } from './mumpsConnect';

export class MumpsGlobalProvider implements vscode.TreeDataProvider<GlobalNode> {
  private static _onDidChangeTreeData = new vscode.EventEmitter<GlobalNode | undefined | void>();

  readonly onDidChangeTreeData = MumpsGlobalProvider._onDidChangeTreeData.event;

  private static _mconnect: MumpsConnect | null = null;

  private pendingSearch?: {
    term: string;
    global?: string;
  };

  public constructor() {}

  static refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  static setMconnect(mconnect: MumpsConnect) {
    MumpsGlobalProvider._mconnect = mconnect;
  }

  async search(node?: GlobalNode) {
    const globalName = node?.id || '';

    const input = await vscode.window.showInputBox({
      title: node ? 'Search inside Global ' + globalName : 'Search for global key',
      placeHolder: 'Type search text',
    });

    if (!input) return;

    this.pendingSearch = {
      term: input,
      global: globalName || undefined,
    };

    MumpsGlobalProvider.refresh();
  }

  getTreeItem(element: GlobalNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: GlobalNode): Promise<GlobalNode[]> {
    const conn = MumpsGlobalProvider._mconnect;

    if (!conn) return [];

    // LoadMore-Knoten lädt die nächste Seite
    if (element?.nodeType === 'loadMore') {
      return this.loadPage(element.startFrom ?? '');
    }

    const startFrom = element?.id ?? '';

    return this.loadPage(startFrom);
  }
  private async loadPage(startFrom: string): Promise<GlobalNode[]> {
    const conn = MumpsGlobalProvider._mconnect;

    if (!conn) return [];

    const nodes = this.pendingSearch
      ? await conn.getGlobals(this.pendingSearch.term, this.pendingSearch.global || startFrom)
      : await conn.getGlobals(startFrom);

    this.pendingSearch = undefined;
    const result: GlobalNode[] = [];

    let lastKey: string | undefined;
    let hasMore = false;

    for (const key in nodes) {
      const v = nodes[key];

      lastKey = key;
      hasMore = !!v.moreToFollow;

      result.push(
        new GlobalNode(
          key,
          v.value,
          v.hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
        )
      );
    }

    // nächste Seite anhängen
    if (hasMore && lastKey) {
      result.push(
        new GlobalNode('Load more...', '', vscode.TreeItemCollapsibleState.Collapsed, 'loadMore', lastKey.slice(0, -1))
      );
    }

    return result;
  }
}

export class GlobalNode extends vscode.TreeItem {
  constructor(
    public id: string,
    public value: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public nodeType: 'normal' | 'loadMore' = 'normal',
    public startFrom?: string
  ) {
    super(id, collapsibleState);

    this.label = id;
    this.description = value;

    if (nodeType === 'loadMore') {
      this.command = {
        command: 'mumps.Globals.loadMore',
        title: 'Load more',
        arguments: [this],
      };

      this.contextValue = 'loadMore';
    }
  }
}
