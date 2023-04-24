import * as vscode from 'vscode';
import { MumpsTokenHelper } from './mumpsTokenData';
export default class MumpsSignatureHelpProvider {
	provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position) {
		const helper = new MumpsTokenHelper(document, position);
		return helper.getTokenSignature();
	}
}
