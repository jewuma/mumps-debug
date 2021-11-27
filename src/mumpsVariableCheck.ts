import * as vscode from 'vscode';
import { LineToken, TokenType, MumpsLineParser } from './mumpsLineParser'
const parser = new MumpsLineParser();
interface Parameter {
	name: string,
	position: number
}
interface Subroutine {
	startLine: number,
	endLine: number
	parameters: Parameter[]
}
interface VariableState {
	newedAtLine?: number[],
	newedAtPostion?: number[],
	newedAtLevel?: number[],
	isExcluded?: boolean,
	isParameter?: boolean,
	isUsed?: boolean
	parameterPosition?: number
}
interface VariableStates {
	name: VariableState
}

//const currentValue = configuration.get<{}>('conf.resource.insertEmptyLastLine');
/**
 * Checks if mumps routines NEWs variables correctly
 *
 */
export default class MumpsVariableCheck {
	private _linetokens: LineToken[][];
	private _warnings: vscode.Diagnostic[];
	private _variablesToBeIgnored: string[] = [];
	private _enableVariableCheck: boolean = true;
	private _varStates: VariableStates;
	private _levelExclusiveNew: number[];
	private _subroutines: Subroutine[];
	constructor(document: vscode.TextDocument) {
		this._linetokens = parser.analyzeLines(document.getText());
		const configuration = vscode.workspace.getConfiguration();
		if (configuration.mumps.variablesToBeIgnoredAtNewCheck !== undefined) {
			this._variablesToBeIgnored = configuration.mumps.variablesToBeIgnoredAtNewCheck.split(",");
		}
		if (configuration.mumps.enableVariableCheck !== undefined) {
			this._enableVariableCheck = configuration.mumps.enableVariableCheck;
		}
	}
	/**
	 * Check all subroutines with parameters in actual document
	 * @returns Array of diagnostic messages if problems found, else an empty array
	 */
	public scanSubroutines(): vscode.Diagnostic[] {
		//let start = 0;
		this._warnings = [];
		this._subroutines = [];
		this._checkFile();
		for (let i = 0; i < this._subroutines.length; i++) {
			this.analyzeSubroutine(this._subroutines[i]);
		}
		return this._warnings;
	}
	/**
	 * Checks a single subroutine if variables are NEWed correctly
	 * sets found problems in this._warnings
	 * @param routine subroutine to be checked
	 */
	public analyzeSubroutine(routine: Subroutine): void {
		if (this._enableVariableCheck) {
			this._varStates = {} as VariableStates;
			this._levelExclusiveNew = [];
			let level = 0; //intendation-level
			for (let i = 0; i < routine.parameters.length; i++) {
				this._varStates[routine.parameters[i].name] = { isParameter: true, parameterPosition: routine.parameters[i].position }
			}
			for (let i = routine.startLine; i <= routine.endLine; i++) {
				let intendationFound = false;
				for (let j = 0; j < this._linetokens[i].length; j++) {
					let token = this._linetokens[i][j];
					if (i === routine.startLine && j === 0) { // skip parameters
						while (++j < this._linetokens[i].length && this._linetokens[i][j].type === TokenType.local) {
						}
						if (j < this._linetokens[i].length) {
							token = this._linetokens[i][j];
						} else {
							continue;
						}
					}
					if (token.type === TokenType.intendation) {
						intendationFound = true;
						let newLevel = token.name.length
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
							let anyVariablesNewed: boolean = false;
							let containsExclusions = false;
							while (++j < this._linetokens[i].length &&
								(this._linetokens[i][j].type === TokenType.local ||
									this._linetokens[i][j].type === TokenType.sysvariable)) {
								anyVariablesNewed = true;
								token = this._linetokens[i][j];
								if (token.isExcludedVariable) {
									containsExclusions = true;
								}
								if (token.type === TokenType.local) {
									let varName = token.name;
									let message = '';
									let varState: VariableState = this._varStates[varName] ? this._varStates[varName] : { isExcluded: token.isExcludedVariable }
									// Variable is already NEWed or used
									if (varState.isParameter) {
										if (token.isExcludedVariable) {
											varState.isExcluded = true;
										} else {
											if (level === 0) { //NEW inside higher intendation-level should be possible
												message = "NEW hides formal parameter " + varName;
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
											} else {
												varState.newedAtLevel.push(level);
												varState.newedAtLine!.push(i);
												varState.newedAtPostion!.push(token.position);
											}
										}
									}
									if (message !== "") {
										this._addWarning(message, i, token.position, token.name.length);
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
										this._addWarning("NEW hides formal parameters", i, token.position, token.name.length);
										break;
									}
								}
							}
						}
					} else if (token.type === TokenType.local) {  // local variable found at a non NEW command
						let varName = token.name;
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
		for (let key in this._varStates) {
			let state: VariableState = this._varStates[key];
			if (state.isParameter && !state.isUsed && !this._isIgnoredVariable(key)) {
				this._addWarning("Variable " + key + " is a formal parameter but not used", routine.startLine,
					state.parameterPosition!,
					key.length);
			} else if (state.newedAtLine && state.newedAtLine.length > 0 && !state.isUsed && !this._isIgnoredVariable(key)) {
				this._addWarning("Variable " + key + " is NEWed but not used",
					state.newedAtLine[0],
					state.newedAtPostion![0],
					key.length);
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
				this._addWarning("Variable " + varName + " not NEWed", line, position, varName.length);
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
	private _addWarning(message: string, line: number, startPosition: number, len: number) {
		this._warnings.push({
			code: '',
			message,
			range: new vscode.Range(new vscode.Position(line, startPosition), new vscode.Position(line, startPosition + len)),
			severity: vscode.DiagnosticSeverity.Warning,
			source: ''
		});
	}
	/**
	 * Scans the given File for subroutines with paramters and save their parameters in this._subroutines
	 * Looks for unreachable Code and saves error messages if this is the case
	 */
	private _checkFile() {
		let routine: Subroutine = { startLine: -1, endLine: -1, parameters: [] };
		let level: number = 0;
		let isBehindQuit: boolean = false;
		let startUnreachable: vscode.Position | false = false;
		for (let line = 0; line < this._linetokens.length; line++) {
			let ifFlag = false;
			let intendationFound = false;
			for (let j = 0; j < this._linetokens[line].length; j++) {
				let token: LineToken = this._linetokens[line][j];
				if (token.type === TokenType.comment && token.name.match(/ignoreVars:/)) { //Check for IgnoreVars-directive
					this._variablesToBeIgnored = this._variablesToBeIgnored.concat(token.name.split("ignoreVars:")[1].split(","));
				}
				if (j === 0 && token.type === TokenType.label) {
					isBehindQuit = false;
					if (startUnreachable) {
						this._warnings.push({
							code: '',
							message: "Unreachable Code",
							range: new vscode.Range(startUnreachable, new vscode.Position(line, 0)),
							severity: vscode.DiagnosticSeverity.Warning,
							source: ''
						});
						startUnreachable = false;
					}
					if (this._linetokens[line][1] !== undefined &&
						this._linetokens[line][1].type === TokenType.local) { //Begin of a parametrized subroutine
						routine.startLine = line;
						while (++j < this._linetokens[line].length && this._linetokens[line][j].type === TokenType.local) {
							routine.parameters.push({ name: this._linetokens[line][j].name, position: this._linetokens[line][j].position });
						}
						if (j >= this._linetokens[line].length) {
							continue;
						}
						token = this._linetokens[line][j];
					}
				}
				if (token.type === TokenType.keyword) {
					if (isBehindQuit && startUnreachable === false) {
						startUnreachable = new vscode.Position(line, token.position);
					}
					if (intendationFound === false) {
						level = 0;
					}
					let command = token.longName;
					if (command === "IF" || command === "ELSE") {
						ifFlag = true;
					}
					if (!ifFlag && (command === "QUIT" || command === "GOTO") && !token.isPostconditioned && level === 0) {
						let hasPostcondition = false;
						if (command === "GOTO") {
							for (let k = j + 1; k < this._linetokens[line].length; k++) {
								if (this._linetokens[line][k].type === TokenType.argPostcondition) {
									hasPostcondition = true;
									break;
								} else if (this._linetokens[line][k].type === TokenType.keyword) {
									break;
								}
							}
						}
						if (!hasPostcondition) {
							routine.endLine = line;
							if (routine.startLine !== -1) {
								this._subroutines.push(routine);
								routine = { startLine: -1, endLine: -1, parameters: [] };
							}
							isBehindQuit = true;
							break;
						}
					}
				}
				if (token.type === TokenType.intendation) {
					level = token.name.length;
					intendationFound = true;
				}

			}
		}
	}
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
			let index = this._levelExclusiveNew.indexOf(k);
			if (index > -1) {
				this._levelExclusiveNew.splice(index, 1);
			}
		}
		for (let key in this._varStates) {
			let state = this._varStates[key];
			let found = false;
			let memLine = 0;
			let memPosition = 0;
			if (state.newedAtLevel) {
				for (let k = newLevel + 1; k <= level; k++) {
					let index = state.newedAtLevel?.indexOf(k)
					if (index > -1) {
						memLine = state.newedAtLine![index];
						memPosition = state.newedAtPostion![index];
						state.newedAtLevel.splice(index, 1);
						state.newedAtLine!.splice(index, 1);
						state.newedAtPostion!.splice(index, 1);
						found = true;
						this._varStates[key] = state;
					}
				}
				if (found && !state.isUsed) {
					this._addWarning("Variable " + key + " is NEWed but not used",
						memLine,
						memPosition,
						key.length);
				}
			}
		}
	}
}