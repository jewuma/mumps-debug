import * as vscode from 'vscode';
import * as parser from './parser/parser';

export default class MumpsDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

	public provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.SymbolInformation[]> {
		return new Promise(resolve => {
			const parsedDoc = parser.parseText(document.getText());
			const symbols: vscode.SymbolInformation[] = [];

			parsedDoc.methods.forEach(method => {
				const kind = vscode.SymbolKind.Function;

				const startPosition = new vscode.Position(method.id.position.line, 0);

				const endPostionLine = (method.endLine === -1) ? document.lineCount - 1 : method.endLine;
				const endPosition = new vscode.Position(endPostionLine, 0);

				const methodRange = new vscode.Location(document.uri, new vscode.Range(startPosition, endPosition));

				symbols.push(new vscode.SymbolInformation(method.id.value, kind, '', methodRange));
			});

			resolve(symbols);
		})
	}
}