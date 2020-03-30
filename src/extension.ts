/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import { WorkspaceFolder, DebugConfiguration, ProviderResult, CancellationToken } from 'vscode';
import { MumpsDebugSession } from './mumpsDebug';
//import * as Net from 'net';

/*
 * The compile time flag 'runMode' controls how the debug adapter is run.
 * Please note: the test suite only supports 'external' mode.
 */

//const runMode: 'external' | 'server' | 'inline' = 'inline';

export function activate(context: vscode.ExtensionContext) {

	// register a configuration provider for 'mock' debug type
	const provider = new MumpsConfigurationProvider();
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('mumps', provider));
	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('mumps', new InlineDebugAdapterFactory()));
	vscode.languages.registerEvaluatableExpressionProvider({ scheme: 'file', language: 'mumps' }, {
		provideEvaluatableExpression(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.EvaluatableExpression> {
			const lineContent = document.lineAt(position.line).text;
			let expression = /([ (,+\-\*_:=])(\^?%?[a-zA-Z][a-zA-Z\d]*(\(.[^\)]+\))?)/g;
			if (lineContent.substring(position.character,position.character+1)!==")") {
				expression = /([ (,+\-\*_:=])(\^?%?[a-zA-Z][a-zA-Z\d]*)/g;
			}
			let result: RegExpExecArray | null = null;

			// find the word under the cursor
			while (result = expression.exec(lineContent)) {
				let start = result.index;
				start+=result[0].length-result[2].length; // ignore first part of expression
				let end = start + result[2].length - 1;

				if (start <= position.character && end >= position.character) {
					return new vscode.EvaluatableExpression(new vscode.Range(position.line, start, position.line, end),result[2]);
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
