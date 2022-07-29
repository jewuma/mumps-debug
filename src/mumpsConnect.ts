/*
	Connector to MDEBUG-Server by Jens Wulf
	License: LGPL
*/
import { DebugProtocol } from 'vscode-debugprotocol';
import { Socket } from "net";
import { EventEmitter } from 'events';
import { readFileSync } from 'fs';
export interface MumpsBreakpoint {
	id: number,
	file: string,
	line: number,
	verified: boolean,
	condition?: string
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
enum connectState {
	disconnected, waitingforStart, waitingForVars, waitingForBreakpoints, waitingForSingleVar, waitingForSingleVarContent, waitingForErrorReport, waitingForHints
}
export class MumpsConnect extends EventEmitter {
	private _socket = new Socket();
	private _connectState: connectState;
	private _readedData: string;
	private _mVars: Object;
	private _mStack: Array<string>;
	private _activeBreakpoints: Array<string>;
	private _event = new EventEmitter();
	private _hostname: string;
	private _port: number;
	private _sourceFile: string;
	private _sourceLines: string[];
	private _currentLine = 0;
	private _errorLines: string[];
	private _hints: string[];
	private _breakPoints: MumpsBreakpoint[];
	private _localRoutinesPath: string;
	private _breakpointId: number = 1;
	private _commandQueue: string[];
	private _logging: boolean = false;
	private _singleVar: string = "";
	private _singleVarContent: string = "";
	constructor() {
		super();
		this._commandQueue = [];
		this._connectState = connectState.disconnected;
		this._readedData = "";
		this._mVars = {};
		this._mStack = [];
		this._activeBreakpoints = [];
		this._breakPoints = [];
		this._errorLines = [];
		this._singleVar = "";
		this._singleVarContent = "";
		this._hints = [];
		this._event.on('varsComplete', () => {
			if (typeof (this._mVars["I"]) !== 'undefined') {
				let internals = this._mVars["I"];
				this.checkEvents(internals);
			}
		})
	}

