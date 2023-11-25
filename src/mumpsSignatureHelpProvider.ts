import * as vscode from 'vscode';
import { MumpsTokenHelper } from './mumpsTokenData';
export default class MumpsSignatureHelpProvider {
	/*eslint class-methods-use-this: 0*/
	provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position) {
		const helper = new MumpsTokenHelper(document, position);
		return helper.getTokenSignature();
	}
}
