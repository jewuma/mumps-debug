'use strict';

import * as vscode from 'vscode';
import { autoSpaceEnter, autoSpaceTab } from './mumpsAutospace';
import MumpsCodeActionProvider from './mumpsCodeActionProvider';
import MumpsCompletionItemProvider from './mumpsCompletionItemProvider';
import MumpsConfigurationProvider from './mumpsConfigurationProvider';
import MumpsDebugSession from './mumpsDebug';
import MumpsDiagnosticsProvider from './mumpsDiagnosticsProvider';
import MumpsDocumenter from './mumpsDocumenter';
import MumpsDocumentSymbolProvider from './mumpsDocumentSymbolProvider';
import MumpsDefinitionProvider from './mumpsDefinitionProvider';
import MumpsEvalutableExpressionProvider from './mumpsEvalutableExpressionProvider';
import MumpsExpandCompress from './mumpsCompExp';
import MumpsFoldingProvider from './mumpsFoldingProvider';
import MumpsFormattingHelpProvider from './mumpsFormattingHelpProvider';
import { MumpsGlobalProvider, GlobalNode } from './mumpsGlobalProvider';
import { MumpsHighlighter, SemanticTokens } from './mumpsHighlighter';
import MumpsHoverProvider from './mumpsHoverProvider';
import MumpsLinter, { removeLintFileFlag, LintOptions } from './mumpsLinter';
import MumpsReferenceProvider from './mumpsReferenceProvider';
import MumpsRoutineSorter from './mumpsRoutineSorter';
import MumpsSignatureHelpProvider from './mumpsSignatureHelpProvider';
import * as fs from 'fs'
let timeout: ReturnType<typeof setTimeout> | undefined;
const entryRef: string | undefined = "";
let dbFile = "";
let localRoutinesPath = "";
let cancellationTokenSource: vscode.CancellationTokenSource | null = null;
const globalDirectoryProvider = MumpsGlobalProvider.getInstance();
const mumpsCodeActionProvider = new MumpsCodeActionProvider();
export let mumpsDiagnostics: vscode.DiagnosticCollection;
export async function activate(context: vscode.ExtensionContext) {
	const MUMPS_MODE: vscode.DocumentFilter = { language: 'mumps', scheme: 'file' };
	mumpsDiagnostics = vscode.languages.createDiagnosticCollection("mumps");
	let storage = "";
	if (context.storageUri !== undefined) {
		storage = context.storageUri.fsPath;
		if (!fs.existsSync(storage)) {
			fs.mkdirSync(storage);
		}
		dbFile = storage + "/labeldb.json";
		context.subscriptions.push(vscode.languages.registerCompletionItemProvider(MUMPS_MODE, new MumpsCompletionItemProvider(dbFile)));
	}
	const wsState = context.workspaceState;
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.text = "$(primitive-square) Stop Scan";
	statusBarItem.command = 'mumps.stopScan';
	statusBarItem.tooltip = "Stop current Mumps scan";
	statusBarItem.hide(); // initially hidden
	const scanCommand = async () => {
		if (cancellationTokenSource) {
			// Abbruch wenn bereits ein Scan läuft
			cancellationTokenSource.cancel();
			cancellationTokenSource = null;
			statusBarItem.hide(); // hide the button when scan is canceled
			return;
		}
		const userOptions = await askUserForLintOptions();
		cancellationTokenSource = new vscode.CancellationTokenSource();
		const token = cancellationTokenSource.token;
		statusBarItem.show(); // show the button when scan starts
		try {
			await new MumpsLinter(mumpsDiagnostics, userOptions).lintAllFiles(token);
		} finally {
			cancellationTokenSource = null; // Zurücksetzen der Quelle nach Abschluss des Scans
			statusBarItem.hide(); // hide the button when scan is finished
		}
	}
	const stopCommand = () => {
		if (cancellationTokenSource) {
			cancellationTokenSource.cancel();
			cancellationTokenSource = null;
			vscode.window.showInformationMessage('Scan wurde gestoppt.');
			statusBarItem.hide(); // hide the button when scan is stopped
		} else {
			vscode.window.showInformationMessage('Kein laufender Scan zum Stoppen.');
		}
	};
	const generateForLoop = (document: vscode.TextDocument, range: vscode.Range, shortNames: boolean, isUppercase: boolean, indentation: number) =>
		mumpsCodeActionProvider.generateForLoop(document, range, shortNames, isUppercase, indentation);

	context.subscriptions.push(
		vscode.commands.registerCommand("mumps.documentFunction", () => { MumpsDocumenter(); }),
		vscode.commands.registerCommand("mumps.autoSpaceEnter", () => { autoSpaceEnter(); }),
		vscode.commands.registerCommand("mumps.autoSpaceTab", () => { autoSpaceTab(); }),
		vscode.commands.registerCommand("mumps.sortRoutine", () => { new MumpsRoutineSorter() }),
		vscode.commands.registerCommand("mumps.toggleExpandedCommands", () => { MumpsExpandCompress(wsState) }),
		vscode.commands.registerCommand('mumps.getEntryRef', () => { return getEntryRef() }),
		vscode.commands.registerCommand('mumps.Globals.loadMore', (node: GlobalNode) => globalDirectoryProvider.getMoreNodes(node)),
		vscode.commands.registerCommand('mumps.Globals.refresh', () => MumpsGlobalProvider.refresh()),
		vscode.commands.registerCommand('mumps.Globals.search', (node: GlobalNode) => globalDirectoryProvider.search(node)),
		vscode.commands.registerCommand('mumps.generateForLoop', generateForLoop),
		vscode.commands.registerCommand('mumps.scanWorkspaceForErrors', scanCommand),
		vscode.commands.registerCommand('mumps.stopScan', stopCommand),
		vscode.debug.registerDebugConfigurationProvider('mumps', new MumpsConfigurationProvider()),
		vscode.debug.registerDebugAdapterDescriptorFactory('mumps', new InlineDebugAdapterFactory()),
		vscode.languages.registerHoverProvider(MUMPS_MODE, new MumpsHoverProvider()),
		vscode.languages.registerDefinitionProvider(MUMPS_MODE, new MumpsDefinitionProvider()),
		vscode.languages.registerEvaluatableExpressionProvider(MUMPS_MODE, new MumpsEvalutableExpressionProvider()),
		vscode.languages.registerSignatureHelpProvider(MUMPS_MODE, new MumpsSignatureHelpProvider(), '(', ','),
		vscode.languages.registerDocumentSymbolProvider(MUMPS_MODE, new MumpsDocumentSymbolProvider()),
		vscode.languages.registerDocumentSemanticTokensProvider(MUMPS_MODE, MumpsHighlighter, SemanticTokens),
		vscode.languages.registerDocumentFormattingEditProvider(MUMPS_MODE, new MumpsFormattingHelpProvider()),
		vscode.languages.registerDocumentRangeFormattingEditProvider(MUMPS_MODE, new MumpsFormattingHelpProvider()),
		vscode.languages.registerReferenceProvider(MUMPS_MODE, new MumpsReferenceProvider()),
		vscode.languages.registerFoldingRangeProvider(MUMPS_MODE, new MumpsFoldingProvider()),
		vscode.languages.registerCodeActionsProvider(MUMPS_MODE, new MumpsCodeActionProvider()),
		vscode.window.registerTreeDataProvider('mumpsGlobals', MumpsGlobalProvider.getInstance()),
		vscode.window.onDidChangeActiveTextEditor(editor => { if (editor) { triggerUpdateDiagnostics(editor.document, mumpsDiagnostics) } }),
		vscode.workspace.onDidChangeTextDocument(editor => { if (editor) { triggerUpdateDiagnostics(editor.document, mumpsDiagnostics) } }),
		vscode.workspace.onDidOpenTextDocument(document => { triggerUpdateDiagnostics(document, mumpsDiagnostics) }),
		statusBarItem
	);
}

