import * as vscode from 'vscode'
import { LineToken, MumpsLineParser, ErrorInformation } from './mumpsLineParser'
import { mumpsDiagnostics } from './extension';
import MumpsDiagnosticsProvider from './mumpsDiagnosticsProvider'
export default class MumpsParseDb {
	private static instance: MumpsParseDb | null = null
	private _linetokens: LineToken[][] = []
	private _lines: string[] = []
	private _errorInformation: ErrorInformation[] = []
	private _intendationLevel: number[] = []
	private static _documentName: string = ""
	private static _documentVersion: number = -1
	private constructor() {
		this._linetokens = []
		this._errorInformation = []
		this._intendationLevel = []
	}
	static getInstance(document: vscode.TextDocument, noDiagnostics?: boolean): MumpsParseDb {
		if (!MumpsParseDb.instance) {
			MumpsParseDb.instance = new MumpsParseDb()
		}
		if (document.fileName !== MumpsParseDb._documentName || document.version !== MumpsParseDb._documentVersion) {
			MumpsParseDb.instance.updateData(document, noDiagnostics)
			MumpsParseDb._documentName = document.fileName
			MumpsParseDb._documentVersion = document.version
		}
		return MumpsParseDb.instance;
	}
	static getFileInstance(fileName: string, fileContent: string): MumpsParseDb {
		if (!MumpsParseDb.instance) {
			MumpsParseDb.instance = new MumpsParseDb()
		}
		if (fileName !== MumpsParseDb._documentName) {
			MumpsParseDb.instance.updateFromFileData(fileContent)
			MumpsParseDb._documentName = fileName
			MumpsParseDb._documentVersion = 0;
		}
		return MumpsParseDb.instance;
	}
	public updateData(document: vscode.TextDocument, noDiagnostics?: boolean) {
		if (document.languageId === "mumps") {
			this.updateFromFileData(document.getText())
			if (noDiagnostics !== true) {
				new MumpsDiagnosticsProvider(mumpsDiagnostics).updateDiagnostics(document)
			}
		}
	}
	public updateFromFileData(fileContent: string) {
		this._lines = []
		this._linetokens = []
		this._errorInformation = [];
		[this._lines, this._linetokens, this._errorInformation, this._intendationLevel] = new MumpsLineParser().analyzeLines(fileContent)

	}
	public getIntendationLevel(line: number): number {
		return this._intendationLevel[line]
	}
	public getIntendationLevels(): number[] {
		return this._intendationLevel
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
	public setUnreachable(line: number, tokenId: number, unreachable: boolean) {
		this._linetokens[line][tokenId].isUnreachable = unreachable
	}
}