/*
Mumps-Debug-Extension for Visual Studio Code by Jens Wulf
*/

'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, ProviderResult, DebugConfiguration, CancellationToken } from 'vscode';
import { MumpsDebugSession} from './mumpsDebug';
export async function activate(context: vscode.ExtensionContext) {

	// register a configuration provider for 'mumps' debug type

	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('mumps', new MumpsConfigurationProvider()));
	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('mumps', new InlineDebugAdapterFactory()));
	const mumpsDiagnostics = vscode.languages.createDiagnosticCollection("mumps");
	//vscode.debug.onDidStartDebugSession(()=>refreshDiagnostics(vscode.window.activeTextEditor!.document, mumpsDiagnostics))
	context.subscriptions.push(mumpsDiagnostics);
	//subscribeToDocumentChanges(context, mumpsDiagnostics);
	//vscode.languages.registerCodeActionsProvider({scheme:'file', language:'mumps'},new MumpsSpellChecker(),{providedCodeActionKinds:MumpsSpellChecker.providedCodeActionKinds})
	vscode.languages.registerEvaluatableExpressionProvider({ scheme: 'file', language: 'mumps' }, {
		provideEvaluatableExpression(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.EvaluatableExpression> {
			const diags:readonly vscode.Diagnostic[]|undefined=mumpsDiagnostics.get(document.uri);
			//If Position is inside Error-marked Area then no Check for Variables is performed
			if (diags) {
				const found=diags.find(diag=>diag.range.contains(position))
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
				config.hostname = '127.0.0.1';
				config.localRoutinesPath = 'y:\\',
					config.port = 9000
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

