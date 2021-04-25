
'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, ProviderResult, DebugConfiguration, CancellationToken } from 'vscode';
import { MumpsDebugSession } from './mumpsDebug';
import { MumpsHoverProvider } from './mumps-hover-provider'
import { MumpsDefinitionProvider } from './mumps-definition-provider'
import { MumpsSignatureHelpProvider } from './mumps-signature-help-provider'
import { DocumentFunction } from './mumps-documenter'
import { MumpsDocumentSymbolProvider } from './mumps-document';
import { CompletionItemProvider } from './mumps-completion-item-provider';
import * as AutospaceFunction from './mumps-autospace'
import { MumpsLineParser } from './mumpsLineParser';
import { MumpsHighlighter, SemanticTokens } from './mumps-highlighter';
import { expandCompress } from './mumpsCompExp';
const parser = new MumpsLineParser;

const fs = require('fs');
let timeout: ReturnType<typeof setTimeout> | undefined;
let entryRef: string | undefined = "";
export async function activate(context: vscode.ExtensionContext) {
	const MUMPS_MODE: vscode.DocumentFilter = { language: 'mumps', scheme: 'file' };
	// register a configuration provider for 'mumps' debug type
	const mumpsDiagnostics = vscode.languages.createDiagnosticCollection("mumps");
	let storage = context.storageUri!.fsPath;
	if (!fs.existsSync(storage)) {
		fs.mkdirSync(storage);
	}
	const dbFile = storage + "/labeldb.json";
	const wsState = context.workspaceState;
	context.subscriptions.push(
		vscode.commands.registerCommand("mumps.documentFunction", () => { DocumentFunction(); }),
		vscode.commands.registerCommand("mumps.autoSpaceEnter", () => { AutospaceFunction.autoSpaceEnter(); }),
		vscode.commands.registerCommand("mumps.autoSpaceTab", () => { AutospaceFunction.autoSpaceTab(); }),
		vscode.commands.registerCommand("mumps.toggleExpandedCommands", () => { expandCompress(wsState) }),
		vscode.commands.registerCommand('mumps.getEntryRef', () => {
			return vscode.window.showInputBox({
				placeHolder: "Please enter the Entry-Reference to start Debugging",
				value: entryRef
			})
		}),
		vscode.languages.registerHoverProvider(MUMPS_MODE, new MumpsHoverProvider()),
		vscode.languages.registerDefinitionProvider(MUMPS_MODE, new MumpsDefinitionProvider()),
		vscode.languages.registerSignatureHelpProvider(MUMPS_MODE, new MumpsSignatureHelpProvider(), '(', ','),
		vscode.languages.registerDocumentSymbolProvider(MUMPS_MODE, new MumpsDocumentSymbolProvider()),
		vscode.languages.registerCompletionItemProvider(MUMPS_MODE, new CompletionItemProvider(dbFile)),
		vscode.languages.registerDocumentSemanticTokensProvider(MUMPS_MODE, MumpsHighlighter, SemanticTokens),
		vscode.languages.registerDocumentFormattingEditProvider(MUMPS_MODE, {
			provideDocumentFormattingEdits: (document, options, token) => {
				let textEdits: vscode.TextEdit[] = []
				for (let i = 0; i < document.lineCount; i++) {
					let line = document.lineAt(i).text;
					formatDocumentLine(line, i, textEdits);
				}
				return textEdits;
			}
		}),
		vscode.languages.registerDocumentRangeFormattingEditProvider(MUMPS_MODE, {
			provideDocumentRangeFormattingEdits: (document, range, options, token) => {
				let textEdits: vscode.TextEdit[] = []
				for (let i = range.start.line; i <= range.end.line; i++) {
					let line = document.lineAt(i).text;
					formatDocumentLine(line, i, textEdits);
				}
				return textEdits;
			}
		}),
		vscode.debug.registerDebugConfigurationProvider('mumps', new MumpsConfigurationProvider()),
		vscode.debug.registerDebugAdapterDescriptorFactory('mumps', new InlineDebugAdapterFactory()),
		vscode.window.onDidChangeActiveTextEditor(editor => { if (editor) { triggerUpdateDiagnostics(editor.document, mumpsDiagnostics) } }),
		vscode.workspace.onDidChangeTextDocument(editor => { if (editor) { triggerUpdateDiagnostics(editor.document, mumpsDiagnostics) } })
	);
	vscode.languages.registerEvaluatableExpressionProvider(MUMPS_MODE, {
		provideEvaluatableExpression(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.EvaluatableExpression> {
			const diags: readonly vscode.Diagnostic[] | undefined = mumpsDiagnostics.get(document.uri);
			//If Position is inside Error-marked Area then no Check for Variables is performed
			if (diags) {
				const found = diags.find(diag => diag.range.contains(position))
				if (found) {
					return undefined;
				}
			}
			const lineContent = document.lineAt(position.line).text;
			let expression = /([ (,+\-\*_:=])(\^?%?[a-zA-Z][a-zA-Z\d]*(\(.[^\)]+\))?)/g;
			if (lineContent.substring(position.character, position.character + 1) !== ")") {
				expression = /([ (,+\-\*_:=])(\^?%?[a-zA-Z][a-zA-Z\d]*)/g;
			}
			let result: RegExpExecArray | null = null;

			// find the word under the cursor
			while (result = expression.exec(lineContent)) {
				let start = result.index;
				start += result[0].length - result[2].length; // ignore first part of expression
				let end = start + result[2].length - 1;

				if (start <= position.character && end >= position.character) {
					return new vscode.EvaluatableExpression(new vscode.Range(position.line, start, position.line, end), result[2]);
				}
			}

			return undefined;
			//	const wordRange = document.getWordRangeAtPosition(position);
			//return wordRange ? new vscode.EvaluatableExpression(wordRange) : undefined;
		}
	});
}

export function deactivate() {
	// nothing to do
}

class MumpsConfigurationProvider implements vscode.DebugConfigurationProvider {

	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	*/
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {

		// if launch.json is missing or empty
		if (!config.type && !config.request && !config.name) {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.languageId === 'mumps') {
				config.type = 'mumps';
				config.name = 'Launch';
				config.request = 'launch';
				config.program = '${file}';
				config.stopOnEntry = true;
				config.hostname = '192.168.0.1';
				config.localRoutinesPath = 'y:\\';
				config.port = 9000;
			}
		}

		if (!config.program) {
			return vscode.window.showInformationMessage("Cannot find a program to debug").then(_ => {
				return undefined;	// abort launch
			});
		}

		return config;
	}
}
class InlineDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {

	createDebugAdapterDescriptor(_session: vscode.DebugSession): ProviderResult<vscode.DebugAdapterDescriptor> {
		return new vscode.DebugAdapterInlineImplementation(new MumpsDebugSession());
	}
}
function formatDocumentLine(line: string, lineNumber, textEdits) {
	let emptyLine = line.replace(/(\ |\t)/ig, "");
	if (emptyLine.length === 0) {
		textEdits.push(vscode.TextEdit.insert(new vscode.Position(lineNumber, 0), "\t;"))
	}
	if (line.endsWith(". ")) {
		textEdits.push(vscode.TextEdit.insert(new vscode.Position(lineNumber, line.length), ";"))
	} else if (line.endsWith(".")) {
		textEdits.push(vscode.TextEdit.insert(new vscode.Position(lineNumber, line.length), " ;"))
	}
	if (line.startsWith(" ")) {
		let endSpace: number;
		//console.log("start")
		for (endSpace = 0; endSpace < line.length; endSpace++) {
			if (line.charAt(endSpace) !== " ") {
				break;
			}
		}
		textEdits.push(vscode.TextEdit.replace(new vscode.Range(new vscode.Position(lineNumber, 0), new vscode.Position(lineNumber, endSpace)), "\t"));
	}
}
function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
	if (document && document.languageId === 'mumps') {
		collection.clear();
		let diags: Array<vscode.Diagnostic> = [];
		for (let i = 0; i < document.lineCount; i++) {
			let line = document.lineAt(i);
			let diag = parser.checkLine(line.text);
			if (diag.text !== '') {
				diags.push({
					code: '',
					message: diag.text,
					range: new vscode.Range(new vscode.Position(i, diag.position), new vscode.Position(i, line.text.length)),
					severity: vscode.DiagnosticSeverity.Error,
					source: '',
				});

			}
		}
		if (diags) {
			collection.set(document.uri, diags);
		}
	}
}
function triggerUpdateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
	if (timeout) {
		clearTimeout(timeout);
		timeout = undefined;
	}
	timeout = setTimeout(() => updateDiagnostics(document, collection), 500);
}

