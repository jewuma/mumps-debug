import * as vscode from 'vscode';
let Location = vscode.Location;
let MumpsToken = require('./mumps-language-token').MumpsToken;
class MumpsDefinitionProvider {
    provideDefinition(document, position) {
        let token = new MumpsToken(document, position);
        if (token.isLabelReference && token.referredToLabel) {
            let position = token.referredToLabel.position;
            return new Location(token.referredToLabel.uri, position);
        }
    }
}

export {MumpsDefinitionProvider};