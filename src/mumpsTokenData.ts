import * as vscode from 'vscode';
import { TokenType, MumpsLineParser, label } from './mumpsLineParser';
const parser = new MumpsLineParser();
import { definitionsArray } from './language-definitions';
const definitions = {};
import * as fs from 'fs'
import * as path from 'path';
const Uri = vscode.Uri;
const EXTENSIONS = ['.m', '.int', '.zwr', '.M', '.INT', '.ZWR'];
const cache: { fsPath: string, text: string } = { fsPath: "", text: "" };
interface LocationInfo { location: vscode.Location, commentText: string, labelLine: string }
interface ParameterDefinition {
	name: string,
	type: string,
	description?: string
	optional?: boolean
}
interface TokenDefinition {
	name: string,
	type: string,
	abbreviation?: string,
	commentText?: string,
	description: string,
	parameters?: ParameterDefinition[],
	returns?: { type: string }
	location?: vscode.Location
}
interface TokenData {
	name: string,
	parameters: vscode.ParameterInformation[],
	description: string
}
function addDefinition(name: string, definition: TokenDefinition) {
	if (!definitions[name]) {
		definitions[name] = [definition];
	} else {
		definitions[name].push(definition);
	}
}
if (Object.keys(definitions).length === 0) {
	for (const definition of definitionsArray) {
		addDefinition(definition.name, definition);
		if (definition.abbreviation) {
			addDefinition(definition.abbreviation, definition);
		}
	}
}
export class MumpsTokenHelper {
	private _document: vscode.TextDocument;
	private _position: vscode.Position;
	constructor(document: vscode.TextDocument, position: vscode.Position) {
		this._document = document;
		this._position = position;
	}
	private _getText(uri: vscode.Uri) {
		if (uri === this._document.uri) {
			return this._document.getText();
		}
		if (uri.fsPath === cache.fsPath) {
			return cache.text;
		}
		try {
			cache.text = fs.readFileSync(uri.fsPath, 'utf8');
			cache.fsPath = uri.fsPath;
			return cache.text;
		} catch {
			return '';
		}
	}
	public getTokenSignature(): vscode.SignatureHelp | undefined {
		const line = this._document.lineAt(this._position);
		if (!line) {
			return;
		}
		const text = line.text;
		const myToken = this._getFunctionToken(text);
		if (myToken === undefined || (myToken.type !== TokenType.ifunction && myToken.type !== TokenType.exfunction)) {
			return;
		}
		const definition = this.getTokenData(myToken.name, myToken.type);
		if (!definition) {
			return;
		}
		const help = new vscode.SignatureHelp();
		help.signatures = [MumpsTokenHelper.convertDefinition(definition)];
		help.activeSignature = 0;
		help.activeParameter = MumpsTokenHelper._calculateActiveParameter(line.text, myToken.position + myToken.name.length, this._position.character);
		return help;
	}
	public getTokenHoverInfo(): vscode.Hover | undefined {
		const myToken = parser.getTokenAt(this._document.lineAt(this._position).text, this._position.character);
		if (myToken === undefined) {
			return;
		}
		if (myToken.type === TokenType.exfunction || myToken.type === TokenType.ifunction ||
			myToken.type === TokenType.entryref || myToken.type === TokenType.keyword) {
			const definition = this.getTokenData(myToken.name, myToken.type);
			if (!definition) {
				return;
			}
			if (definition.parameters) {
				definition.name += "(";
				for (let i = 0; i < definition.parameters.length; i++) {
					if (i !== 0) {
						definition.name += ",";
					}
					definition.name += definition.parameters[i].name;
				}
				definition.name += ")";
			}
			const snippet = { language: 'mumps', value: definition.name };
			return new vscode.Hover([snippet, definition.commentText || definition.description]);
		}
	}
	private static _calculateActiveParameter(lineText: string, parametersStartIndex: number, insertIndex: number) {
		let active = 0;
		let depth = 0;
		let isInsideString = false;
		for (let i = parametersStartIndex + 1; i < insertIndex; i++) {
			const char = lineText.charAt(i);
			if (char === '(' && !isInsideString) {
				depth++;
			} else if (char === ')' && !isInsideString) {
				depth--;
			} else if (char === '"') {
				isInsideString = !isInsideString;
			} else if (char === ',' && depth === 0 && !isInsideString) {
				active++;
			}
		}
		return active;
	}
	public getTokenRefLocation(): vscode.Location | undefined {
		const myToken = parser.getTokenAt(this._document.lineAt(this._position).text, this._position.character);
		if (myToken === undefined) {
			return;
		}
		if (myToken.type === TokenType.entryref || myToken.type === TokenType.exfunction) {
			const tokendata = this.getTokenData(myToken.name, myToken.type);
			if (tokendata) {
				return tokendata.location;
			}
		}
	}

