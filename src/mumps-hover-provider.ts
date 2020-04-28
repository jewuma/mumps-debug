import * as vscode from 'vscode';
let Hover = vscode.Hover;
let MumpsToken = require('./mumps-language-token').MumpsToken;

class MumpsHoverProvider {
    provideHover(document, position) {
        let token = new MumpsToken(document, position);

        if (!token.mayBeCommand && !token.isIntrinsic && !token.isLabelReference) {
            return;
        }

        if (token.definition) {
            let definition = token.definition;
            var snippet = { language: 'typescript', value: definition.functionSignature || definition.name };
            return new Hover([snippet, definition.description]);
        }
    }
}

export {MumpsHoverProvider}
