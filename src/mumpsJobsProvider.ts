import * as vscode from 'vscode';
import { MumpsConnect } from './mumpsConnect';

export class MumpsJobsProvider implements vscode.TreeDataProvider<JobNode> {
  private static _onDidChangeTreeData = new vscode.EventEmitter<JobNode | undefined | void>();

  readonly onDidChangeTreeData = MumpsJobsProvider._onDidChangeTreeData.event;

  private static _mconnect: MumpsConnect | null = null;

  public constructor() {
    console.log('MumpsJobsProvider initialized');
  }

  static refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  static setMconnect(mconnect: MumpsConnect): void {
    this._mconnect = mconnect;
  }
  /*eslint class-methods-use-this: 0*/
  getTreeItem(element: JobNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: JobNode): Promise<JobNode[]> {
    if (element) {
      return [];
    }

    const nodes = await MumpsJobsProvider._mconnect?.getJobs();

    if (!nodes) {
      return [];
    }

    return Object.values(nodes).map((job) => new JobNode(job.jobId, job.user, job.processorUsage, job.memUsage));
  }
}

export class JobNode extends vscode.TreeItem {
  constructor(
    public readonly jobId: number,
    public readonly user: string,
    public readonly processorUsage: number,
    public readonly memUsage: number
  ) {
    super(`${jobId}`, vscode.TreeItemCollapsibleState.None);

    this.id = `${jobId}`;

    this.description = `${user} | CPU: ${processorUsage}% | MEM: ${memUsage}%`;

    this.tooltip = `Job ${jobId}\n` + `User: ${user}\n` + `CPU: ${processorUsage}%\n` + `Memory: ${memUsage}%`;

    this.contextValue = 'mumpsJob';

    this.iconPath = new vscode.ThemeIcon('server-process');
  }

  contextValue = 'mumpsJob';
}
