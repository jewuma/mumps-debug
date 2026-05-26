import * as vscode from 'vscode';
import { LockEntry, LockRegion, MumpsConnect } from './mumpsConnect';

export class MumpsLocksProvider implements vscode.TreeDataProvider<LockNode> {
  private static _onDidChangeTreeData = new vscode.EventEmitter<LockNode | undefined | void>();

  readonly onDidChangeTreeData = MumpsLocksProvider._onDidChangeTreeData.event;

  private static _mconnect: MumpsConnect | null = null;

  public constructor() {}

  static refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  static setMconnect(mconnect: MumpsConnect): void {
    this._mconnect = mconnect;
  }
  /*eslint class-methods-use-this: 0*/
  getTreeItem(element: LockNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: LockNode): Promise<LockNode[]> {
    const nodes: LockNode[] = [];

    const regions = await MumpsLocksProvider._mconnect?.getLocks();

    if (!regions) {
      return [];
    }

    // Root-Level => Regionen anzeigen
    if (!element) {
      for (const region of regions) {
        nodes.push(new LockNode(region.name, vscode.TreeItemCollapsibleState.Collapsed, region));
      }

      return nodes;
    }

    // Unterhalb einer Region => Locks anzeigen
    if (element.region) {
      for (const entry of element.region.lockEntries) {
        nodes.push(new LockNode(entry.name, vscode.TreeItemCollapsibleState.None, undefined, entry));
      }
    }

    return nodes;
  }
}

export class LockNode extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly region?: LockRegion,
    public readonly entry?: LockEntry
  ) {
    super(label, collapsibleState);

    // Region
    if (region) {
      this.id = `region:${region.name}`;

      this.description =
        `Waiting: ${region.jobsWaiting ?? 0} | ` + `Locks: ${region.usedLocks ?? 0}/${region.lockSlots ?? 0}`;

      this.tooltip =
        `Region: ${region.name}\n` +
        `Waiting Jobs: ${region.jobsWaiting ?? 0}\n` +
        `Possible Jobs: ${region.possibleJobs ?? 0}\n` +
        `Used Locks: ${region.usedLocks ?? 0}\n` +
        `Lock Slots: ${region.lockSlots ?? 0}`;

      this.contextValue = 'lockRegion';

      this.iconPath = new vscode.ThemeIcon('database');
    }

    // Lock Entry
    if (entry) {
      this.id = `lock:${entry.region}:${entry.jobId}:${entry.name}`;

      this.description = `Job ${entry.jobId}`;

      this.tooltip = `Lock: ${entry.name}\n` + `Job: ${entry.jobId}\n` + `Region: ${entry.region}`;

      this.contextValue = 'lockEntry';

      this.iconPath = new vscode.ThemeIcon('lock');
    }
  }

  contextValue = '';
}
