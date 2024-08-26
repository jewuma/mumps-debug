import * as vscode from 'vscode';
import MumpsParseDb from './mumpsParseDb';
import { TokenType } from './mumpsLineParser';
import { isLintingFile } from './mumpsLinter';
export default class MumpsCodeActionProvider implements vscode.CodeActionProvider {
	private _document: vscode.TextDocument | null = null
	private _actualDiagnostic: vscode.Diagnostic
	private _actualParameter: string
	private _parseDb: MumpsParseDb
	provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range,
		context: vscode.CodeActionContext,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		token: vscode.CancellationToken
	): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
		if (!isLintingFile(document.uri.fsPath)) {
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
				const lineTokens = this._parseDb.getLineTokens(range.end.line)
				if (lineTokens.length > 1 && lineTokens[lineTokens.length - 1].longName === "SET" && lineTokens[lineTokens.length - 2].longName === "FOR") {
					const shortNames: boolean = lineTokens[lineTokens.length - 1].name.length === 1;
					const isUppercase: boolean = lineTokens[lineTokens.length - 1].name[0] === "S"
					let intendation = 0
					if (lineTokens[0].type === TokenType.intendation) {
						intendation = lineTokens[0].name.length;
					}
					fix.title = "Create $ORDER-Loop";
					fix.kind = vscode.CodeActionKind.QuickFix;
					fix.command = {
						command: "mumps.generateForLoop",
						title: "Create $ORDER-Loop",
						arguments: [document, range, shortNames, isUppercase, intendation]
					}
				}
				return fix;
			});

			return codeActions;
		}
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
	public generateForLoop(document: vscode.TextDocument, range: vscode.Range, shortNames: boolean, isUppercase: boolean, intendation: number): void {
		vscode.window.showInputBox({ prompt: "Enter loop variable including indices:" }).then((variableName) => {
			if (variableName) {
				this._parseDb = MumpsParseDb.getInstance(document)
				const variableParts = variableName.split("(");
				if (variableParts.length === 2) {
					let forToken = "for"
					let setToken = "set"
					let orderToken = "$order("
					let quitToken = "quit"
					let doToken = "do"
					if (shortNames) {
						forToken = "f"
						setToken = "s"
						orderToken = "$o("
						quitToken = "q"
						doToken = "d"
					}
					if (isUppercase) {
						forToken = forToken.toUpperCase();
						setToken = setToken.toUpperCase();
						orderToken = orderToken.toUpperCase();
						quitToken = quitToken.toUpperCase();
						doToken = doToken.toUpperCase();
					}
					const variableStart = variableParts[0] + "(";
					const indices = variableParts[1].split(",");
					const indexCount = indices.length
					let bracketCounter = 0;
					for (const char of indices[indexCount - 1]) {
						if (char === "(") {
							bracketCounter++;
						} else if (char === ")") {
							bracketCounter--;
						}
					}
					if (bracketCounter < 0) {
						indices[indexCount - 1] = indices[indexCount - 1]!.slice(0, -1)
					}
					const startIndex = this.getStartVariable(range.end.line, indices);
					let forLoop = " " + indices[startIndex] + "=" + orderToken + variableStart
					for (let i = 0; i <= startIndex; i++) {
						forLoop += indices[i]
						if (i < startIndex) forLoop += ","
					}
					forLoop += ")) " + quitToken + ":" + indices[0] + '=""  ' + doToken + "\n";
					if (indexCount > startIndex + 1) {
						for (let i = startIndex + 1; i < indexCount; i++) {
							forLoop += "\t" + ". ".repeat(i - startIndex + intendation) + setToken + " " + indices[i] + '="" ' + forToken + "  " +
								setToken + " " + indices[i] + "=" + orderToken + variableStart + indices[0] + ","
							for (let j = 1; j <= i; j++) {
								forLoop += indices[j];
								if (j < i) { forLoop += "," }
							}
							forLoop += ")) " + quitToken + ":" + indices[i] + '=""  ' + doToken + "\n";
						}
						forLoop += "\t" + ". ".repeat(indexCount - startIndex + intendation)
					}
					const editor = vscode.window.activeTextEditor;
					if (!editor) {
						return;
					}
					const line = document.lineAt(range.end.line);
					const lineText = line.text.trimEnd()

					editor.edit((editBuilder) => {
						editBuilder.replace(line.range, lineText + forLoop);
					}).then(() => {
						// Setze den Cursor an das Ende des eingefügten Textes
						const newEndPosition = new vscode.Position(range.end.line + indexCount - startIndex, 99);
						editor.selection = new vscode.Selection(newEndPosition, newEndPosition);
						editor.revealRange(new vscode.Range(newEndPosition, newEndPosition));
					});
				}
			}
		});
	}
	private getStartVariable(startLine: number, indices: string[]): number {
		let startIndex = 0
		const lineTokens = this._parseDb.getLineTokens(startLine)
		const tokenCount = lineTokens.length
		for (let i = tokenCount - 3; i >= 0; i--) {
			if (lineTokens[i].longName === "SET") {
				for (let j = i + 1; j < tokenCount - 2; j++) {
					if (lineTokens[j].type === TokenType.local) {
						startIndex = indices.indexOf(lineTokens[j].name)
						if (startIndex === -1) {
							startIndex = 0;
						}
					}
				}
			}
		}
		if (startLine > 0) {
			const lineTokens = this._parseDb.getLineTokens(startLine - 1)
			const tokenCount = lineTokens.length
			for (let i = tokenCount - 2; i >= 0; i--) {
				if (lineTokens[i].longName === "SET") {
					for (let j = i + 1; j < tokenCount - 1; j++) {
						if (lineTokens[j].type === TokenType.local) {
							startIndex = indices.indexOf(lineTokens[j].name)
							if (startIndex === -1) {
								startIndex = 0;
							}
						}
					}
				}
			}
		}
		return startIndex
	}
}
