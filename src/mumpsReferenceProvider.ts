import * as vscode from 'vscode';
import { TokenType, MumpsLineParser } from './mumpsLineParser';
const fs = require('fs');
const parser = new MumpsLineParser();
export default class MumpsReferenceProvider {
	provideReferences(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Location[] | null | undefined> {
		let myToken = parser.getTokenAt(document.lineAt(position).text, position.character);
		let result: vscode.Location[] = [];
		if (myToken !== undefined) {
			let searchType: TokenType = myToken.type;
			let searchToken = myToken?.name;
			if (searchType === TokenType.label) {
				let routine = document.fileName.replace(/\\/g, '/').split('/').pop();
				routine = routine!.split('.')[0].replace('_', '%');
				searchType = TokenType.entryref
				let externalLabel: string = searchToken + "^" + routine;
				// Check active document for entryrefs
				let docLines: string[] = document.getText().split('\n');
				for (let i = 0; i < docLines.length; i++) {
					if (docLines[i].includes(externalLabel) || docLines[i].includes(searchToken)) {
						let foundPosition = -1;
						do {
							let extPosition = docLines[i].indexOf(externalLabel, foundPosition + 1);
							if (extPosition === -1) {
								foundPosition = docLines[i].indexOf(searchToken, foundPosition + 1);
								if (foundPosition === -1) {
									break;
								}
							} else {
								foundPosition = extPosition;
							}
							let token = parser.getTokenAt(docLines[i], foundPosition + 1)
							if (token !== undefined && (token.name === externalLabel || token.name === searchToken) &&
								(token.type === TokenType.entryref || token.type === TokenType.exfunction)) {
								result!.push(new vscode.Location(document.uri, new vscode.Range(i, foundPosition, i, foundPosition + token.name.length)));
							}
						} while (1);
					}
				}
				// Check all other documents and return result
				return this.getallLabelReferences(result, externalLabel, searchType);
			} else {
				if (searchType === TokenType.local || searchType === TokenType.global) {
					return this.getallLabelReferences(result, searchToken, searchType);
				}
				return Promise.resolve(result);
			}
		} else {
			return Promise.resolve(result);
		}
	}
	getallLabelReferences(result: vscode.Location[], searchToken: string, searchType: TokenType): Promise<vscode.Location[]> {
		//result.push(new vscode.Location(vscode.Uri.file("X://AAFA02.m"), new vscode.Position(1, 1)));
		return new Promise(resolve => {
			vscode.workspace.findFiles('*.m').then((files) => {
				let filesToCheck = files.length;
				for (let i = 0; i < filesToCheck; i++) {
					let path = files[i].fsPath;
					fs.readFile(path, 'utf8', (err, content: string) => {
						if (!err) {
							if (content.includes(searchToken)) {
								let lines = content.split('\n');
								for (let i = 0; i < lines.length; i++) {
									if (lines[i].includes(searchToken)) {
										let foundPosition = lines[i].indexOf(searchToken);
										let token = parser.getTokenAt(lines[i], foundPosition + 1)
										if (token !== undefined && token.name === searchToken &&
											(token.type === searchType || (token.type === TokenType.exfunction && searchType === TokenType.entryref))) {
											result!.push(new vscode.Location(vscode.Uri.file(path), new vscode.Range(i, foundPosition, i, foundPosition + token.name.length)));
										}
									}
								}
							}
						}
						if (i === filesToCheck - 1) {
							resolve(result);
						}
					});
				}
			});
		});
	}
}
