import * as vscode from 'vscode';
import { MumpsTokenHelper } from './mumpsTokenData';
export default class MumpsHoverProvider {
	/*eslint class-methods-use-this: 0*/
	provideHover(document: vscode.TextDocument, position: vscode.Position) {
		const helper = new MumpsTokenHelper(document, position);
		return helper.getTokenHoverInfo();
	}
}
