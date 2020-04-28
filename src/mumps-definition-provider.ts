import * as vscode from 'vscode';
let Location = vscode.Location;
let Position = vscode.Position;
let MumpsToken = require('./mumps-language-token').MumpsToken;

class MumpsDefinitionProvider {
    provideDefinition(document, position) {
        let token = new MumpsToken(document, position);
        if (token.isLabelReference && token.referredToLabel) {
            let position = token.referredToLabel.position;
            if (token.word === token.labelProgram) {
                position = new Position(0, 0);
            }
            return new Location(token.referredToLabel.uri, position);
        }
    }
}

export {MumpsDefinitionProvider};