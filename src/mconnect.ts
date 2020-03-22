import { Socket } from "net";
import { EventEmitter } from 'events';
import { readFileSync } from 'fs';
export interface MumpsBreakpoint {
	id: number;
	file: string,
	line: number;
	verified: boolean;
}

export class mconnect extends EventEmitter {
	private _socket: Socket;
	private _connectState: string;
	private _readedData: string;
	private _mVars: Object;
	private _mStack: Array<string>;
	private _activeBreakpoints: Array<string>;
	private event = new EventEmitter();
	private _hostname: string;
	private _port: number;
	private _sourceFile: string;
	private _sourceLines: string[];
	private _currentLine = 0;
	private _breakPoints: MumpsBreakpoint[];
	private _localRoutinesPath: string;
	private _breakpointId: number = 1;
	private _commandQueue: string[];
	private _logging: boolean=true;
	constructor() {
		super();
		this._connectState = "waitingforStart";
		this._readedData = "";
		this._mVars = {};
		this._mStack = [];
		this._commandQueue = [];
		this._activeBreakpoints = [];
		this._breakPoints = [];
		this.event.on('varsComplete', () => {
			if (typeof (this._mVars["I"]) !== 'undefined') {
				var internals = this._mVars["I"];
				this.checkEvents(internals["$ZPOSITION"], internals["$ZSTATUS"]);
			}
		})
	}

	public async init(hostname: string, port: number, localRoutinesPath: string) {
		var socket = new Socket();
		this._localRoutinesPath = localRoutinesPath;
		this._hostname = hostname;
		this._port = port;

		return new Promise((resolve, reject) => {
			socket.connect(this._port, this._hostname, () => {
				this._socket = socket;
				console.log("Debug-Server connected\n");
				socket.on('data', (chunk) => {
					this._readedData += chunk.toString();
					var n = this._readedData.indexOf('\n');
					while (n != -1) {
						this.processLine(this._readedData.substring(0, n))
						this._readedData = this._readedData.substring(n + 1);
						var n = this._readedData.indexOf('\n');
					}
				});
				resolve(socket);
			});
			socket.on('error', (error) => { reject(error) });
		})
		// Put a friendly message on the terminal of the server.
	}
	private _log(msg) {
		if (this._logging) console.log(msg);
	}
	processLine(line: string) {
		var varname: string;
		var value: string;
		var vartype: string;
		switch (this._connectState) {
			case "waitingforStart": {
				if (line == "***STARTVAR") {
					this._connectState = "waitingforVars";
					this._mStack = [];
					this._mVars = {};
				}
				if (line == "***STARTBP") {
					this._connectState = "waitingforBreakpoints"
					this._activeBreakpoints = [];
					this._log(line);
				}
				break;
			}
			case "waitingforVars": {
				if (line === "***ENDVAR") {
					this._connectState = "waitingforStart";
					this.event.emit("varsComplete");
				} else {
					vartype = line.substring(0, 1); //I=internal,V=local Variable,S=Stackframe
					if (vartype == "S") {
						this._mStack.push(line.substring(2));
					}
					varname = line.substring(2, line.indexOf('='));
					while ((varname.split('"').length - 1) % 2 != 0) {
						varname = line.substring(0, line.indexOf('=', varname.length + 1));
					}
					value = line.substring(varname.length + 3).replace(/^"/, "").replace(/"$/, "");
					if (typeof (this._mVars[vartype]) === 'undefined') { this._mVars[vartype] = {}; }
					this._mVars[vartype][varname] = value;
				}
				break;
			}
			case "waitingforBreakpoints": {
				if (line == "***ENDBP") {
					this._log(line);
					this._connectState = "waitingforStart";
					this.verifyBreakpoints();
				} else {
					this._log(line);
					this._activeBreakpoints.push(line);
				}
				break;
			}
			default: {
				console.log("Unexpected Message: " + line);
			}
		}
	}
	private writeln(message: string): void {
		this._commandQueue.push(message);
		if (this._commandQueue.length > 1000) {
			console.log("Too many Commands in Queue Check Debugger Connection");
			throw new Error();
		}
		if (this._socket) {
			while (this._commandQueue.length) {
				message = this._commandQueue.shift()!;
				this._log(message);
				this._socket.write(message + "\n");
			}
		}
	}
	private sendBreakpoint(file: string, line: number, onOff: boolean): void {
		if (onOff) this.writeln("SETBP;" + file + ";" + line);
		else this.writeln("CLEARBP;" + file + ";" + line);
	}
	public start(file: string, stopAtStart: boolean): void {
		if (stopAtStart) this.sendBreakpoint(file, 1, true);
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
	}
	public requestBreakpoints(): void {
		this.writeln("REQUESTBP");
	}

