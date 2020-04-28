import * as vscode from 'vscode';
import * as parser from './parser/parser';

export class MumpsDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

	public provideDocumentSymbols(document: vscode.TextDocument): Promise<vscode.SymbolInformation[]> {
		return new Promise(resolve => {
			let parsedDoc = parser.parseText(document.getText());
            let symbols: vscode.SymbolInformation[] = [];

			parsedDoc.methods.forEach(method => {
                let kind = vscode.SymbolKind.Function;

				let startPosition = new vscode.Position(method.id.position.line, 0);

				let endPostionLine = (method.endLine === -1) ? document.lineCount - 1 : method.endLine;
                let endPosition = new vscode.Position(endPostionLine, 0);

                let methodRange = new vscode.Location(document.uri, new vscode.Range(startPosition, endPosition));

				symbols.push(new vscode.SymbolInformation(method.id.value, kind, '', methodRange));
            });

			resolve(symbols);
		})
	}
}