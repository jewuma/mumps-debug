import * as vscode from 'vscode';
import { LineToken, TokenType, ErrorInformation } from './mumpsLineParser'
import MumpsParseDb from './mumpsParseDb';
import { convertMumpsPosition } from './mumpsConnect';

interface Parameter {
	name: string,
	position: number
}
interface Subroutine {
	startLine: number,
	endLine: number
	parameters: Parameter[]
}
interface GeneralSubroutine {
	name: string,
	startLine: number,
	endLine: number
}
interface VariableState {
	newedAtLine?: number[],
	newedAtPostion: number[],
	newedAtLevel?: number[],
	isExcluded?: boolean,
	isParameter?: boolean,
	isUsed?: boolean
	parameterPosition: number
}
interface VariableStates {
	name: VariableState
}
enum QuitState {
	noQuit, behindQuit, behindLevelQuit
}
const symbols: vscode.SymbolInformation[] = [];

/**
 * Checks if mumps routines NEWs variables correctly
 * Checks if intendation levels are correct
 * Checks if there's unreachable code
 *
 */
export default class MumpsDiagnosticsProvider {
	private _parseDb: MumpsParseDb
	private _linetokens: LineToken[][] = [];
	private _errorInformation: ErrorInformation[] = []
	private _diags: vscode.Diagnostic[] = [];
	private _variablesToBeIgnored: string[] = [];
	private _enableVariableCheck = true;
	private _varStates: VariableStates;
	private _levelExclusiveNew: number[];
	private _subroutines: Subroutine[] = [];
	private _labelTable: { [key: string]: number } = {};
	private _document: vscode.TextDocument;
	private _routine: Subroutine = { startLine: -1, endLine: -1, parameters: [] };
	private _level = 0;
	private _lineWithDo = -2;
	private _isBehindQuit: QuitState[] = [];
	private _startUnreachable: vscode.Position | false = false;
	private _activeSubroutine: GeneralSubroutine = { name: '', startLine: -1, endLine: -1 }
	constructor(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
		if (document && document.languageId === 'mumps') {
			this._parseDb = MumpsParseDb.getInstance(document)
			this._linetokens = this._parseDb.getDocumentTokens()
			this._errorInformation = this._parseDb.getDocumentErrors()
			this._document = document;
			this._diags = [];
			for (let i = 0; i < 32; i++) { this._isBehindQuit.push(QuitState.noQuit) }
			const configuration = vscode.workspace.getConfiguration();
			if (configuration.mumps.variablesToBeIgnoredAtNewCheck !== undefined) {
				this._variablesToBeIgnored = configuration.mumps.variablesToBeIgnoredAtNewCheck.split(",");
			}
			if (configuration.mumps.enableVariableCheck !== undefined) {
				this._enableVariableCheck = configuration.mumps.enableVariableCheck;
			}
			collection.delete(document.uri);
			collection.clear();
			this._generateLabelTable(document);
			for (let i = 0; i < document.lineCount; i++) {
				const tokens = this._linetokens[i]
				const errorInformation = this._errorInformation[i]
				if (errorInformation.text !== '') {
					this._addWarning(errorInformation.text, i, errorInformation.position, -1, vscode.DiagnosticSeverity.Error)
				}
				this._checkLine(i, tokens);
			}
			if (this._activeSubroutine.startLine > -1) {
				this._addSymbol(this._activeSubroutine.name, this._activeSubroutine.startLine, this._linetokens.length);
			}
			for (let i = 0; i < this._subroutines.length; i++) {
				this.analyzeSubroutine(this._subroutines[i]);
			}
			if (this._diags) {
				collection.set(document.uri, this._diags);
			}
		}
	}
	/**
	 * Checks a single subroutine if variables are NEWed correctly
	 * sets found problems in this._warnings
	 * @param routine subroutine to be checked
	 */
	public analyzeSubroutine(routine: Subroutine): void {
		let code: string = "";
		if (this._enableVariableCheck) {
			this._varStates = {} as VariableStates;
			this._levelExclusiveNew = [];
			let level = 0; //intendation-level
			for (let i = 0; i < routine.parameters.length; i++) {
				this._varStates[routine.parameters[i].name] = { isParameter: true, parameterPosition: routine.parameters[i].position }
			}
			for (let i = routine.startLine; i <= routine.endLine; i++) {
				let intendationFound = false;
				const line = this._parseDb.getLine(i)
				for (let j = 0; j < this._linetokens[i].length; j++) {
					let token = this._linetokens[i][j];
					if (i === routine.startLine && j === 0) { // skip parameters
						while (++j < this._linetokens[i].length && this._linetokens[i][j].type === TokenType.local) { /* empty */ }
						if (j < this._linetokens[i].length) {
							token = this._linetokens[i][j];
						} else {
							continue;
						}
					}
					if (token.type === TokenType.intendation) {
						intendationFound = true;
						const newLevel = token.name.length
						if (newLevel < level) {
							this._reduceIntendationLevel(level, newLevel);
						}
						level = newLevel;
					} else if (token.type === TokenType.comment) {
						if (!intendationFound && level > 0) {
							this._reduceIntendationLevel(level, 0);
							level = 0;
						}
					}
					if (token.type === TokenType.keyword) {
						if (!intendationFound && level > 0) {
							this._reduceIntendationLevel(level, 0);
							level = 0;
						}
						if (token.longName === "NEW") {
							let anyVariablesNewed = false;
							let containsExclusions = false;
							//exclude postcondition
							while (++j < this._linetokens[i].length) {
								const token = this._linetokens[i][j]
								const position = token.position
								if (line[position - 1] === " ") {
									--j
									break;
								} else if (token.type === TokenType.local) {
									this._checkNewed(token.name, level, i, token.position)
								}
							}
							while (++j < this._linetokens[i].length &&
								(this._linetokens[i][j].type === TokenType.local ||
									this._linetokens[i][j].type === TokenType.sysvariable)) {
								anyVariablesNewed = true;
								token = this._linetokens[i][j];
								if (token.isExcludedVariable) {
									containsExclusions = true;
								}
								if (token.type === TokenType.local) {
									const varName = token.name;
									let message = '';
									const varState: VariableState = this._varStates[varName] ? this._varStates[varName] : { isExcluded: token.isExcludedVariable }
									// Variable is already NEWed or used
									if (varState.isParameter) {
										if (token.isExcludedVariable) {
											varState.isExcluded = true;
										} else {
											if (level === 0) { //NEW inside higher intendation-level should be possible
												message = "NEW hides formal parameter " + varName;
												code = "NewHidesParam:" + varName;
											}
										}
									} else {
										if (!varState.newedAtLevel) { // Variable not NEWed yet - New is OK
											varState.newedAtLevel = [level];
											varState.newedAtLine = [i];
											varState.newedAtPostion = [token.position];
										} else {
											if (varState.newedAtLevel.indexOf(level) > -1) {
												message = "Variable " + varName + " already mentioned in NEW command"
												code = "VarAlreadyNewed:" + varName
											} else {
												varState.newedAtLevel.push(level);
												// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
												varState.newedAtLine!.push(i);
												// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
												varState.newedAtPostion!.push(token.position);
											}
										}
									}
									if (message !== "") {
										this._addWarning(message, i, token.position, token.name.length, vscode.DiagnosticSeverity.Warning, code);
									}
									this._varStates[varName] = varState;
								}
							}
							if (anyVariablesNewed === false) {
								containsExclusions = true;
							}
							if (containsExclusions) {
								this._levelExclusiveNew.push(level);
							}
							//Check if parameters are hidden by NEW-exclusion
							if (routine.parameters.length > 0 && containsExclusions && level === 0) {
								for (let k = 0; k < routine.parameters.length; k++) {
									if (!this._varStates[routine.parameters[k].name].isExcluded) {
										this._addWarning("NEW hides formal parameters", i, token.position, token.name.length,
											vscode.DiagnosticSeverity.Warning,
											"NewHidesParam:" + this._varStates[routine.parameters[k].name]);
										break;
									}
								}
							}
						}
					} else if (token.type === TokenType.local) {  // local variable found at a non NEW command
						const varName = token.name;
						this._checkNewed(varName, level, i, token.position);
					}
				}
			}
			this._checkVariableUsage(routine)
		}
	}
	/**
	 * Check if Variables are formal parameters but not used, or NEWed but not used
	 * @param routine Subroutine to check
	 * @param varStates array of found variable-states
	 */
	private _checkVariableUsage(routine: Subroutine): void {
		for (const key in this._varStates) {
			const state: VariableState = this._varStates[key];
			if (state.isParameter && !state.isUsed && !this._isIgnoredVariable(key)) {
				this._addWarning("Variable " + key + " is a formal parameter but not used", routine.startLine,
					state.parameterPosition,
					key.length,
					vscode.DiagnosticSeverity.Warning,
					"FormalNotUsed:" + key);
			} else if (state.newedAtLine && state.newedAtLine.length > 0 && !state.isUsed && !this._isIgnoredVariable(key)) {
				this._addWarning("Variable " + key + " is NEWed but not used",
					state.newedAtLine[0],
					state.newedAtPostion[0],
					key.length,
					vscode.DiagnosticSeverity.Warning,
					"NewedButNotUsed:" + key
				);
			}
		}
	}
	/**
	 * Check if a local Variable is correctly NEWed or generate Warning
	 * @param varName Variable to be checked
	 * @param level intendation-level on which Variable is found
	 * @param line Line where variable is found
	 * @param position Position inside Line
	 */
	private _checkNewed(varName: string, level: number, line: number, position: number): void {
		//Check Variable-Ignore-List
		let varState = this._varStates[varName];
		if (!this._isIgnoredVariable(varName)) {
			let isNewed = false;
			for (let k = 0; k < this._levelExclusiveNew.length; k++) {
				if (this._levelExclusiveNew[k] <= level) {
					isNewed = true;
				}
			}
			if (!isNewed) {
				if (varState) {
					if (!varState.isParameter) {
						if (varState.newedAtLevel) {
							for (let i = 0; i < varState.newedAtLevel.length; i++) {
								if (varState.newedAtLevel[i] <= level) {
									isNewed = true;
									break;
								}
							}
						}
					} else {
						isNewed = true;
					}
					varState.isUsed = true;
				}
			}
			if (!isNewed) {
				this._addWarning("Variable " + varName + " not NEWed", line, position, varName.length,
					vscode.DiagnosticSeverity.Warning,
					"VarNotNewed:" + varName);
			}
		}
		if (varState) {
			varState.isUsed = true;
		} else {
			varState = { isUsed: true }
		}
		this._varStates[varName] = varState;
	}
	/**
	 * Remember a new Warning in this._warnings
	 * @param message Warning message
	 * @param line Line where th problem was found
	 * @param startPosition Position inside Line where the problem was found
	 * @param len Length of variable-name
	 */
	private _addWarning(message: string, line: number, startPosition: number, len: number, severity?, code?: string) {
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
			code,
			message,
			range: new vscode.Range(new vscode.Position(line, startPosition), new vscode.Position(endline, endPosition)),
			severity,
			source: ''
		});
	}
	private _checkLine(line: number, tokens: LineToken[]) {
		let ifFlag = false;
		let intendationFound = false;
		if (tokens.length === 0) { //empty line = intendation 0 is it OK?
			if (line === this._lineWithDo + 1) {
				this._addWarning("Expected intendation level: " + (this._level + 1) + ", found: 0", line, 0, 1, vscode.DiagnosticSeverity.Warning,
					"ExpectedIntendation:" + (this._level + 1));
				this._lineWithDo = -2;
			}
			this._level = 0;
			this._removeQuits(0);
		}
		for (let tokenId = 0; tokenId < tokens.length; tokenId++) { // iterate over every token in actual line
			let token: LineToken = tokens[tokenId];
			if (token.type === TokenType.comment && token.name.match(/ignoreVars:/)) { //Check for IgnoreVars-directive
				this._variablesToBeIgnored = this._variablesToBeIgnored.concat(token.name.split("ignoreVars:")[1].split(","));
			}
			if (tokenId === 0 && token.type === TokenType.label) { 	//If there was unreachable code before this label
				//save a warning
				//Remember label in symbol library
				this._removeQuits(this._level - 1)
				this._checkUnreachable(line, token)
				if (tokenId === 0 && token.type === TokenType.label) {
					if (this._activeSubroutine.startLine > -1) {
						this._addSymbol(this._activeSubroutine.name, this._activeSubroutine.startLine, line)
					}
					this._activeSubroutine.startLine = line;
					this._activeSubroutine.name = token.name;
					if (tokens[1] !== undefined && tokens[1].type === TokenType.local) { //Begin of a parametrized subroutine
						this._routine.startLine = line;
						while (++tokenId < tokens.length && tokens[tokenId].type === TokenType.local) {
							this._routine.parameters.push({ name: tokens[tokenId].name, position: tokens[tokenId].position });
						}
						if (tokenId >= tokens.length) {
							continue;
						}
						token = tokens[tokenId];
					}
				}
			}
			if (token.type === TokenType.keyword || token.type === TokenType.comment) { //Check intendation level
				if (intendationFound === false) {
					if (line === this._lineWithDo + 1) {
						this._addWarning("Expected intendation level: " + (this._level + 1) + ", found: " + this._level,
							line, 0, token.position, vscode.DiagnosticSeverity.Warning,
							"ExpectedIntendation:" + (this._level + 1));
						this._lineWithDo = -2;
					}
					this._level = 0;
					this._removeQuits(0)
					this._checkUnreachable(line, token)
				}
			}
			if (token.type === TokenType.keyword) {
				this._checkUnreachable(line, token)
				const command = token.longName;
				if (command === "IF" || command === "ELSE" || command === "FOR") {
					ifFlag = true;
				}
				if (command === "DO" && token.hasArguments === false) {
					this._lineWithDo = line;
				}
				if (!ifFlag && (command === "QUIT" || command === "GOTO" || command === "HALT") && !token.isPostconditioned) {
					let hasPostcondition = false;
					if (command === "GOTO") { //Check if GOTO argument is postconditioned
						for (let k = tokenId + 1; k < tokens.length; k++) {
							if (tokens[k].type === TokenType.entryref) {
								if (!this._labelExists(tokens[k].name))  // && !/^\+\d+$/.test(tokens[k].name))
									this._addWarning("Entry-Reference not found",
										line, tokens[k].position, tokens[k].name.length, vscode.DiagnosticSeverity.Warning);
							}
							if (tokens[k].type === TokenType.argPostcondition) {
								hasPostcondition = true;
								break;
							} else if (tokens[k].type === TokenType.keyword) {
								break;
							}
						}
					}
					if (!hasPostcondition) {
						this._routine.endLine = line;
						if (this._routine.startLine !== -1) {
							this._subroutines.push(this._routine);
							this._routine = { startLine: -1, endLine: -1, parameters: [] };
						}
						if (line === this._lineWithDo) {
							this._isBehindQuit[this._level] = QuitState.behindLevelQuit
						} else {
							this._isBehindQuit[this._level] = QuitState.behindQuit
						}
					}
				}
			}
			if (token.type === TokenType.intendation) { //check if new intendation level is OK and remember new level
				const expectedLevel = line === this._lineWithDo + 1 ? this._level + 1 : this._level;
				this._level = token.name.length;
				this._removeQuits(this._level)
				this._checkUnreachable(line, token)
				intendationFound = true;
				if (this._level > expectedLevel) {
					this._addWarning("Intendation Level wrong, found: " + this._level + ", expected: " + expectedLevel,
						line, 0, token.position, vscode.DiagnosticSeverity.Warning, "ExpectedIntendation:" + expectedLevel);
				}
				if (line === this._lineWithDo + 1 && this._level < expectedLevel) {
					this._addWarning("Higher intendation expected after argumentless Do", line, 0, token.position,
						vscode.DiagnosticSeverity.Warning, "ExpectedIntendation:" + expectedLevel);
				}
				this._lineWithDo = -2;
			}
			if (token.type === TokenType.entryref || token.type === TokenType.exfunction) {
				if (!this._labelExists(token.name) && !token.name.includes("&") && !token.name.includes("@")) {
					this._addWarning("Entry-Reference not found", line, token.position, token.name.length, vscode.DiagnosticSeverity.Warning);
				}
			}
		}
	}
	private _checkUnreachable(line: number, token: LineToken) {
		let isBehindQuit = false
		for (let i = 0; i < this._level; i++) { if (this._isBehindQuit[i] === QuitState.behindQuit) { isBehindQuit = true; break } }
		if (this._isBehindQuit[this._level] !== QuitState.noQuit) isBehindQuit = true
		if (isBehindQuit && token.type !== TokenType.comment) {
			if (this._startUnreachable === false) {
				this._startUnreachable = new vscode.Position(line, token.position);
			}
		} else {
			if (this._startUnreachable !== false) {
				//Only if there were Code lines after a quit or a goto
				this._diags.push({
					code: '',
					message: "Unreachable Code",
					range: new vscode.Range(this._startUnreachable, new vscode.Position(line, 0)),
					severity: vscode.DiagnosticSeverity.Warning,
					source: ''
				});
				this._startUnreachable = false;
			}
		}
	}
	private _removeQuits(level: number) {
		for (let i = level + 1; i < 32; i++) { this._isBehindQuit[i] = QuitState.noQuit }
	}
	private _generateLabelTable(document: vscode.TextDocument) {
		this._labelTable = {};
		for (let i = 0; i < document.lineCount; i++) {
			const lineTokens = this._linetokens[i]
			if (lineTokens.length > 0 && lineTokens[0].type === TokenType.label) {
				this._labelTable[lineTokens[0].name] = i;
			}
		}
	}
	private _labelExists(name: string): boolean {
		if (name.startsWith("$$")) name = name.substring(2)
		if (name.indexOf("^") > -1) {
			const filePosition = convertMumpsPosition(name, false);
			if (filePosition.file !== "") {
				return true;
			} else {
				return false;
			}
		} else {
			if (name.includes("+")) name = name.split("+")[0];  //In case of label+offset
			if (name === "") return true
			return this._labelTable[name] !== undefined;
		}
	}
	/**
	 * Checks if the given variablename is on the ignore-list
	 * @param variable
	 * @returns true if variable can be ignored at NEW-Check
	 */
	private _isIgnoredVariable(variable: string): boolean {
		let isIgnoredVariable = false;
		for (let k = 0; k < this._variablesToBeIgnored.length; k++) {
			if (new RegExp("^" + this._variablesToBeIgnored[k] + "$").test(variable)) {
				isIgnoredVariable = true;
				break;
			}
		}
		return isIgnoredVariable;
	}
	/**
	 * Clears all NEWs that were started above the new intendation-level
	 * @param level old intendation-level
	 * @param newLevel new-intendation-level
	 */
	private _reduceIntendationLevel(level: number, newLevel: number) {
		for (let k = newLevel + 1; k <= level; k++) {
			const index = this._levelExclusiveNew.indexOf(k);
			if (index > -1) {
				this._levelExclusiveNew.splice(index, 1);
			}
		}
		for (const key in this._varStates) {
			const state = this._varStates[key];
			let found = false;
			let memLine = 0;
			let memPosition = 0;
			if (state.newedAtLevel) {
				for (let k = newLevel + 1; k <= level; k++) {
					const index = state.newedAtLevel?.indexOf(k)
					if (index > -1) {
						memLine = state.newedAtLine[index];
						memPosition = state.newedAtPostion[index];
						state.newedAtLevel.splice(index, 1);
						state.newedAtLine.splice(index, 1);
						state.newedAtPostion.splice(index, 1);
						found = true;
						this._varStates[key] = state;
					}
				}
				if (found && !state.isUsed) {
					this._addWarning("Variable " + key + " is NEWed but not used",
						memLine,
						memPosition,
						key.length, vscode.DiagnosticSeverity.Warning,
						"NewedButNotUsed:" + key);
				}
			}
		}
	}
	private _addSymbol(name: string, startLine: number, endLine: number) {
		const startPosition = new vscode.Position(startLine, 0);
		const endPosition = new vscode.Position(endLine, 0);
		const methodRange = new vscode.Location(this._document.uri, new vscode.Range(startPosition, endPosition));
		symbols.push(new vscode.SymbolInformation(name, vscode.SymbolKind.Function, '', methodRange));
	}
}
