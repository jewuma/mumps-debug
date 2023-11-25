import * as vscode from 'vscode';
import { MumpsLineParser, LabelInformation } from './mumpsLineParser'

export default class MumpsDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
	/*eslint class-methods-use-this: 0*/
	public provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.SymbolInformation[]> {
		return new Promise(resolve => {

			const labels: LabelInformation[] = MumpsLineParser.getLabels(document.getText());
			const symbols: vscode.SymbolInformation[] = [];

			for (let i = 0; i < labels.length; i++) {
				const startPosition = new vscode.Position(labels[i].line, 0);
				let endPostionLine = document.lineCount - 1;
				if (labels[i + 1] !== undefined) {
					endPostionLine = labels[i + 1].line
				}
				const endPosition = new vscode.Position(endPostionLine, 0);
				const methodRange = new vscode.Location(document.uri, new vscode.Range(startPosition, endPosition));
				symbols.push(new vscode.SymbolInformation(labels[i].name, vscode.SymbolKind.Function, '', methodRange));
			}

			resolve(symbols);
		})
	}
}