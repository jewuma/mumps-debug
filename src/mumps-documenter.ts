import * as vscode from 'vscode';
import { MumpsLabel } from "./mumps-label-lookup";
const DIVIDERLINE = "\t;****************\n"

function DocumentFunction(){
		let editor = vscode.window.activeTextEditor
		if (editor) {
			let document = editor.document
			let InsertPosition = editor.selection.start.with(editor.selection.start.line,0)

			//if the line is empty look down for the label
			while(InsertPosition.line < document.lineCount){
				let txt = editor.document.lineAt(InsertPosition.line).text
				if (txt.replace(/\t|\ /i,"")===""){
					InsertPosition = InsertPosition.translate(1,0)
				} else {
					break;
				}
			}
			if(InsertPosition.line === document.lineCount){
				InsertPosition = InsertPosition.translate(-1,0)
			}
			//start moving up the file looking for the label header
			while(InsertPosition.line >= 0){
				let txt = editor.document.lineAt(InsertPosition.line).text
				let functionSig = lineIsFunctionSig(txt)
				if (functionSig){
					editor.edit((editBuilder) =>{
						editBuilder.insert(InsertPosition, makeSignature(txt))
					})
					break;
				} else {
					InsertPosition = InsertPosition.translate(-1,0)
				}
			}
		}
};

/**
 * @description this will assume if there is code on the first position of the line that it is a function
 * @param {text to search} text
 * @return {returns false if there is none, true otherwise}
 */
function lineIsFunctionSig(text){
  if(text.length ===0 || text.charAt(0)===" " || text.charAt(0)==='\t' || text.charAt(0)===';'){
    return false;
  }
  return true
}

function makeSignature(labelLine:string){
  let Signature = ""

  Signature+=DIVIDERLINE
  Signature+="\t; DESCRIPTION: \n"
  let parameters = labelLine.match(/\(.*\)/)
  if(parameters !== null && parameters.length> 0){
    parameters = parameters[0].substring(1, parameters[0].length-1).split(",")
    if(parameters.length > 0){
      Signature+="\t; PARAMETERS: \n"
      parameters.forEach(function(element:string) {
        Signature+="\t;    " + element + "(I/O,REQ): \n"
      });
    }
  }

  Signature+="\t; RETURNS: \n"
  Signature+="\t; REVISIONS: \n"
  Signature+=DIVIDERLINE
  return Signature;
}

function getSigInfo(referredTo:MumpsLabel, definition, parametersByName){
	if (referredTo.text) {
		let description = referredTo.text.match(/DESCRIPTION:.*/i)
		if(description!==null) {definition.description = description[0];}
		//console.log(definition.description)
		//console.log(parametersByName)

		for(let param in parametersByName){
			//console.log(param)
			let paramDescription = referredTo.text.match(new RegExp(param+"\\(.*\\):.*",'i'))
			if(paramDescription !== null) {parametersByName[param].description=paramDescription}
		};
	}
}

export {getSigInfo, DocumentFunction};