let fs = require('fs');
let path = require('path');
import * as vscode from 'vscode';
import * as autoDoc from './mumps-documenter'
let Position = vscode.Position;
let Uri = vscode.Uri;

const EXTENSIONS = ['.M', '.INT', '.ZWR', '.m', '.int', '.zwr'];

let cache:any = {};

function lookupLabelReference(token):MumpsLabel{
    console.log("here")
    let uri = token.labelProgram ?
        siblingUri(token.document, token.labelProgram) :
        token.document.uri;
    let referredTo = findReferredToLabel(getText(uri, token.document), token.label);
    console.log(referredTo)
    if (referredTo) {
        referredTo.position = new Position(referredTo.line + (token.labelOffset || 0), 0);
    } else {
        referredTo = {
						text: '',
            position: new Position(0, 0)
        };
    }
    referredTo.uri = uri;
    return referredTo;
}

function siblingUri(document, fileName) {
    let siblingPath = path.resolve(document.uri.fsPath, '../' + fileName);
    if (!fs.existsSync(siblingPath)) {
        if (fileName.charAt(0) === '%') {
            return siblingUri(document, '_' + fileName.substring(1));
        }

        for (var extension of EXTENSIONS) {
            let extendedPath = siblingPath + extension;
            if (fs.existsSync(extendedPath)) {
                siblingPath = extendedPath;
                break;
            }
        }
    }
    return Uri.file(siblingPath);
}

function getText(uri, document) {
    if (uri === document.uri) {
        return document.getText();
    }
    if (uri.fsPath === cache.fsPath) {
        return cache.text;
    }
    try {
        cache.text = fs.readFileSync(uri.fsPath, 'utf8');
        cache.fsPath = uri.fsPath;
        return cache.text;
    } catch (e) {
        return '';
    }
}

function findReferredToLabel(text:string, label):MumpsLabel|undefined {
    let lines = text.split("\n");
    let commentText = "";
    for(var i = 0; i<lines.length;i++){
        if(lines[i].match("^"+label)!=null){
            commentText+=lines[i]+"\n";
            for(var j = i-1; j> 0; j--){
                if(lines[j].length == 0 || lines[j].charAt(1) == ";"){
                    commentText+=lines[j]+"\n"
                }else {
                    break;
                }
            }
            break;
        }
    }
    if (commentText.length > 0) {
        return {
            text: commentText,
            line: i
        };
    }
}
/*
function countLines(text, index) {
    if (index >= text.length) {
        index = text.length - 1;
    }
    let re = /[\r\n]+/g;
    let result;
    let line = 0;
    while ((result = re.exec(text)) && result.index >= 0 && result.index < index) {
        ++line;
    }
    return line;
}
*/
function createDefinitionForLabelReference(referredTo:MumpsLabel) {
    console.log("CreateLabel")
    if (!referredTo.text) {
        return;
    }

    let definitionRegex = /^([%A-Z][A-Z0-9]*)(\((,?[%A-Z][A-Z0-9]*)+\))?/i;
    let result = definitionRegex.exec(referredTo.text);
    if (!result) {
        return;
    }

    let parameters:any = result[2].substring(1, result[2].length - 1).split(',');
    let parametersByName = {};
    for (var i = 0; i < parameters.length; i++) {
        parameters[i] = {
            name: parameters[i],
            type: 'any'
        };
        parametersByName[parameters[i].name] = parameters[i];
    }
    let definition = {
        name: result[1],
        type: 'function',
        parameters: parameters
    };

    //extractDescriptionFromComments(referredTo, definition, parametersByName);
    autoDoc.getSigInfo(referredTo,definition,parametersByName);

    return definition;
}
/*
function extractDescriptionFromComments(referredTo:MumpsLabel, definition, parametersByName) {
    let commentRegex = /;[ \t]*(.*)$/gm;
    let commentText = '';
    let result;
    while ((result = commentRegex.exec(referredTo.text)) !== null) {
        commentText += result[1] + '\n';
    }
    if (!commentText) {
        return;
    }

    // don't look for parameters in the first line
    let newlineResult = /\n/m.exec(commentText);
    if (newlineResult) {
        let additionalLines = commentText.substring(newlineResult.index + 1);
        for (var name in parametersByName) {
            let parameterRegex = new RegExp('^((input|output|input/output)[ \t:\\-]+)?' + name + '[ \t:\\-]+(.+)\n', 'm');
            let result = parameterRegex.exec(additionalLines);
            if (result) {
                parametersByName[name].description = result[3] + "ss";
                if (result[2]) {
                    parametersByName[name].description = result[2] + parametersByName[name].description;
                }
                additionalLines = additionalLines.substring(0, result.index) + additionalLines.substring(result.index + result[0].length);
            }
        }
        commentText = commentText.substring(0, newlineResult.index) + '\n' + additionalLines;
    }

    definition.description = commentText;
}
*/
interface MumpsLabel{text:string,line?:number,position?:vscode.Position,uri?:string}
export {lookupLabelReference,createDefinitionForLabelReference,MumpsLabel};