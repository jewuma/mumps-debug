import * as vscode from 'vscode';
import { LineToken, TokenType } from './mumpsLineParser'
import MumpsParseDb from './mumpsParseDb';

type Subroutines = {
	[name: string]: {
		startLine: number;
		endLine: number;
	};
};

export default class MumpsFoldingProvider implements vscode.FoldingRangeProvider {
	private _linetokens: LineToken[][] = [];
	private _subroutines: Subroutines = {};
	private _foldingRanges: vscode.FoldingRange[] = []
	public provideFoldingRanges(document: vscode.TextDocument): vscode.ProviderResult<vscode.FoldingRange[]> {
		const parseDb = MumpsParseDb.getInstance(document)
		this._linetokens = parseDb.getDocumentTokens()
		this._foldingRanges = []
		this._subroutines = {}
		let line = -1
		while (line !== -2 && line < this._linetokens.length) {
			const startSubroutine = ++line
			line = this._lookforNextSubroutineEnd(line)
			if (line === -2) break;
			this._generateFoldingInfo(startSubroutine, line)
		}
		Object.keys(this._subroutines).forEach((name) => {
			this._separateCommentsandCode(name)
		})
		return this._foldingRanges
	}
	private _lookforNextSubroutineEnd(line: number): number {
		for (let index = line; index < this._linetokens.length; index++) {
			const tokens = this._linetokens[index];
			let subroutineEndFound = false;
			for (let j = 0; j < tokens.length; j++) {
				const token = tokens[j]
				if (token.type === TokenType.indentation) {
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
		return -2
	}
	private _separateCommentsandCode(subroutineName: string) {
		const subroutine = this._subroutines[subroutineName]
		let commentStart = -1
		let commentLines = 0
		for (let line = subroutine.startLine; line < subroutine.endLine; line++) {
			if (this._linetokens[line][0]?.type === TokenType.label && this._linetokens[line][0].name === subroutineName) {
				if (commentLines > 1) {
					this._foldingRanges.push({ start: commentStart, end: commentStart + commentLines - 1 })
				}
				commentStart = -1
				commentLines = 0
				this._foldingRanges.push({ start: line, end: subroutine.endLine })
			} else if (this._linetokens[line][0]?.type === TokenType.comment
				|| this._linetokens[line][1]?.type === TokenType.comment
				&& this._linetokens[line][0]?.type !== TokenType.label) {
				if (commentStart === -1) {
					commentStart = line
					commentLines = 1
				} else commentLines++
			} else {
				if (commentLines > 1) {
					this._foldingRanges.push({ start: commentStart, end: commentStart + commentLines - 1 })
				}
				commentStart = -1
				commentLines = 0
			}
		}
	}
	private _generateFoldingInfo(startLine: number, endLine: number) {
		for (let i = startLine; i <= endLine; i++) {
			const tokens = this._linetokens[i]
			if (tokens[0]?.type === TokenType.label) {
				const label = tokens[0].name
				this._subroutines[label] = { startLine, endLine }
				break
			}
		}
	}
}