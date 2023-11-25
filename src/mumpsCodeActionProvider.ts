import * as vscode from 'vscode';
import MumpsParseDb from './mumpsParseDb';
import { TokenType } from './mumpsLineParser';
export default class MumpsCodeActionProvider implements vscode.CodeActionProvider {
	private _document: vscode.TextDocument | null = null
	private _actualDiagnostic: vscode.Diagnostic
	private _actualParameter: string
	private _parseDb: MumpsParseDb
	// eslint-disable-next-line class-methods-use-this
	provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range,
		context: vscode.CodeActionContext,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		token: vscode.CancellationToken
	): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
		this._parseDb = MumpsParseDb.getInstance(document)
		const diagnostics = context.diagnostics;
		const codeActions: vscode.CodeAction[] = diagnostics.map((diagnostic) => {
			let fix: vscode.CodeAction = new vscode.CodeAction('No Solution', vscode.CodeActionKind.Empty);
			if (diagnostic.code) {
				const parts = diagnostic.code.toString().split(":")
				const errorCode = parts[0]
				this._actualParameter = parts[1]
				this._document = document
				this._actualDiagnostic = diagnostic
				switch (errorCode) {
					case "VarAlreadyNewed":
						fix = this._removeNewVariable()
						break;
					case "NewedButNotUsed":
						fix = this._removeNewVariable()
						break;
					case "NewHidesParam":
						fix = this._removeNewVariable()
						break;
					case "VarNotNewed":
						fix = this._varNotNewed()
						break;
				}
			}
			return fix;
		});

		return codeActions;
	}
	private _removeNewVariable(): vscode.CodeAction {
		const fix = new vscode.CodeAction('Remove variable', vscode.CodeActionKind.QuickFix)
		fix.edit = new vscode.WorkspaceEdit()
		const uri = this._document?.uri
		const diagRange = this._actualDiagnostic.range
		const line = diagRange.start.line
		let startPosition = diagRange.start.character
		let endPosition = diagRange.end.character
		const tokens = this._parseDb.getLineTokens(line)
		const lineContent = this._parseDb.getLine(line)
		for (let i = 1; i < tokens.length; i++) {
			const token = tokens[i]
			const positionAfterToken = token.position + token.name.length
			if (token.position === startPosition) {
				if (lineContent[startPosition - 1] === " ") { //First NEW argument or single argument
					if (lineContent[positionAfterToken] === ",") {
						endPosition++
					} else { //Single NEW argument - delete NEW complete
						for (let j = i - 1; j >= 0; j--) {
							if (tokens[j].type === TokenType.keyword && tokens[j].longName === "NEW") {
								startPosition = tokens[j].position
								if (i === tokens.length) { //NEW argument is last token in the line
									while (startPosition > 0) {
										if (/\s/.test(lineContent[startPosition - 1])) {
											startPosition--
										} else break
									}
								}
								break
							}
						}
						if (positionAfterToken < lineContent.length && lineContent[positionAfterToken] === " ") endPosition++
					}
				} else { //not the first NEW argument
					if (lineContent[startPosition - 1] === ",") {
						startPosition--
					}
				}
				break
			}
		}
		fix.edit.replace(uri!, new vscode.Range(
			new vscode.Position(line, startPosition),
			new vscode.Position(line, endPosition)
		), "")
		return fix;
	}

	private _varNotNewed(): vscode.CodeAction {
		const fix = new vscode.CodeAction('Add Variable to NEW-Statement', vscode.CodeActionKind.QuickFix);
		fix.edit = new vscode.WorkspaceEdit();
		const diagnostic = this._actualDiagnostic
		const line = diagnostic.range.start.line
		const uri = this._document?.uri
		const subroutineStartLine = this._getSubroutineStart(line)
		if (subroutineStartLine === line) {
			const lineContent = this._parseDb.getLine(line)
			const tokens = this._parseDb.getLineTokens(line)
			let j = 1
			for (; j < tokens.length; j++) {
				if (tokens[j].type !== TokenType.local) {
					j--
					break
				}
			}
			const bracketPosition = tokens[j].position + tokens[j].name.length
			let endReplace = bracketPosition + 1;
			if (/\s/.test(lineContent[bracketPosition + 1])) endReplace++
			const range = new vscode.Range(new vscode.Position(line, bracketPosition + 1), new vscode.Position(line, endReplace))
			fix.edit.replace(uri!, range, "\n\tNEW " + this._actualParameter + "\n\t")
		} else {
			fix.edit = this._getfixedNew(subroutineStartLine + 1, uri!, fix.edit)
		}
		return fix;
	}
	private _getSubroutineStart(line: number): number {
		for (let i = line; i >= 0; i--) {
			const tokens = this._parseDb.getLineTokens(i);
			if (tokens.length > 0 &&
				tokens[0].type === TokenType.label &&
				tokens.length > 1 &&
				tokens[1].type === TokenType.local) { //Subroutine with parameters
				return i
			}
		}
		return -1
	}
	private _getfixedNew(line: number, uri: vscode.Uri, edit: vscode.WorkspaceEdit): vscode.WorkspaceEdit {
		const lineCount = this._parseDb.getLineCount()
		let i = line
		let varStartPosition = 0
		const variables: string[] = []
		for (; i < lineCount; i++) {
			const tokens = this._parseDb.getLineTokens(i)
			if (tokens.length === 0) continue
			if (tokens[0].type === TokenType.comment) continue
			if (tokens[0].type === TokenType.keyword && tokens[0].longName === "NEW" && tokens[0].isPostconditioned === false) {
				let j = 1
				for (; j < tokens.length; j++) {
					if (tokens[j].type !== TokenType.local) {
						break
					}
					if (j == 1) varStartPosition = tokens[j].position
					variables.push(tokens[j].name)
				}
				variables.push(this._actualParameter)
				variables.sort()
				const varString = variables.join(",")
				const startPosition = new vscode.Position(i, varStartPosition)
				const endPosition = new vscode.Position(i, tokens[j - 1].position + tokens[j - 1].name.length)
				edit.replace(uri, new vscode.Range(startPosition, endPosition), varString)
				return edit
			} else break
		}
		edit.insert(uri!, new vscode.Position(i, 0), "\tNEW " + this._actualParameter + "\n")
		return edit
	}
}
