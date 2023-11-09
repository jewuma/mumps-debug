import * as vscode from 'vscode';
import { TokenType, LineToken } from './mumpsLineParser'
import MumpsParseDb from './mumpsParseDb';
const tokenModifiers = ['standard'];
const subtype = "standard";
const tokentypes: string[] = Object.keys(TokenType).map(key => TokenType[key]);
const SemanticTokens = new vscode.SemanticTokensLegend(tokentypes, tokenModifiers);
//type: "global" | "local" | "exfunction" | "nonMfunction" | "entryref" | "operator" |
//      "keyword" | "ifunction" | "label" | "comment" | "sysvariable" | "string" | "number",


const MumpsHighlighter: vscode.DocumentSemanticTokensProvider = {
	// analyze the document and return semantic tokens
	provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
		const parseDb = MumpsParseDb.getInstance(document)
		const documentTokens: LineToken[][] = parseDb.getDocumentTokens()
		const tokensBuilder = new vscode.SemanticTokensBuilder(SemanticTokens);
		for (let line = 0; line < documentTokens.length; line++) {
			const tokens: LineToken[] = documentTokens[line];
			for (let tokenId = 0; tokenId < tokens.length; tokenId++) {
				const t = tokens[tokenId];
				const type = t.type;
				if (type === TokenType.exfunction) {
					t.position -= 2;			//Correct Position because of leading $$
					t.name = "$$" + t.name;
				}
				tokensBuilder.push(
					new vscode.Range(new vscode.Position(line, t.position), new vscode.Position(line, t.position + t.name.length)),
					TokenType[type], [subtype]
				);
			}
		}
		return tokensBuilder.build();
	}
};

export { MumpsHighlighter, SemanticTokens }
