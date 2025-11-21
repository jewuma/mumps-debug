import * as vscode from 'vscode';
import { MumpsTokenHelper } from './mumpsTokenData';

export default class MumpsDefinitionProvider {
	/*eslint class-methods-use-this: 0*/
	provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
		const helper = new MumpsTokenHelper(document, position);
		return helper.getTokenRefLocation();
	}
}
