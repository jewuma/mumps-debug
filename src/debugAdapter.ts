/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { MumpsDebugSession } from './mumpsDebug';
import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {
	/*
	vscode.languages.registerEvaluatableExpressionProvider({ scheme: 'file', language: 'mumps' }, {
		provideEvaluatableExpression(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.EvaluatableExpression> {
			const lineContent = document.lineAt(position.line).text;

			let expression = /([ (,+\-\*_:])(\^?%?[a-zA-Z][a-zA-Z\d]*(\(.[^\)]+\))?)/g;
			let result: RegExpExecArray | null = null;

			// find the word under the cursor
			while (result = expression.exec(lineContent)) {
				let start = result.index;
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
	*/
}
MumpsDebugSession.run(MumpsDebugSession);

//vscode.languages.registerEvaluatableExpressionProvider({ scheme: 'file', language: 'mumps' }, new SimpleEvaluatableExpressionProvider());


