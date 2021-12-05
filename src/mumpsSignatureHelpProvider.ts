import * as vscode from 'vscode';
import { MumpsTokenHelper } from './mumpsTokenData';
class MumpsSignatureHelpProvider {
	provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position) {
		let helper = new MumpsTokenHelper(document, position);
		return helper.getTokenSignature();
	}
}
export { MumpsSignatureHelpProvider };




