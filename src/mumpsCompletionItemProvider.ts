import * as vscode from 'vscode';
import { MumpsLineParser, LabelInformation, LineObject, entryref } from './mumpsLineParser';
import * as fs from 'fs'

enum LineStatus {
	noJumplabel, jumplabel
}

interface ItemHint {
	lineStatus: LineStatus,
	startString: string
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
	private _parser = new MumpsLineParser();
	constructor(labeldb: string) {
		this._labelsReady = false;
		this._dbfile = labeldb;
		this._refreshLabelDB();
	}
	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		this._document = document;
		const line = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position))
		const parsed = this._parser.parseLine(line);
		const status = getLineStatus(parsed, position.character);
		this._refreshLocalLabels(document);
		let completionItems: Array<vscode.CompletionItem> = [];
		if (this._labelsReady && status.lineStatus === LineStatus.jumplabel) {
			const replaceRange = new vscode.Range(new vscode.Position(position.line, position.character - status.startString.length), position)
			completionItems = this._findLabel(status.startString, completionItems, replaceRange);
		}
		return completionItems;
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
	private _refreshLocalLabels(document: vscode.TextDocument) {
		let routine: string = document.fileName.replace(/\\/g, '/').split('/').pop() ?? "";
		routine = routine?.split('.')[0].replace('_', '%') ?? "";
		const lines = document.getText().split('\n');
		const existingLabels = this._labelDB.labels.filter((label) => label.routine === routine);

		// Create a map of existing labels for quick lookup
		const existingLabelsMap = new Map(existingLabels.map((label) => [label.label, label]));

		// Process each line in the document
		let labelsinDocumentChanged = false;
		for (let i = 0; i < lines.length; i++) {
			if (routine) {
				if (i === 0) {
					// Handle special case for the first line
					const firstLineLabel = { label: '*FL', routine, line: lines[0] };
					if (!existingLabelsMap.has('*FL') || existingLabelsMap.get('*FL')?.line !== firstLineLabel.line) {
						// Add or update the first line label
						existingLabelsMap.set('*FL', firstLineLabel);
						labelsinDocumentChanged = true;
					}
				}
				const labelMatch = lines[i].match(/^[%A-Za-z0-9][A-Za-z0-9]{0,31}/);
				if (labelMatch) {
					const labelName = labelMatch[0];
					const labelLine = { label: labelName, routine, line: lines[i] };
					if (existingLabelsMap.has(labelName)) {
						// Label exists, check if it's different
						const existingLabel = existingLabelsMap.get(labelName);
						if (existingLabel?.line !== labelLine.line) {
							// Update the existing label
							existingLabelsMap.set(labelName, labelLine);
							labelsinDocumentChanged = true;

						}
					} else {
						// Label doesn't exist, add it
						existingLabelsMap.set(labelName, labelLine);
						labelsinDocumentChanged = true;
					}
				}
			}
		}
		if (labelsinDocumentChanged) {
			const updatedLabels: LabelItem[] = [];
			existingLabelsMap.forEach((labelItem, labelName) => {
				updatedLabels.push({ label: labelName, routine, line: labelItem.line })
			})
			this._labelDB.labels = this._labelDB.labels.filter((label) => {
				return label.routine !== routine;
			})
			this._labelDB.labels.push(...updatedLabels);
		}
	}

	private _refreshFileLabels(path: string) {  // Refresh all Labels of a changed .m File
		let routine = path.replace(/\\/g, '/').split('/').pop();
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
						label = lines[i].match(/^[%A-Za-z0-9][A-Za-z0-9]{0,31}/)
						if (label) {
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
		const localLabels: LabelInformation[] = this._parser.getLabels(this._document.getText());
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
			if (detail.length > 0) {
				sortText = '099';
			} //prefer documented lables
			if (item.routine === '') { // local labels first
				sortText = '098';
			}

			list.push({ label, detail, sortText, range: replaceRange });
		}
		return list;
	}
}
function getLineStatus(parsed: LineObject, position: number): ItemHint {
	let lineStatus = LineStatus.noJumplabel
	let startString = ""
	if (parsed.lineRoutines && parsed.lineRoutines.length > 0) {
		for (const i in parsed.lineRoutines) {
			const cmd = parsed.lineRoutines[i];
			if (cmd.mPostCondition !== "" && position >= cmd.pcPosition && position <= (cmd.pcPosition + cmd.mPostCondition.length)) {
				startString = cmd.mPostCondition.substring(0, position - cmd.pcPosition);
				if (startString.indexOf("$$") !== -1) {
					const lastIndex = startString.lastIndexOf("$$");
					startString = startString.slice(lastIndex + 2);
					if (startString.match(entryref)) {
						lineStatus = LineStatus.jumplabel
					}
				}
			} else if (cmd.mArguments !== "" && position >= cmd.argPosition && position <= (cmd.argPosition + cmd.mArguments.length)) {
				startString = cmd.mArguments.substring(0, position - cmd.argPosition)
				if (cmd.mCommand.match(/[D|DO|G|GOTO|J|JOB]/i)) {
					if (startString.match(entryref)) {
						lineStatus = LineStatus.jumplabel
					}
				} else if (startString.indexOf("$$") !== -1) {
					const lastIndex = startString.lastIndexOf("$$");
					startString = startString.slice(lastIndex + 2);
					if (startString.match(entryref)) {
						lineStatus = LineStatus.jumplabel
					}
				}
			}
		}
	}
	return { lineStatus, startString }
}

