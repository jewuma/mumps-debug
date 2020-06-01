
const lvn=/^[A-Za-z%][A-Za-z0-9]*/
const glvn=/^\^[A-Za-z%][A-Za-z0-9]*/
const isv=/^\$(?i:DEVICE|ECODE|EC|ESTACK|ES|ETRAP|ET|HALT|HOROLOG|H|IO|I|JOB|J|KEY|K|NAMESPACE|PRINCIPAL|P|QUIT|Q|ROLES|STACK|ST|STORAGE|S|SYSTEM|TEST|T|THIS|TLEVEL|TL|USERNAME|X|Y)/i
const ifunction=/^(?&lt;!\$)\$(?i:ASCII|A|CHAR|C|DATA|D|EXTRACT|E|FIND|F|FNUMBER|FN|GET|G|JUSTIFY|J|LENGTH|L|NAME|NA|NEXT|N|ORDER|O|PIECE|P|QLENGTH|QL|QSUBSCRIPT|QS|QUERY|Q|RANDOM|R|REVERSE|RE|SELECT|S|STACK|ST|TEXT|T|TRANSLATE|TR|VIEW|V|ZABS|ZARCCOS|ZARCSIN|ZARCTAN|ZCOS|ZCOT|ZCSC|ZDATE|ZD|ZDATEH|ZDH|ZDATETIME|ZDT|ZDATETIMEH|ZDTH|ZEXP|ZHEX|ZH|ZLN|ZLOG|ZPOWER|ZSEC|ZSIN|ZSQR|ZTAN|ZTIME|ZT|ZTIMEH|ZTH|ZUTIL|ZU|ZF|ZPREVIOUS|ZP)(?=\()/i
const exfuncton=/^\$\$([A-Za-z%0-9][A-Za-z0-9]*)?(\^[A-Za-z%][A-Za-z0-9]*)?\(/
const exsv=/^\$\$([A-Za-z%0-9][A-Za-z0-9]*)?(\^[A-Za-z%][A-Za-z0-9]*)?/
const numlit=/^(\d*(?:(?=\d*)\.\d*)(E-?\d+)?)/
const command=/^[B|BREAK|C|CLOSE|D|DO|E|ELSE|F|FOR|G|GOTO|H|HALT|HANG|I|IF|J|JOB|K|KILL|L|LOCK|M|MERGE|N|NEW|O|OPEN|Q|QUIT|R|READ|S|SET|U|USE|V|VIEW|W|WRITE|X|XECUTE|ZA|ZALLOCATE|ZBR|ZBREAK|ZC|ZCONTINUE|ZD|ZDEALLOCATE|ZE|ZEDIT|ZG|ZGOTO|ZHALT|ZH|ZHELP|ZK|ZKILL|ZL|ZLINK|ZM|ZMESSAGE|ZP|ZPRINT|ZRUPDATE|ZSH|ZSHOW|ZST|ZSTEP|ZSY|ZSYSTEM|ZTC|ZTCOMMIT|ZTR|ZTRIGGER|ZTS|ZTSTART|ZWI|ZWITHDRAW|ZWR|ZWRITE]/i
const binoperator=/(\+|\-|\*|\/|\\|#|'|&|!|_|<|>|=|\[|\])/
const unaryoperator=/(\-|')/


class MumpsLineParser {


	getLineStatus(line: string | undefined, position: number) {
		let lineStatus = 'lineStart';
		let lookPosition = 0;
		let lastCommand = '';
		let startstring = '';
		let isInsidePostcond = false;
		if (line) {
			while (lookPosition < position) {
				let char = line.substring(lookPosition, ++lookPosition);
				let isWhiteSpace = (char === " " || char === "\t");
				let isBeginOfVariable = char.match(/[A-Za-z%^]/);
				let isAlphaChar = char.match(/[A-Za-z]/);
				//let isAlphanumeric=char.match(/[A-Za-z0-9%]/);
				//let isOperand = char.match(/[*+-/\[\]']/);
				if (lineStatus !== 'string' && char === ';') {
					return { lineStatus: 'comment', startstring: '' };
				}
				if (!isBeginOfVariable) {
					if (startstring !== '' && char.match(/[0-9]/)) {
						startstring += char
					} else {
						startstring = '';
					}
				} else {
					startstring += char;
				}
				switch (lineStatus) {
					case 'argument': {
						if (isWhiteSpace) {
							if (isInsidePostcond) {
								isInsidePostcond = false;
								if (lastCommand.match(/[D|DO|G|GOTO|J|JOB]/i)) {
									lineStatus = 'jumplabel'
								}
							} else {
								lineStatus = 'command';
								lastCommand = '';
							}
						} else if (char === '"') {
							lineStatus = 'string';
						} else if (isBeginOfVariable) {
							lineStatus = 'variable';
						} else if (char === "$") {
							lineStatus = 'function';
						}
						break;
					}
					case 'command': {
						if (char === ":") {
							lineStatus = 'argument';
							isInsidePostcond = true;
						} else if (isAlphaChar) {
							lastCommand += char;
							break;
						} else if (isWhiteSpace) {
							lineStatus = 'argument';
							if (lastCommand.match(/[D|DO|G|GOTO|J|JOB]/i)) {
								lineStatus = 'jumplabel'
							}
						} else {
							lineStatus = 'error';
							return { lineStatus: 'error', startstring: '' };
						}
						break;
					}
					case 'function': {
						if (isWhiteSpace) {
							if (isInsidePostcond) {
								isInsidePostcond = false;
							} else {
								lineStatus = 'command';
								lastCommand = '';
							}
						} else if (char === "$") {
							lineStatus = 'jumplabel';
						}
						if (!isBeginOfVariable) {
							lineStatus = 'argument';
						}
						break;
					}
					case 'jumplabel': {
						if (isWhiteSpace) {
							lineStatus = 'command';
							lastCommand = '';
						} else if (char === ":") {
							lineStatus = 'argument';
						} else if (char === "(") {
							lineStatus = 'argument';
						}
						break;
					}
					case 'label': {
						if (isWhiteSpace) {
							lineStatus = 'command';
						} else if (char = '(') {
							lineStatus = 'variable';
						}
						break;
					}
					case 'lineStart': {
						if (isWhiteSpace) {
							lineStatus = 'command';
						} else {
							lineStatus = 'label';
						}
						break;
					}
					case 'string': {
						if (char === '"') {
							lineStatus = 'argument';
						}
						break;
					}
					case 'variable': {
						if (isWhiteSpace) {
							if (isInsidePostcond) {
								isInsidePostcond = false;
								lineStatus = 'argument';
							} else {
								lineStatus = 'command';
								lastCommand = '';
							}
						} else if (!isBeginOfVariable) {
							lineStatus = 'argument';
						}
						break;
					}
				}
			}
		}
		return { lineStatus, startstring };

	}
	evaluateExpression(line:string,position:number,ergObject,level:number|undefined) {
		if (level===undefined) {level=0;}
		let char=line.charAt(position);
		if (char==='(') {
			return this.evaluateExpression(line,++position,ergObject,++level);
		}
		let evalString=line.substring(position);
		if (evalString.match(glvn)) {
			ergObject.push({type: "globalname", value:evalString.match(glvn)});
		} else if  (evalString.match(lvn)) {
			ergObject.push({type: "localname", value:evalString.match(lvn)});
		} else if (evalString.match(exfuncton)) {
			ergObject.push({type: "exfunction", value:evalString.match(exfuncton)});
		} else if (evalString.match(exsv)) {
			ergObject.push({type: "exvariable", value:evalString.match(exsv)});
		}
	}
}