import * as vscode from 'vscode';
import * as fs from 'fs/promises'
const lintingFiles = new Set<string>();
export type LintOptions = { checkNEWs: boolean, checkUnreachable: boolean }
export function isLintingFile(filePath: string): boolean {
	return lintingFiles.has(filePath);
}

export function startLintingFile(filePath: string): void {
	lintingFiles.add(filePath)
}

export function removeLintFileFlag(filePath: string): void {
	lintingFiles.delete(filePath)
}

import MumpsDiagnosticsProvider from './mumpsDiagnosticsProvider';
export default class MumpsLinter {
	diagnosticsCollection: vscode.DiagnosticCollection;
	lintOptions: LintOptions
	constructor(collection: vscode.DiagnosticCollection, options: LintOptions) {
		this.diagnosticsCollection = collection
		this.lintOptions = options
	}
	async lintAllFiles(token: vscode.CancellationToken): Promise<void> {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		this.diagnosticsCollection.clear()
		lintingFiles.clear()
		const diagnosticsProvider = new MumpsDiagnosticsProvider(this.diagnosticsCollection);
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No workspace folder is open.');
			return;
		}
		const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
		statusBarItem.text = 'Linting MUMPS files: 0%';
		statusBarItem.show();
		let processedFiles = 0;
		let totalFiles = 0;
		try {
			const lintPromises: Promise<void>[] = [];
			for (const folder of workspaceFolders) {
				if (token.isCancellationRequested) {
					statusBarItem.text = 'Linting MUMPS files: Abgebrochen';
					return;
				}
				const mumpsFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '**/*.m'));
				totalFiles += mumpsFiles.length;
				for (const file of mumpsFiles) {
					if (token.isCancellationRequested) {
						statusBarItem.text = 'Linting MUMPS files: Abgebrochen';
						return
					}
					const content = await fs.readFile(file.fsPath, 'utf8');
					lintPromises.push(diagnosticsProvider.updateFileDiagnostics(file, content, this.lintOptions));
					processedFiles++;
					statusBarItem.text = `Linting MUMPS files: ${processedFiles} files, ${((processedFiles / totalFiles) * 100).toFixed(2)}%`;
				}
				await Promise.all(lintPromises);
				lintingFiles.clear()
				vscode.window.showInformationMessage(`Linted ${mumpsFiles.length} MUMPS files.`);
			}
		}
		finally {
			vscode.window.showInformationMessage('Scan abgeschlossen.');
			setTimeout(() => {
				statusBarItem.dispose(); // Entfernen des StatusBarItem nach kurzer Zeit
			}, 3000);

		}
	}
}