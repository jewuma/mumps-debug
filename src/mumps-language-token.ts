import * as vscode from 'vscode';
import { lookupLabelReference, createDefinitionForLabelReference, MumpsLabel } from './mumps-label-lookup';
const definitionsArray = require('./../language-definitions.json');

const definitions = {};
exports.definitions = definitions;

class MumpsToken {
    _definition: any;
    referredToLabel:MumpsLabel;
    labelProgram: String;
    labelOffset: number;
    label: string;
    _isLabelReference: Boolean;
    document: vscode.TextDocument;
    position:vscode.Position;
    range:vscode.Range;
    word:String;
    surroundWord:String;

    constructor(document, position) {
        this.document = document;
        this.position = position;

        this.range = document.getWordRangeAtPosition(position);
        if (!this.range) {
            return;
        }

        this.word = document.getText(this.range);
        if (!this.word) {
            return;
        }

        this.surroundWord = getWordWithSurrounds(document, this.range) || this.word;

        if (this.isIntrinsic) {
            this.word = '$' + this.word;
        }
    }

    get mayBeCommand() {
        if (!this.surroundWord) {
            return false;
        }
        let lastChar = this.surroundWord.charAt(this.surroundWord.length - 1);
        return (isWhitespace(this.surroundWord.charAt(0)) ||this.surroundWord.charAt(0)===".") &&
            (lastChar === ':' ||
                isWhitespace(lastChar) ||
                this.surroundWord.length === this.word.length + 1);   // end-of-line
    }

    get isIntrinsic() {
        if (!this.surroundWord) {
            return false;
        }
        return this.surroundWord.charAt(0) === '$' && this.surroundWord.charAt(1) !== '$';
    }

    get isFunctionCall() {
        if (!this.surroundWord) {
            return false;
        }
        return this.surroundWord.charAt(this.surroundWord.length - 1) === '(';
    }

    get isLabelReference() {
        if (this._isLabelReference === undefined) {
            let line = this.document.lineAt(this.range.start);
            let word = this.isIntrinsic ? this.word.substring(1) : this.word;
            let regex = new RegExp('(([ \t](D|DO|G|GOTO)[ \t]+)|\\$\\$)([%\\^\\+A-Z0-9]*' + word + '[%\\^\\+A-Z0-9]*)', 'i');
            let match = regex.exec(line.text);
            this._isLabelReference = match !== null;
            if (match) {
                let fullLabel = match[4];
                let partsRegex = /([%A-Z][%A-Z0-9]*)?(\+\d+)?(\^[%A-Z][%A-Z0-9]*)?/gi;
								let parts = partsRegex.exec(fullLabel);
								if (parts) {
									this.label = parts[1];
									this.labelOffset = Number(withoutFirstCharacter(parts[2]));
									this.labelProgram = withoutFirstCharacter(parts[3]);
								}

                this.referredToLabel = lookupLabelReference(this);
            }
        }
        return this._isLabelReference;
    }

    get definition() {
        if (this._definition === undefined) {
            this._definition = false;
            let matches = definitions[this.word.toUpperCase()];
            if (matches) {
                for (let definition of matches) {
                    if (this.isFunctionCall && definition.type !== 'function') {
                        continue;
                    }
                    this._definition = definition;
                    break;
                }
            } else if (this.isLabelReference) {
                this._definition = createDefinitionForLabelReference(this.referredToLabel);
            }
            if (this._definition && this._definition.type === 'function') {
                this._definition.functionSignature = formatFunctionSignature(this._definition);
            }
        }
        return this._definition;
    }
}


function getWordWithSurrounds(document, range) {
    if (range.start.character <= 0) {
        return;
    }
    let start = new vscode.Position(range.start.line, range.start.character - 1);
    let end = new vscode.Position(range.end.line, range.end.character + 1);
    let surroundWord = document.getText(new vscode.Range(start, end));

    // check for two dollar signs
    if (surroundWord.charAt(0) === '$') {
        start = new vscode.Position(start.line, start.character - 1);
        let extendedWord = document.getText(new vscode.Range(start, end));
        if (extendedWord.charAt(0) === '$') {
            surroundWord = extendedWord;
        }
    }
    return surroundWord;
}

function isWhitespace(char) {
    return /\s+/.test(char);
}

function withoutFirstCharacter(string) {
    return string ? string.substring(1) : string;
}

function formatFunctionSignature(definition) {
    let signature = definition.name + '(';
    if (definition.parameters) {
        for (let i = 0; i < definition.parameters.length; i++) {
            signature += formatParameter(definition.parameters[i], i === 0);
        }
    }
    signature += ')';
    if (definition.returns) {
        signature += ':' + definition.returns.type;
    }
    return signature;
}

function formatParameter(parameter, first) {
    let s = (first ? '' : ',');
    s += parameter.name;
    s += ':' + parameter.type;
    if (parameter.optional) {
        s = '[' + s + ']';
    }
    return s;
}

function addDefinition(name, definition) {
    if (!definitions[name]) {
        definitions[name] = [definition];
    } else {
        definitions[name].push(definition);
    }
}

for (let definition of definitionsArray) {
    addDefinition(definition.name, definition);
    if (definition.abbreviation) {
        addDefinition(definition.abbreviation, definition);
    }
}
export {MumpsToken};