	/**
	 * Fire events if line has a breakpoint or hs stopped beacause of a different reason
	 */
	private checkEvents(mumpsposition: string, mumpsstatus: string): void {
		var parts = mumpsposition.split("^");
		var position = parts[0];
		var program = parts[1];
		var file = this._localRoutinesPath + program + ".m";
		this.loadSource(file);
		var startlabel = position.split("+")[0];
		var offset = 0;
		if (position.split("+")[1] !== "undefined") {
			offset = parseInt(position.split("+")[1]);
		}
		var line = 0
		if (startlabel != "") {
			for (let ln = 0; ln < this._sourceLines.length; ln++) {
				if (this._sourceLines[ln].substring(0, startlabel.length) == startlabel) {
					line = ln;
					break;
				}
			}
		}
		this._currentLine = line + offset;
		if (mumpsstatus !== "") {
			this.sendEvent('stopOnException');
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

		const frames = new Array<any>();

		for (let i = startFrame; i < this._mStack.length; i++) {
			const position = this._mStack[i];
			const fileposition = this.convertMumpsPosition(position);
			fileposition.line++;	//Correction 0/1 based in Editor/GT.M
			frames.push({
				index: i,
				name: `${position}(${i})`,
				file: fileposition.file,
				line: fileposition.line
			});
		}
		return {
			frames: frames,
			count: Math.min(this._mStack.length, endFrame)
		};
	}


	/*
	 * Set breakpoint in file with given line.
	 */
	public setBreakPoint(file: string, line: number): MumpsBreakpoint {
		const bp = <MumpsBreakpoint>{ verified: false, file, line, id: this._breakpointId++ };
		this._breakPoints.push(bp);
		this.sendBreakpoint(file, bp.line + 1, true);
		return bp;
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
		let bps = this._breakPoints;
		if (bps) {
			bps.filter(bp => bp.file === file);
			bps.forEach(bp => {
				this.clearBreakPoint(file, bp.line);
			});
		}
	}

	private verifyBreakpoints(): void {
		let merk: boolean[] = [];
		this._breakPoints.forEach(bp => {
			bp.verified = false;
			for (var i = 0; i < this._activeBreakpoints.length; i++) {
				var internalBp = this.convertMumpsPosition(this._activeBreakpoints[i])
				if (internalBp.file == bp.file && bp.line == internalBp.line) {
					bp.verified = true;
					this.sendEvent('breakpointValidated', bp);
					merk[i] = true;
					break;
				}
			}
			if (!bp.verified) this.sendEvent('breakpointValidated', bp);
		});
		for (var i = 0; i < this._activeBreakpoints.length; i++) {
			if (!merk[i]) {
				var internalBp = this.convertMumpsPosition(this._activeBreakpoints[i])
				var bp: MumpsBreakpoint = { 'verified': true, 'file': internalBp.file, 'line': internalBp.line, 'id': this._breakpointId++ }
				this.sendEvent('breakpointValidated', bp);
			}
		}
	}

	public getVariables(type: string) {
		if (type == "system") {
			return this._mVars["I"];
		} else if (type = "local") {
			return this._mVars["V"];
		}
	}

	public getSingleVar(expression: string) {
		if (expression.substring(0, 1) == "$") {
			return (this._mVars["I"] != undefined) ? this._mVars["I"][expression] : undefined;
		} else {
			return (this._mVars["V"] != undefined) ? this._mVars["V"][expression] : undefined;
		}
	}

	// private methods

	private loadSource(file: string) {
		if (this._sourceFile !== file) {
			this._sourceFile = file;
			this._sourceLines = readFileSync(this._sourceFile).toString().split('\n');
		}
	}

	private convertMumpsPosition(positionstring: string) {
		var parts = positionstring.split("^");
		var position = parts[0];
		var program = parts[1].split(" ", 1)[0];
		var file = this._localRoutinesPath + program + ".m";
		var filecontent = readFileSync(file).toString().split('\n');
		var startlabel = position.split("+")[0];
		var offset = 0;
		if (position.split("+")[1] !== undefined) {
			offset = parseInt(position.split("+")[1]);
		}
		var line = 0;
		if (startlabel != "") {
			for (let ln = 0; ln < filecontent.length; ln++) {
				if (filecontent[ln].substring(0, startlabel.length) == startlabel) {
					line = ln;
					break;
				}
			}
		}
		return { "file": file, "line": line + offset - 1 };
	}

	private sendEvent(event: string, ...args: any[]) {
		setImmediate(_ => {
			this.emit(event, ...args);
		});
	}
	// Identify this client
}