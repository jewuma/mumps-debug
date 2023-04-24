import * as vscode from 'vscode';
import { MumpsLineParser } from './mumpsLineParser';
const parser = new MumpsLineParser;
export default function expandCompress(state: vscode.Memento) {
	let doExpand = true;
	const editor = vscode.window.activeTextEditor
	if (editor) {
		const filename = editor.document.fileName;
		if (state.get(filename + "_expandState") === true) {
			doExpand = false;
			state.update(filename + "_expandState", false);
		} else {
			state.update(filename + "_expandState", true);
		}
		const document = editor.document.getText();
		const lines = document.split("\n")
		const lineCount = lines.length;
		if (lineCount) {
			const lastLineLength = lines[lineCount - 1].length;
			for (let i = 0; i < lineCount; i++) {
				const info = parser.expandCompressLine(lines[i], doExpand);
				if (info.errorText === '') {
					lines[i] = info.lineText;
				}
			}
			editor.edit(editBuilder => {
				editBuilder.replace(new vscode.Range(0, 0, lineCount, lastLineLength), lines.join("\n"));
			})
		}
	}
}
