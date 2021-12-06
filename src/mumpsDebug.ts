/*
	Implementation of DebugProtocol-Server for GT.M, Yottadb by Jens Wulf
	based on Mock-Debug by Microsoft Corp.
	License: LGPL
*/

import {
	DebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { basename } from 'path';
const { Subject } = require('await-notify');
import { MumpsConnect, MumpsBreakpoint } from './mumpsConnect';
import * as vscode from 'vscode';
import { readFileSync } from 'fs';
const MUMPSDIAGNOSTICS = vscode.languages.createDiagnosticCollection("mumps");
/**
 * This interface describes the mumps-debug specific launch attributes
 * The schema for these attributes lives in the package.json of the mumps-debug extension.
 * The interface should always match this schema.
 */
interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	/** An absolute path to the "program" to debug. */
	program: string;
	/** Automatically stop target after launch. If not specified, target does not stop. */
	stopOnEntry?: boolean;
	/** enable logging the Debug Adapter Protocol */
	trace?: boolean;
	/** The Port on which MDEBUG listens */
	port: number;
	/**The Hostname of the MDEBUG-Server */
	hostname: string;
	/**Map Local-Routines to Host-Routines */
	localRoutinesPath: string;
	/**Flag if internal Database for M-Labels should be build up */
	buildLabelDb?: boolean;
}
interface VarData {
	name: string,
	indexCount: number,
	bases: Array<string>,
	content: string
}
export default class MumpsDebugSession extends DebugSession {

	// we don't support multiple threads, so we can use a hardcoded ID for the default thread
	private static THREAD_ID = 1;

	private _variableHandles = new Handles<string>();

	private _configurationDone = new Subject();

	private _program: string;

	private _mconnect: MumpsConnect;
	/**
	 * Creates a new debug adapter that is used for one debug session.
	 * We configure the default implementation of a debug adapter here.
	 */
	public constructor() {
		super();

		// this debugger uses zero-based lines and columns
		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);
		this._program = "";
		this._mconnect = new MumpsConnect();

		// setup event handlers
		this._mconnect.on('stopOnEntry', () => {
			this.sendEvent(new StoppedEvent('entry', MumpsDebugSession.THREAD_ID));
		});
		this._mconnect.on('stopOnStep', () => {
			this.sendEvent(new StoppedEvent('step', MumpsDebugSession.THREAD_ID));
		});
		this._mconnect.on('stopOnBreakpoint', () => {
			this.sendEvent(new StoppedEvent('breakpoint', MumpsDebugSession.THREAD_ID));
		});
		this._mconnect.on('stopOnDataBreakpoint', () => {
			this.sendEvent(new StoppedEvent('data breakpoint', MumpsDebugSession.THREAD_ID));
		});
		this._mconnect.on('stopOnException', () => {
			this.sendEvent(new StoppedEvent('exception', MumpsDebugSession.THREAD_ID));
		});
		this._mconnect.on('breakpointValidated', (bp: MumpsBreakpoint) => {
			this.sendEvent(new BreakpointEvent('changed', <DebugProtocol.Breakpoint>{ verified: bp.verified, id: bp.id }));
		});

