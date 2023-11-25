import * as vscode from 'vscode';
import { LineObject, MumpsLineParser } from './mumpsLineParser';
async function autoSpaceEnter() {
	const editor = vscode.window.activeTextEditor
	if (editor) {
		const pos = editor.selection.active
		const currentLine = editor.document.lineAt(pos.line).text;
		const parsedLine = MumpsLineParser.parseLine(currentLine);
		let newLine = '';
		if (pos.character !== 0) {
			//check for removing a trailing .
			if ((parsedLine.lineRoutines === undefined || parsedLine.lineRoutines.length === 0) && currentLine.indexOf(";") === -1 &&
				parsedLine.lineIndentationArray !== undefined && parsedLine.lineIndentationArray.length > 0) {
				parsedLine.lineIndentationArray.splice(-1)
				editor.edit((editBuilder) => {
					editBuilder.replace(new vscode.Range(pos.with(pos.line, 0), pos.with(pos.line, currentLine.length)), renderLine(parsedLine))
				})
				//check for adding indentation to the new line
			} else {
				if (parsedLine.lineIndentationArray === undefined) {
					parsedLine.lineIndentationArray = []
				}
				if (lineContainsNoParamDo(parsedLine)) {
					parsedLine.lineIndentationArray.push(" ")
				}
				parsedLine.lineRoutines = []
				delete parsedLine.lineComment
				delete parsedLine.lineLabel
				newLine = renderLine(parsedLine);
			}
		}
		editor.edit((editBuilder) => {
			editBuilder.insert(pos, "\n" + newLine);
		})
	}
}

function lineContainsNoParamDo(parsed: LineObject) {
	const cmds = parsed.lineRoutines;
	if (cmds) {
		for (let i = 0; i < cmds.length; i++) {
			if (cmds[i].mCommand.match(/(d|do)/i) && !cmds[i].mArguments) {
				return true;
			}
		}
	}
	return false;
}

async function autoSpaceTab() {

	const editor = vscode.window.activeTextEditor
	if (editor) {
		const pos = editor.selection.active
		const currentLine = editor.document.lineAt(pos.line).text;
		const parsed = MumpsLineParser.parseLine(currentLine);
		if ((parsed.lineRoutines === undefined || parsed.lineRoutines.length === 0) &&
			currentLine.indexOf(";") === -1 && parsed.lineIndentationArray !== undefined &&
			parsed.lineIndentationArray.length > 0) {
			parsed.lineIndentationArray.push(" ")
			editor.edit((editBuilder) => {
				if (currentLine.charAt(pos.character - 1) === " ") {
					editBuilder.insert(pos.with(pos.line, pos.character), ". ")
				} else {
					editBuilder.insert(pos.with(pos.line, pos.character), " . ")
				}
			})
		} else {
			editor.edit((eb) => {
				eb.insert(pos, "\t")
			})
		}
	}
}
function renderLine(inputObject: LineObject): string {

	let tmpLine = "";

	//Rendering must be performed sequentially.
	tmpLine = appendLabel(inputObject, tmpLine);
	tmpLine = appendIndentation(inputObject, tmpLine);
	tmpLine = appendRoutines(inputObject, tmpLine);
	tmpLine = appendComment(inputObject, tmpLine);

	return tmpLine;

}
function appendLabel(inputObject: LineObject, inputLine: string) {
	if (inputObject.lineLabel) {
		inputLine = inputLine + inputObject.lineLabel;
	}
	if (inputObject.lineLeadSpace) {
		inputLine = inputLine + inputObject.lineLeadSpace;
	}
	return inputLine;
}

//Append Indentation to Label/Spacing.
function appendIndentation(inputObject: LineObject, inputLine: string) {
	let tmpIndentation = "";
	if (inputObject.lineIndentationArray) {
		if (inputObject.lineIndentationArray.length > 0) {
			for (const i in inputObject.lineIndentationArray) {
				tmpIndentation = tmpIndentation + "." + inputObject.lineIndentationArray[i];
			}
			inputLine = inputLine + tmpIndentation;
		}
	}
	return inputLine;
}

//Append Routines to Label/Spacing/Indentation.
function appendRoutines(inputObject: LineObject, inputLine: string) {
	if (inputObject.lineRoutines) {
		for (const i in inputObject.lineRoutines) {
			if (inputObject.lineRoutines[i].mCommand || inputObject.lineRoutines[i].mCommand === "") {
				//Leave off interval spacing for first Routine.
				if (i === "0") {
					inputLine = inputLine + inputObject.lineRoutines[i].mCommand;
				} else {
					inputLine = inputLine + " " + inputObject.lineRoutines[i].mCommand;
				}
				//Append Post-Conditional.
				if (inputObject.lineRoutines[i].mPostCondition) {
					inputLine = inputLine + ":" + inputObject.lineRoutines[i].mPostCondition;
				}
				//Append Arguments.
				if (Object.prototype.hasOwnProperty.call(inputObject.lineRoutines[i], "mArguments")) {
					inputLine = inputLine + " " + inputObject.lineRoutines[i].mArguments;
				}
			}
		}
	}
	return inputLine;
}

//Append Comment.
function appendComment(inputObject: LineObject, inputLine: string) {
	if (Object.prototype.hasOwnProperty.call(inputObject, "lineComment")) {
		inputLine = inputLine + ";" + inputObject.lineComment;
	}
	return inputLine;
}

export { autoSpaceTab, autoSpaceEnter };