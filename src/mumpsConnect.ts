/*
	Connector to MDEBUG-Server by Jens Wulf
	License: LGPL
*/
import { DebugProtocol } from '@vscode/debugprotocol';
import { EventEmitter } from 'events';
import { existsSync, readFileSync } from 'fs';
import { Socket } from "net";
import * as vscode from 'vscode';
import { MumpsLineParser, TokenType } from './mumpsLineParser';
import { getLocalRoutinesPath, getWworkspaceFolder } from './extension';
export interface MumpsBreakpoint {
	id: number,
	file: string,
	line: number,
	verified: boolean,
	condition?: string
}
export interface FilePosition {
	file: string,
	line: number
}
interface VarData {
	name: string,
	indexCount: number,
	bases: Array<string>,
	content: string
}
interface FrameInfo {
	index: number,
	name: string,
	file: string,
	line: number
}
interface StackInfo {
	frames: FrameInfo[];
	count: number;
}
type MumpsVariable = {
	[variableType in VariableType]: {
		[variableName: string]: string;
	};
};
export type MumpsGlobal = {
	[variableName: string]:
	{
		value: string,
		isDefined: boolean,
		hasChildren: boolean,
		moreToFollow: boolean
	}
}
interface IVariables {
	[varName: string]: string;
}
enum connectState {
	disconnected, waitingforStart, waitingForVars, waitingForBreakpoints, waitingForSingleVar, waitingForSingleVarContent, waitingForErrorReport, waitingForHints, waitingForGlobals
}

export enum VariableType {
	system, local
}

export class MumpsConnect extends EventEmitter {
	private _socket = new Socket();
	private _connectState: connectState;
	private _readedData: string;
	private _mVars: MumpsVariable;
	private _globals: MumpsGlobal;
	private _mStack: Array<string>;
	private _activeBreakpoints: Array<string>;
	private _event = new EventEmitter();
	private _hostname: string;
	private _port: number;
	private _errorLines: string[];
	private _hints: string[];
	private _breakPoints: MumpsBreakpoint[];
	private _breakpointId = 1;
	private _commandQueue: string[];
	private _logging = false;
	private _singleVar = "";
	private _singleVarContent = "";
	private _lastError = "";
	constructor() {
		super();
		this._commandQueue = [];
		this._connectState = connectState.disconnected;
		this._readedData = "";
		this._mVars = {
			[VariableType.system]: {},
			[VariableType.local]: {}
		};
		this._globals = {};
		this._mStack = [];
		this._activeBreakpoints = [];
		this._breakPoints = [];
		this._errorLines = [];
		this._singleVar = "";
		this._singleVarContent = "";
		this._hints = [];
		this._event.on('varsComplete', () => {
			if (Object.keys(this._mVars[VariableType.system]).length > 0) {
				const internals = this._mVars[VariableType.system];
				this.checkEvents(internals);
			}
		})
	}

