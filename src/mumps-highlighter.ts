import * as vscode from 'vscode';
import {TokenType, MumpsLineParser} from './mumpsLineParser'
const tokenModifiers = ['standard'];
const subtype="standard";
const tokentypes:string[]=Object.values(TokenType);
const SemanticTokens = new vscode.SemanticTokensLegend(tokentypes, tokenModifiers);
const parser = new MumpsLineParser();
//type: "global" | "local" | "exfunction" | "nonMfunction" | "entryref" | "operator" |
//      "keyword" | "ifunction" | "label" | "comment" | "sysvariable" | "string" | "number",


const MumpsHighlighter: vscode.DocumentSemanticTokensProvider = {
  provideDocumentSemanticTokens(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.SemanticTokens> {
    // analyze the document and return semantic tokens
		const text = document.getText();
		const result = parser.analyzeLines(text);
		const tokensBuilder = new vscode.SemanticTokensBuilder(SemanticTokens);
		for (let line=0;line<result.length;line++) {
			let tokens=result[line];
			for (let tokenId=0;tokenId<tokens.length;tokenId++) {
				let t=tokens[tokenId];
				let type=t.type;
				if (type==="exfunction") {
					t.position-=2;			//Correct Position because of leading $$
					t.name="$$"+t.name;
				}
				if (t.position<0) {
					console.log(tokens);
				}
				tokensBuilder.push(
					new vscode.Range(new vscode.Position(line,t.position), new vscode.Position(line, t.position+t.name.length)),
				  type, [subtype]
				);
			}
		}
    return tokensBuilder.build();
  }
};

export {MumpsHighlighter, SemanticTokens}
