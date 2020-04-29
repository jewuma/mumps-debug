import * as vscode from 'vscode';
//let Location = vscode.Location;
//let Position = vscode.Position;
interface ItemHint {
	lineStatus: string,
	startstring: string
}
export class CompletionItemProvider {
	/**
 * Provides the completion items for the supplied words.
 *
 * @param {TextDocument} document
 * @param {Position} position
 * @param {CancellationToken} token
 * @returns
 */
	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
		//let word = document.getText(document.getWordRangeAtPosition(position));
		let line = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position))
		console.log(getLineStatus(line, position.character));
		let clean: Array<vscode.CompletionItem> = [];
		return clean;
	}
}

function getLineStatus(line: string | undefined, position: number):ItemHint {
	let lineStatus = 'lineStart';
	let lookPosition = 0;
	let lastCommand = '';
	let startstring = '';
	let isInsidePostcond=false;
	if (line) {
		while (lookPosition < position) {
			let char = line.substring(lookPosition,++lookPosition);
			let isWhiteSpace = (char === " " || char === "\t");
			let isBeginOfVariable = char.match(/[A-Za-z%^]/);
			let isAlphaChar = char.match(/[A-Za-z]/);
			//let isAlphanumeric=char.match(/[A-Za-z0-9%]/);
			//let isOperand = char.match(/[*+-/\[\]']/);
			if (lineStatus !== 'string' && char === ';') {
				return {lineStatus:'comment',startstring:''};
			}
			if (!isBeginOfVariable) {
				if (startstring!=='' && char.match(/[0-9]/)) {
					startstring+=char
				} else {
					startstring = '';
				}
			} else {
				startstring += char;
			}
			switch (lineStatus) {
				case 'argument': {
					if (isWhiteSpace) {
						if (isInsidePostcond) {
							isInsidePostcond=false;
						} else {
							lineStatus='command';
							lastCommand='';
						}
					} else if (char === '"') {
						lineStatus = 'string';
					} else if (isBeginOfVariable) {
						lineStatus = 'variable';
					} else if (char === "$") {
						lineStatus = 'function';
					}
					break;
				}
				case 'command': {
					if (char === ":") {
						lineStatus = 'argument';
						isInsidePostcond=true;
					} else if (isAlphaChar) {
						lastCommand += char;
						break;
					} else if (isWhiteSpace) {
						lineStatus = 'argument';
						if (lastCommand.match(/[D|DO|G|GOTO|J|JOB]/i)) {
							lineStatus = 'jumplabel'
						}
					} else {
						lineStatus = 'error';
						return {lineStatus:'error',startstring:''};
					}
					break;
				}
				case 'function': {
					if (isWhiteSpace) {
						if (isInsidePostcond) {
							isInsidePostcond=false;
						} else {
							lineStatus='command';
							lastCommand='';
						}
					} else if (char==="$") {
						lineStatus='jumplabel';
					}
					if (!isBeginOfVariable) {
						lineStatus = 'argument';
					}
					break;
				}
				case 'jumplabel': {
					if (isWhiteSpace) {
						lineStatus = 'command';
						lastCommand='';
					} else if (char===":") {
						lineStatus = 'argument';
					}
					break;
				}
				case 'label': {
					if (isWhiteSpace) {
						lineStatus = 'command';
					} else if (char = '(') {
						lineStatus = 'variable';
					}
					break;
				}
				case 'lineStart': {
					if (isWhiteSpace) {
						lineStatus = 'command';
					} else {
						lineStatus = 'label';
					}
					break;
				}
				case 'string': {
					if (char === '"') {
						lineStatus = 'argument';
					}
					break;
				}
				case 'variable': {
					if (isWhiteSpace) {
						if (isInsidePostcond) {
							isInsidePostcond=false;
							lineStatus='argument';
						} else {
							lineStatus='command';
							lastCommand='';
						}
					} else if (!isBeginOfVariable) {
						lineStatus = 'argument';
					}
					break;
				}
			}
		}
	}
	return {lineStatus,startstring};
}