	public async init(hostname: string, port: number): Promise<Socket> {
		this._hostname = hostname;
		this._port = port;

		return new Promise((resolve, reject) => {
			this._socket.connect(this._port, this._hostname, () => {
				this._log("Debug-Server connected\n");
				vscode.commands.executeCommand('setContext', 'mumps.showGlobals', true)
				this._connectState = connectState.waitingforStart;
				this._socket.on('data', (chunk) => {
					this._readedData += chunk.toString();
					let n = this._readedData.indexOf('\n');
					while (n !== -1) {
						const data = this._readedData.substring(0, n);
						this.processLine(data)
						this._readedData = this._readedData.substring(n + 1);
						n = this._readedData.indexOf('\n');
					}
				});
				resolve(this._socket);
			});
			this._socket.on('error', (error) => {
				reject(error);
			});
			this._socket.on('end', () => {
				this._connectState = connectState.disconnected
				vscode.commands.executeCommand('setContext', 'mumps.showGlobals', false)
			})
		})
		// Put a friendly message on the terminal of the server.
	}
	private _log(msg: string): void {
		if (this._logging) { console.log(msg); }
	}
	private processLine(line: string): void {
		this._log("Line:  " + line);

		let varname: string;
		let value: string;
		let vartype: string;
		switch (this._connectState) {
			case connectState.waitingforStart: {
				if (line === "***STARTVAR") {
					this._connectState = connectState.waitingForVars;
					this._mStack = [];
					this._mVars = {
						[VariableType.system]: {},
						[VariableType.local]: {}
					};
					break;
				}
				if (line === "***STARTBP") {
					this._connectState = connectState.waitingForBreakpoints;
					this._activeBreakpoints = [];
					this._log(line);
					break;
				}
				if (line === "***SINGLEVAR") {
					this._connectState = connectState.waitingForSingleVar;
					this._singleVar = "";
					this._singleVarContent = "";
					break;
				}
				if (line === "***ENDPROGRAM") {
					this.sendEvent("end");
					this._socket.end();
					break;
				}
				if (line === "***BEGINERRCHK") {
					this._connectState = connectState.waitingForErrorReport;
					this._errorLines = [];
					break;
				}
				if (line === "***STARTHINTS") {
					this._connectState = connectState.waitingForHints;
					this._hints = [];
					break;
				}
				if (line === "***STARTGBL") {
					this._connectState = connectState.waitingForGlobals;
					this._globals = {};
					break;
				}
				break;
			}
			case connectState.waitingForVars: {
				if (line === "***ENDVAR") {
					this._connectState = connectState.waitingforStart;
					delete this._mVars[VariableType.local]["%STEP"];			//Remove internal debugger variables
					delete this._mVars[VariableType.local]["%PROGNAME"];
					this._event.emit("varsComplete");
				} else {
					vartype = line.substring(0, 1); //I=internal,V=local Variable,S=Stackframe
					if (vartype === "S") {
						this._mStack.push(line.substring(2));
						break;
					}
					varname = line.substring(2, line.indexOf('='));
					while ((varname.split('"').length - 1) % 2 !== 0) {
						varname = line.substring(0, line.indexOf('=', varname.length + 1));
					}
					value = line.substring(varname.length + 3).replace(/^"/, "").replace(/"$/, "");
					const variableType = vartype === "V" ? VariableType.local : VariableType.system;
					this._mVars[variableType][varname] = value;
				}
				break;
			}
			case connectState.waitingForBreakpoints: {
				if (line === "***ENDBP") {
					this._log(line);
					this._connectState = connectState.waitingforStart;
					this.verifyBreakpoints();
				} else {
					this._log(line);
					this._activeBreakpoints.push(line);
				}
				break;
			}
			case connectState.waitingForSingleVar: {
				if (line === "***SINGLEEND") {
					this._connectState = connectState.waitingforStart;
					this._event.emit('SingleVarReceived', this._event, this._singleVar, this._singleVarContent);
				} else if (line === "***SINGLEVARCONTENT") {
					this._connectState = connectState.waitingForSingleVarContent;
				} else {
					this._singleVar += line;
				}
				break;
			}
			case connectState.waitingForSingleVarContent: {
				if (line === "***SINGLEEND") {
					this._connectState = connectState.waitingforStart;
					this._event.emit('SingleVarReceived', this._event, this._singleVar, this._singleVarContent);
				} else {
					this._singleVarContent += line;
				}
				break;
			}
			case connectState.waitingForErrorReport: {
				if (line === "***ENDERRCHK") {
					this._connectState = connectState.waitingforStart;
					this._event.emit('ErrorreportReceived', this._event, this._errorLines);
				} else {
					this._errorLines.push(line);
				}
				break;
			}
			case connectState.waitingForGlobals: {
				if (line === "***ENDGBL") {
					this._connectState = connectState.waitingforStart;
					this._event.emit("gblsComplete");
				} else {
					let moreToFollow = false;
					let indicator = parseInt(line[0]);
					if (indicator > 3) {
						moreToFollow = true;
						indicator -= 4;
					}
					const hasChildren = indicator === 2;
					const isDefined = line[1] === "1";
					varname = line.substring(2, line.indexOf('='));
					while ((varname.split('"').length - 1) % 2 !== 0) {
						varname = line.substring(2, line.indexOf('=', varname.length + 1));
					}
					value = line.substring(varname.length + 3).replace(/^"/, "").replace(/"$/, "");
					this._globals[varname] = { value, hasChildren, isDefined, moreToFollow }
				}
				break;
			}
			case connectState.waitingForHints: {
				if (line === "***ENDHINTS") {
					this._connectState = connectState.waitingforStart;
					this._event.emit('HintsReceived', this._event, this._hints);
				} else {
					this._hints.push(line);
				}
				break;
			}
			default: {
				console.error("Unexpected Message: " + line);
			}
		}
	}
	private writeln(message: string): void {
		this._commandQueue.push(message);
		if (this._commandQueue.length > 1000) {
			console.error("Too many Commands in Queue: Check Debugger Connection");
			throw new Error();
		}
		if (this._connectState !== connectState.disconnected) {
			while (this._commandQueue.length) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				message = this._commandQueue.shift()!;
				try {
					this._socket.write(message + "\n");
				} catch {
					this._commandQueue.unshift(message);
					break;
				}
			}
		}
	}
	private sendBreakpoint(file: string, line: number, onOff: boolean, condition?: string): void {
		if (condition === undefined) { condition = ""; }
		if (onOff) { this.writeln("SETBP;" + file + ";" + line + ";" + condition); }
		else { this.writeln("CLEARBP;" + file + ";" + line); }
	}
	public start(file: string, stopAtStart: boolean): void {
		if (stopAtStart) {
			if (file.indexOf("^")) {
				//Stop direct at given Label not at first line
				this.sendBreakpoint(file, 0, true, "");
			} else {
				this.sendBreakpoint(file, 1, true, "");
			}
		}
		this.requestBreakpoints();
		this.writeln("START;" + file);
	}
	public step(type: string): void {
		this.writeln(type);
	}
	public continue(): void {
		this.writeln("CONTINUE");
	}
	public disconnect(): void {
		this.writeln("RESET");
		this._socket.end();
	}
	public requestBreakpoints(): void {
		this.writeln("REQUESTBP");
	}
	public restart(file: string): void {
		this.writeln("RESTART;" + file);
	}

	/**
	 * Returns the actual Stack
	 */
	public stack(startFrame: number, endFrame: number): StackInfo {

		const frames = new Array<FrameInfo>();

		for (let i = startFrame; i < this._mStack.length; i++) {
			const position = this._mStack[i];
			if (position.indexOf("^") !== -1) {
				const fileposition = convertMumpsPosition(position);
				frames.push({
					index: i,
					name: `${position}(${i})`,
					file: fileposition.file,
					line: fileposition.line
				});
			}
		}
		return {
			frames: frames,
			count: Math.min(frames.length, endFrame)
		};
	}


	/*
	 * Set breakpoint in file with given line.
	 */
	public setBreakPoint(file: string, breakpoints: DebugProtocol.SourceBreakpoint[] | undefined): DebugProtocol.Breakpoint[] {
		const confirmedBreakpoints: DebugProtocol.Breakpoint[] = [];
		file = file.replace(/\\/g, "/");
		if (breakpoints) {
			for (let i = 0; i < breakpoints.length; i++) {
				const breakpoint = breakpoints[i];
				const line = breakpoint.line
				confirmedBreakpoints.push({ id: this._breakpointId, verified: false })
				const newBreakpoint = { verified: false, file, line, id: this._breakpointId++ };
				const existingBreakpoint = this._breakPoints.find(bp => bp.file === file && bp.line === line);
				if (!existingBreakpoint) {
					this._breakPoints.push(newBreakpoint);
				} else {
					existingBreakpoint.condition = breakpoint.condition;
				}
				this.sendBreakpoint(file, line, true, breakpoint.condition);
			}
		}
		return confirmedBreakpoints;
	}

	/*
	 * Clear breakpoint in file with given line.
	 */
	public clearBreakPoint(file: string, line: number): MumpsBreakpoint | undefined {
		const bps = this._breakPoints;
		if (bps) {
			const index = bps.findIndex(bp => bp.file === file && bp.line === line);
			if (index >= 0) {
				const bp = bps[index];
				this.sendBreakpoint(file, bp.line, false);
				bps.splice(index, 1);
				return bp;
			}
		}
		return undefined;
	}

	/*
	 * Clear all breakpoints
	 */
	public clearBreakpoints(file: string): void {
		this.writeln("CLEARBP;" + file);
	}

	private verifyBreakpoints(): void {
		const merk: boolean[] = [];
		this._breakPoints.forEach(bp => {
			bp.verified = false;
			for (let i = 0; i < this._activeBreakpoints.length; i++) {
				const internalBp = convertMumpsPosition(this._activeBreakpoints[i])
				internalBp.file = this.normalizeDrive(internalBp.file.replace(/\\/g, "/"));
				bp.file = this.normalizeDrive(bp.file.replace(/\\/g, "/"));
				if (internalBp.file === bp.file && bp.line === internalBp.line + 1) {
					bp.verified = true;
					this.sendEvent('breakpointValidated', bp);
					merk[i] = true;
					break;
				}
			}
			if (!bp.verified) { this.sendEvent('breakpointValidated', bp); }
		});
		for (let i = 0; i < this._activeBreakpoints.length; i++) {
			if (!merk[i]) {
				const internalBp = convertMumpsPosition(this._activeBreakpoints[i])
				const bp: MumpsBreakpoint = { 'verified': true, 'file': internalBp.file, 'line': internalBp.line + 1, 'id': this._breakpointId++ }
				this.sendEvent('breakpointValidated', bp);
			}
		}
	}
	private normalizeDrive(path: string): string {
		const parts = path.split(':');
		if (parts.length === 2) {
			return parts[0].toLowerCase() + ':' + parts[1];
		} else {
			return path;
		}
	}
	public async getGlobals(keys: string, searchInGlobal?: string): Promise<MumpsGlobal> {
		if (searchInGlobal !== undefined) {
			this.writeln("SEARCHGBL;" + searchInGlobal + ";" + keys)
		} else {
			this.writeln("GETGBL;" + keys);
		}
		return new Promise((resolve) => {
			// Listen for the "gblsComplete" event.
			const gblsCompleteListener = () => {
				// Unsubscribe from the event to avoid memory leaks.
				this._event.removeListener("gblsComplete", gblsCompleteListener);

				// Resolve the Promise with the received value.
				resolve(this._globals);
			};

			// Subscribe to the "gblsComplete" event.
			this._event.on("gblsComplete", gblsCompleteListener);
		});
	}
	public getVariables(type: VariableType): { [variableName: string]: string } {
		return this._mVars[type];
	}
	/**
	 *
	 * @param lines M-Code to check
	 * @returns Error-Report by Mumps-Compiler
	 */
	public async checkRoutine(lines: string[]): Promise<string[]> {
		return new Promise((resolve) => {
			this._event.on('ErrorreportReceived', function ErrorreportReceived(event: EventEmitter, errorLines: string[]) {
				event.removeListener('ErrorreportReceived', ErrorreportReceived);
				errorLines = errorLines.filter(line => !line.includes("I-SRCNAM"));
				for (let i = 0; i < errorLines.length; i++) {
					if (errorLines[i].indexOf("E-LABELMISSING")) {
						const label = errorLines[i].match(/: ([A-Za-z%0-9][A-Za-z0-9]*)/)
						if (label !== null && label.length > 1) {
							const searchLabel = label[1];
							for (let j = 0; j < lines.length; j++) {
								if (lines[j].indexOf(searchLabel) !== -1) {
									const lineInfo = new MumpsLineParser().analyzeLine(lines[j]);
									if (lineInfo.tokens.length > 0) {
										for (let k = 0; k < lineInfo.tokens.length; k++) {
											if (lineInfo.tokens[k].type === TokenType.entryref && lineInfo.tokens[k].name === searchLabel) {
												errorLines[i] = (lineInfo.tokens[k].position + 1) + ";" + (j + 1) + ";" + errorLines[i].substring(3);
												break;
											}
										}
									}
								}
							}
						}
					}
				}
				resolve(errorLines);
			});
			this.writeln("ERRCHK");
			for (let i = 0; i < lines.length; i++) {
				this.writeln(lines[i]);
			}
			this.writeln("***ENDPROGRAM");
		})
	}
	/**
	 *
	 * @param expression Name of the Variable to get
	 * @returns Variable Content
	 */
	public async getSingleVar(expression: string): Promise<VarData> {
		return new Promise((resolve) => {
			const reply: VarData = { name: expression, indexCount: 0, content: "undefined", bases: [] }
			const varType = expression.charAt(0) === "$" ? VariableType.system : VariableType.local;
			if (this._mVars[varType][expression] !== undefined) {
				reply.content = this._mVars[varType][expression];
				resolve(reply);
			} else {
				this._event.on('SingleVarReceived', function SingleVarReceived(event, singleVar, singleVarContent) {
					event.removeListener('SingleVarReceived', SingleVarReceived);
					reply.name = singleVar;
					reply.content = singleVarContent;
					resolve(reply);
				});
				this.writeln("GETVAR;" + expression);
			}
		});
	}

	/**
	 * Fire events if line has a breakpoint or hs stopped beacause of a different reason
	 */
	private checkEvents(internals: IVariables): void {
		const mumpsposition = internals["$ZPOSITION"];
		const mumpsstatus = internals["$ZSTATUS"];
		const filePosition = convertMumpsPosition(mumpsposition);
		if (mumpsstatus !== "") {
			if (mumpsstatus === this._lastError && internals["$ETRAP"] === internals["$ZSTEP"]) {
				this.sendEvent("end");
				return
			} else {
				if (mumpsstatus !== this._lastError) {
					this._lastError = mumpsstatus;
					const parts = mumpsstatus.split(",");
					this.sendEvent('stopOnException', mumpsstatus, convertMumpsPosition(parts[1]));
					this._log(mumpsstatus);
					return
				}
			}
		}
		const bps = this._breakPoints.filter(bp => bp.file === filePosition.file && bp.line === filePosition.line + 1);
		if (bps.length > 0) {
			this.sendEvent('stopOnBreakpoint');
		} else {
			this.sendEvent('stopOnStep');
		}
	}

	private sendEvent(event: string, ...args: unknown[]): void {
		this.emit(event, ...args);
	}
}
export function convertMumpsPosition(positionstring: string, showNotFound?: boolean | undefined): FilePosition {
	if (showNotFound === undefined) { showNotFound = true; }
	const parts = positionstring.split("^");
	const position = parts[0];
	if (parts[1] !== undefined) {
		const program = parts[1].split(" ", 1)[0].replace(/%/g, "_") + ".m";
		let file = (getLocalRoutinesPath() + program)
		if (!existsSync(file)) {
			if (getWworkspaceFolder() !== undefined) {
				file = getWworkspaceFolder() + program;
			}
		}
		if (!existsSync(file)) {
			if (showNotFound) { vscode.window.showErrorMessage("Could not find Routine " + program); }
			return { "file": "", "line": 1 };
		}

		try {
			const filecontent = readFileSync(file).toString().split('\n');
			const startlabel = position.split("+")[0];
			const labelRegexp = new RegExp("^" + startlabel + "([(\\s;]|$)");
			let offset = 0;
			if (position.split("+")[1] !== undefined) {
				offset = parseInt(position.split("+")[1]);
				if (startlabel === "") { offset-- }   //If there's no startlabel M reports +1^XXX
			}
			let line = 0;
			let labelFound = false;
			if (startlabel !== "") {
				for (let ln = 0; ln < filecontent.length; ln++) {
					if (filecontent[ln].match(labelRegexp)) {
						line = ln;
						labelFound = true;
						break;
					}
				}
				if (!labelFound) return { "file": "", "line": 1 }
			}
			if (line + offset >= filecontent.length) return { "file": "", "line": 1 }
			return { "file": file, "line": line + offset };
		} catch {
			console.log("Could not read Sourcefile " + file)
			return { "file": "", "line": 1 };
		}
	} else {
		return { "file": "", "line": 1 };
	}
}
