/*
	Implementation of DebugProtocol-Server for GT.M, Yottadb by Jens Wulf
	based on Mock-Debug by Microsoft Corp.
	License: LGPL
*/

import {
	DebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent,
	Thread, StackFrame, Scope, Source, Handles
} from '@vscode/debugadapter';
import { DebugProtocol } from '@vscode/debugprotocol';
import { basename } from 'path';
import { Subject } from 'await-notify';
import { MumpsConnect, MumpsBreakpoint, FilePosition, VariableType } from './mumpsConnect';
import * as vscode from 'vscode';
import { readFileSync } from 'fs';
import MumpsDiagnosticsProvider from './mumpsDiagnosticsProvider';
import { setLocalRoutinesPath } from './extension';

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
	private _variableBases = {};

	private _configurationDone = new Subject();

	private _program: string;

	private _mconnect: MumpsConnect;
	private _localScope = this._variableHandles.create("~local|0");
	private _systemScope = this._variableHandles.create("~system");
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
		this._mconnect.on('stopOnException', (e: string, filePosition: FilePosition) => {
			vscode.debug.activeDebugConsole.append(`${filePosition.file}:${filePosition.line + 1}:1`);
			vscode.debug.activeDebugConsole.appendLine(' Error: ' + e);
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
	protected initializeRequest(response: DebugProtocol.InitializeResponse): void {

		// build and return the capabilities of this debug adapter:
		response.body = response.body || {};

		// the adapter implements the configurationDoneRequest.
		response.body.supportsConfigurationDoneRequest = true;

		// make VS Code to use 'evaluate' when hovering over source
		response.body.supportsEvaluateForHovers = true;

		// make VS Code to support data breakpoints
		response.body.supportsDataBreakpoints = false;
		response.body.supportsConditionalBreakpoints = true;
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
		setLocalRoutinesPath(args.localRoutinesPath);
		// start the program in the runtime
		this._mconnect.init(args.hostname, args.port).then(async () => {
			if (vscode.window.activeTextEditor?.document)
				new MumpsDiagnosticsProvider(vscode.window.activeTextEditor?.document, MUMPSDIAGNOSTICS)
			this._mconnect.start(args.program, !!args.stopOnEntry);
			this._program = args.program;
			this.sendResponse(response);
		}).catch(() => {
			vscode.window.showErrorMessage("Connection to MDEBUG failed. \nPlease start MDEBUG first.");
			response.success = false;
			response.message = "Connection to MDEBUG failed. \nPlease start MDEBUG first.";
			this.sendResponse(response);
		})
	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		const path = <string>args.source.path;
		this._mconnect.clearBreakpoints(path);
		const actualBreakpoints = this._mconnect.setBreakPoint(path, args.breakpoints);

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

	protected scopesRequest(response: DebugProtocol.ScopesResponse): void {

		response.body = {
			scopes: [
				new Scope("Local", this._localScope, false),
				new Scope("System", this._systemScope, false),
			]
		};
		this.sendResponse(response);
	}

	protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments) {

		const variables: DebugProtocol.Variable[] = [];
		let insertVariable: DebugProtocol.Variable | undefined;
		const varReference = args.variablesReference;
		const varId = this._variableHandles.get(args.variablesReference);
		switch (varReference) {
			case this._systemScope: {
				const varObject = this._mconnect.getVariables(VariableType.system);
				for (const varname in varObject) {
					variables.push({
						name: varname,
						type: 'string',
						value: varObject[varname],
						variablesReference: 0
					})
				}
				break;
			}
			case this._localScope: {
				const varparts: string[] = varId.split("|");
				const indexCount: number = parseInt(varparts.pop() || "0");
				const varBase = varparts.join("|");
				const varObject = this._mconnect.getVariables(VariableType.local);
				let lastVar: VarData | undefined = undefined;
				let lastRef = "";
				for (const varname in varObject) {
					const actualVar = this.varAnalyze(varname, varObject[varname]);
					if (lastVar === undefined) { //First Variable not processed
						lastVar = actualVar;
						continue;
					}
					// eslint-disable-next-line no-cond-assign
					if (insertVariable = this._checkVars(lastVar, actualVar, indexCount, varBase, lastRef)) {
						if (insertVariable.variablesReference !== 0) { lastRef = lastVar.bases[indexCount]; }
						variables.push(insertVariable);
					}
					lastVar = actualVar;
				}
				if (lastVar !== undefined) { // process Last Variable if there was minimum one
					const dummyVar: VarData = { name: "", "indexCount": 0, "bases": [], "content": "" }
					const insertVariable = this._checkVars(lastVar, dummyVar, indexCount, varBase, lastRef)
					if (insertVariable) {
						variables.push(insertVariable);
					}
				}
				break;
			}
		}
		response.body = {
			variables: variables
		};
		this.sendResponse(response);
	}
	//checkVars checks if Variable has to be inserted in Var-Display and if it has descendants
	private _checkVars(lastVar: VarData, actualVar: VarData, indexCount: number, varBase: string, lastRef: string): DebugProtocol.Variable | undefined {
		let returnVar: DebugProtocol.Variable | undefined = undefined;
		let actualReference = 0;
		if (indexCount === 0 || (lastVar.bases[indexCount - 1] === varBase && lastVar.indexCount > indexCount)) {
			if (lastVar.indexCount > indexCount + 1) {
				if (lastRef !== lastVar.bases[indexCount]) {
					let name = lastVar.bases[indexCount];
					if (indexCount > 0) { name += ")"; }
					if (this._variableBases[lastVar.bases[indexCount]] === undefined) {
						this._variableBases[lastVar.bases[indexCount]] = this._variableHandles.create(lastVar.bases[indexCount] + "|" + (indexCount + 1));
					}
					returnVar = {
						name,
						type: 'string',
						value: 'undefined',
						variablesReference: this._variableBases[lastVar.bases[indexCount]]
					};
				}
			} else { //lastVar.indexCount==indexCount+1
				if (lastVar.bases[indexCount] === actualVar.bases[indexCount]) {
					if (this._variableBases[lastVar.bases[indexCount]] === undefined) {
						this._variableBases[lastVar.bases[indexCount]] = this._variableHandles.create(lastVar.bases[indexCount] + "|" + (indexCount + 1));
					}
					actualReference = this._variableBases[lastVar.bases[indexCount]];
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
	protected continueRequest(response: DebugProtocol.ContinueResponse): void {
		this._mconnect.continue();
		this.sendResponse(response);
	}

	protected nextRequest(response: DebugProtocol.NextResponse): void {
		this._mconnect.step("OVER");
		this.sendResponse(response);
	}

	protected stepInRequest(response: DebugProtocol.StepInResponse): void {
		this._mconnect.step("INTO");
		this.sendResponse(response);
	}

	protected stepOutRequest(response: DebugProtocol.StepOutResponse): void {
		this._mconnect.step("OUTOF");
		this.sendResponse(response);
	}

	protected async evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments) {
		if (args.context === "hover" || args.context === "repl") {
			this._mconnect.getSingleVar(args.expression).then((varReply: VarData) => {
				response.body = {
					result: varReply.name + " := " + varReply.content,
					variablesReference: 0
				}
				if (!args.expression.includes(")") && this._variableBases[args.expression] !== undefined) {
					response.body.variablesReference = this._variableBases[args.expression];
				}
				this.sendResponse(response);
			});
		}
	}

	protected async restartRequest(response: DebugProtocol.RestartResponse) {
		const sourceLines = readFileSync(this._program).toString().split('\n');
		this._mconnect.checkRoutine(sourceLines).then((errorLines: string[]) => {
			if (errorLines.length) {
				vscode.window.showErrorMessage("File contains Problems - No Restart possible!");
			} else {
				this._mconnect.restart(this._program);
			}
		});
		this.sendResponse(response);
	}

	protected disconnectRequest(response: DebugProtocol.DisconnectResponse): void {
		this._mconnect.disconnect();
		this.sendResponse(response);
	}

	private createSource(filePath: string): Source {
		return new Source(basename(filePath), this.convertDebuggerPathToClient(filePath), undefined, undefined, 'mumps-adapter-data');
	}

	protected async exceptionInfoRequest(response: DebugProtocol.ExceptionInfoResponse) {
		const statVariable: VarData = await this._mconnect.getSingleVar("$ZSTATUS");
		const status = statVariable.content.split(",");
		const trashlength = status[0].length + status[1].length + status[2].length + 4;
		const description = 'Line :' + status[1] + " " + statVariable.content.substring(trashlength);
		response.body = {
			exceptionId: status[2],
			description,
			breakMode: 'always',
			details: {
				typeName: 'ErrorException',
			}
		}
		this.sendResponse(response);
	}

	private varAnalyze(varname: string, content: string): VarData {
		let indexcount = 1;
		const bases: string[] = [];
		const length = varname.length;
		const klammerpos = varname.indexOf("(");
		let countKomma = true;
		if (klammerpos > 0) {
			bases.push(varname.substring(0, klammerpos));
			indexcount++;
			for (let i = klammerpos; i < length; i++) {
				if (varname.substring(i, i + 1) === "," && countKomma) {
					bases.push(varname.substring(0, i));
					indexcount++;
				}
				if (varname.substring(i, i + 1) === '"') { countKomma = !countKomma; }
			}
			bases.push(varname.substring(0, varname.length - 1));
		} else {
			bases.push(varname);
		}
		return { "name": varname, "indexCount": indexcount, "bases": bases, content };
	}
}
