import * as vscode from 'vscode';
import { TokenType, LineToken } from './mumpsLineParser'
import MumpsParseDb from './mumpsParseDb';
const tokenModifiers = ['readonly', 'deprecated'];
const tokentypes: string[] = Object.keys(TokenType).map(key => TokenType[key]);
tokentypes.push("unreachable")
const SemanticTokens = new vscode.SemanticTokensLegend(tokentypes, tokenModifiers);

//type: "global" | "local" | "exfunction" | "nonMfunction" | "entryref" | "operator" |
//      "keyword" | "ifunction" | "label" | "comment" | "sysvariable" | "string" | "number",


const MumpsHighlighter: vscode.DocumentSemanticTokensProvider = {
	// analyze the document and return semantic tokens
	provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
		const parseDb = MumpsParseDb.getInstance(document)
		const documentTokens: LineToken[][] = parseDb.getDocumentTokens()
		const tokensBuilder = new vscode.SemanticTokensBuilder(SemanticTokens);
		const subtype = "readonly"
		for (let line = 0; line < documentTokens.length; line++) {
			const tokens: LineToken[] = documentTokens[line];
			for (let tokenId = 0; tokenId < tokens.length; tokenId++) {
				const t = tokens[tokenId];
				const type = t.type;
				let position = t.position
				let name = t.name
				if (type === TokenType.exfunction) {
					position -= 2;			//Correct Position because of leading $$
					name = "$$" + t.name;
				} else if (type === TokenType.comment) {
					name = ";" + name; // Token is too short else
				}
				const typeString = t.isUnreachable ? "unreachable" : TokenType[type]
				//console.log({ Type: TokenType[type], SubType: subtype, line, start: t.position, end: (position + name.length) })
				tokensBuilder.push(
					new vscode.Range(new vscode.Position(line, t.position), new vscode.Position(line, position + name.length)),
					typeString, [subtype]
				);
			}
		}
		return tokensBuilder.build();
	}
};

export { MumpsHighlighter, SemanticTokens }
