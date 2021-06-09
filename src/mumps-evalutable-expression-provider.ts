import * as vscode from 'vscode';

export class MumpsEvalutableExpressionProvider {
	provideEvaluatableExpression(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.EvaluatableExpression> {
		/*
		const diags: readonly vscode.Diagnostic[] | undefined = mumpsDiagnostics.get(document.uri);
		//If Position is inside Error-marked Area then no Check for Variables is performed
		if (diags) {
			const found = diags.find(diag => diag.range.contains(position))
			if (found) {
				return undefined;
			}
		}
		*/
		const lineContent = document.lineAt(position.line).text;
		if (lineContent.charAt(position.character) === ")") {
			return this.getExpression(position.line, lineContent.substr(0, position.character))
		}
		let result: RegExpExecArray | null = null;
		let expression = /([ (,+\-\*_:=])([\^\$]?%?[a-zA-Z][a-zA-Z\d]*)/g;

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
	}
	getExpression(line: number, content: string): vscode.EvaluatableExpression | undefined {
		let isInsideString = false;
		for (let i = 0; i < content.length; i++) {
			if (content.charAt(i) === '"') {
				isInsideString = !isInsideString;
			}
		}
		if (isInsideString) { //Closing Bracket is inside a String - no evaluable Expression
			return;
		}
		let level = 1;
		let position = 0;
		for (let i = content.length - 1; i > -1; i--) {
			let char = content.charAt(i);
			if (char === '"') {
				isInsideString = !isInsideString;
			}
			if (char === '(' && !isInsideString) {
				level--;
				if (level === 0) {
					position = i;
					break;
				}
			}
			if (char === ')' && !isInsideString) {
				level++;
			}
		}
		if (level === 0) { // Corresponding opening bracket found
			let part = content.substr(0, position);
			let expression = /([ (,+\-\*_:=])([\^\$]?%?[a-zA-Z][a-zA-Z\d]*)$/
			let match = part.match(expression);
			if (match) {
				return new vscode.EvaluatableExpression(new vscode.Range(line, position - match[2].length, line, content.length + 1));
			}
		}
		return;
	}
}