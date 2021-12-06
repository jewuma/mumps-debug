import * as vscode from 'vscode';
import { MumpsLineParser, LabelInformation } from './mumpsLineParser'
const parser = new MumpsLineParser();

export default class MumpsDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

	public provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.SymbolInformation[]> {
		return new Promise(resolve => {

			let labels: LabelInformation[] = parser.getLabels(document.getText());
			let symbols: vscode.SymbolInformation[] = [];

			for (let i = 0; i < labels.length; i++) {
				let startPosition = new vscode.Position(labels[i].line, 0);
				let endPostionLine = document.lineCount - 1;
				if (labels[i + 1] !== undefined) {
					endPostionLine = labels[i + 1].line
				}
				let endPosition = new vscode.Position(endPostionLine, 0);
				let methodRange = new vscode.Location(document.uri, new vscode.Range(startPosition, endPosition));
				symbols.push(new vscode.SymbolInformation(labels[i].name, vscode.SymbolKind.Function, '', methodRange));
			}

			resolve(symbols);
		})
	}
}