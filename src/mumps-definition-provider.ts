import * as vscode from 'vscode';
import { MumpsTokenHelper } from './mumpsTokenData';
class MumpsDefinitionProvider {
	provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
		let helper = new MumpsTokenHelper(document, position);
		return helper.getTokenRefLocation();
	}
}

export { MumpsDefinitionProvider };