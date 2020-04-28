import * as vscode from 'vscode';
let ParameterInformation = vscode.ParameterInformation;
let Position = vscode.Position;
let SignatureHelp = vscode.SignatureHelp;
let SignatureInformation = vscode.SignatureInformation;
let MumpsToken = require('./mumps-language-token').MumpsToken;

class MumpsSignatureHelpProvider {
    provideSignatureHelp(document, position) {
        let line = document.lineAt(position);
        if (!line) {
            return;
        }

        let token = getFunctionToken(document, line, position);
        if (!token || !token.definition) {
            return;
        }

        let signature = createSignatureInformation(token.definition);

        let help = new SignatureHelp();
        help.signatures = [signature];
        help.activeSignature = 0;
        help.activeParameter = calculateActiveParameter(line.text, token.position.character + 1, position.character);
        return help;
    }
}
export {MumpsSignatureHelpProvider};

function getFunctionToken(document, line, position) {
    let depth = 1;
    let index;
    for (index = position.character - 1; index > 0 && depth > 0; index--) {
        let char = line.text.charAt(index);
        if (char === ')') {
            depth++;
        } else if (char === '(') {
            depth--;
        }
    }
    if (depth > 0 || index <= 0) {
        return;
    }

    return new MumpsToken(document, new Position(position.line, index));
}

function createSignatureInformation(definition) {
    let signature = new SignatureInformation(definition.functionSignature, definition.description);
    if (definition.parameters) {
        signature.parameters = [];
        for (var parameter of definition.parameters) {
            var description = parameter.optional ? '(optional) ' : '';
            description += parameter.description || parameter.name;
            signature.parameters.push(new ParameterInformation(parameter.name, description));
        }
    }
    return signature;
}

function calculateActiveParameter(lineText, parametersStartIndex, insertIndex) {
    let active = 0;
    let depth = 0;
    for (var i = parametersStartIndex + 1; i < insertIndex; i++) {
        let char = lineText.charAt(i);
        if (char === '(') {
            depth++;
        } else if (char === ')') {
            depth--;
        } else if (char === ',' && depth === 0) {
            active++;
        }
    }
    return active;
}