	public async init(hostname: string, port: number, localRoutinesPath: string) {
		this._localRoutinesPath = localRoutinesPath;
		this._hostname = hostname;
		this._port = port;

		return new Promise((resolve, reject) => {
			this._socket.connect(this._port, this._hostname, () => {
				this._log("Debug-Server connected\n");
				this._connectState = connectState.waitingforStart;
				this._socket.on('data', (chunk) => {
					this._readedData += chunk.toString();
					let n = this._readedData.indexOf('\n');
					while (n !== -1) {
						let data = this._readedData.substring(0, n);
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
			this._socket.on('end', () => { this._connectState = connectState.disconnected })
		})
		// Put a friendly message on the terminal of the server.
	}
	private _log(msg: string) {
		if (this._logging) { console.log(msg); }
	}
	private processLine(line: string) {
		this._log("Line:  " + line);

		let varname: string;
		let value: string;
		let vartype: string;
		switch (this._connectState) {
			case connectState.waitingforStart: {
				if (line === "***STARTVAR") {
					this._connectState = connectState.waitingForVars;
					this._mStack = [];
					this._mVars = {};
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
				break;
			}
			case connectState.waitingForVars: {
				if (line === "***ENDVAR") {
					this._connectState = connectState.waitingforStart;
					this._event.emit("varsComplete");
				} else {
					vartype = line.substring(0, 1); //I=internal,V=local Variable,S=Stackframe
					if (vartype === "S") {
						this._mStack.push(line.substring(2));
					}
					varname = line.substring(2, line.indexOf('='));
					while ((varname.split('"').length - 1) % 2 !== 0) {
						varname = line.substring(0, line.indexOf('=', varname.length + 1));
					}
					value = line.substring(varname.length + 3).replace(/^"/, "").replace(/"$/, "");
					if (typeof (this._mVars[vartype]) === 'undefined') { this._mVars[vartype] = {}; }
					this._mVars[vartype][varname] = value;
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
			case connectState.waitingForHints: {
				if (line === "***ENDHINTS") {
					this._connectState = connectState.waitingforStart;
					this._event.emit('HintsReceived', this._event, this._hints);
				} else {
					this._hints.push(line);
				}
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
	public restart(file: string) {
		this.writeln("RESTART;" + file);
	}
	/**
	 * Fire events if line has a breakpoint or hs stopped beacause of a different reason
	 */
	private checkEvents(internals: Array<string>): void {
		const mumpsposition = internals["$ZPOSITION"];
		const mumpsstatus = internals["$ZSTATUS"];
		const parts = mumpsposition.split("^");
		const position = parts[0];
		const program = parts[1];
		const file = this._localRoutinesPath + program + ".m";
		this.loadSource(file);
		const startlabel = position.split("+")[0];
		let offset = 0;
		if (position.split("+")[1] !== undefined) {
			offset = parseInt(position.split("+")[1]);
		}
		let line = 0
		if (startlabel !== "") {
			for (let ln = 0; ln < this._sourceLines.length; ln++) {
				if (this._sourceLines[ln].substring(0, startlabel.length) === startlabel) {
					line = ln;
					break;
				}
			}
		}
		this._currentLine = line + offset;
		if (mumpsstatus !== "" && internals["$ZTRAP"] === internals["$ZSTEP"]) {
			this.sendEvent('stopOnException', mumpsstatus);
			this._log(mumpsstatus);
		} else {
			const bps = this._breakPoints.filter(bp => bp.file === this._sourceFile && bp.line === this._currentLine);
			if (bps.length > 0) {
				this.sendEvent('stopOnBreakpoint');
			} else {
				this.sendEvent('stopOnStep');
			}
		}
	}

	/**
	 * Returns the actual Stack
	 */
	public stack(startFrame: number, endFrame: number): any {

		const frames = new Array<FrameInfo>();

		for (let i = startFrame; i < this._mStack.length; i++) {
			const position = this._mStack[i];
			if (position.indexOf("^") !== -1) {
				const fileposition = this.convertMumpsPosition(position);
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
		let confirmedBreakpoints: DebugProtocol.Breakpoint[] = [];
		if (breakpoints) {
			for (let i = 0; i < breakpoints.length; i++) {
				let breakpoint = breakpoints[i];
				let line = breakpoint.line
				confirmedBreakpoints.push({ id: this._breakpointId, verified: false })
				this._breakPoints.push({ verified: false, file, line, id: this._breakpointId++ });
				this.sendBreakpoint(file, line, true, breakpoint.condition);
			}
		}
		return confirmedBreakpoints;
	}

	/*
	 * Clear breakpoint in file with given line.
	 */
	public clearBreakPoint(file: string, line: number): MumpsBreakpoint | undefined {
		let bps = this._breakPoints;
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
		let merk: boolean[] = [];
		this._breakPoints.forEach(bp => {
			bp.verified = false;
			for (let i = 0; i < this._activeBreakpoints.length; i++) {
				let internalBp = this.convertMumpsPosition(this._activeBreakpoints[i])
				if (internalBp.file === bp.file && bp.line === internalBp.line) {
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
				let internalBp = this.convertMumpsPosition(this._activeBreakpoints[i])
				let bp: MumpsBreakpoint = { 'verified': true, 'file': internalBp.file, 'line': internalBp.line, 'id': this._breakpointId++ }
				this.sendEvent('breakpointValidated', bp);
			}
		}
	}

	public getVariables(type: string) {
		if (type === "system") {
			return this._mVars["I"];
		} else if (type === "local") {
			return this._mVars["V"];
		}
	}
	public async checkRoutine(lines: string[]) {
		return new Promise((resolve, reject) => {
			this._event.on('ErrorreportReceived', function ErrorreportReceived(event: EventEmitter, errorLines: string[]) {
				event.removeListener('ErrorreportReceived', ErrorreportReceived);
				resolve(errorLines);
			});
			this.writeln("ERRCHK");
			for (let i = 0; i < lines.length; i++) {
				this.writeln(lines[i]);
			}
			this.writeln("***ENDPROGRAM");
		})
	}
	public async getSingleVar(expression: string) {
		return new Promise((resolve, reject) => {
			let reply: VarData = { name: expression, indexCount: 0, content: "undefined", bases: [] }
			let varType = "V";
			if (expression.charAt(0) === "$") {
				varType = "I";
			}
			if (this._mVars[varType] !== undefined) {
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
			} else {
				resolve(reply);
			}
		});
	}

	// private methods

	private loadSource(file: string) {
		file = file.replace(/%/g, "_");
		if (this._sourceFile !== file) {
			this._sourceFile = file;
			try {
				this._sourceLines = readFileSync(this._sourceFile).toString().split('\n');
			} catch {
				console.log("Could not read Sourcefile " + file)
			}
		}
	}

	private convertMumpsPosition(positionstring: string) {
		let parts = positionstring.split("^");
		let position = parts[0];
		if (parts[1] !== undefined) {

			let program = parts[1].split(" ", 1)[0];
			let file = (this._localRoutinesPath + program + ".m").replace(/%/g, "_");
			try {
				let filecontent = readFileSync(file).toString().split('\n');
				let startlabel = position.split("+")[0];
				let labelRegexp = new RegExp("^" + startlabel + "[\\s;]");
				let offset = 0;
				if (position.split("+")[1] !== undefined) {
					offset = parseInt(position.split("+")[1]);
					//if (startlabel === "") { offset-- }   //If there's no startlabel M reports +1^XXX
				}
				let line = 0;
				if (startlabel !== "") {
					for (let ln = 0; ln < filecontent.length; ln++) {
						if (filecontent[ln].match(labelRegexp)) {
							line = ln;
							break;
						}
					}
				}
				return { "file": file, "line": line + offset };
			} catch {
				console.log("Could not read Sourcefile " + file)
				return { "file": file, "line": 1 };
			}
		} else {
			return { "file": "", "line": 1 };
		}
	}

	private sendEvent(event: string, ...args: any[]) {
		this.emit(event, ...args);
	}
}