	// get Information for given function or keyword
	public getTokenData(functionName: string, functionType: TokenType): TokenDefinition | undefined {
		if (functionType === TokenType.ifunction || functionType === TokenType.keyword) {
			const matches = definitions[functionName.toUpperCase()];
			if (matches) {
				for (const definition of matches) {
					if (definition.type !== 'function' && definition.type !== "command") {
						continue;
					}
					return Object.assign({}, definition);
				}
			} else {
				return;
			}
		} else if (functionType === TokenType.exfunction || functionType === TokenType.entryref) {
			const locationInfo = this.getPositionForLabel(functionName);
			if (locationInfo) {
				return MumpsTokenHelper._extractDefinition(locationInfo);
			}
		} else {
			return;
		}
	}
	public static convertDefinition(definition: TokenDefinition): vscode.SignatureInformation {
		const data: TokenData = {
			name: "",
			description: "",
			parameters: []
		}
		data.description = definition.description;
		if (definition.parameters) {
			data.name = definition.name + '(';
			for (let i = 0; i < definition.parameters.length; i++) {
				const parameter = definition.parameters[i];
				let description = parameter.optional ? '(optional) ' : '';
				description += parameter.description || parameter.name;
				data.parameters.push(new vscode.ParameterInformation(parameter.name, description));
				if (parameter.optional) {
					data.name += '[';
				}
				data.name += (i === 0 ? '' : ',');
				data.name += parameter.name + ':' + parameter.type;
				if (parameter.optional) {
					data.name += ']';
				}
			}
			data.name += ')';
			if (definition.returns) {
				data.name += ':' + definition.returns;
			}
		}
		const signature = new vscode.SignatureInformation(data.name, data.description);
		signature.parameters = data.parameters;
		return signature;
	}
	public getPositionForLabel(label: string): LocationInfo | undefined {
		let fileUri = this._document.uri;
		let nakedLabel = label.split("^")[0];
		let offset = 0;
		let labelLine = "";
		if (nakedLabel.split("+")[1] !== undefined) {
			offset = parseInt(label.split("+")[1]);
			nakedLabel = nakedLabel.split("+")[0];
		}
		if (label.indexOf("^") !== -1) {
			let fileName = label.split("^")[1];
			if (fileName.charAt(0) === '%') {
				fileName = '_' + fileName.substring(1);
			}
			let fullPath = path.resolve(this._document.uri.fsPath, '../' + fileName);
			for (const extension of EXTENSIONS) {
				const extendedPath = fullPath + extension;
				if (fs.existsSync(extendedPath)) {
					fullPath = extendedPath;
					break;
				}
			}
			fileUri = Uri.file(fullPath);
		}
		const lines: string[] = this._getText(fileUri).split("\n");
		let commentText = "";
		let i = 0;
		const labelLength = nakedLabel.length;
		for (i = 0; i < lines.length; i++) {
			if (labelLength === 0 || (lines[i].startsWith(nakedLabel) && (lines[i].length === labelLength || lines[i][labelLength].match(/(;|\s|\(|:)/) !== null))) {
				labelLine = lines[i];
				commentText += lines[i] + "\n";
				for (let j = i - 1; j > 0; j--) {
					if (lines[j].length === 0 || lines[j].match(/^\s*;/)) {
						commentText += lines[j] + "\n"
					} else {
						break;
					}
				}
				break;
			}
		}
		if (commentText.length > 0) {
			commentText = commentText.split("\n").reverse().join("\n")
			return {
				commentText,
				location: new vscode.Location(fileUri, new vscode.Position(i + offset, 0)),
				labelLine
			};
		}
		return;
	}
	private static _extractDefinition(locationInfo: LocationInfo): TokenDefinition | undefined {
		const definition: TokenDefinition = {
			name: '',
			type: 'function',
			commentText: '',
			description: '',
			returns: { type: '' },
			location: locationInfo.location
		};
		const labelLines = locationInfo.commentText;
		definition.commentText = labelLines
		//const definitionRegex = /^(\d+)|([%A-Z][A-Z0-9]*)(\((,?[%A-Z][A-Z0-9]*)+\))?/i;
		const result = label.exec(locationInfo.labelLine);
		if (!result) {
			return;
		}
		definition.name = result[1];
		if (labelLines.indexOf(';')) {
			definition.commentText = labelLines.substring(labelLines.indexOf(';') + 1);
		}
		let parameterNames: string[] = [];
		const parametersByName = {};
		if (result[3] !== undefined) {
			parameterNames = result[3].substring(1, result[3].length - 1).split(',')
			definition.parameters = [];
			for (let i = 0; i < parameterNames.length; i++) {
				definition.parameters.push(
					{
						name: parameterNames[i],
						type: 'any'
					});
				parametersByName[parameterNames[i]] = definition.parameters.length - 1;
			}
		}
		if (labelLines !== "") {
			const description = labelLines.match(/DESCRIPTION:.*/i)
			if (description !== null) { definition.description = description[0]; }

			for (const param in parametersByName) {
				const paramDescription = labelLines.match(new RegExp("\\s" + param + "(\\(.*\\))?:.*", 'i'))

				if (paramDescription !== null) { definition.parameters![parametersByName[param]].description = paramDescription[0] }
			}
		}
		return definition;
	}
	private _getFunctionToken(lineText: string) {
		let depth = 1;
		let index: number;
		const linePosition = this._position.character;
		for (index = linePosition - 1; index > 0 && depth > 0; index--) {
			const char = lineText.charAt(index);
			if (char === ')') {
				depth++;
			} else if (char === '(') {
				depth--;
			}
		}
		if (depth > 0 || index <= 0) {
			return;
		}
		return parser.getTokenAt(lineText, index);
	}
}

