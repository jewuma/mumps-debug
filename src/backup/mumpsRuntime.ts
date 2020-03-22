/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { readFileSync } from 'fs';
import { EventEmitter } from 'events';
import { mconnect } from './mconnect';
export interface MumpsBreakpoint {
	id: number;
	line: number;
	verified: boolean;
}
/**
 * Mumps Runtime debugger
 */
export class MumpsRuntime extends EventEmitter {

	// the initial file
	private _sourceFile: string;
	private mconnector: mconnect;
	public get sourceFile() {
		return this._sourceFile;
	}

	// the contents (= lines) of the one and only file
	private _sourceLines: string[];

	// This is the next line that will be 'executed'
	private _currentLine = 0;

	// maps from sourceFile to array of breakpoints
	private _breakPoints = new Map<string, MumpsBreakpoint[]>();

	// since we want to send breakpoint events, we will assign an id to every event
	// so that the frontend can match events with breakpoints.
	private _breakpointId = 1;

	private _localRoutinesPath: string;


	constructor() {
		super();
	}

	/**
	 * Start executing the given program.
	 */
	public async init(hostname: string, port: number, localRoutinesPath: string) {
		this._localRoutinesPath = localRoutinesPath;
		this.mconnector = new mconnect(hostname, port);
		this.mconnector.event.
			on('varsComplete', () => {
				console.log("VarsComplete");
				if (typeof (this.mconnector.mVars["I"]) !== 'undefined') {
					var internals = this.mconnector.mVars["I"];
					this.checkEvents(internals["$ZPOSITION"], internals["$ZSTATUS"]);
				}
			}).
			on('breakpointsComplete', () => {
				this.verifyBreakpoints(this.sourceFile);
			})
		return this.mconnector.init();
	}
	public start(program: string, stopOnEntry: boolean) {
		this.loadSource(program);
		this._currentLine = -1;

		if (stopOnEntry) {
			this.setBreakPoint(this._sourceFile, 1);
		}
		this.transferBreakpoints();
		this.mconnector.requestBreakpoints();
		this.mconnector.start(program);
	}

	/**
	 * Continue execution to the end/beginning.
	 */
	public continue(reverse = false) {
		this.mconnector.continue();
	}

	/**
	 * Step to the next line.
	 */
	public step(type: String) {
		this.mconnector.step(type);
	}

	public disconnect() {
		this.mconnector.disconnect();
	}

	/**
	 * Returns the actual Stack
	 */
	public stack(startFrame: number, endFrame: number): any {

		const frames = new Array<any>();

		for (let i = startFrame; i < this.mconnector.mStack.length; i++) {
			const position = this.mconnector.mStack[i];
			const fileposition = this.convertMumpsPosition(position);
			frames.push({
				index: i,
				name: `${position}(${i})`,
				file: fileposition.file,
				line: fileposition.line
			});
		}
		return {
			frames: frames,
			count: Math.min(this.mconnector.mStack.length, endFrame)
		};
	}


	/*
	 * Set breakpoint in file with given line.
	 */
	public setBreakPoint(path: string, line: number): MumpsBreakpoint {

		const bp = <MumpsBreakpoint>{ verified: false, line, id: this._breakpointId++ };
		let bps = this._breakPoints.get(path);
		if (!bps) {
			bps = new Array<MumpsBreakpoint>();
			this._breakPoints.set(path, bps);
		}
		bps.push(bp);
		//this.verifyBreakpoints(path);

		return bp;
	}

	/*
	 * Clear breakpoint in file with given line.
	 */
	public clearBreakPoint(path: string, line: number): MumpsBreakpoint | undefined {
		let bps = this._breakPoints.get(path);
		if (bps) {
			const index = bps.findIndex(bp => bp.line === line);
			if (index >= 0) {
				const bp = bps[index];
				this.mconnector.clearBreakpoint(path, bp.line);
				bps.splice(index, 1);
				return bp;
			}
		}
		return undefined;
	}

	public transferBreakpoints() {
		let bps = this._breakPoints.get(this._sourceFile);
		if (bps) {
			bps.forEach(bp => {
				this.mconnector.setBreakpoint(this._sourceFile, bp.line + 1);
			})
		}
	}
	/*
	 * Clear all breakpoints for file.
	 */
	public clearBreakpoints(path: string): void {
		this._breakPoints.delete(path);
	}

	public getVariables(type: string) {
		if (type == "internal") {
			return this.mconnector.mVars["I"];
		} else if (type = "local") {
			return this.mconnector.mVars["V"];
		}
	}

	public getSingleVar(expression: string) {
		if (expression.substring(0, 1) == "$") {
			return (this.mconnector.mVars["I"] != undefined) ? this.mconnector.mVars["I"][expression] : undefined;
		} else {
			return (this.mconnector.mVars["V"] != undefined) ? this.mconnector.mVars["V"][expression] : undefined;
		}
	}
	// private methods

	private loadSource(file: string) {
		if (this._sourceFile !== file) {
			this._sourceFile = file;
			this._sourceLines = readFileSync(this._sourceFile).toString().split('\n');
		}
	}

	private verifyBreakpoints(path: string): void {
		let bps = this._breakPoints.get(path);
		if (bps) {
			this.loadSource(path);
			bps.forEach(bp => {
				bp.verified = false;
				for (var i = 0; i < this.mconnector.activeBreakpoints.length; i++) {
					var internalBp = this.convertMumpsPosition(this.mconnector.activeBreakpoints[i])
					if (internalBp.file == path && bp.line == internalBp.line) {
						bp.verified = true;
						break;
					}
				}
			});
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
		return { "file": file, "line": line + offset };
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
			const breakpoints = this._breakPoints.get(this._sourceFile);
			if (breakpoints) {
				const bps = breakpoints.filter(bp => bp.line === this._currentLine);
				if (bps.length > 0) {
					this.sendEvent('stopOnBreakpoint');
				} else {
					this.sendEvent('stopOnStep');
				}
			} else {
				this.sendEvent('stopOnStep');
			}
		}
	}

	private sendEvent(event: string, ...args: any[]) {
		setImmediate(_ => {
			this.emit(event, ...args);
		});
	}
}