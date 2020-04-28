import { getTokens, Token, Type } from './tokenizer';

// Code adapted from the vscode-psl extension by ing-bank

/**
 * Used for checking the type of Member at runtime
 */
export enum MemberClass {
	method = 1,
	parameter = 2,
	// property = 3,
	declaration = 4,
	column = 5,
	table = 6,
	proc = 7,
}

/**
 * A generic type that abstracts Method, Parameter, Declaration, etc
 */
export interface IMember {

	/**
	 * The Token representing the name of the member.
	 */
	id: Token

	documentation?: string;
}

/**
 * Contains information about a Method
 */
export interface IMethod extends IMember {

	/**
	 * The Token of the closing parenthesis after the declaration of all the Method's parameters.
	 */
	closeParen: Token

	/**
	 * The parameters of the Method, each with their own typing and comment information.
	 */
	parameters: IParameter[]

	/**
	 * The zero-based line where the Method begins
	 */
	line: number

	/**
	 * The last line of the Method, right before the start of a new Method
	 */
	endLine: number

	/**
	 * Next Line of a method implementation
	 */
	nextLine: number

	/**
	 * Previous Line of a method implementation
	 */
	prevLine: number;

}

/**
 * Represents a parameter, always belonging to a Method
 */
export interface IParameter extends IMember {
	/**
	 * The contents of the comment for the parameter, i.e.
	 * ```
	 * public String name(
	 * 		String p1 // a comment
	 * 		)
	 * ```
	 */
	comment: Token
}

/**
 * A type declaration, typically found within a method.
 */
export interface IDeclaration extends IMember {
}


/**
 * An abstract syntax tree of a PSL document
 */
export interface IParsedDocument {

	/**
	 * An array of Declarations that are not contained within a method.
	 * This will be empty for valid Profile 7.6 code but is maintained for compatibility.
	 */
	declarations: IDeclaration[]

	/**
	 * An array of the methods in the document
	 */
	methods: IMethod[]

	/**
	 * All the tokens in the document, for reference.
	 */
	tokens: Token[]
}

class Method implements IMethod {

	nextLine: number;
	prevLine: number;
	closeParen: Token;
	id: Token;
	parameters: Parameter[]
	declarations: IDeclaration[];
	line: number;
	endLine: number;
	memberClass: MemberClass;
	documentation: string;

	constructor() {
		this.parameters = [];
		this.line = -1;
		this.declarations = [];
		this.endLine = -1;
		this.memberClass = MemberClass.method;
		this.documentation = '';
	}
}

class Parameter implements IParameter {
	id: Token
	comment: Token

	constructor() { }
}

export function parseText(sourceText: string): IParsedDocument {
	let parser = new Parser();
	return parser.parseDocument(sourceText);
}

class Parser {

	private tokenizer: IterableIterator<Token>;
	private activeToken: Token;
	private methods: Method[];
	private declarations: IDeclaration[];
	private activeMethod: Method;
	private tokens: Token[];

	constructor(tokenizer?: IterableIterator<Token>) {
		this.methods = [];
		this.declarations = [];
		this.tokens = [];
		if (tokenizer) this.tokenizer = tokenizer;
	}

	private next(): boolean {
		this.activeToken = this.tokenizer.next().value;
		if (this.activeToken) this.tokens.push(this.activeToken);
		return this.activeToken !== undefined;
	}

	parseDocument(documentText: string): IParsedDocument {
		this.tokenizer = getTokens(documentText);
		while (this.next()) {
			if (this.activeToken.isAlphanumeric()) {
				let method = this.parseMethod();
				if (!method) continue;
				this.methods.push(method);
				this.activeMethod = method;
			}
			else if (this.activeToken.isTab() || this.activeToken.isSpace()) {
				let lineNumber = this.activeToken.position.line;
				let tokenBuffer = this.loadTokenBuffer();
				if (this.activeMethod && this.activeMethod.nextLine === lineNumber) {
					let documentation = this.checkForDocumentation(tokenBuffer);
					if (documentation) this.activeMethod.documentation = documentation;
				}
			}
			else if (this.activeToken.isNewLine()) continue;
			else this.throwAwayTokensTil(Type.NewLine);
		}
		return {
			declarations: this.declarations,
			methods: this.methods,
			tokens: this.tokens
		}
	}

	private checkForDocumentation(tokenBuffer: Token[]): string {
		let i = 0;
		while (i < tokenBuffer.length) {
			let token = tokenBuffer[i];
			if (token.isSpace() || token.isTab()) {
				i++;
				continue;
			}
			if (token.isLineCommentInit() && tokenBuffer[i + 1] && tokenBuffer[i + 1].isLineComment()) {
				return tokenBuffer[i + 1].value;
			}
			return '';
		}
		return '';
	}

	private loadTokenBuffer() {
		let tokenBuffer:Token[] = []
		while (this.next() && this.activeToken.type !== Type.NewLine) {
			tokenBuffer.push(this.activeToken);
		}
		return tokenBuffer;
	}

	private parseMethod(): Method | undefined {
		let method: Method = new Method();
		do {
			if (!this.activeToken) continue;
			if (this.activeToken.isTab() || this.activeToken.isSpace()) continue;
			else if (this.activeToken.isNewLine()) break;
			else if (this.activeToken.isOpenParen()) {
				let processed = this.processParameters(method);
				if (!processed) return undefined;
				method.parameters = processed;
				break;
			}
			else if (this.activeToken.isAlphanumeric()) {
				if (method.line === -1) {
					method.line = this.activeToken.position.line;
					method.prevLine = this.activeToken.position.line - 1;
					method.nextLine = this.activeToken.position.line + 1;
                    method.id = this.activeToken;
				}
			}
			else if (this.activeToken.isLineCommentInit() || this.activeToken.isLineComment()) {
				continue;
			}
			else if (this.activeToken.value === '\r') continue;
			else if (this.activeToken.isCloseParen()) {
				if (!method.closeParen) {
					method.closeParen = this.activeToken;
					method.nextLine = this.activeToken.position.line + 1;
				}
			}
			else {
				this.throwAwayTokensTil(Type.NewLine);
				if (method.id) {
					break;
				}
				return undefined
			}
		} while (this.next());

		if (this.activeMethod) {
			this.activeMethod.endLine = method.id.position.line - 1;
		}
        this.activeMethod = method;
        return method;
	}

	private processParameters(method: Method): Parameter[] | undefined {
		let args: Parameter[] = [];
		let param: Parameter | undefined;
		let open = false;
		while (this.next()) {
			if (this.activeToken.isTab() || this.activeToken.isSpace() || this.activeToken.isNewLine()) continue;
			else if (this.activeToken.isOpenParen()) {
				open = true;
				if (!param) return undefined;
				continue;
			}
			else if (this.activeToken.isCloseParen()) {
				open = false;
				method.closeParen = this.activeToken;
				method.nextLine = this.activeToken.position.line + 1;
				if (!param) break;
				args.push(param);
				break;
			}
			else if (this.activeToken.isAlphanumeric()) {
				if (!param) param = new Parameter();
                param.id = this.activeToken;
			}
			else if (this.activeToken.isLineComment()) {
				if (param) {
					param.comment = this.activeToken
				}
				else if (args.length >= 1) {
					args[args.length - 1].comment = this.activeToken;
				}
			}
			else if (this.activeToken.isComma()) {
				if (!param) return undefined;
				args.push(param)
				param = undefined;
			}
		}
		if (open) return undefined;
		return args;
	}

	private throwAwayTokensTil(type: Type) {
		do { } while (this.next() && this.activeToken.type !== type)
	}

}