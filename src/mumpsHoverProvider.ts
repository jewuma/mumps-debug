import * as vscode from 'vscode';
import { MumpsTokenHelper } from './mumpsTokenData';
class MumpsHoverProvider {
	provideHover(document: vscode.TextDocument, position: vscode.Position) {
		const helper = new MumpsTokenHelper(document, position);
		return helper.getTokenHoverInfo();
	}
}
export { MumpsHoverProvider }
