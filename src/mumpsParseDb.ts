import * as vscode from 'vscode'
import { LineToken, MumpsLineParser, ErrorInformation } from './mumpsLineParser'
export default class MumpsParseDb {
	private static instance: MumpsParseDb | null = null
	private _linetokens: LineToken[][] = []
	private _lines: string[] = []
	private _errorInformation: ErrorInformation[] = []
	private static _documentName: string = ""
	private static _documentVersion: number = -1
	private constructor() {
		this._linetokens = []
		this._errorInformation = []
	}
	static getInstance(document: vscode.TextDocument) {
		if (!MumpsParseDb.instance) {
			MumpsParseDb.instance = new MumpsParseDb()
		}
		if (document.fileName !== MumpsParseDb._documentName || document.version !== MumpsParseDb._documentVersion) {
			MumpsParseDb.instance.updateData(document)
			MumpsParseDb._documentName = document.fileName
			MumpsParseDb._documentVersion = document.version
		}
		return MumpsParseDb.instance;
	}
	public updateData(document: vscode.TextDocument) {
		this._lines = []
		this._linetokens = []
		this._errorInformation = []
		if (document.languageId === "mumps") {
			[this._lines, this._linetokens, this._errorInformation] = new MumpsLineParser().analyzeLines(document.getText())
		}
	}
	public getLine(line: number): string {
		return this._lines[line]
	}
	public getLineTokens(line: number): LineToken[] {
		return this._linetokens[line]
	}
	public getDocumentTokens(): LineToken[][] {
		return this._linetokens
	}
	public getDocumentErrors(): ErrorInformation[] {
		return this._errorInformation
	}
	public getLineCount(): number {
		return this._lines.length
	}
}