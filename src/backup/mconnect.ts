import { Socket } from "net";
import { EventEmitter } from 'events';

//let net = require('net');
export class mconnect {
	private socket:Socket;
	private connectState:string;
	private data:string;
	public mVars:Object;
	public mStack:Array<string>;
	public activeBreakpoints:Array<string>;
	public event=new EventEmitter();
	private hostname: string;
	private port: number;

	constructor(hostname:string,port:number) {
		this.connectState="waitingforStart";
		this.data="";
		this.mVars={};
		this.mStack=[];
		this.activeBreakpoints=[];
		this.hostname=hostname;
		this.port=port;
	}
async init() {
	var socket=new Socket();

	return new Promise((resolve,reject)=>{
		socket.connect(this.port,this.hostname,()=>{
			this.socket=socket;
			console.log("Debug-Server connected\n");
			socket.on('data', (chunk)=> {
				this.data+=chunk.toString();
				var n=this.data.indexOf('\n');
				while(n!=-1) {
					this.processLine(this.data.substring(0,n))
					this.data=this.data.substring(n+1);
					var n=this.data.indexOf('\n');
				}
			});
			resolve(socket);
		});
		socket.on('error',(error)=>{reject(error)});
	})
	// Put a friendly message on the terminal of the server.
}
	processLine(line:string) {
		var varname:string;
		var value:string;
		var vartype:string;
		switch(this.connectState){
			case "waitingforStart": {
				if (line=="***STARTVAR") {
					this.connectState="waitingforVars";
					this.mStack=[];
					this.mVars={};
				}
				if (line=="***STARTBP") {
					this.connectState="waitingforBreakpoints"
					this.activeBreakpoints=[];
				}
				break;
			}
			case "waitingforVars": {
				if (line==="***ENDVAR") {
					this.connectState="waitingforStart";
					this.event.emit("varsComplete");
				}else {
					vartype=line.substring(0,1); //I=internal,V=local Variable,S=Stackframe
					if (vartype=="S") {
						this.mStack.push(line.substring(2));
					}
					varname=line.substring(2,line.indexOf('='));
					while ((varname.split('"').length - 1) % 2 != 0) {
						varname=line.substring(0,line.indexOf('=',varname.length+1));
					}
					value=line.substring(varname.length+3).replace(/^"/,"").replace(/"$/,"");
					if (typeof(this.mVars[vartype])==='undefined') {this.mVars[vartype]={};}
					this.mVars[vartype][varname]=value;
				}
				break;
			}
			case "waitingforBreakpoints": {
				if (line=="***ENDBP") {
					this.connectState="waitingforStart";
					this.event.emit("breakpointsComplete");
				} else {
					this.activeBreakpoints.push(line);
				}
				break;
			}
			default: {
				console.log("Unexpected Message: "+line);
			}
		}
	}
	writeln(message:String) {
		this.socket.write(message+"\n");
	}
	getLocalVariables() {
		this.writeln("VARS");
	}
	getInternalVariables() {
		this.writeln("INTERNALS");
	}
	setBreakpoint(file,line) {
		this.writeln("SETBP;"+file+";"+line);
	}
	clearBreakpoint(file,line) {
		this.writeln("CLEARBP;"+file+";"+line);
	}
	start(file) {
		this.writeln("START;"+file);
	}
	step(type:String) {
		this.writeln(type);
	}
	continue() {
		this.writeln("CONTINUE");
	}
	disconnect() {
		this.writeln("RESET");
	}
	requestBreakpoints() {
		this.writeln("REQUESTBP");
	}
	// Identify this client
}