		this._mconnect.on('end', () => {
			this.sendEvent(new TerminatedEvent());
		});
	}

	/**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {

		// build and return the capabilities of this debug adapter:
		response.body = response.body || {};

		// the adapter implements the configurationDoneRequest.
		response.body.supportsConfigurationDoneRequest = true;

		// make VS Code to use 'evaluate' when hovering over source
		response.body.supportsEvaluateForHovers = true;

		// make VS Code to support data breakpoints
		response.body.supportsDataBreakpoints = false;

		// make VS Code to support completion in REPL
		response.body.supportsCompletionsRequest = false;
		response.body.completionTriggerCharacters = [".", "["];

		// make VS Code to send cancelRequests
		response.body.supportsCancelRequest = false;

		// make VS Code send the breakpointLocations request
		response.body.supportsBreakpointLocationsRequest = true;
		response.body.supportsExceptionInfoRequest = true;
		response.body.supportsRestartRequest = true;


		// since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
		// we request them early by sending an 'initializeRequest' to the frontend.
		// The frontend will end the configuration sequence by calling 'configurationDone' request.
		this.sendResponse(response);
		this.sendEvent(new InitializedEvent());
	}

	/**
	 * Called at the end of the configuration sequence.
	 * Indicates that all breakpoints etc. have been sent to the DA and that the 'launch' can start.
	 */
	protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
		super.configurationDoneRequest(response, args);

		// notify the launchRequest that configuration has finished

		this._configurationDone.notify();
	}

	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments) {

		// make sure to 'Stop' the buffered logging if 'trace' is not set
		//logger.setup(args.trace ? Logger.LogLevel.Verbose : Logger.LogLevel.Stop, false);

		// wait until configuration has finished (and configurationDoneRequest has been called)
		await this._configurationDone.wait(1000);

		// start the program in the runtime
		this._mconnect.init(args.hostname, args.port, args.localRoutinesPath).then(async () => {
			this.refreshDiagnostics(vscode.window.activeTextEditor!.document, MUMPSDIAGNOSTICS);
			this._mconnect.start(args.program, !!args.stopOnEntry);
			this._program = args.program;
			this.sendResponse(response);
		}).catch((error) => {
			vscode.window.showErrorMessage("Connection to MDEBUG failed. \nPlease start MDEBUG first.");
		})
	}
	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {

		const path = <string>args.source.path;
		const clientLines = args.lines || [];

		this._mconnect.clearBreakpoints(path);
		// set and verify breakpoint locations
		const actualBreakpoints = clientLines.map(l => {
			let { verified, line, id } = this._mconnect.setBreakPoint(path, this.convertClientLineToDebugger(l));
			const bp = <DebugProtocol.Breakpoint>new Breakpoint(verified, this.convertDebuggerLineToClient(line));
			bp.id = id;
			return bp;
		});
		// send back the actual breakpoint positions
		response.body = {
			breakpoints: actualBreakpoints
		};
		this.sendResponse(response);
		this._mconnect.requestBreakpoints();
	}

	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {

		// runtime supports no threads so just return a default thread.
		response.body = {
			threads: [
				new Thread(MumpsDebugSession.THREAD_ID, "thread 1")
			]
		};
		this.sendResponse(response);
	}

	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {

		const startFrame = typeof args.startFrame === 'number' ? args.startFrame : 0;
		const maxLevels = typeof args.levels === 'number' ? args.levels : 1000;
		const endFrame = startFrame + maxLevels;

		const stk = this._mconnect.stack(startFrame, endFrame);
		response.body = {
			stackFrames: stk.frames.map(f => new StackFrame(f.index, f.name, this.createSource(f.file), this.convertDebuggerLineToClient(f.line))),
			totalFrames: stk.count
		};
		if (stk.count === 0) {
			this.sendEvent(new TerminatedEvent());
		}
		this.sendResponse(response);
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {

		response.body = {
			scopes: [
				new Scope("Local", this._variableHandles.create("local|0"), true),
				new Scope("System", this._variableHandles.create("system"), false)
			]
		};
		this.sendResponse(response);
	}

	protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request) {

		const variables: DebugProtocol.Variable[] = [];
		let insertVariable: DebugProtocol.Variable | undefined;
		const varId = this._variableHandles.get(args.variablesReference);
		if (varId === "system") {
			let varObject = this._mconnect.getVariables("system");
			for (let varname in varObject) {
				variables.push({
					name: varname,
					type: 'string',
					value: varObject[varname],
					variablesReference: 0
				})
			}
		} else {
			const varparts: string[] = varId.split("|");
			const indexCount: number = parseInt(varparts.pop()!);
			const varBase = varparts.join("|");
			let varObject = this._mconnect.getVariables("local");
			let lastVar: VarData;
			let firstTime: boolean = true;
			let lastRef: string = "";
			for (let varname in varObject) {
				let actualVar = this.varAnalyze(varname, varObject[varname]);
				if (firstTime) { //First Variable not processed
					lastVar = actualVar;
					firstTime = false;
					continue;
				}
				if (insertVariable = this.checkVars(lastVar!, actualVar, indexCount, varBase, lastRef)) {
					if (insertVariable.variablesReference !== 0) { lastRef = lastVar!.bases[indexCount]; }
					variables.push(insertVariable);
				}
				lastVar = actualVar;
			}
			if (!firstTime) { // process Last Variable if there was minimum one
				const dummyVar: VarData = { name: "", "indexCount": 0, "bases": [], "content": "" }
				if (insertVariable = this.checkVars(lastVar!, dummyVar, indexCount, varBase, lastRef)) {
					variables.push(insertVariable);
				}
			}
		}
		response.body = {
			variables: variables
		};
		this.sendResponse(response);
	}
	//checkVars checks if Variable has to be inserted in Var-Display and if it has descendants
	private checkVars(lastVar: VarData, actualVar: VarData, indexCount: number, varBase: string, lastRef: string): DebugProtocol.Variable | undefined {
		let returnVar: DebugProtocol.Variable | undefined = undefined;
		let actualReference: number = 0;
		if (indexCount === 0 || (lastVar.bases[indexCount - 1] === varBase && lastVar.indexCount > indexCount)) {
			if (lastVar.indexCount > indexCount + 1) {
				if (lastRef !== lastVar.bases[indexCount]) {
					let name = lastVar.bases[indexCount];
					if (indexCount > 0) { name += ")"; }
					returnVar = {
						name,
						type: 'string',
						value: 'undefined',
						variablesReference: this._variableHandles.create(lastVar.bases[indexCount] + "|" + (indexCount + 1))
					};
				}
			} else { //lastVar.indexCount==indexCount+1
				if (lastVar.bases[indexCount] === actualVar.bases[indexCount]) {
					actualReference = this._variableHandles.create(lastVar.bases[indexCount] + "|" + (indexCount + 1));
				}
				returnVar = {
					name: lastVar.name,
					type: 'string',
					value: lastVar.content,
					variablesReference: actualReference
				};
			}
		}
		return returnVar
	}
	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		this._mconnect.continue();
		this.sendResponse(response);
	}

	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		this._mconnect.step("OVER");
		this.sendResponse(response);
	}

	protected stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments, request?: DebugProtocol.Request): void {
		this._mconnect.step("INTO");
		this.sendResponse(response);
	}

	protected stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments, request?: DebugProtocol.Request): void {
		this._mconnect.step("OUTOF");
		this.sendResponse(response);
	}

	protected async evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments) {
		if (args.context === "hover" || args.context === "repl") {
			this._mconnect.getSingleVar(args.expression).then((varReply: VarData) => {
				response.body = {
					result: varReply.name + " := " + varReply.content,
					variablesReference: 0
				};
				this.sendResponse(response);
			})
		}
	}

	protected async restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments) {
		let sourceLines = readFileSync(this._program).toString().split('\n');
		this._mconnect.checkRoutine(sourceLines).then((errorLines: string[]) => {
			if (errorLines.length) {
				vscode.window.showErrorMessage("File contains Problems - No Restart possible!");
			} else {
				this._mconnect.restart(this._program);
			}
		});
		this.sendResponse(response);
	}

	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request): void {
		this._mconnect.disconnect();
		this.sendResponse(response);
	}

	private createSource(filePath: string): Source {
		return new Source(basename(filePath), this.convertDebuggerPathToClient(filePath), undefined, undefined, 'mumps-adapter-data');
	}

	protected async exceptionInfoRequest(response: DebugProtocol.ExceptionInfoResponse, args: DebugProtocol.ExceptionInfoArguments) {
		const statVariable: any = await this._mconnect.getSingleVar("$ZSTATUS");
		const status = statVariable.content.split(",");
		let trashlength = status[0].length + status[1].length + status[2].length + 4;
		let description = statVariable.content.substr(trashlength);
		response.body = {
			exceptionId: status[2],
			description,
			breakMode: 'always',
			details: {
				message: 'Line :' + status[1],
				typeName: 'ErrorException',
			}
		}
		this.sendResponse(response);
	}

	private varAnalyze(varname: string, content: string): VarData {
		let indexcount = 1;
		let bases: string[] = [];
		let length = varname.length;
		let klammerpos = varname.indexOf("(");
		let countKomma = true;
		//let lastKommaPos = varname.length;
		if (klammerpos > 0) {
			bases.push(varname.substring(0, klammerpos));
			indexcount++;
			//lastKommaPos = klammerpos;
			for (let i = klammerpos; i < length; i++) {
				if (varname.substring(i, i + 1) === "," && countKomma) {
					bases.push(varname.substring(0, i));
					indexcount++;
					//lastKommaPos = i;
				}
				if (varname.substring(i, i + 1) === '"') { countKomma = !countKomma; }
			}
			bases.push(varname.substring(0, varname.length - 1));
		} else {
			bases.push(varname);
		}
		return { "name": varname, "indexCount": indexcount, "bases": bases, content };
	}

	private refreshDiagnostics(doc: vscode.TextDocument | undefined, mumpsDiagnostics: vscode.DiagnosticCollection): void {
		let diagnostics: vscode.Diagnostic[] = [];
		if (doc) {
			let lines: string[] = []
			for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
				const lineOfText = doc.lineAt(lineIndex);
				lines.push(lineOfText.text);
			}
			this._mconnect.checkRoutine(lines).then((errLines: string[]) => {
				for (let i = 0; i < errLines.length; i++) {
					let errData = errLines[i].split(";");
					let column = parseInt(errData[0]) - 1;
					if (isNaN(column)) { column = 0 };
					let line = parseInt(errData[1]) - 1;
					if (isNaN(line)) { line = 0 };
					let endColumn = doc.lineAt(line).text.length
					if (line === 0 && column === 0) { endColumn = 0 };
					let message = errData[2];
					let range = new vscode.Range(line, column, line, endColumn);
					let diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
					diagnostic.code = message;
					diagnostics.push(diagnostic);
				}
				mumpsDiagnostics.clear();
				mumpsDiagnostics.set(doc.uri, diagnostics);
			})
		}
	}
}
