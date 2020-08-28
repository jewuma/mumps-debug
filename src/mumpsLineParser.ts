let fs = require('fs');
interface ErrorInformation {
	text: string,
	position: number,
	line?: number,
	indexFound?: boolean,
	globalFound?: boolean
	indirectionFound?: boolean;
}
export enum TokenType {
	"global"= "global" , "local"="local" , "exfunction"="exfunction", "nonMfunction"="nonMfunction" , "entryref"="entryref" ,
	 "operator"="operator" ,	"keyword"="keyword" , "ifunction"="ifunction" , "label"="label" , "comment"="comment",
	 "sysvariable"="sysvariable" , "string"="string" , "number"="number"
}
interface LineToken {
	type: TokenType,
	name: string,
	position: number
}
interface LineComand {
	command: string,
	position: number
}
interface LineComment {
	comment: string,
	position: number
}
interface LineObject {
	lineComment?: LineComment;
	lineIndentationArray?: string[];
	lineRoutines?: TmpFunction[];
	lineLeadSpace?: string,
	lineLabel?: string,
	lineExpression: string,
	errorText?: string,
	errorPosition?: number,
	expressionPosition: number
}
interface TmpFunction {
	mCommand: string,
	mArguments: string,
	mPostCondition: string,
	cmdPosition: number,
	argPosition: number,
	pcPosition: number
}
const label = /^[A-Za-z%][A-Za-z0-9]*(\([A-Za-z%][A-Za-z0-9]*(,[A-Za-z%][A-Za-z0-9]*)*\))?/
const lvn = /^[A-Za-z%][A-Za-z0-9]*/
const gvn = /^\^[A-Za-z%][A-Za-z0-9]*/
const isv = /^\$(DEVICE|ECODE|EC|ESTACK|ES|ETRAP|ET|HALT|HOROLOG|H|IO|I|JOB|J|KEY|K|NAMESPACE|PRINCIPAL|P|QUIT|Q|REFERENCE|R|STACK|ST|STORAGE|S|SYSTEM|TEST|THIS|TLEVEL|TL|T|USERNAME|X|Y|ZALLOCSTOR|ZA|ZB|ZCHSET|ZCLOSE|ZCMDLINE|ZCM|ZCOMPILE|ZCO|ZCSTATUS|ZC|ZDATEFORM|ZDA|ZDIRECTORY|ZD|ZEDITOR|ZED|ZEOF|ZEO|ZE[A-Z]*|ZGBLDIR|ZG|ZHRORLOG|ZH|ZININTERRUPT|ZINI|ZINTERRUPT|ZINT|ZIO|ZJOB|ZJ|ZKEY|ZLEVEL|ZL|ZMAXTPTIME|ZMAXTPTI|ZMODE|ZMO|ZONLNRLBK|ZPATNUMERIC|ZPATN|ZPIN|ZPOSITION|ZPOS|ZPOUT|ZPROMPT|ZQUIT|ZREALSTOR|ZRELDATE|ZRO[A-Z]*|ZSOURCE|ZSO|ZSTA[A-Z]*|ZSTEP|ZSTRP|ZSTRPLLIM|ZST|ZSYSTEM|ZSY|ZS|ZTEXIT|ZTE|ZTIMEOUT|ZTIM|ZTRAP|ZT|ZUSEDSTOR|ZUT|ZVERSION|ZV[A-Z]*|ZYERROR|ZYRELEASE|ZTDATA|ZTDELIM|ZTLEVEL|ZTNAME|ZTOLDVAL|ZTRIGGEROP|ZTSLATE|ZTUPDATE|ZTVALUE|ZTWORMHOLE)/i
const ifunction = /^\$(ASCII|A|CHAR|C|DATA|D|EXTRACT|E|FIND|F|FNUMBER|FN|GET|G|INCREMENT|INCR|I|JUSTIFY|J|LENGTH|L|NAME|NA|NEXT|N|ORDER|O|PIECE|P|QLENGTH|QL|QSUBSCRIPT|QS|QUERY|Q|RANDOM|R|REVERSE|RE|SELECT|S|STACK|ST|TEXT|T|TRANSLATE|TR|VIEW|V|ZAHANDLE|ZAH|ZASCII|ZATRANSFORM|ZAT|ZBITAND|ZBITCOUNT|ZBITFIND|ZBITGET|ZBITLEN|ZBITNOT|ZBITOR|ZBITSET|ZBITSTR|ZBITXOR|ZCHAR|ZCH|ZCOLLATE|ZCONVERT|ZCO|ZDATE|ZDATA|ZD|ZEXTRACT|ZE|ZFIND|ZF|ZGETJPI|ZG|ZINCREMENT|ZINCR|ZJOBEXAM|ZJUSTIFY|ZJ|ZLENGTH|ZL|ZMESSAGE|ZPARSE|ZPEEK|ZPIECE|ZPI|ZPREVIOUS|ZP|ZQGBLMOD|ZSEARCH|ZSIGPROC|ZSOCKET|ZSUBSTR|ZSUB|ZSYSLOG|ZTRANSLATE|ZTRIGGER|ZTRI|ZTRNLNM|ZTR|ZWIDTH|ZWRITE|ZW)(?=\()/i;
const nonMfunction = /^\$\&([A-Za-z%0-9][A-Za-z0-9]*.)?([A-Za-z%0-9][A-Za-z0-9]*)?(\^[A-Za-z%][A-Za-z0-9]*)?/
const entryref = /^(\&[A-Za-z0-9]*\.?)?@?([A-Za-z%0-9][A-Za-z0-9]*)?(\^@?[A-Za-z%][A-Za-z0-9]*)?/
const routineref = /^\^@?[A-Za-z%][A-Za-z0-9]*/
const numlit = /^(\d*\.?\d*(E-?\d+)?)/
const strlit = /^"([^"]*("")*)*"/
const command = /^[B|BREAK|C|CLOSE|D|DO|E|ELSE|F|FOR|G|GOTO|H|HALT|HANG|I|IF|J|JOB|K|KILL|L|LOCK|M|MERGE|N|NEW|O|OPEN|Q|QUIT|R|READ|S|SET|U|USE|V|VIEW|W|WRITE|X|XECUTE|ZA|ZALLOCATE|ZBR|ZBREAK|ZC|ZCONTINUE|ZD|ZDEALLOCATE|ZE|ZEDIT|ZG|ZGOTO|ZHALT|ZH|ZHELP|ZK|ZKILL|ZL|ZLINK|ZM|ZMESSAGE|ZP|ZPRINT|ZRUPDATE|ZSH|ZSHOW|ZST|ZSTEP|ZSY|ZSYSTEM|ZTC|ZTCOMMIT|ZTR|ZTRIGGER|ZTS|ZTSTART|ZWI|ZWITHDRAW|ZWR|ZWRITE]/i
const binoperator = /^('=|'>|'<|<=|>=|'&|'!|'\?|'\[|'\]|\*\*|\+|\-|\*|\/|\\|#|'|&|!|_|<|>|=|\[|\]|\?|@)/
const unaryoperator = /(\-|'|\+|@)/
const patcode = /^([A|C|E|L|N|P|U]|^("([^"]("")*)*"))+/i
const repititionCount = /^\d*\.?\d*/
const openkeywords = /^APPEND|ATTACH=|BLOCK(SIZE)?=|COMMAND=|CONNECT=|(NO)?DELIM(ITER)?=?|EXC(EPTION)?=|FIFO|(NO)?FIXED|GROUP=|[IO]?CHSET=|KEY|IKEY|INDEPENDANT|IOERROR=|NEW[A-Z]*|MOREREADTIME=|OKEY|OWNER=|(NO)?RCHK|(NO)?READ(ONLY)?|RECORD(SIZE)?=|(NO)?RETRY|REWIND|SEEK=|SHELL=|STDERR=|(NO)?STREAM|SYSTEM=|(NO)?TRUNCATE|UIC=|VARIABLE|WORLD=|Z?(NO)?WRAP|WRITE(ONLY)?|ZBFSIZE|Z(NO)?DELAY|Z(NO)?FF|ZIBFSIZE|Z?LISTEN=/i
const usekeywords = /^ATTACH|(NO)?CENABLE|[IO]?CHSET=|CLEAR(SCREEN)?|CONNECT|(NO)?CONVERT|CTRAP=|(NO)?DELIM(ITER)?=?|DETACH|DOWNSCROLL|(NO)?ECHO|(NO)?EDITING|ERASELINE|(NO)?ESC(APE)?|EXC(EPTION)?=|(NO)?FILTER=?|FLUSH|GROUP=|KEY|IKEY|IOERROR=|OKEY|OWNER=|(NO)?PASTHRU|(NO)?RCHK|(NO)?RETRY|REWIND|SEEK=|SKIPFILE=|SOCKET=|SPACE=|TERM(INATOR)?=|(NO)?TRUNCATE|(NO)?TTSNYC|(NO)?TYPEAHEAD|UPSCROLL|Z?LENGTH=|Z?WIDTH=|Z?(NO)?WRAP|WRITELB=|X=|Y=|ZBFSIZE|Z(NO)?DELAY|Z(NO)?FF|ZIBFSIZE|LISTEN=/i
const closekeywords = /^DELETE|(NO)?DESTROY|EXCEPTION=|GROUP=|OWNER=|RENAME=|SOCKET=|TIMEOUT=|UIC=|WORLD=/i
const jobkeywords = /^CMD=|CMDLINE=|DEF=|DEFAULT=|ERR=|ERROR=|GBL=|GBLDIR=|IN=|INPUT=|OUT=|OUTPUT=|PASS|PASSCURLVN|STA=|STARTUP=/i
const tstartkeywords = /^SERIAL|S|T=|TRANSACTIONID=/i
const cmdExpansions = {
	'B': 'BREAK', 'C': 'CLOSE', 'D': 'DO', 'E': 'ELSE', 'F': 'FOR', 'G': 'GOTO', 'H': 'HALT', 'I': 'IF', 'J': 'JOB', 'K': 'KILL', 'L': 'LOCK', 'M': 'MERGE', 'N': 'NEW',
	'O': 'OPEN', 'Q': 'QUIT', 'R': 'READ', 'S': 'SET', 'U': 'USE', 'V': 'VIEW', 'W': 'WRITE', 'X': 'XECUTE', 'ZA': 'ZALLOCATE', 'ZB': 'ZBREAK', 'ZC': 'ZCONTINUE',
	'ZD': 'ZDEALLOCATE', 'ZED': 'ZEDIT', 'ZG': 'ZGOTO', 'ZH': 'ZHELP', 'ZK': 'ZKILL', 'ZL': 'ZLINK', 'ZM': 'ZMESSAGE', 'ZP': 'ZPRINT', 'ZSH': 'ZSHOW',
	'ZST': 'ZSTEP', 'ZSY': 'ZSYSTEM', 'ZTC': 'ZTCOMMIT', 'ZTR': 'ZTRIGGER', 'ZTS': 'ZTSTART', 'ZWI': 'ZWITHDRAW', 'ZWR': 'ZWRITE'
}
const funcExpansions = {
	'A': 'ASCII', 'C': 'CHAR', 'D': 'DATA', 'E': 'EXTRACT', 'F': 'FIND', 'FN': 'FNUMBER', 'G': 'GET', 'I': 'INCREMENT', 'J': 'JUSTIFY', 'L': 'LENGTH', 'NA': 'NAME', 'N': 'NEXT', 'O': 'ORDER',
	'P': 'PIECE', 'QL': 'QLENGTH', 'QS': 'QSUBSCRIPT', 'Q': 'QUERY', 'R': 'RANDOM', 'RE': 'REVERSE', 'S': 'SELECT', 'ST': 'STACK', 'T': 'TEXT', 'TR': 'TRANSLATE', 'V': 'VIEW',
	'ZA': 'ZASCII', 'ZAH': 'ZAHANDLE', 'ZD': 'ZDATE', 'ZE': 'ZEXTRACT', 'ZF': 'ZFIND', 'ZG': 'ZGETJPI', 'ZJ': 'ZJUSTIFY', 'ZL': 'ZLENGTH', 'ZM': 'ZMESSAGE', 'ZPI': 'ZPIECE', 'ZP': 'ZPREVIOUS',
	'ZSUB': 'ZSUBSTR', 'ZTR': 'ZTRANSLATE', 'ZTRI': 'ZTRIGGER', 'ZW': 'ZWIDTH'
}
const cmdParams = {
	'BREAK': {
		'abbreviation': 'B',
		'postcondition': true,
		'parameter': '[expr[:tvexpr][,...]]'
	},
	'CLOSE': {
		'abbreviation': 'C',
		'postcondition': true,
		'parameter': 'expr[:(keyword[=expr][:...])][,...]'
	},
	'DO': {
		'abbreviation': 'D',
		'postcondition': true,
		'parameter': '[entryref[(expr:.lvn[,...])][:tvexpr][,...]]'
	},
	'ELSE':
	{
		'abbreviation': 'E',
		'postcondition': false,
		'parameter': ''
	},
	'FOR': {
		'abbreviation': 'F',
		'postcondition': false,
		'parameter': '[lvn=expr[:numexpr1[:numexpr2]][,...]]]'
	},
	'GOTO': {
		'abbreviation': 'G',
		'postcondition': true,
		'parameter': 'entryref[:tvexpr][,...]'
	},
	'HALT': {
		'abbreviation': 'H',
		'postcondition': true,
		'parameter': ''
	},
	'HANG': {
		'abbreviation': 'H',
		'postcondition': true,
		'parameter': 'numexpr[,...]'
	},
	'IF': {
		'abbreviation': 'I',
		'postcondition': false,
		'parameter': '[tvexpr[,...]]'
	},
	'JOB': {
		'abbreviation': 'J',
		'postcondition': true,
		'parameter': 'entryref[(expr[,...])][:[(keyword[=value][:...])][:numexpr]][,...]'
	},
	'KILL': {
		'abbreviation': 'K',
		'postcondition': true,
		'parameter': '[glvn | (lvn[,...]) | *lname | *lvn ]'
	},
	'LOCK': {
		'abbreviation': 'L',
		'postcondition': true,
		'parameter': '[[-|+]nref|(nref[,...])[:numexpr] [,...]]'
	},
	'MERGE': {
		'abbreviation': 'M',
		'postcondition': true,
		'parameter': 'glvn=glvn[,...]'
	},
	'NEW': {
		'abbreviation': 'N',
		'postcondition': true,
		'parameter': '[[(]lvn[,...][)][,...]]'
	},
	'OPEN': {
		'abbreviation': 'O',
		'postcondition': true,
		'parameter': 'expr[:[(keyword[=expr][:...])] [:numexpr]][,...]'
	},
	'QUIT': {
		'abbreviation': 'Q',
		'postcondition': true,
		'parameter': '[expr | *lname | *lvn]'
	},
	'READ': {
		'abbreviation': 'R',
		'postcondition': true,
		'parameter': '(glvn|*glvn|glvn#intexpr)[:numexpr]|strlit|fcc[,...]'
	},
	'SET': {
		'abbreviation': 'S',
		'postcondition': true,
		'parameter': 'setleft=expr | (setleft[,...])=expr | *lvn=lname | aliascontainer[,...]'
	},
	'TCOMMIT': {
		'abbreviation': 'TC',
		'postcondition': true,
		'parameter': ''
	},
	'TRESTART': {
		'abbreviation': 'TRE',
		'postcondition': true,
		'parameter': ''
	},
	'TROLLBACK': {
		'abbreviation': 'TRO',
		'postcondition': true,
		'parameter': '[intexpr]'
	},
	'TSTART': {
		'abbreviation': 'TS',
		'postcondition': true,
		'parameter': '[([lvn...])|lvn|*|][:keyword|(keyword...)]'
	},
	'USE': {
		'abbreviation': 'U',
		'postcondition': true,
		'parameter': 'expr[:(keyword[=expr][:...])][,...]'
	},
	'VIEW': {
		'abbreviation': 'V',
		'postcondition': true,
		'parameter': 'keyword[:expr[:...]][,...]'
	},
	'WRITE': {
		'abbreviation': 'W',
		'postcondition': true,
		'parameter': 'expr|*intexpr|fcc[,...]'
	},
	'XECUTE': {
		'abbreviation': 'X',
		'postcondition': true,
		'parameter': 'expr[:tvexpr][,...]'
	},
	'ZALLOCATE': {
		'abbreviation': 'ZA',
		'postcondition': true,
		'parameter': '[(]nref[,...][)][:intexpr][,...]'
	},
	'ZBREAK': {
		'abbreviation': 'ZB',
		'postcondition': true,
		'parameter': '[-]entryref[:[expr][:intexpr]][,...]'
	},
	'ZCOMPILE': {
		'abbreviation': 'ZCOM',
		'postcondition': true,
		'parameter': 'expr[,...]'
	},
	'ZCONTINUE': {
		'abbreviation': 'ZC',
		'postcondition': true,
		'parameter': ''
	},
	'ZDEALLOCATE': {
		'abbreviation': 'ZD',
		'postcondition': true,
		'parameter': '[nref[,...]]'
	},
	'ZEDIT': {
		'abbreviation': 'ZED',
		'postcondition': true,
		'parameter': '[expr[,...]]'
	},
	'ZGOTO': {
		'abbreviation': 'ZG',
		'postcondition': true,
		'parameter': '[[intexpr][:entryref[:tvexpr]],...]'
	},
	'ZHALT': {
		'abbreviation': 'ZHALT',
		'postcondition': true,
		'parameter': '[intexpr]'
	},
	'ZHELP': {
		'abbreviation': 'ZH',
		'postcondition': true,
		'parameter': '[expr1[:expr2],...]'
	},
	'ZKILL': {
		'abbreviation': 'ZK',
		'postcondition': true,
		'parameter': 'glvn'
	},
	'ZLINK': {
		'abbreviation': 'ZL',
		'postcondition': true,
		'parameter': '[expr1[:expr2][,...]]'
	},
	'ZMESSAGE': {
		'abbreviation': 'ZM',
		'postcondition': true,
		'parameter': 'intexpr[:expr2][:...]'
	},
	'ZPRINT': {
		'abbreviation': 'ZP',
		'postcondition': true,
		'parameter': '[entryref[:label[+intexpr]][,...]'
	},
	'ZRUPDATE': {
		'abbreviation': 'ZRUP',
		'postcondition': true,
		'parameter': 'expr[,...]'
	},
	'ZSHOW': {
		'abbreviation': 'ZSH',
		'postcondition': true,
		'parameter': '[expr[:glvn][,...]]'
	},
	'ZSTEP': {
		'abbreviation': 'ZST',
		'postcondition': true,
		'parameter': '[keyword[:expr]][,...]'
	},
	'ZSYSTEM': {
		'abbreviation': 'ZSY',
		'postcondition': true,
		'parameter': '[expr][,...]]'
	},
	'ZTCOMMIT': {
		'abbreviation': 'ZTC',
		'postcondition': true,
		'parameter': '[intexpr]'
	},
	'ZTRIGGER': {
		'abbreviation': 'ZTR',
		'postcondition': true,
		'parameter': 'gvn'
	},
	'ZTSTART': {
		'abbreviation': 'ZTS',
		'postcondition': true,
		'parameter': ''
	},
	'ZWITHDRAW': {
		'abbreviation': 'ZWI',
		'postcondition': true,
		'parameter': 'glvn'
	},
	'ZWRITE': {
		'abbreviation': 'ZWR',
		'postcondition': true,
		'parameter': '[zwrglvn[,...]]'
	}
}
const funcParams = {
	'ASCII': {
		'maxparams': 2
	},
	'CHAR': {
		'maxparams': 99
	},
	'DATA': {
		'maxparams': 1,
		'format': 'glvn'
	},
	'EXTRACT': {
		'maxparams': 3
	},
	'FIND': {
		'maxparams': 3
	},
	'FNUMBER': {
		'minparams': 2,
		'maxparams': 3
	},
	'GET': {
		'maxparams': 2,
		'format': 'glvn,expr'
	},
	'INCREMENT': {
		'maxparams': 2,
		'format': 'glvn,expr'
	},
	'JUSTIFY': {
		'maxparams': 3
	},
	'LENGTH': {
		'maxparams': 2
	},
	'NAME': {
		'maxparams': 2,
		'format': 'glvn,expr'
	},
	'NEXT': {
		'maxparams': 1,
		'format': 'glvn('
	},
	'ORDER': {
		'maxparams': 2,
		'format': 'glvn,expr'
	},
	'PIECE': {
		'maxparams': 4
	},
	'QLENGTH': {
		'maxparams': 1,
		'format': 'glvn'
	},
	'QSUBSCRIPT': {
		'maxparams': 2,
		'format': 'glvn,expr'
	},
	'QUERY': {
		'maxparams': 1,
		'format': 'glvn'
	},
	'RANDOM': {
		'maxparams': 1
	},
	'REVERSE': {
		'maxparams': 1
	},
	'SELECT': {
		'maxparams': 99,
		'format': 'special'
	},
	'STACK': {
		'maxparams': 2
	},
	'TEXT': {
		'maxparams': 1,
		'format': 'entryref'
	},
	'TRANSLATE': {
		'maxparams': 3
	},
	'VIEW': {
		'maxparams': 2
	},
	'ZASCII': {
		'maxparams': 2
	},
	'ZATRANSFORM': {
		'minparams': 2,
		'maxparams': 4,
		'format': 'expr,expr,bool,bool'
	},
	'ZBITAND': {
		'minparams': 2,
		'maxparams': 2
	},
	'ZBITCOUNT': {
		'maxparams': 1
	},
	'ZBITFIND': {
		'maxparams': 3
	},
	'ZBITGET': {
		'minparams': 2,
		'maxparams': 2
	},
	'ZBITLEN': {
		'maxparams': 1
	},
	'ZBITNOT': {
		'maxparams': 1
	},
	'ZBITOR': {
		'minparams': 2,
		'maxparams': 2
	},
	'ZBITSET': {
		'minparams': 3,
		'maxparams': 3
	},
	'ZBITSTR': {
		'maxparams': 2
	},
	'ZBITXOR': {
		'minparams': 2,
		'maxparams': 2
	},
	'ZCHAR': {
		'maxparams': 99
	},
	'ZCOLLATE': {
		'maxparams': 3,
		'format': 'glvn,expr,bool'
	},
	'ZCONVERT': {
		'maxparams': 3
	},
	'ZDATA': {
		'maxparams': 1,
		'format': 'lvn'
	},
	'ZDATE': {
		'maxparams': 4
	},
	'ZEXTRACT': {
		'maxparams': 3
	},
	'ZFIND': {
		'maxparams': 3
	},
	'ZGETJPI': {
		'minparams': 2,
		'maxparams': 2
	},
	'ZJOBEXAM': {
		'minparams': 0,
		'maxparams': 1
	},
	'ZJUSTIFY': {
		'minparams': 2,
		'maxparams': 3
	},
	'ZLENGTH': {
		'maxparams': 2
	},
	'ZMESSAGE': {
		'maxparams': 1
	},
	'ZPARSE': {
		'maxparams': 5
	},
	'ZPEEK': {
		'maxparams': 4
	},
	'ZPIECE': {
		'maxparams': 4
	},
	'ZPREVIOUS': {
		'maxparams': 1,
		'format': 'glvn'
	},
	'ZQGBLMOD': {
		'maxparams': 1,
		'format': 'gvn'
	},
	'ZSEARCH': {
		'maxparams': 2
	},
	'ZSIGPROC': {
		'maxparams': 2
	},
	'ZSOCKET': {
		'minparams': 2,
		'maxparams': 4
	},
	'ZSUBSTR': {
		'minparams': 2,
		'maxparams': 3
	},
	'ZSYSLOG': {
		'maxparams': 1
	},
	'ZTRANSLATE': {
		'maxparams': 3
	},
	'ZTRIGGER': {
		'maxparams': 2
	},
	'ZTRNLNM': {
		'maxparams': 6
	},
	'ZWIDTH': {
		'maxparams': 1
	},
	'ZWRITE': {
		'maxparams': 2
	}
}
const expressiontype = {
	"Standard": 0,
	"Index": 1,
	"eArgument": 2,
	"iArgument": 3,
	"Atom": 4
}

export class MumpsLineParser {
	tokens: LineToken[] = [];
	private linePosition: number = 0;
	private _evaluatePattern(pattern: string, position: number, level?: number): ErrorInformation {
		let result = { text: '', position }
		let patternComplete = false;
		if (level === undefined) {
			level = 0;
		}
		do {
			if (pattern[position] === '@') {
				result = this.evaluateExpression(expressiontype.Standard, pattern, ++position);
				patternComplete = true;
				break;
			}
			if (pattern.substring(result.position).match(repititionCount)) {
				let repCount = pattern.substring(result.position).match(repititionCount)![0];
				if (repCount !== '') {
					patternComplete = false;
					result.position += repCount.length;
					if (pattern.substring(result.position).match(patcode)) {
						patternComplete = true;
						result.position += pattern.substring(result.position).match(patcode)![0].length;
						continue;
					} else if (pattern[result.position] === '(') {
						result = this._evaluatePattern(pattern, ++result.position, level + 1);
						patternComplete = true;
						continue;
					}
				} else if (pattern[result.position] === ')') {
					if (!patternComplete) {
						result.text = 'Incomplete pattern';
						throw result;
					}
					if (level > 0) {
						result.position++;
					}
					return result;
				} else if (pattern[result.position] === ',' && level > 0) {
					result.position++;
					continue;
				} else {
					break;
				}
			} else if (pattern[result.position] === ')') {
				if (!patternComplete) {
					result.text = 'Incomplete pattern';
					throw result;
				} else {
					result.position++;
				}
				return result;
			} else if (pattern[result.position] === ',' && level > 0) {
				if (!patternComplete) {
					result.text = 'Incomplete pattern';
					throw result;
				} else {
					result.position++;
				}
				continue;
			} else {
				break;
			}
		} while (position < pattern.length)
		if (!patternComplete) {
			result.text = 'Incomplete pattern';
			throw result;
		}
		if (level > 0) {
			result.text = 'Missing ")"';
			throw result;
		}
		return result;

	}
	public evaluateExpression(exType: number, line: string, position: number, level?: number | undefined): ErrorInformation {
		let expressionComplete = false;
		let startposition = position;
		if (level === undefined) {
			level = 0;
		}
		let lastExpression = '';
		while (position < line.length) {
			let char = line.charAt(position);
			if (char === '(') {
				let subExType = expressiontype.Standard
				switch (lastExpression) {
					case 'ifunction':
						subExType = expressiontype.iArgument;
						break;
					case 'exfunction':
						subExType = expressiontype.eArgument;
						break;
					case 'pattern':
						throw { text: 'Unecpected "("', position };
				}
				let result = this.evaluateExpression(subExType, line, ++position, level + 1);
				if (exType === expressiontype.Atom) {
					return result;
				}
				expressionComplete = true;
				position = result.position;
				continue;
			}
			lastExpression = '';
			if (char === ')') {
				if (!expressionComplete) {
					if (position === startposition && exType === expressiontype.eArgument) {
						return { text: '', position: ++position }
					}
					throw { text: 'Incomplete Expression', position };
				}
				if (level > 0) {
					position++;
				}
				return { text: '', position: position };
			}
			if (char === '.' && exType === expressiontype.eArgument) {
				position++;
				let evalString = line.substring(position);
				if (evalString.match(lvn)) {
					let localname = evalString.match(lvn)![0];
					this.tokens.push({ type: TokenType.local, name: localname, position: position + this.linePosition });
					position += localname.length;
					char = line.charAt(position);
					if (char !== ',' && char !== ')') {
						throw { text: 'Variablereference must stand alone', position }
					} else {
						expressionComplete = true;
						continue;
					}
				}
			}
			if (char === ',') {
				if (!expressionComplete) {
					if (position === startposition && exType === expressiontype.eArgument) {
						if (level === 0) {
							return { text: '', position: ++position }
						} else {
							position++
							expressionComplete = false;
							startposition = position;
							continue;
						}
					}
					throw { text: 'Incomplete Expression', position };
				}
				if (exType === expressiontype.Standard || exType === expressiontype.Atom) {
					return { text: '', position }
				}
				position++
				expressionComplete = false;
				startposition = position;
				continue;
			}
			if (expressionComplete) {
				if (exType === expressiontype.Atom) {
					return { text: '', position }
				}
				if (line.substring(position).match(binoperator)) {
					let operator = line.substring(position).match(binoperator)![0];
					this.tokens.push({ name: operator, position: position + this.linePosition, type: TokenType.operator });
					position += operator.length;
					expressionComplete = false;
					if (operator === '?' || operator === "'?") {
						let result = this._evaluatePattern(line, position);
						position = result.position;
						expressionComplete = true;
						lastExpression = 'pattern';
					}
					continue;
				} else {
					return { text: '', position }
				}
			}
			let evalString = line.substring(position);
			try {
				let provResult = this._checkVar(line, position);
				expressionComplete = true;
				position = provResult.position;
			} catch (provResult) {
				if (evalString.substring(0, 2) === '$$') {
					position += 2;
					provResult = this._checkEntryRef(line, position, true, true);
					expressionComplete = true;
					position = provResult.position;
					expressionComplete = true;
				} else if (evalString.match(nonMfunction)) {
					let functionname = evalString.match(nonMfunction)![0];
					this.tokens.push({ type: TokenType.nonMfunction, name: functionname, position: position + this.linePosition });
					position += functionname.length;
					lastExpression = 'exfunction'
					expressionComplete = true;
				} else if (evalString.match(ifunction)) {
					let functionname = evalString.match(ifunction)![0].substring(1).toUpperCase();
					this.tokens.push({ name: "$" + functionname, position: position + this.linePosition, type: TokenType.ifunction });
					position += functionname.length + 2
					if (funcExpansions[functionname] !== undefined) {
						functionname = funcExpansions[functionname];
					}
					let result = this._checkFunction(functionname, line, position);
					position = result.position;
					lastExpression = '';
					expressionComplete = true;
				} else if (evalString.match(isv)) {
					let specialvarname = evalString.match(isv)![0];
					this.tokens.push({ name: specialvarname, position: position + this.linePosition, type: TokenType.sysvariable });
					position += specialvarname.length
					expressionComplete = true;
				} else if (evalString.match(numlit) && evalString.match(numlit)![0] !== '') {
					let numericliteral = evalString.match(numlit)![0];
					this.tokens.push({ name: numericliteral, type: TokenType.number, position: position + this.linePosition });
					position += numericliteral.length;
					expressionComplete = true;
				} else if (evalString.match(strlit)) {
					let stringlit = evalString.match(strlit)![0];
					this.tokens.push({ name: stringlit, type: TokenType.string, position: position + this.linePosition });
					position += stringlit.length;
					expressionComplete = true;
				} else if (char.match(unaryoperator)) {
					this.tokens.push({ name: char, type: TokenType.operator, position: position + this.linePosition });
					position++;
				} else {
					throw { text: 'Unexpected Character ' + char, position }
				}
			}
		}
		if (expressionComplete) {
			if (level > 0) {
				throw { text: 'Missing ")"', position }
			}
			return { text: '', position }
		} else {
			throw { text: 'Incomplete Expression', position };
		}
	}
	private _extractLabel(inputObject: LineObject): LineObject {
		inputObject.lineLabel = '';
		let inputLine=inputObject.lineExpression;
		inputObject.lineExpression='';
		if (inputLine.match(label)) {
			inputObject.lineLabel = inputLine.match(label)![0];
		}
		let position = inputObject.lineLabel.length;
		if (position === inputLine.length) {
			return inputObject
		}
		if (!inputLine.charAt(position).match(/[\s|;]/)) {
			inputObject.errorText = 'Unexpected Character' + inputLine.charAt(position);
			inputObject.errorPosition = position;
			return inputObject;
		}
		let i = 0;
		for (i = position; i <= inputLine.length; i++) {
			if (inputLine[i] !== " " && inputLine[i] !== "\t") {
				break;
			}
		}
		inputObject.lineLeadSpace = inputLine.substring(position, i);
		if (i !== (inputLine.length - 1)) {
			inputObject.lineExpression = inputLine.substring(i);
			inputObject.expressionPosition = i;
		}
		return inputObject;
	}

	//Extract Comments.
	private _extractComment(inputObject: LineObject): LineObject {
		let inputLine = inputObject.lineExpression!;
		//Semicolon identifies comments.
		if (inputLine.search(";") >= 0) {
			let isInsideString = false;
			for (let i = 0; i < inputLine.length; i++) {
				if (inputLine[i] === ";") {
					if (!isInsideString) {
						inputObject.lineExpression = inputLine.substring(0, i);
						inputObject.lineComment = { comment: inputLine.substring(i).substring(1), position: i+inputObject.expressionPosition };
						return inputObject;
					}
				}
				if (inputLine[i] === '"') {
					isInsideString = !isInsideString;
				}
			}
		}
		return inputObject;
	}

	//Extract Indentation.
	//Assumes inputLine has extracted comments/spacing.
	private _extractIndentation(inputObject: LineObject): LineObject {

		let lineIndentationArray: string[] = [];
		let lineIndentation = 0;
		let inputLine = inputObject.lineExpression!;
		let spacer = '';
		let i = 0;
		for (i = 0; i <= inputLine.length; i++) {
			let char = inputLine[i];
			if (char === ".") {
				if (lineIndentation > 0) {
					lineIndentationArray.push(spacer);
				}
				lineIndentation++;
				spacer = '';
				continue;
			}
			if (char === " " || char === "\t") {
				spacer += char;
			} else {
				break;
			}
		}
		if (lineIndentation > 0) {
			lineIndentationArray.push(spacer);
			inputObject.lineExpression = inputLine.substring(i);
			inputObject.expressionPosition! += i;
			inputObject.lineIndentationArray = lineIndentationArray;
		}
		return inputObject;
	}

	//Extract M-Commands.
	//Assumes inputLine has extracted comments/spacing/indentation.
	private _extractCommands(inputObject: LineObject): LineObject {

		let tmpFunction: TmpFunction;
		let tmpFunctionArray: Array<TmpFunction> = [];
		//Divide Routines and Arguments.
		let splitLine = this._splitCommandsAndArguments(inputObject);
		//Loop, even is function, odd is arguments.
		let i = 0;
		tmpFunction = { mCommand: '', mPostCondition: '', mArguments: '', cmdPosition: 0, argPosition: 0, pcPosition: 0 }
		while (i < splitLine.length) {
			if (i % 2 === 0) {
				tmpFunction.mCommand = splitLine[i].command;
				tmpFunction.cmdPosition = splitLine[i].position;
			} else {

				tmpFunction.mArguments = splitLine[i].command;
				tmpFunction.argPosition = splitLine[i].position;

				//Custom handler for trailing argument spacing.
				//Go until splitline hits a non empty val.
				let ii = i + 1;
				while (ii < splitLine.length) {
					if (splitLine[ii].command === "") {
						splitLine.splice(ii, 1);
						//tmpFunction.mArguments = tmpFunction.mArguments + " ";
					} else {
						break;
					}
				}
				tmpFunctionArray.push(tmpFunction);
				tmpFunction = { mCommand: '', mPostCondition: '', mArguments: '', cmdPosition: 0, argPosition: 0, pcPosition: 0 }
			}
			i++
		}
		//Last command doesn't always require parameter, so if odd number of pairs, push it.
		if (splitLine.length % 2 !== 0) {
			tmpFunction.mCommand = splitLine[splitLine.length - 1].command;
			tmpFunction.cmdPosition = splitLine[splitLine.length - 1].position;
			tmpFunction.mArguments = '';
			tmpFunction.argPosition = inputObject.lineExpression!.length;
			tmpFunctionArray.push(tmpFunction);
		}


		//Extract and output Post Conditionals.
		let postConditionFunctionArray = this._extractPostConditional(tmpFunctionArray);
		if (postConditionFunctionArray.length > 0) {
			inputObject.lineRoutines = postConditionFunctionArray;
		}
		return inputObject;
	}

	//Divide commands and arguments into array, used by extractRoutines.
	private _splitCommandsAndArguments(inputObject: LineObject): LineComand[] {

		let lineCommands: LineComand[] = [];
		let tmpCursor = 0;
		let isInsideString = false;
		let inputLine = inputObject.lineExpression!;
		let start = inputObject.expressionPosition!;
		for (let i = 0; i < inputLine.length; i++) {

			//Ensure space isn't quoted.
			if (inputLine[i] === '"') {
				isInsideString = !isInsideString;
			}
			//Flag spaces/tabs as dividers.
			if ((inputLine[i] === " " || inputLine[i] === "\t") && !isInsideString) {
				//If has content, push.
				if (inputLine.substring(tmpCursor, i).length > 0) {
					lineCommands.push({ command: inputLine.substring(tmpCursor, i), position: start + tmpCursor });
					//Otherwise, push empty commands.
				} else if (inputLine.substring(tmpCursor, i).length === 0 && (inputLine.substring(tmpCursor - 1, tmpCursor) === " " || inputLine.substring(tmpCursor - 1, tmpCursor) === "\t")) {
					lineCommands.push({ command: inputLine.substring(tmpCursor, i), position: start + tmpCursor });
				}
				tmpCursor = i + 1;
			}
		}
		let i = inputLine.length;
		if (inputLine.substring(tmpCursor, i).length > 0) {
			lineCommands.push({ command: inputLine.substring(tmpCursor, i), position: start + tmpCursor });
			//Gather empty commands from end of line.
		} else if (i === tmpCursor && (inputLine.substring(i - 1, i) === " " || inputLine.substring(i - 1, i) === "/t")) {
			lineCommands.push({ command: '', position: start + tmpCursor });
		}
		return lineCommands;
	}

	//Extracts Post-Conditionals from Routines, used by extractRoutines.
	private _extractPostConditional(tmpFunctionArray: TmpFunction[]): TmpFunction[] {

		//Assign to new variable to truncate Routines.
		let tmpObject = tmpFunctionArray;
		for (let i = 0; i < tmpObject.length; i++) {
			//Colon indicates Post-Conditionals.
			let tmpIndex = tmpObject[i].mCommand!.indexOf(":");
			if (tmpIndex > -1) {
				tmpObject[i].mPostCondition = tmpObject[i].mCommand.substring(tmpIndex + 1);
				tmpObject[i].mCommand = tmpObject[i].mCommand.substring(0, tmpIndex);
				tmpObject[i].pcPosition = tmpObject[i].cmdPosition + tmpIndex + 1;
			}
		}
		return tmpObject;
	}

	public parseLine(inputString): LineObject {

		let tmpObject: LineObject={lineExpression:inputString, expressionPosition:0};

		//Parsing must be performed sequentially.
		tmpObject = this._extractLabel(tmpObject);
		if (tmpObject.errorText) {
			return tmpObject;
		}
		tmpObject = this._extractComment(tmpObject);
		tmpObject = this._extractIndentation(tmpObject);
		tmpObject = this._extractCommands(tmpObject);

		//Line Expression is no longer needed.
		delete tmpObject.lineExpression;
		return tmpObject;
	}
	public checkFile(filename: string): ErrorInformation[] {
		let errlist: ErrorInformation[] = [];
		let content: string;
		try {
			content = fs.readFileSync(filename, "utf8");
		} catch (err) {
			errlist.push({ text: 'File read error: ' + filename, position: 0, line: 0 });
			return errlist;
		}
		let lines = content.split('\n');
		for (let i = 0; i < lines.length; i++) {
			lines[i] = lines[i].replace('\r', '');
			let info = this.checkLine(lines[i]);
			if (info.text !== '') {
				info.line = i + 1;
				errlist.push(info);
			}
		}
		return errlist;
	}
	public analyzeLines(input: string): Array<Array<LineToken>> {
		let lines = input.split('\n');
		let linetokens: Array<Array<LineToken>> = [];
		for (let i = 0; i < lines.length; i++) {
			lines[i] = lines[i].replace('\r', '');
			this.checkLine(lines[i]);
			linetokens[i] = this.tokens;
		}
		return linetokens;
	}
	public checkLine(line: string): ErrorInformation {
		this.tokens = [];
		this.linePosition = 0;
		let parsed = this.parseLine(line);
		if (parsed.lineLabel) {
			this.tokens.push({ name: parsed.lineLabel, position: 0, type: TokenType.label });
		}
		if (parsed.lineComment) {
			this.tokens.push({ name: parsed.lineComment.comment, position: parsed.lineComment.position, type: TokenType.comment });
		}
		let result: ErrorInformation = { text: '', position: 0 }
		if (parsed.lineRoutines) {
			for (let i = 0; i < parsed.lineRoutines.length; i++) {
				let code = parsed.lineRoutines[i];
				if (code.mCommand.length > 0) {
					this.tokens.push({ name: code.mCommand, type: TokenType.keyword, position: code.cmdPosition });
					let cmd = code.mCommand.toUpperCase();
					if (cmd === 'H') {
						if (code.mArguments === '') {
							cmd = 'HALT';
						} else {
							cmd = 'HANG';
						}
					}
					if (cmd.match(command)) {
						let longcmd = cmd;
						if (cmdParams[cmd] === undefined) {
							longcmd = cmdExpansions[cmd];
						}
						if (longcmd === undefined) {
							result.text = 'Unknown Command';
							result.position = code.cmdPosition;
							return result;
						}
						try {
							result = this._checkCommand(longcmd, code);
						} catch (result) {
							return result;
						}
					} else {
						return { text: 'Invalid Command', position: code.cmdPosition }
					}
				}
			}
		}
		return result;
	}
	private _checkEntryRefAndPostcondition(arg: string, position: number, withParams: boolean): ErrorInformation {
		let result: ErrorInformation = { text: '', position };
		result = this._checkEntryRef(arg, result.position, withParams);
		if (arg[result.position] === ':') {
			result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
		}
		return result;
	}
	private _checkEntryRef(arg: string, position: number, withParams: boolean, isUserfunction?:boolean): ErrorInformation {
		if (isUserfunction===undefined) {
			isUserfunction=false;
		}
		let tokentype:TokenType=TokenType.entryref;
		if (isUserfunction) {
			tokentype=TokenType.exfunction;
		}
		let result: ErrorInformation = { text: '', position };
		if (arg[result.position] === '@') { //Check Indirection
			result = this.evaluateExpression(expressiontype.Atom, arg, ++result.position);
			if (arg[result.position] === '+') { //Check Label+Offset
				result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
			}
			if (arg[result.position] === '^') { //Check if it's a Label like xxx^yyy
				if (arg[result.position + 1] === '@') { // or a Label xxx^@expr
					result = this.evaluateExpression(expressiontype.Atom, arg, ++result.position);
				} else {
					if (arg.substring(result.position).match(entryref)) {
						let ref = arg.substring(result.position).match(entryref)![0];
						result.position += ref.length;
					} else {
						result.text = 'Invalid EntryRef';
						throw result;
					}
				}
			}
			if (arg.substring(result.position, result.position + 2) === '@(') {
				result.position++;
			}
		} else if (arg.substring(result.position).match(entryref)) { //No Indirection and a valid entryref
			let ref = arg.substring(result.position).match(entryref)![0];
			let merkpos = result.position;
			result.position += ref.length;
			let char = arg[result.position];
			if (result.position >= arg.length) {
				if (ref.length > 0) {
					if (ref[0]==='&') {
						tokentype=TokenType.nonMfunction;
					}
					this.tokens.push({ 'type':tokentype, name: ref, position: merkpos + this.linePosition });
					return result;
				} else {
					result.text = 'Missing Entryref';
					throw result;
				}
			}
			if (ref.indexOf('^') === -1 && char === '+') {
				result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
				//ref += "+X";
				if (result.position >= arg.length) {
					this.tokens.push({ 'type': tokentype, name: ref, position: merkpos+this.linePosition });
					return result
				}
				if (arg.substring(result.position).match(routineref)) {
					let routine = arg.substring(result.position).match(routineref)![0];
					ref += routine;
					result.position += routine.length;
				}
			}
			this.tokens.push({ 'type': tokentype, name: ref, position: merkpos + this.linePosition });
		} else {
			result.text = 'Invalid Entryref';
			throw result;
		}
		if (arg[result.position] === '(' && withParams) {
			result = this.evaluateExpression(expressiontype.eArgument, arg, ++result.position, 1);
		}
		return result
	}
	private _checkVar(arg: string, position: number, globalOk?: boolean, indexOk?: boolean): ErrorInformation {
		let result: ErrorInformation = { text: '', position, indexFound: false, globalFound: false, indirectionFound: false };
		let varFound = false;
		if (globalOk === undefined) {
			globalOk = true;
		}
		if (indexOk === undefined) {
			indexOk = true;
		}
		if (arg[result.position] === '@') {
			result = this.evaluateExpression(expressiontype.Atom, arg, ++result.position);
			result.indirectionFound = true;
			varFound = true;
			if (arg.substring(result.position, result.position + 2) === '@(') {
				result.position++;
			}
		} else {
			if (arg.substring(result.position).match(gvn) || arg.substring(result.position, result.position + 2) === '^|') {
				if (!globalOk) {
					result.text = 'Global not allowed here';
					throw result;
				}
				result.globalFound = true;
				if (arg.substring(result.position, result.position + 2) === '^|') {
					result.position += 2
					result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
					result.globalFound = true;
					if (arg[result.position] === ',') {
						result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
						result.globalFound = true;
					}
					if (arg[result.position] !== '|') {
						result.text = 'Missing "|"';
						throw result;
					}
					result.position++;
					if (arg.substring(result.position).match(lvn)) {
						let global = arg.substring(result.position).match(lvn)![0];
						this.tokens.push({ name: global, type: TokenType.global, position: result.position + this.linePosition });
						varFound = true;
						result.position += global.length;
					}
				} else {
					let global = arg.substring(result.position).match(gvn)![0];
					this.tokens.push({ name: global, type: TokenType.global, position: result.position + this.linePosition });
					varFound = true;
					result.position += global.length;
				}
			} else if (arg.substring(result.position).match(lvn)) {
				let local = arg.substring(result.position).match(lvn)![0];
				this.tokens.push({ name: local, type: TokenType.local, position: result.position + this.linePosition });
				varFound = true;
				result.position += local.length;
			} else if (arg.substring(result.position, result.position + 2) === '^(') {
				result.globalFound = true;
				if (!globalOk) {
					result.text = 'Global not allowed here';
					varFound = false;
					throw result;
				}
				varFound = true;
				result.position++;
			}
		}
		if (varFound && arg[result.position] === '(') {
			if (!indexOk) {
				result.text = 'Index not allowed here';
				throw result;
			}
			let provResult = this.evaluateExpression(expressiontype.Index, arg, ++result.position, 1);
			result.position = provResult.position;
			result.indexFound = true;
		}
		if (!varFound) {
			result.text = 'Name missing';
			throw result;
		}
		return result;
	}
	private _checkBreak(arg: string, position: number): ErrorInformation {
		//[expr[:tvexpr][,...]]
		let result = this.evaluateExpression(expressiontype.Standard, arg, position);
		if (arg[result.position] === ':') {
			result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
		}
		return result;
	}
	private _checkKeyword(keywords: RegExp, arg: string, position: number): ErrorInformation {
		let result: ErrorInformation = { text: '', position };
		if (arg.substring(result.position).match(keywords)) {
			let keyword = arg.substring(result.position).match(keywords)![0];
			result.position += keyword.length;
			if (keyword.slice(-1) === '=') {
				result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
			}
		} else {
			result.text = 'No valid Keyword for command found';
			throw result;
		}
		return result;
	}
	private _checkOUC(keywords: RegExp, arg: string, position: number): ErrorInformation {
		let result: ErrorInformation = { text: '', position };
		//expr[:(keyword[=expr][:...])][,...]
		result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
		if (arg[result.position] === ':') {
			result.position++;
			if (arg[result.position] === '(') {
				result.position++;
				let braceComplete = false;
				do {
					result = this._checkKeyword(keywords, arg, result.position);
					braceComplete = true;
					if (arg[result.position] === ')') {
						result.position++;
						break;
					}
					if (arg[result.position] !== ':') {
						result.text = 'Unecpected Character';
						throw result;
					} else {
						result.position++;
					}
					braceComplete = false;
				} while (result.position < arg.length)
				if (!braceComplete) {
					result.text = 'Missing ")" or Keyword';
					throw result;
				}
			} else {
				if (arg[result.position] !== ':') {
					result = this._checkKeyword(keywords, arg, result.position);
				}
			}
		}
		if (keywords === openkeywords && arg[result.position] === ':') {
			result.position++;
			if (arg[result.position] !== ':') {
				result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
			}
		}
		if (keywords === openkeywords && arg[result.position] === ':') {
			result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
		}
		return result;
	}
	private _checkFor(arg: string, position: number, argNumber: number): ErrorInformation {
		//[lvn=expr[:numexpr1[:numexpr2]][,...]]]
		let result: ErrorInformation = { text: '', position };
		if (argNumber > 1) { //If it's not the first Argument the Options are possible: F I=1:2:3,4 or F I=1:2:3,I=4:1:6
			try {
				let provResult = this._checkVar(arg, result.position, false);
				if (arg[provResult.position] === '"') {
					result.position = provResult.position + 1;
				}
			} catch(provResult) {
				if (provResult.text!=="Name missing") {
					throw result;
				}
			}
		} else {
			result = this._checkVar(arg, result.position, false);
			if (arg[result.position] !== '=') {
				result.text = 'Missing equal-sign';
				throw result;
			}
			result.position++;
		}
		result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
		if (arg[result.position] !== ':') {
			return result;
		}
		result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
		if (arg[result.position] !== ':') {
			return result;
		}
		result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
		return result;
	}
	private _checkJobKeyword(arg: string, position: number): ErrorInformation {
		let result: ErrorInformation = { text: '', position };
		if (arg.substring(result.position).match(jobkeywords)) {
			let keyword = arg.substring(result.position).match(jobkeywords)![0];
			result.position += keyword.length;
			if (keyword[keyword.length - 1] === '=') {
				if (arg.substring(result.position).match(strlit)) {
					let stringlit = arg.substring(result.position).match(strlit)![0];
					result.position += stringlit.length;
					if (stringlit.length === 0) {
						result.text = 'String literal expected';
						throw result;
					}
				} else {
					result.text = 'String literal expected';
					throw result;
				}
			}
		} else {
			result.text = 'No valid Keyword for JOB Command';
			throw result;
		}
		return result;
	}
	private _checkJob(arg: string, position: number): ErrorInformation {
		//entryref[(expr[,...])][:[(keyword[=value][:...])][:numexpr]][,...]
		let result = this._checkEntryRef(arg, position, true);
		if (arg[result.position] === ':') {
			result.position++;
			if (arg[result.position] === '(') {
				result.position++;
				let braceComplete = false;
				do {
					result = this._checkJobKeyword(arg, result.position);
					braceComplete = true;
					if (arg[result.position] === ')') {
						result.position++;
						break;
					}
					if (arg[result.position] !== ':') {
						result.text = 'Unecpected Character';
						throw result;
					} else {
						result.position++;
					}
					braceComplete = false;
				} while (result.position < arg.length)
				if (!braceComplete) {
					result.text = 'Missing ")" or Keyword';
					throw result;
				}
			} else {
				if (arg[result.position] !== ':') {
					result = this._checkJobKeyword(arg, result.position);
				}
			}
		}
		if (arg[result.position] === ':') { //Numeric expression for Job-Timeout
			result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
		}
		return result;
	}
	private _checkKill(arg: string, position: number): ErrorInformation {
		//[glvn | (lvn[,...]) | *lname | *lvn ]
		let result: ErrorInformation = { text: '', position };
		if (arg[result.position] === '(') {
			result.position++;
			let braceComplete = false;
			do {
				result = this._checkVar(arg, result.position);
				braceComplete = true;
				if (arg[result.position] === ')') {
					result.position++;
					break;
				}
				if (arg[result.position] !== ',') {
					result.text = 'Unecpected Character';
					throw result;
				} else {
					result.position++;
				}
				braceComplete = false;
			} while (result.position < arg.length)
			if (!braceComplete) {
				result.text = 'Missing ")" or Name';
				throw result;
			}
		} else {
			result = this._checkVar(arg, result.position);
		}
		return result;
	}
	private _checkLock(arg: string, position: number, isLock: boolean): ErrorInformation {
		//[[-|+]nref|(nref[,...])[:numexpr] [,...]]
		let result: ErrorInformation = { text: '', position };
		if ((arg[result.position] === '+' || arg[result.position] === '-') && isLock) {
			result.position++;
		}
		if (arg[result.position] === '(') {
			result.position++;
			let braceComplete = false;
			do {
				result = this._checkVar(arg, result.position);
				braceComplete = true;
				if (arg[result.position] === ')') {
					result.position++;
					break;
				}
				if (arg[result.position] !== ',') {
					result.text = 'Unecpected Character';
					throw result;
				} else {
					result.position++;
				}
				braceComplete = false;
			} while (result.position < arg.length)
			if (!braceComplete) {
				result.text = 'Missing ")" or Name';
				throw result;
			}
		} else {
			result = this._checkVar(arg, result.position);
		}
		if (arg[result.position] === ':') {
			result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
		}
		return result;
	}
	private _checkMerge(arg: string, position: number): ErrorInformation {
		//glvn=glvn[,...]
		let result: ErrorInformation = { text: '', position };
		result = this._checkVar(arg, result.position);
		if (arg[result.position] !== '=') {
			result.text = 'Equal-Sign expected';
			throw result;
		}
		result = this._checkVar(arg, ++result.position);
		return result;
	}
	private _checkNew(arg: string, position: number): ErrorInformation {
		//[[(]lvn[,...][)][,...]]
		let result: ErrorInformation = { text: '', position };
		if (arg[result.position] === '(') {
			result.position++;
			let braceComplete = false;
			do {
				if (arg.substring(result.position).match(isv)) {
					result.position += arg.substring(result.position).match(isv)![0].length;
				} else {
					result = this._checkVar(arg, result.position, false);
				}
				braceComplete = true;
				if (arg[result.position] === ')') {
					result.position++;
					break;
				}
				if (arg[result.position] !== ',') {
					result.text = 'Unecpected Character';
					throw result;
				} else {
					result.position++;
				}
				braceComplete = false;
			} while (result.position < arg.length)
			if (!braceComplete) {
				result.text = 'Missing ")" or Name';
				throw result;
			}
		} else {
			if (arg.substring(result.position).match(isv)) {
				result.position += arg.substring(result.position).match(isv)![0].length;
			} else {
				result = this._checkVar(arg, result.position, false);
			}
		}
		return result;
	}
	private _checkRead(arg: string, position: number): ErrorInformation {
		//(glvn|*glvn|glvn#intexpr)[:numexpr]|strlit|fcc[,...]
		let result: ErrorInformation = { text: '', position };
		let starDetected = false;
		let mat: string[] | null;
		if (arg[result.position] === '*') {
			result.position++;
			starDetected = true;
		}
		try {
			let provResult = this._checkVar(arg, result.position);
			result.position = provResult.position;
			if (arg[result.position] === '#') {
				result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
				if (result.text !== '') {
					return result;
				}
			}
			if (arg[result.position] === ':') {
				result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
			}
			return result;
		} catch {
			if (starDetected) {
				result.text = 'Variable expected';
				throw result;
			}
			if (mat = arg.substring(result.position).match(strlit)) {
				result.position += mat[0].length;
				return result;
			} else if (mat = arg.substring(result.position).match(/^(#|!)+/)) {
				result.position += mat[0].length;
			}
			if (arg[result.position] === '?') {
				result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
				return result;
			}
		}
		return result;
	}
	private _checkSet(arg: string, position: number): ErrorInformation {
		//setleft=expr | (setleft[,...])=expr | *lvn=lname | aliascontainer[,...]
		let result: ErrorInformation = { text: '', position };
		let mat: string[] | null;
		let isBraced = false;
		if (arg[result.position] === '*') { //*lvn=lname
			result = this._checkVar(arg, ++result.position, false);
			if (arg[result.position] !== '=') {
				result.text = 'Equal-Sign expected';
				throw result;
			}
			result = this._checkVar(arg, ++result.position, false);
			return result;
		}
		if (arg[result.position] === '(') {
			isBraced = true;
			result.position++;
		}
		do {
			if (arg[result.position] === '@') {
				try {
					let provResult = this._checkVar(arg, result.position);
					result.position = provResult.position;
					if (result.position === arg.length || arg[result.position] === ',') {
						return result;
					}
				} catch {
					result = this.evaluateExpression(expressiontype.Atom, arg, ++result.position);
					if (result.position === arg.length || arg[result.position] === ',') {
						return result;
					}
				}
			} else if (mat = arg.substring(result.position).match(/^\$Z?(PIECE|P|EXTRACT|E)\(/i)) {
				let functionname = mat[0].substring(1, mat[0].length - 1).toUpperCase();
				result.position += functionname.length + 2
				if (funcExpansions[functionname] !== undefined) {
					functionname = funcExpansions[functionname];
				}
				result = this._checkFunction(functionname, arg, result.position);
			} else if (mat = arg.substring(result.position).match(isv)) {
				result.position += mat[0].length;
			} else {
				result = this._checkVar(arg, result.position, true);
			}
			if (arg[result.position] === ',' && isBraced) {
				result.position++;
				continue;
			}
			if (arg[result.position] === ')' && isBraced) {
				isBraced = false;
				result.position++;
			}
		} while (result.position < arg.length && isBraced);
		if (arg[result.position] !== '=') {
			result.text = 'Equal-Sign expected';
			throw result;
		}
		result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
		return result;
	}
	private _checkTstart(arg: string, position: number): ErrorInformation {
		//[([lvn...])|lvn|*|][:keyword|(keyword...)]
		let result: ErrorInformation = { text: '', position };
		if (arg[result.position] === '(') {
			result.position++;
			if (arg[result.position] !== ')') {
				let braceComplete = false;
				do {
					braceComplete = true;
					result = this._checkVar(arg, result.position, false, false);
					if (arg[result.position] === ')') {
						result.position++;
						break;
					}
					if (arg[result.position] !== ',') {
						result.text = 'Unecpected Character';
						throw result;
					} else {
						result.position++;
					}
					braceComplete = false;
				} while (result.position < arg.length)
				if (!braceComplete) {
					result.text = 'Missing ")" or Name';
					throw result;
				}
			}
		} else {
			if (arg[result.position] !== '*') {
				result = this._checkVar(arg, result.position, false, false);
			}
		}
		if (arg[result.position] === ':') {
			result.position++;
			if (arg[result.position] === '(') {
				result.position++;
				let braceComplete = false;
				do {
					result = this._checkKeyword(tstartkeywords, arg, result.position);
					braceComplete = true;
					if (arg[result.position] === ')') {
						result.position++;
						break;
					}
					if (arg[result.position] !== ':') {
						result.text = 'Unecpected Character';
						throw result;
					} else {
						result.position++;
					}
					braceComplete = false;
				} while (result.position < arg.length)
				if (!braceComplete) {
					result.text = 'Missing ")" or Keyword';
					throw result;
				}
			} else {
				result = this._checkKeyword(tstartkeywords, arg, result.position);
			}
		}

		return result;
	}
	private _checkView(arg: string, position: number): ErrorInformation {
		//keyword[:expr[:...]][,...]
		let result: ErrorInformation = { text: '', position };
		result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
		while (arg[result.position] === ':') {
			result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
		}
		return result;
	}
	private _checkWrite(arg: string, position: number): ErrorInformation {
		//expr|*intexpr|fcc[,...]
		let result: ErrorInformation = { text: '', position };
		let mat: string[] | null;
		if (arg[result.position] === '*') {
			result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
			return result;
		}
		if (arg.substring(result.position).match(/^\/(EOF|PASS|ACCEPT|LISTEN|L|TLS|WAIT|W)/i)) {
			result = this._checkWriteSocket(arg, result.position);
			return result;
		}
		if (mat = arg.substring(result.position).match(/^(#|!)+/)) {
			result.position += mat[0].length;
			if (arg[result.position] === '?') {
				result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
			}
			return result;
		}
		if (arg[result.position] === '?') {
			result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
			return result;
		}
		result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
		return result;
	}
	private _checkWriteSocket(arg: string, position: number): ErrorInformation {
		let result: ErrorInformation = { text: '', position };
		let mat: string[] | null;
		if (mat = arg.substring(result.position).match(/^\/(EOF|PASS|ACCEPT|LISTEN|L|TLS|WAIT|W)/i)) {
			result.position += mat[0].length;
			let fname = mat![0].toUpperCase();
			if (fname === '/EOF') {
				return result;
			}
			if (arg[result.position] !== '(') {
				if (!fname.match(/^\/(LISTEN|L|WAIT|W)/)) {
					result.text = fname + ' needs Parameter(s)';
					throw result;
				}
				return result;
			}
			result.position++;
			let maxparams = 99;
			if (fname === '/LISTEN' || fname === '/L' || fname === '/WAIT' || fname === '/W') {
				maxparams = 1;
			} else if (fname === '/TLS') {
				maxparams = 4;
			}
			let paramCount = 0;
			let braceComplete = false;
			do {
				paramCount++;
				if (paramCount > maxparams) {
					result.text = 'More Parameters than expected';
					throw result;
				}
				if (fname === '/ACCEPT' && paramCount === 1) {
					if (arg[result.position] !== '.') {
						result.text = 'Local Variablereference expected (.lvn)';
						throw result
					}
					result = this._checkVar(arg, ++result.position, false, false);
				} else {
					result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
				}
				braceComplete = true;
				if (arg[result.position] === ',') {
					braceComplete = false;
					continue;
				}
				if (arg[result.position] === ')') {
					result.position++;
					break;
				}
			} while (result.position < arg.length)
			if (!braceComplete) {
				result.text = 'Missing Parameter or ")"';
				throw result;
			}
		}
		return result;
	}
	private _checkXecute(arg: string, position: number): ErrorInformation {
		let result: ErrorInformation = { text: '', position };
		result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
		if (arg[result.position] === ':') {
			result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
		}
		return result;
	}
	private _checkZbreak(arg: string, position: number): ErrorInformation {
		//[-]entryref[:[expr][:intexpr]][,...]
		let result: ErrorInformation = { text: '', position };
		if (arg[result.position] === '-') {
			result.position++;
			if (arg[result.position] === '*') {
				result.position++;
				return result;
			}
		}
		result = this._checkEntryRef(arg, result.position, false);
		if (arg[result.position] === ':') {
			result.position++;
			if (arg[result.position] === ':') {
				result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
			} else {
				result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
				if (arg[result.position] === ':') {
					result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
				}
			}
		}
		return result;
	}
	private _checkZprint(arg: string, position: number): ErrorInformation {
		// 'parameter': '[entryref[:label[+intexpr]][,...]'
		let result: ErrorInformation = { text: '', position };
		result = this._checkEntryRef(arg, result.position, false);
		if (arg[result.position] === ':') {
			result = this._checkEntryRef(arg, ++result.position, false);
		}
		return result;
	}
	private _checkZstep(arg: string, position: number): ErrorInformation {
		// 'parameter': '[keyword[:expr]][,...]'
		let result: ErrorInformation = { text: '', position };
		let mat: string[] | null;

		if (mat = arg.substring(result.position).match(/^(INTO|OUTOF|OU|OVER|OV)/i)) {
			result.position += mat.length;
		} else {
			result.text = 'Invalid ZSTEP Qualifier';
			throw result;
		}
		if (arg[result.position] === ':') {
			result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
		}
		return result;
	}
	private _checkCommand(longcmd: string, code: TmpFunction): ErrorInformation {
		let para = cmdParams[longcmd];
		let postcondPossible = para.postcondition;
		let argFormat = para.parameter;
		let arg = code.mArguments;
		let argPosition = code.argPosition;
		let result: ErrorInformation = { text: '', position: 0 }
		if (!postcondPossible && code.mPostCondition !== '') {
			throw { text: 'Poscondition not allowed', position: code.pcPosition }
		} else if (code.mPostCondition !== '') {
			try {
				this.linePosition = code.pcPosition;
				result = this.evaluateExpression(expressiontype.Standard, code.mPostCondition, 0);
			} catch (result) {
				result.position += code.pcPosition;
				throw result;
			}
		}
		if (arg === '') {
			if (argFormat === '' || argFormat[0] === '[') {
				return { text: '', position: code.argPosition }
			} else {
				throw { text: 'Argument for command ' + code.mCommand + " required", position: code.argPosition }
			}
		}
		this.linePosition = argPosition;
		result.position = 0;
		let argCount = 0;
		try {
			do {
				argCount++;
				switch (longcmd) {
					case 'BREAK':
						result = this._checkBreak(arg, result.position);
						break;
					case 'CLOSE':
						result = this._checkOUC(closekeywords, arg, result.position);
						break;
					case 'DO':
						result = this._checkEntryRefAndPostcondition(arg, result.position, true);
						break;
					case 'ELSE':
						if (arg !== '') {
							return { text: 'No Argument expected', position: code.argPosition }
						}
						break;
					case 'FOR':
						result = this._checkFor(arg, result.position, argCount);
						break;
					case 'GOTO':
						result = this._checkEntryRefAndPostcondition(arg, result.position, false);
						break;
					case 'HANG':
						result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
						break;
					case 'IF':
						result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
						break;
					case 'JOB':
						result = this._checkJob(arg, result.position);
						break;
					case 'KILL':
						result = this._checkKill(arg, result.position);
						break;
					case 'LOCK':
						result = this._checkLock(arg, result.position, true);
						break;
					case 'MERGE':
						result = this._checkMerge(arg, result.position);
						break;
					case 'NEW':
						result = this._checkNew(arg, result.position);
						break;
					case 'OPEN':
						result = this._checkOUC(openkeywords, arg, result.position);
						break;
					case 'QUIT':
						if (argCount > 1) {
							result.text = 'Quit allows only one Argument'
							throw result;
						} else {
							if (arg[result.position] === '*') {
								result = this._checkVar(arg, ++result.position, false);
							} else {
								result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
							}
						}
						break;
					case 'READ':
						result = this._checkRead(arg, result.position);
						break;
					case 'SET':
						result = this._checkSet(arg, result.position);
						break;
					case 'TROLLBACK':
						if (argCount > 1) {
							result.text = 'TROLLBACK allows only one Argument'
						} else {
							result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
						}
						break;
					case 'TSTART':
						result = this._checkTstart(arg, result.position);
						break;
					case 'USE':
						result = this._checkOUC(usekeywords, arg, result.position);
						break;
					case 'VIEW':
						result = this._checkView(arg, result.position);
						break;
					case 'WRITE':
						result = this._checkWrite(arg, result.position);
						break;
					case 'XECUTE':
						result = this._checkXecute(arg, result.position);
						break;
					case 'ZALLOCATE':
						result = this._checkLock(arg, result.position, false);
						break;
					case 'ZBREAK':
						result = this._checkZbreak(arg, result.position);
						break;
					case 'ZCOMPILE':
						// 'abbreviation': 'ZCOM',
						// 'postcondition': true,
						// 'parameter': 'expr[,...]'
						result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
						break;
					case 'ZDEALLOCATE':
						result = this._checkVar(arg, result.position);
						// 'abbreviation': 'ZD',
						// 'postcondition': true,
						// 'parameter': '[nref[,...]]'
						break;
					case 'ZEDIT':
						result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
						// 'abbreviation': 'ZED',
						// 'postcondition': true,
						// 'parameter': '[expr[,...]]'
						break;
					case 'ZGOTO':
						result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
						if (arg[result.position] === ':') {
							result = this._checkEntryRefAndPostcondition(arg, ++result.position, false);
						}
						// 'abbreviation': 'ZG',
						// 'postcondition': true,
						// 'parameter': '[[intexpr][:entryref[:tvexpr]],...]'
						break;
					case 'ZHALT':
						result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
						// 'abbreviation': 'ZHALT',
						// 'postcondition': true,
						// 'parameter': '[intexpr]'
						break;
					case 'ZHELP':
						result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
						if (arg[result.position] === ':') {
							result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
						}
						// 'abbreviation': 'ZH',
						// 'postcondition': true,
						// 'parameter': '[expr1[:expr2],...]'
						break;
					case 'ZKILL':
						result = this._checkVar(arg, result.position);
						// 'abbreviation': 'ZK',
						// 'postcondition': true,
						// 'parameter': 'glvn'
						break;
					case 'ZLINK':
						result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
						if (arg[result.position] === ':') {
							result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
						}
						// 'abbreviation': 'ZL',
						// 'postcondition': true,
						// 'parameter': '[expr1[:expr2][,...]]'
						break;
					case 'ZMESSAGE':
						result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
						while (arg[result.position] === ':') {
							result = this.evaluateExpression(expressiontype.Standard, arg, ++result.position);
						}
						// 'abbreviation': 'ZM',
						// 'postcondition': true,
						// 'parameter': 'intexpr[:expr2][:...]'
						break;
					case 'ZPRINT':
						// 'abbreviation': 'ZP',
						// 'postcondition': true,
						// 'parameter': '[entryref[:label[+intexpr]][,...]'
						result = this._checkZprint(arg, result.position);
						break;
					case 'ZRUPDATE':
						// 'abbreviation': 'ZRUP',
						// 'postcondition': true,
						// 'parameter': 'expr[,...]'
						result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
						break;
					case 'ZSHOW':
						// 'abbreviation': 'ZSH',
						// 'postcondition': true,
						// 'parameter': '[expr[:glvn][,...]]'
						result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
						if (arg[result.position] === ':') {
							result = this._checkVar(arg, ++result.position);
						}
						break;
					case 'ZSTEP':
						// 'abbreviation': 'ZST',
						// 'postcondition': true,
						// 'parameter': '[keyword[:expr]][,...]'
						result = this._checkZstep(arg, result.position);
						break;
					case 'ZSYSTEM':
						// 'abbreviation': 'ZSY',
						// 'postcondition': true,
						// 'parameter': '[expr][,...]]'
						result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
						break;
					case 'ZTCOMMIT':
						// 'abbreviation': 'ZTC',
						// 'postcondition': true,
						// 'parameter': '[intexpr]'
						result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
						break;
					case 'ZTRIGGER':
						// 'abbreviation': 'ZTR',
						// 'postcondition': true,
						// 'parameter': 'gvn'
						result = this._checkVar(arg, result.position, true, false);
						if (!result.globalFound) {
							result.text = 'Global Variable expected';
							throw result;
						}
						break;
					case 'ZWITHDRAW':
						// 'abbreviation': 'ZWI',
						// 'postcondition': true,
						// 'parameter': 'glvn'
						result = this._checkVar(arg, result.position);
						break;
					case 'ZWRITE':
						//'abbreviation': 'ZWR',
						//'postcondition': true,
						//'parameter': '[zwrglvn[,...]]'
						//not separately tested because ZWRITE is for debugging and should not appear in normal code
						result.position += arg.length;
						break;
					default:
						result.position = arg.length;
						break;
				}
				if (arg[result.position] === ',') {
					result.position++;
					if (result.position === arg.length) {
						if (argFormat !== '' && argFormat[0] !== '[') {
							throw { text: 'Argument for command ' + code.mCommand + " required", position: result.position }
						}
					}
					continue;
				} else if (arg[result.position] !== undefined) {
					result.text = 'Unexpected Character "' + arg[result.position] + '"';
					throw result;
					break;
				}
			} while (result.position < arg.length)
		} catch (result) {
			result.position += argPosition;
			throw result;
		}
		result.position += code.argPosition;
		return result;
	}
	private _checkFunction(longfunc: string, arg: string, position: number): ErrorInformation {
		let result: ErrorInformation = { text: '', position: position };
		let params = funcParams[longfunc];
		let minArguments = params.minparams !== undefined ? params.minparams : 1;
		let formats = params.format !== undefined ? params.format.split(',') : undefined;
		let argCount = 0;
		longfunc = '$' + longfunc;
		if (minArguments === 0 && arg[result.position] === ')') {
			result.position++;
			return result;
		}
		do {
			let format = (formats !== undefined && formats[argCount] !== undefined) ? formats[argCount] : 'expr';
			if (longfunc === '$SELECT') {
				format = 'special';
			}
			if (format === 'glvn' || format === 'gvn' || format === 'glvn(' || format === 'lvn') {
				result = this._checkVar(arg, result.position);
				if (format === 'glvn(' && (!result.indexFound && !result.indirectionFound)) {
					result.text = 'Variable with Index expected for ' + longfunc;
					throw result;
				}
				if (format === 'lvn' && result.globalFound) {
					result.text = 'Local variable expected';
					throw result;
				}
			} else if (format === 'entryref') {
				result = this._checkEntryRef(arg, result.position, false);
			} else if (format === 'expr') {
				result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
			} else if (format === 'bool') {
				if (arg[result.position] !== '0' && arg[result.position] !== '1') {
					result.text = '0/1 expected';
					throw result;
				} else {
					result.position++;
				}
			} else if (format === 'special') {
				if (longfunc === '$SELECT') {
					result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
					if (arg[result.position] !== ':') {
						result.text = 'Missing Expression';
						throw result;
					}
					result.position++
					result = this.evaluateExpression(expressiontype.Standard, arg, result.position);
				}
			}
			argCount++;
			let char = arg[result.position];
			if (char === ',') {
				if (argCount > params.maxparams) {
					result.text = 'More Arguments for ' + longfunc + ' than expected';
					throw result;
				}
				result.position++;
				continue;
			} else if (char === ')') {
				if (argCount < minArguments) {
					result.text = 'Less Arguments for ' + longfunc + ' than expected';
					throw result;
				}
				result.position++;
				break;
			} else {
				result.text = 'Unxepected character ';
				throw result;
			}
		} while (result.position < arg.length);

		return result;
	}
}
/*
let test=new MumpsLineParser();

let result=test.checkLine('		F  S BILD=$$ZSEARCH(PFAD_"*") Q:BILD=""  D');
console.log(result);
console.log(test.tokens);
*/
