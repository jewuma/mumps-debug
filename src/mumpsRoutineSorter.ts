import * as vscode from 'vscode';
import { LineToken, TokenType, ErrorInformation } from './mumpsLineParser'
import MumpsParseDb from './mumpsParseDb';

type Subroutines = {
	[name: string]: {
		startLine: number;
		endLine: number;
	};
};

export default class MumpsRoutineSorter {
	private _linetokens: LineToken[][] = [];
	private _subroutines: Subroutines = {};
	private _newSortedLines: string[];
	constructor() {
		const editor = vscode.window.activeTextEditor
		if (editor && editor.document && editor.document.languageId === 'mumps') {
			const parseDb = MumpsParseDb.getInstance(editor.document)
			this._linetokens = parseDb.getDocumentTokens()
			const errors: ErrorInformation[] = parseDb.getDocumentErrors()
			const document = editor.document;
			let errorFound = false
			this._newSortedLines = []
			for (let i = 0; i < document.lineCount; i++) {
				if (errors[i].text !== '') {
					errorFound = true
					break
				}
			}
			if (errorFound) {
				vscode.window.showErrorMessage("Routine sort aborted - errors found")
			} else {
				let line = this._lookforNextSubroutineEnd(0)
				if (line === -1 || line === this._linetokens.length - 1) {
					vscode.window.showErrorMessage("Routine sort ended - nothing to sort found")
				} else {
					const startSortLine = line + 1
					while (line !== -1 && line < this._linetokens.length) {
						const startSubroutine = ++line
						line = this._lookforNextSubroutineEnd(line)
						if (line === -1) break;
						this._generateSubroutineInfo(startSubroutine, line)
					}
					if (Object.keys(this._subroutines).length !== 0) {
						const subroutineNames = Object.keys(this._subroutines);
						subroutineNames.sort();
						for (const name of subroutineNames) {
							const subroutine = this._subroutines[name];
							for (let line = subroutine.startLine; line <= subroutine.endLine; line++) {
								this._newSortedLines.push(document.lineAt(line).text)
							}
						}
						const lastLineLength = document.lineAt(document.lineCount - 1).text.length
						editor.edit(editBuilder => {
							editBuilder.replace(new vscode.Range(startSortLine, 0, document.lineCount - 1, lastLineLength), this._newSortedLines.join("\n"));
						})
					}
				}
			}
		}
	}

	private _lookforNextSubroutineEnd(line: number): number {
		for (let index = line; index < this._linetokens.length; index++) {
			const tokens = this._linetokens[index];
			let subroutineEndFound = false;
			for (let j = 0; j < tokens.length; j++) {
				const token = tokens[j]
				if (token.type === TokenType.intendation) {
					break; // Ignore QUIT etc in indentation-levels > 0
				}
				if (token.type === TokenType.keyword) {
					const command = token.longName;
					if (command === "FOR" || command === "IF" || command === "ELSE") {
						break; // Ignore QUIT etc after FOR and IF
					}
					if (
						(command === "QUIT" ||
							command === "GOTO" ||
							command === "ZGOTO" ||
							command === "HALT" ||
							command === "ZHALT") &&
						token.isPostconditioned === false
					) {
						if (command === "GOTO" || command === "ZGOTO") {
							let hasPostcondition = false
							for (let k = j + 1; k < tokens.length; k++) {
								if (tokens[k].type === TokenType.argPostcondition) {
									hasPostcondition = true;
									break;
								} else if (tokens[k].type === TokenType.keyword) {
									break;
								}
							}
							if (!hasPostcondition) {
								subroutineEndFound = true
								break
							}
						} else {
							subroutineEndFound = true
							break
						}
					}
				}
			}
			if (subroutineEndFound) {
				return index
			}
		}
		return -1
	}
	private _generateSubroutineInfo(startLine: number, endLine: number) {
		for (let i = startLine; i <= endLine; i++) {
			const tokens = this._linetokens[i]
			if (tokens[0].type === TokenType.label) {
				const label = tokens[0].name
				this._subroutines[label] = { startLine, endLine }
				break
			}
		}
	}
	/**
	 * Remember a new Warning in this._warnings
	 * @param message Warning message
	 * @param line Line where th problem was found
	 * @param startPosition Position inside Line where the problem was found
	 * @param len Length of variable-name
	private _addWarning(message: string, line: number, startPosition: number, len: number, severity?) {
		if (severity === undefined) {
			severity = vscode.DiagnosticSeverity.Warning;
		}
		let endline = line;
		let endPosition = startPosition + len;
		if (len === -1) { //mark complete rest of line
			endline = line + 1;
			endPosition = 0;
		}
		this._diags.push({
			code: '',
			message,
			range: new vscode.Range(new vscode.Position(line, startPosition), new vscode.Position(endline, endPosition)),
			severity,
			source: ''
		});
	}

	private _generateLabelTable(document: vscode.TextDocument) {
		this._labelTable = {};
		for (let i = 0; i < document.lineCount; i++) {
			const line = document.lineAt(i);
			const lineInfo: LineInformation = this._parser.analyzeLine(line.text);
			if (lineInfo.tokens.length > 0 && lineInfo.tokens[0].type === TokenType.label) {
				this._labelTable[lineInfo.tokens[0].name] = i;
			}
		}
	}
	*/
}