export function deactivate() {
	// nothing to do
}

class InlineDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
	/*eslint class-methods-use-this: 0*/
	createDebugAdapterDescriptor(): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		return new vscode.DebugAdapterInlineImplementation(new MumpsDebugSession());
	}
}

function triggerUpdateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
	if (timeout) {
		clearTimeout(timeout);
		timeout = undefined;
	}
	timeout = setTimeout(() => {
		removeLintFileFlag(document.fileName)
		const diagnosticsProvider = new MumpsDiagnosticsProvider(collection)
		diagnosticsProvider.updateDiagnostics(document);
	}, 500);
}

function getEntryRef() {
	return vscode.window.showInputBox({
		placeHolder: "Please enter the Entry-Reference to start Debugging",
		value: entryRef
	})
}
async function askUserForLintOptions(): Promise<LintOptions> {
	const config = vscode.workspace.getConfiguration('mumps')
	const checkVariablesNEWsDefault = config.get<boolean>('enableVariableCheck', true)
	const checkUnreachableCodeDefault = config.get<boolean>('warnIfCodeIsUnreachable', true)
	const options = [
		{ label: 'Check correct NEWing', picked: checkVariablesNEWsDefault },
		{ label: 'Check for unreachable code', picked: checkUnreachableCodeDefault }
	];

	const selectedOptions = await vscode.window.showQuickPick(options, {
		canPickMany: true,
		placeHolder: 'Select the additional checks you want to perform'
	});

	if (selectedOptions) {
		const checkNEWs = selectedOptions.some(option => option.label === 'Check correct NEWing')
		const checkUnreachable = selectedOptions.some(option => option.label === 'Check for unreachable code')
		await config.update('enableVariableCheck', checkNEWs, vscode.ConfigurationTarget.Workspace)
		await config.update('warnIfCodeIsUnreachable', checkUnreachable, vscode.ConfigurationTarget.Workspace)
		return { checkNEWs, checkUnreachable };
	}

	return { checkNEWs: false, checkUnreachable: false };
}

export function getdbFile() {
	return dbFile;
}

export function getWworkspaceFolder() {
	return vscode.workspace.workspaceFolders?.[0].uri.fsPath;
}
export function getLocalRoutinesPath() {
	return localRoutinesPath;
}
export function setLocalRoutinesPath(path: string) {
	localRoutinesPath = path;
}
