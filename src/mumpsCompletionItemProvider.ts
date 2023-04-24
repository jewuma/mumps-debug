import * as vscode from 'vscode';
import { MumpsLineParser, LabelInformation } from './mumpsLineParser';
const parser = new MumpsLineParser();
import fs = require('fs');

interface ItemHint {
	lineStatus: string,
	startstring: string
}
interface LabelItem {
	routine: string,
	label: string,
	line: string
}
interface DbItem {
	labels: LabelItem[],
	routines: { path: string }
}
export default class CompletionItemProvider {
	/**
 * Provides the completion items for the supplied words.
 *
 * @param {TextDocument} document
 * @param {Position} position
 * @param {CancellationToken} token
 * @returns
 */
	private _labelsReady: boolean;
	private _labelDB: DbItem;
	private _filesToCheck: number;
	private _dbfile: string;
	private _document: vscode.TextDocument;
	constructor(labeldb: string) {
		this._labelsReady = false;
		this._dbfile = labeldb;
		this._refreshLabelDB();
	}
	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		//let word = document.getText(document.getWordRangeAtPosition(position));
		const line = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position))
		const status = getLineStatus(line, position.character);
		this._document = document;
		let clean: Array<vscode.CompletionItem> = [];
		if (this._labelsReady && status.lineStatus === 'jumplabel') {
			const replaceRange = new vscode.Range(new vscode.Position(position.line, position.character - status.startstring.length), position)
			clean = this._findLabel(status.startstring, clean, replaceRange);
		}
		return clean;
	}
	private _refreshLabelDB() { // Look for all Labels in .m-Routines and them + Comments
		if (!fs.existsSync(this._dbfile)) {
			const db = {
				labels: [{ routine: '', label: '' }],
				routines: {}
			}
			fs.writeFileSync(this._dbfile, JSON.stringify(db));
		}
		fs.readFile(this._dbfile, (err, data) => {
			if (!err) {
				this._labelDB = JSON.parse(data.toString());
				let dbChanged = false;
				vscode.workspace.findFiles('*.m').then((files) => {
					this._filesToCheck = files.length;
					for (let i = 0; i < files.length; i++) {
						const path = files[i].fsPath;
						fs.stat(path, (err, stats) => {
							if (!err) {
								const ms = this._labelDB.routines[path];
								if (ms === undefined || stats.mtimeMs > ms) {
									this._labelDB.routines[path] = stats.mtimeMs;
									dbChanged = true;
									if (stats.size < 50000) {  //parse only Files <50K
										this._refreshFileLabels(path);
									} else {
										this._checkReady(dbChanged);
									}
								} else {
									this._checkReady(dbChanged);
								}
							} else {
								this._checkReady(dbChanged);
							}
						})
					}
					this._labelsReady = true;
				});
			}
		});
	}
	private _checkReady(dbChanged: boolean) {	// Check if all .m Files are processed and save LabelDB then
		if (--this._filesToCheck === 0) {
			if (dbChanged) {
				fs.writeFile(this._dbfile, JSON.stringify(this._labelDB), (err) => {
					if (err) {
						vscode.window.showErrorMessage("Error writing Label DB");
					}
				});
			}
		}
	}
	private _refreshFileLabels(path: string) {  // Refresh all Labels of a changed .m File
		let routine = path.replace(/\\\\/g, '/').split('/').pop();
		routine = routine?.split('.')[0].replace('_', '%') ?? "";
		fs.readFile(path, 'utf8', (err, content: string) => {
			if (!err) {
				const lines = content.split('\n');
				let label: RegExpMatchArray | null = null;
				this._labelDB.labels = this._labelDB.labels.filter((label) => {
					return label.routine !== routine;
				})
				for (let i = 0; i < lines.length; i++) {
					if (routine) {
						if (i === 0) {
							this._labelDB.labels.push({ label: '*FL', routine, line: lines[0] });
						}
						if (label = lines[i].match(/^[%A-Za-z0-9][A-Za-z0-9]{0,31}/)) {
							this._labelDB.labels.push({ label: label[0], routine, line: lines[i] })
						}
					}
				}
			}
			this._checkReady(true);
		});
	}
	private _findLabel(startstring: string, list: Array<vscode.CompletionItem>, replaceRange: vscode.Range) {
		//let hits = 0;
		let hitlist: LabelItem[] = [];
		const localLabels: LabelInformation[] = parser.getLabels(this._document.getText());
		let sortText = '';
		if (startstring.charAt(0) === '^') {
			const suchstring = startstring.substring(1);
			hitlist = this._labelDB.labels.filter((item) => {
				return item.routine.startsWith(suchstring);
			});
		} else {
			if (startstring.indexOf('^') !== -1) {
				const label = startstring.split('^')[0];
				const routinepart = startstring.split('^')[1];
				hitlist = this._labelDB.labels.filter((item) => {
					const fits = item.label === label && item.routine.startsWith(routinepart);
					return fits;
				});
			} else {
				for (let i = 0; i < localLabels.length; i++) {
					if (localLabels[i].name.startsWith(startstring)) {
						hitlist.push({ routine: '', label: localLabels[i].name, line: this._document.lineAt(localLabels[i].line).text })
					}
				}
				hitlist = hitlist.concat(this._labelDB.labels.filter((item) => {
					const fits = item.label.startsWith(startstring);
					return fits;
				}));
			}
		}
		for (let i = 0; i < hitlist.length && i < 100; i++) {
			sortText = '100';
			const item = hitlist[i];
			let label = item.routine !== '' ? item.label + '^' + item.routine : item.label;
			if (label === startstring) {
				continue;
			}
			if (item.label === "*FL") {
				if (!startstring.startsWith('^')) {
					continue;
				}
				label = '^' + item.routine;
			}
			let detail = ''
			if (item.line.charAt(item.label.length) === '(') {
				if (item.line.indexOf(')') !== -1) {
					detail = item.line.split(')')[0] + ')';
				}
			}
			if (item.line.indexOf(';') !== -1) {
				detail += item.line.substring(item.line.indexOf(';') + 1);
			}

			if (detail.length > 0) { sortText = '099'; } //prefer documented lables
			if (item.routine === '') { // local labels first
				sortText = '098';
			}
			list.push({ label, detail, sortText, range: replaceRange });
		}
		return list;
	}
}
function getLineStatus(line: string | undefined, position: number): ItemHint {
	let lineStatus = 'lineStart';
	let lookPosition = 0;
	let lastCommand = '';
	let startstring = '';
	let isInsidePostcond = false;
	if (line) {
		while (lookPosition < position) {
			const char = line.substring(lookPosition, ++lookPosition);
			const isWhiteSpace = (char === " " || char === "\t");
			const isBeginOfVariable = char.match(/[A-Za-z%^]/);
			const isAlphaChar = char.match(/[A-Za-z]/);
			//let isAlphanumeric=char.match(/[A-Za-z0-9%]/);
			//let isOperand = char.match(/[*+-/\[\]']/);
			if (lineStatus !== 'string' && char === ';') {
				return { lineStatus: 'comment', startstring: '' };
			}
			if (!isBeginOfVariable) {
				if (startstring !== '' && char.match(/[0-9]/)) {
					startstring += char
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
							isInsidePostcond = false;
							if (lastCommand.match(/[D|DO|G|GOTO|J|JOB]/i)) {
								lineStatus = 'jumplabel'
							}
						} else {
							lineStatus = 'command';
							lastCommand = '';
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
						isInsidePostcond = true;
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
						return { lineStatus: 'error', startstring: '' };
					}
					break;
				}
				case 'function': {
					if (isWhiteSpace) {
						if (isInsidePostcond) {
							isInsidePostcond = false;
						} else {
							lineStatus = 'command';
							lastCommand = '';
						}
					} else if (char === "$") {
						lineStatus = 'jumplabel';
					} else if (!isBeginOfVariable) {
						lineStatus = 'argument';
					}
					break;
				}
				case 'jumplabel': {
					if (isWhiteSpace) {
						lineStatus = 'command';
						lastCommand = '';
					} else if (char === ":") {
						lineStatus = 'argument';
					} else if (char === "(") {
						lineStatus = 'argument';
					}
					break;
				}
				case 'label': {
					if (isWhiteSpace) {
						lineStatus = 'command';
					} else if (char === '(') {
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
							isInsidePostcond = false;
							lineStatus = 'argument';
						} else {
							lineStatus = 'command';
							lastCommand = '';
						}
					} else if (!isBeginOfVariable) {
						lineStatus = 'argument';
					}
					break;
				}
			}
		}
	}
	return { lineStatus, startstring };
}
