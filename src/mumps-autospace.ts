import * as vscode from 'vscode';
let em = require('emcellent');
//let tabSize = vscode.workspace.getConfiguration().get("editor.tabSize")
//var prevfin = true;

async function autoSpaceEnter() {
	//await vscode.commands.executeCommand("acceptSelectedSuggestion");
	let editor = vscode.window.activeTextEditor
	if (editor) {
		let pos = editor.selection.active
		let currentLine = editor.document.lineAt(pos.line).text;
		let parsed = em.parse(currentLine);
		let newLine = '';
		if (pos.character !== 0) {
			//check for removing a trailing .
			if ((parsed[0].lineRoutines === undefined || parsed[0].lineRoutines.length === 0) && currentLine.indexOf(";") === -1 && parsed[0].lineIndentationArray !== undefined && parsed[0].lineIndentationArray.length > 0) {
				parsed[0].lineIndentationArray.splice(-1)
				editor.edit((editBuilder) => {
					editBuilder.replace(new vscode.Range(pos.with(pos.line, 0), pos.with(pos.line, currentLine.length)), em.render(parsed))
				})
				//check for adding indentation to the new line
			} else {
				if (parsed[0].lineIndentationArray === undefined) {
					parsed[0].lineIndentationArray = []
				}
				if (lineContainsNoParamDo(parsed[0])) {
					parsed[0].lineIndentationArray.push(" ")
				}
				parsed[0].lineRoutines = []
				delete parsed[0].lineComment
				delete parsed[0].lineLabel
				newLine = em.render(parsed);
			}
		}
		editor.edit((editBuilder) => {
			editBuilder.insert(pos, "\n" + newLine);
		})
	}
}

function lineContainsNoParamDo(parsed) {
	let cmds = parsed.lineRoutines;
	if (cmds = parsed.lineRoutines) {
		for (let i = 0; i < cmds.length; i++) {
			if (cmds[i].mRoutine.match(/(d|do)/i) && !cmds[i].mArguments) {
				return true;
			}
		}
	}
	return false;
}

async function autoSpaceTab() {

	let editor = vscode.window.activeTextEditor
	if (editor) {
		let pos = editor.selection.active
		let currentLine = editor.document.lineAt(pos.line).text;
		let parsed = em.parse(currentLine);

		//vscode.commands.executeCommand("acceptSelectedSuggestion").then((test)=>{
		//	console.log(test);
		//});

		if ((parsed[0].lineRoutines === null || parsed[0].lineRoutines.length === 0) && currentLine.indexOf(";") === -1 && parsed[0].lineIndentationArray !== null && parsed[0].lineIndentationArray.length > 0) {
			parsed[0].lineIndentationArray.push(" ")
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

export { autoSpaceTab, autoSpaceEnter };