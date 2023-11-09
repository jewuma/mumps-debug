/* eslint-disable no-cond-assign */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-prototype-builtins */
import fs = require('fs');
export type ErrorInformation = {
	text: string,
	position: number,
	line?: number,
	indexFound?: boolean,
	globalFound?: boolean,
	indirectionFound?: boolean
}
export enum TokenType {
	global, local, exfunction, nonMfunction, entryref, operator, keyword, ifunction,
	label, comment, sysvariable, string, number, intendation, argPostcondition
}
export interface LineToken {
	type: TokenType,
	name: string,
	longName?: string,
	isPostconditioned?: boolean,
	isExcludedVariable?: boolean,
	hasArguments?: boolean,
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
export interface LineObject {
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
interface ModifiedLine {
	lineText: string,
	errorText: string
}
export interface LineInformation {
	error: ErrorInformation,
	tokens: LineToken[]
}
export interface LabelInformation {
	name: string,
	line: number
}
const label = /^[A-Za-z%][A-Za-z0-9]*(\([A-Za-z%][A-Za-z0-9]*(,[A-Za-z%][A-Za-z0-9]*)*\))?/
const lvn = /^[A-Za-z%][A-Za-z0-9]*/
const gvn = /^\^[A-Za-z%][A-Za-z0-9]*/
const isv = /^\$(DEVICE|ECODE|EC|ESTACK|ES|ETRAP|ET|HALT|HOROLOG|H|IO|I|JOB|J|KEY|K|NAMESPACE|PRINCIPAL|P|QUIT|Q|REFERENCE|R|STACK|ST|STORAGE|S|SYSTEM|TEST|THIS|TLEVEL|TL|T|USERNAME|X|Y|ZALLOCSTOR|ZA|ZB|ZCHSET|ZCLOSE|ZCMDLINE|ZCM|ZCOMPILE|ZCO|ZCSTATUS|ZCH[A-Z]*|ZC|ZDATEFORM|ZDA|ZDIRECTORY|ZD|ZEDITOR|ZED|ZEOF|ZEO|ZE[A-Z]*|ZGBLDIR|ZG|ZHRORLOG|ZH|ZININTERRUPT|ZINI|ZINTERRUPT|ZINT|ZIO|ZJOB|ZJ|ZKEY|ZLEVEL|ZL|ZMAXTPTIME|ZMAXTPTI|ZMODE|ZMO|ZONLNRLBK|ZPATNUMERIC|ZPATN|ZPIN|ZPOSITION|ZPOS|ZPOUT|ZPROMPT|ZQUIT|ZREALSTOR|ZRELDATE|ZRO[A-Z]*|ZSOURCE|ZSO|ZSTA[A-Z]*|ZSTEP|ZSTRP|ZSTRPLLIM|ZST|ZSYSTEM|ZSY|ZS|ZTEXIT|ZTE|ZTIMEOUT|ZTIM|ZTRAP|ZT|ZUSEDSTOR|ZUT|ZVERSION|ZV[A-Z]*|ZYERROR|ZYRELEASE|ZTDATA|ZTDELIM|ZTLEVEL|ZTNAME|ZTOLDVAL|ZTRIGGEROP|ZTSLATE|ZTUPDATE|ZTVALUE|ZTWORMHOLE)/i
const ifunction = /^\$(ASCII|A|CHAR|C|DATA|D|EXTRACT|E|FIND|F|FNUMBER|FN|GET|G|INCREMENT|INCR|I|JUSTIFY|J|LENGTH|L|NAME|NA|NEXT|N|ORDER|O|PIECE|P|QLENGTH|QL|QSUBSCRIPT|QS|QUERY|Q|RANDOM|R|REVERSE|RE|SELECT|S|STACK|ST|TEXT|T|TRANSLATE|TR|VIEW|V|ZAHANDLE|ZAH|ZASCII|ZATRANSFORM|ZAT|ZBITAND|ZBITCOUNT|ZBITFIND|ZBITGET|ZBITLEN|ZBITNOT|ZBITOR|ZBITSET|ZBITSTR|ZBITXOR|ZCHAR|ZCH|ZCOLLATE|ZCONVERT|ZCO|ZDATE|ZDATA|ZD|ZEXTRACT|ZE|ZFIND|ZF|ZGETJPI|ZG|ZINCREMENT|ZINCR|ZJOBEXAM|ZJUSTIFY|ZJ|ZLENGTH|ZL|ZMESSAGE|ZPARSE|ZPEEK|ZPIECE|ZPI|ZPREVIOUS|ZP|ZQGBLMOD|ZSEARCH|ZSIGPROC|ZSOCKET|ZSUBSTR|ZSUB|ZSYSLOG|ZTRANSLATE|ZTRIGGER|ZTRI|ZTRNLNM|ZTR|ZWIDTH|ZWRITE|ZW)(?=\()/i;
const nonMfunction = /^\$&([A-Za-z%0-9][A-Za-z0-9]*\.)?([A-Za-z%0-9][A-Za-z0-9]*)(\^[A-Za-z%][A-Za-z0-9]*)?/
export const entryref = /^(&[A-Za-z0-9]*\.?)?@?([A-Za-z%0-9][A-Za-z0-9]*)?(\^@?[A-Za-z%][A-Za-z0-9]*)?/
const routineref = /^\^@?[A-Za-z%][A-Za-z0-9]*/
const numlit = /^(\d*\.?\d*(E-?\d+)?)/
const strlit = /^"(""|[^"])*"/
const command = /^[B|BREAK|C|CLOSE|D|DO|E|ELSE|F|FOR|G|GOTO|H|HALT|HANG|I|IF|J|JOB|K|KILL|L|LOCK|M|MERGE|N|NEW|O|OPEN|Q|QUIT|R|READ|S|SET|U|USE|V|VIEW|W|WRITE|X|XECUTE|ZA|ZALLOCATE|ZBR|ZBREAK|ZC|ZCONTINUE|ZD|ZDEALLOCATE|ZE|ZEDIT|ZG|ZGOTO|ZHALT|ZH|ZHELP|ZK|ZKILL|ZL|ZLINK|ZM|ZMESSAGE|ZP|ZPRINT|ZRUPDATE|ZSH|ZSHOW|ZST|ZSTEP|ZSY|ZSYSTEM|ZTC|ZTCOMMIT|ZTR|ZTRIGGER|ZTS|ZTSTART|ZWI|ZWITHDRAW|ZWR|ZWRITE]/i
const binoperator = /^('=|'>|'<|<=|>=|'&|'!|'\?|'\[|'\]|\*\*|\+|-|\*|\/|\\|#|'|&|!|_|<|>|=|\[|\]\]|\]|\?|@)/
const unaryoperator = /(-|'|\+|@)/
const patcode = /^([A|C|E|L|N|P|U]|^("([^"]("")*)*"))+/i
const repititionCount = /^\d*\.?\d*/
const openkeywords = /^APPEND|ATTACH=|BLOCK(SIZE)?=|COMMAND=|CONNECT=|(NO)?DELIM(ITER)?=?|EXC(EPTION)?=|FIFO|(NO)?FIXED|GROUP=|[IO]?CHSET=|KEY|IKEY|INDEPENDANT|IOERROR=|NEW[A-Z]*|MOREREADTIME=|OKEY|OWNER=|(NO)?RCHK|(NO)?READ(ONLY)?|RECORD(SIZE)?=|(NO)?RETRY|REWIND|SEEK=|SHELL=|STDERR=|(NO)?STREAM|SYSTEM=|(NO)?TRUNCATE|UIC=|VARIABLE|WORLD=|Z?(NO)?WRAP|WRITE(ONLY)?|ZBFSIZE=|Z(NO)?DELAY|Z(NO)?FF|ZIBFSIZE=|Z?LISTEN=/i
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
	'ZA': 'ZASCII', 'ZAH': 'ZAHANDLE', 'ZCO': 'ZCONVERT', 'ZD': 'ZDATE', 'ZE': 'ZEXTRACT', 'ZF': 'ZFIND', 'ZG': 'ZGETJPI', 'ZJ': 'ZJUSTIFY', 'ZL': 'ZLENGTH', 'ZM': 'ZMESSAGE', 'ZPI': 'ZPIECE', 'ZP': 'ZPREVIOUS',
	'ZSUB': 'ZSUBSTR', 'ZTR': 'ZTRANSLATE', 'ZTRI': 'ZTRIGGER', 'ZW': 'ZWIDTH'
}
const isvExpansions = {
	'D': 'DEVICE', 'EC': 'ECODE', 'ES': 'ESTACK', 'ET': 'ETRAP', 'H': 'HOROLOG', 'I': 'IO', 'J': 'JOB', 'K': 'KEY', 'P': 'PRINCIPAL', 'Q': 'QUIT', 'R': 'REFERENCE', 'ST': 'STACK',
	'S': 'STORAGE', 'SY': 'SYSTEM', 'T': 'TEST', 'TL': 'TLEVEL', 'TR': 'TRESTART', 'ZC': 'ZCSTATUS', 'ZDA': 'ZDATEFORM', 'ZD': 'ZDIRECTORY', 'ZED': 'ZEDITOR', 'ZEO': 'ZEOF', 'ZE': 'ZERROR',
	'ZG': 'ZGBLDIR', 'ZH': 'ZHRORLOG', 'ZINI': 'ZININTERRUPT', 'ZINT': 'ZINTERRUPT', 'ZJ': 'ZJOB', 'ZL': 'ZLEVEL', 'ZMAXPTI': 'ZMAXTPTIME', 'ZMO': 'ZMODE', 'ZPOS': 'ZPOSITION',
	'ZPROM': 'ZPROMPT', 'ZRO': 'ZROUTINES', 'ZSO': 'ZSOURCE', 'ZS': 'ZSTATUS', 'ZST': 'ZSTEP', 'ZSTRP': 'ZSTRPLLIM', 'ZSY': 'ZSYSTEM', 'ZTE': 'ZTEXIT', 'ZTIM': 'ZTIMEOUT', 'ZT': 'ZTRAP',
	'ZV': 'ZVERSION', 'ZYER': 'ZYERROR', 'ZYRE': 'ZYRELEASE', 'ZTDE': 'ZTDELIM'

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
		'format': 'expr'
	},
	'QSUBSCRIPT': {
		'maxparams': 2,
		'format': 'expr,expr'
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

class MumpsLineParser {
	private _tokens: LineToken[] = [];
	private cmdCompressions: object;
	private funcCompressions: object;
	private isvCompressions: object;
	private linePosition = 0;
	/**
	 * Checks if the given File is correct M-Code
	 * @param filename
	 * @returns Array with list of errors or an empty array if no errors found in file
	 */
	public checkFile(filename: string): ErrorInformation[] {
		const errlist: ErrorInformation[] = [];
		let content: string;
		try {
			content = fs.readFileSync(filename, "utf8");
		} catch (err) {
			errlist.push({ text: 'File read error: ' + filename, position: 0, line: 0 });
			return errlist;
		}
		const lines = content.split('\n');
		return this.checkLines(lines);
	}
	public checkLines(lines: string[]): ErrorInformation[] {
		const errlist: ErrorInformation[] = [];
		for (let i = 0; i < lines.length; i++) {
			lines[i] = lines[i].replace(/\r/g, '');
			const info = this.checkLine(lines[i]);
			if (info.text !== '') {
				info.line = i + 1;
				errlist.push(info);
			}
		}
		return errlist;
	}
	public checkLine(line: string): ErrorInformation {
		this._tokens = [];
		this.linePosition = 0;
		const parsed = this.parseLine(line);
		if (parsed.lineLabel) {
			this._splitLabelAndParameters(parsed.lineLabel);
		}
		if (parsed.lineIndentationArray) {
			let position = 0;
			if (parsed.lineLeadSpace) {
				position += parsed.lineLeadSpace.length;
			}
			if (parsed.lineLabel) {
				position += parsed.lineLabel.length;
			}
			this._tokens.push({ name: ".".repeat(parsed.lineIndentationArray.length), type: TokenType.intendation, position });
		}
		let result: ErrorInformation = { text: '', position: 0 }
		if (parsed.lineRoutines) {
			for (let i = 0; i < parsed.lineRoutines.length; i++) {
				const code = parsed.lineRoutines[i];
				if (code.mCommand.length > 0) {
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
						this._tokens.push({
							name: code.mCommand,
							type: TokenType.keyword,
							position: code.cmdPosition,
							longName: longcmd,
							isPostconditioned: code.mPostCondition !== "",
							hasArguments: code.mArguments !== ""
						});

						if (longcmd === undefined) {
							result.text = 'Unknown Command';
							result.position = code.cmdPosition;
							return result;
						}
						try {
							result = this._checkCommand(line, longcmd, code);
						} catch (result) {
							return result;
						}
					} else {
						return { text: 'Invalid Command', position: code.cmdPosition }
					}
				}
			}
		}
		if (parsed.lineComment) {
			this._tokens.push({ name: parsed.lineComment.comment, position: parsed.lineComment.position, type: TokenType.comment });
		}
		return result;
	}
	public analyzeLine(line: string): LineInformation {
		this._tokens = [];
		line = line.replace(/\r/g, '');
		const errInfo = this.checkLine(line);
		return { error: errInfo, tokens: this._tokens }
	}
	public analyzeLines(input: string): [LineToken[][], ErrorInformation[]] {
		const lines = input.split('\n');
		const errors: ErrorInformation[] = [];
		const linetokens: Array<Array<LineToken>> = [];
		for (let i = 0; i < lines.length; i++) {
			lines[i] = lines[i].replace(/\r/g, '');
			errors[i] = this.checkLine(lines[i]);
			linetokens[i] = this._tokens;
		}
		return [linetokens, errors];
	}
	public expandCompressFile(filename: string, doExpand: boolean): string {
		if (doExpand === undefined) { doExpand = false; }
		let content: string;
		let lines: string[] = [];
		try {
			content = fs.readFileSync(filename, "utf8");
		} catch (err) {
			lines[0] = 'File read error: ';
			return lines[0];
		}
		lines = content.split('\n');
		for (let i = 0; i < lines.length; i++) {
			//lines[i] = lines[i].replace(/\r/g, '');
			const info = this.expandCompressLine(lines[i], doExpand);
			if (info.errorText !== '') {
				lines = [];
				lines[0] = "Error in Line " + i + " : " + info.errorText;
				break;
			}
			lines[i] = info.lineText;
		}
		return lines.join("\n");
	}
	public expandCompressLine(line: string, doExpand: boolean): ModifiedLine {
		line = line.replace(/\r/g, '');
		if (doExpand === false && this.cmdCompressions === undefined) {
			this.cmdCompressions = {};
			Object.keys(cmdExpansions).forEach(shortCommand => {
				this.cmdCompressions[cmdExpansions[shortCommand]] = shortCommand;
			});
			this.funcCompressions = {};
			Object.keys(funcExpansions).forEach(shortFunction => {
				this.funcCompressions[funcExpansions[shortFunction]] = shortFunction;
			});
			this.isvCompressions = {};
			Object.keys(isvExpansions).forEach(shortIsv => {
				this.isvCompressions[isvExpansions[shortIsv]] = shortIsv;
			});
		}
		const outline: ModifiedLine = { lineText: line, errorText: '' }
		const errorinfo = this.checkLine(line);
		let outText = line;
		if (errorinfo.text !== "") {
			outline.errorText = errorinfo.text;
		} else {
			let posCorrector = 0;
			for (let i = 0; i < this._tokens.length; i++) {
				const token = this._tokens[i];
				if (token.hasOwnProperty("longName")) {
					const name = token.name;
					let longName = name;
					const position = token.position;
					if (doExpand) {
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						longName = token.longName!.toLowerCase();
						if (longName[0] === "$") {
							longName = "$" + longName[1].toUpperCase() + longName.substring(2);
						} else {
							longName = longName[0].toUpperCase() + longName.substring(1);
						}
					} else {
						let checkName = name.toUpperCase();
						if (name[0] === "$") { checkName = name.substring(1); }
						if (token.type === TokenType.keyword) {
							if (this.cmdCompressions[checkName] !== undefined) {
								longName = this.cmdCompressions[checkName];
							}
						} else if (token.type === TokenType.ifunction) {
							if (this.funcCompressions[checkName] !== undefined) {
								longName = "$" + this.funcCompressions[checkName];
							}
						} else if (token.type === TokenType.sysvariable) {
							if (this.isvCompressions[checkName] !== undefined) {
								longName = "$" + this.isvCompressions[checkName];
							}
						}
					}
					if (name.length !== longName.length) {
						outText = outText.substring(0, posCorrector + position) + longName + outText.substring(posCorrector + position + name.length);
						posCorrector += longName.length - name.length;
					}
				}
			}
		}
		outline.lineText = outText;
		return outline;
	}
	public getLabels(text: string): LabelInformation[] {
		const labels: LabelInformation[] = [];
		const lines = text.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const parsed = this.parseLine(lines[i]);
			if (parsed.lineLabel) {
				labels.push({ name: parsed.lineLabel, line: i });
			}
		}
		return labels;
	}
	public getTokenAt(line: string, position: number): LineToken | undefined {
		this.checkLine(line);
		let memPosition = 0
		let tokenId = -1
		for (let i = 0; i < this._tokens.length; i++) {
			const token = this._tokens[i];
			if (token.position >= memPosition && token.position < position) {
				memPosition = token.position;
				tokenId = i;
			}
		}
		if (tokenId === -1) {
			return;
		}
		return this._tokens[tokenId];
	}
	private _checkEntryRefAndPostcondition(line: string, position: number, withParams: boolean): ErrorInformation {
		let result: ErrorInformation = { text: '', position };
		result = this._checkEntryRef(line, result.position, withParams);
		if (line[result.position] === ':') {
			this._tokens.push({ type: TokenType.argPostcondition, name: ":", position });
			result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
		}
		return result;
	}
	private _checkEntryRef(line: string, position: number, withParams: boolean, isUserfunction?: boolean): ErrorInformation {
		isUserfunction = isUserfunction === undefined ? false : isUserfunction;
		let tokentype: TokenType = isUserfunction ? TokenType.exfunction : TokenType.entryref;
		let result: ErrorInformation = { text: '', position };
		if (line[result.position] === '@') { //Check Indirection
			result = this._evaluateExpression(expressiontype.Atom, line, ++result.position);
			if (line[result.position] === '+') { //Check Label+Offset
				result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
			}
			if (line[result.position] === '^') { //Check if it's a Label like xxx^yyy
				if (line[result.position + 1] === '@') { // or a Label xxx^@expr
					result = this._evaluateExpression(expressiontype.Atom, line, ++result.position);
				} else {
					if (line.substring(result.position).match(entryref)) {
						const ref = line.substring(result.position).match(entryref)![0];
						result.position += ref.length;
					} else {
						result.text = 'Invalid EntryRef';
						throw result;
					}
				}
			}
			if (line.substring(result.position, result.position + 2) === '@(') {
				result.position++;
			}
		} else if (line.substring(result.position).match(entryref)) { //No Indirection and a valid entryref
			let ref = line.substring(result.position).match(entryref)![0];
			const merkpos = result.position;
			result.position += ref.length;
			const char = line[result.position];
			if (result.position >= line.length) {
				if (ref.length > 0) {
					if (ref[0] === '&') {
						tokentype = TokenType.nonMfunction;
					}
					this._tokens.push({ 'type': tokentype, name: ref, position: merkpos + this.linePosition });
					return result;
				} else {
					result.text = 'Missing Entryref';
					throw result;
				}
			}
			if (ref.indexOf('^') === -1 && char === '+') {
				const position = ++result.position
				result = this._evaluateExpression(expressiontype.Standard, line, position);
				ref += "+" + line.substring(position, result.position);
				if (result.position >= line.length) {
					this._tokens.push({ 'type': tokentype, name: ref, position: merkpos + this.linePosition });
					return result
				}
				if (line.substring(result.position).match(routineref)) {
					const routine = line.substring(result.position).match(routineref)![0];
					ref += routine;
					result.position += routine.length;
				}
			}
			this._tokens.push({ 'type': tokentype, name: ref, position: merkpos + this.linePosition });
		} else {
			result.text = 'Invalid Entryref';
			throw result;
		}
		if (line[result.position] === '(' && withParams) {
			result = this._evaluateExpression(expressiontype.eArgument, line, ++result.position, 1);
		}
		return result
	}
	private _checkVar(line: string, position: number, globalOk?: boolean, indexOk?: boolean, isExluded?: boolean): ErrorInformation {
		let result: ErrorInformation = { text: '', position, indexFound: false, globalFound: false, indirectionFound: false };
		let varFound = false;
		if (globalOk === undefined) {
			globalOk = true;
		}
		if (indexOk === undefined) {
			indexOk = true;
		}
		if (isExluded === undefined) {
			isExluded = false;
		}
		if (line[result.position] === '@') {
			result = this._evaluateExpression(expressiontype.Atom, line, ++result.position);
			result.indirectionFound = true;
			varFound = true;
			if (line.substring(result.position, result.position + 2) === '@(') {
				result.position++;
			}
		} else {
			if (line.substring(result.position).match(gvn) || line.substring(result.position, result.position + 2) === '^|') {
				if (!globalOk) {
					result.text = 'Global not allowed here';
					throw result;
				}
				result.globalFound = true;
				if (line.substring(result.position, result.position + 2) === '^|') {
					result.position += 2
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					result.globalFound = true;
					if (line[result.position] === ',') {
						result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
						result.globalFound = true;
					}
					if (line[result.position] !== '|') {
						result.text = 'Missing "|"';
						throw result;
					}
					result.position++;
					if (line.substring(result.position).match(lvn)) {
						const global = line.substring(result.position).match(lvn)![0];
						this._tokens.push({ name: global, type: TokenType.global, position: result.position + this.linePosition });
						varFound = true;
						result.position += global.length;
					}
				} else {
					const global = line.substring(result.position).match(gvn)![0];
					this._tokens.push({ name: global, type: TokenType.global, position: result.position + this.linePosition });
					varFound = true;
					result.position += global.length;
				}
			} else if (line.substring(result.position).match(lvn)) {  // local variable found
				const local = line.substring(result.position).match(lvn)![0];
				this._tokens.push({ name: local, type: TokenType.local, position: result.position + this.linePosition, isExcludedVariable: isExluded });
				varFound = true;
				result.position += local.length;
			} else if (line.substring(result.position, result.position + 2) === '^(') {
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
		if (varFound && line[result.position] === '(') {
			if (!indexOk) {
				result.text = 'Index not allowed here';
				throw result;
			}
			const provResult = this._evaluateExpression(expressiontype.Index, line, ++result.position, 1);
			result.position = provResult.position;
			result.indexFound = true;
		}
		if (!varFound) {
			result.text = 'Name missing';
			throw result;
		}
		return result;
	}
	private _checkBreak(line: string, position: number): ErrorInformation {
		//[expr[:tvexpr][,...]]
		let result = this._evaluateExpression(expressiontype.Standard, line, position);
		if (line[result.position] === ':') {
			result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
		}
		return result;
	}
	private _checkKeyword(keywords: RegExp, line: string, position: number): ErrorInformation {
		let result: ErrorInformation = { text: '', position };
		if (line.substring(result.position).match(keywords)) {
			const keyword = line.substring(result.position).match(keywords)![0];
			result.position += keyword.length;
			if (keyword.slice(-1) === '=') {
				result = this._evaluateExpression(expressiontype.Standard, line, result.position);
			}
		} else {
			result.text = 'No valid Keyword for command found';
			throw result;
		}
		return result;
	}
	private _checkOUC(keywords: RegExp, line: string, position: number): ErrorInformation {
		let result: ErrorInformation = { text: '', position };
		//expr[:(keyword[=expr][:...])][,...]
		result = this._evaluateExpression(expressiontype.Standard, line, result.position);
		if (line[result.position] === ':') {
			result.position++;
			if (line[result.position] === '(') {
				result.position++;
				let braceComplete = false;
				do {
					result = this._checkKeyword(keywords, line, result.position);
					braceComplete = true;
					if (line[result.position] === ')') {
						result.position++;
						break;
					}
					if (line[result.position] !== ':') {
						result.text = 'Unecpected Character';
						throw result;
					} else {
						result.position++;
					}
					braceComplete = false;
				} while (!this._isEndOfArgument(line, result.position))
				if (!braceComplete) {
					result.text = 'Missing ")" or Keyword';
					throw result;
				}
			} else {
				if (line[result.position] !== ':') {
					result = this._checkKeyword(keywords, line, result.position);
				}
			}
		}
		if (keywords === openkeywords && line[result.position] === ':') {
			result.position++;
			if (line[result.position] !== ':') {
				result = this._evaluateExpression(expressiontype.Standard, line, result.position);
			}
		}
		if (keywords === openkeywords && line[result.position] === ':') {
			result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
		}
		return result;
	}
	private _checkFor(line: string, position: number, argNumber: number): ErrorInformation {
		//[lvn=expr[:numexpr1[:numexpr2]][,...]]]
		let result: ErrorInformation = { text: '', position };
		if (argNumber > 1) { //If it's not the first Argument the Options are possible: F I=1:2:3,4 or F I=1:2:3,I=4:1:6
			try {
				const provResult = this._checkVar(line, result.position, false);
				if (line[provResult.position] === '"') {
					result.position = provResult.position + 1;
				}
			} catch (provResult) {
				if (provResult.text !== "Name missing") {
					throw result;
				}
			}
		} else {
			result = this._checkVar(line, result.position, false);
			if (line[result.position] !== '=') {
				result.text = 'Missing equal-sign';
				throw result;
			}
			result.position++;
		}
		result = this._evaluateExpression(expressiontype.Standard, line, result.position);
		if (line[result.position] !== ':') {
			return result;
		}
		result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
		if (line[result.position] !== ':') {
			return result;
		}
		result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
		return result;
	}
	private _checkJobKeyword(line: string, position: number): ErrorInformation {
		const result: ErrorInformation = { text: '', position };
		if (line.substring(result.position).match(jobkeywords)) {
			const keyword = line.substring(result.position).match(jobkeywords)![0];
			result.position += keyword.length;
			if (keyword[keyword.length - 1] === '=') {
				if (line.substring(result.position).match(strlit)) {
					const stringlit = line.substring(result.position).match(strlit)![0];
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
	private _checkJob(line: string, position: number): ErrorInformation {
		//entryref[(expr[,...])][:[(keyword[=value][:...])][:numexpr]][,...]
		let result = this._checkEntryRef(line, position, true);
		if (line[result.position] === ':') {
			result.position++;
			if (line[result.position] === '(') {
				result.position++;
				let braceComplete = false;
				do {
					result = this._checkJobKeyword(line, result.position);
					braceComplete = true;
					if (line[result.position] === ')') {
						result.position++;
						break;
					}
					if (line[result.position] !== ':') {
						result.text = 'Unecpected Character';
						throw result;
					} else {
						result.position++;
					}
					braceComplete = false;
				} while (!this._isEndOfArgument(line, result.position))
				if (!braceComplete) {
					result.text = 'Missing ")" or Keyword';
					throw result;
				}
			} else {
				if (line[result.position] !== ':') {
					result = this._checkJobKeyword(line, result.position);
				}
			}
		}
		if (line[result.position] === ':') { //Numeric expression for Job-Timeout
			result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
		}
		return result;
	}
	private _checkKill(line: string, position: number): ErrorInformation {
		//[glvn | (lvn[,...]) | *lname | *lvn ]
		let result: ErrorInformation = { text: '', position };
		if (line[result.position] === '(') {
			result.position++;
			let braceComplete = false;
			do {
				result = this._checkVar(line, result.position);
				braceComplete = true;
				if (line[result.position] === ')') {
					result.position++;
					break;
				}
				if (line[result.position] !== ',') {
					result.text = 'Unecpected Character';
					throw result;
				} else {
					result.position++;
				}
				braceComplete = false;
			} while (!this._isEndOfArgument(line, result.position))
			if (!braceComplete) {
				result.text = 'Missing ")" or Name';
				throw result;
			}
		} else {
			result = this._checkVar(line, result.position);
		}
		return result;
	}
	private _checkLock(line: string, position: number, isLock: boolean): ErrorInformation {
		//[[-|+]nref|(nref[,...])[:numexpr] [,...]]
		let result: ErrorInformation = { text: '', position };
		if ((line[result.position] === '+' || line[result.position] === '-') && isLock) {
			result.position++;
		}
		if (line[result.position] === '(') {
			result.position++;
			let braceComplete = false;
			do {
				result = this._checkVar(line, result.position);
				braceComplete = true;
				if (line[result.position] === ')') {
					result.position++;
					break;
				}
				if (line[result.position] !== ',') {
					result.text = 'Unecpected Character';
					throw result;
				} else {
					result.position++;
				}
				braceComplete = false;
			} while (!this._isEndOfArgument(line, result.position))
			if (!braceComplete) {
				result.text = 'Missing ")" or Name';
				throw result;
			}
		} else {
			result = this._checkVar(line, result.position);
		}
		if (line[result.position] === ':') {
			result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
		}
		return result;
	}
	private _checkMerge(line: string, position: number): ErrorInformation {
		//glvn=glvn[,...]
		let result: ErrorInformation = { text: '', position };
		result = this._checkVar(line, result.position);
		if (line[result.position] !== '=') {
			result.text = 'Equal-Sign expected';
			throw result;
		}
		result = this._checkVar(line, ++result.position);
		return result;
	}
	private _checkNew(line: string, position: number): ErrorInformation {
		//[[(]lvn[,...][)][,...]]
		let result: ErrorInformation = { text: '', position };
		if (line[result.position] === '(') {
			result.position++;
			let braceComplete = false;
			do {
				if (line.substring(result.position).match(isv)) {
					const sysvariable = line.substring(result.position).match(isv)![0];
					let longName = sysvariable.toUpperCase();
					if (isvExpansions[longName.substring(1)] !== undefined) {
						longName = "$" + isvExpansions[longName.substring(1)];
					}
					this._tokens.push({ name: sysvariable, position: position + this.linePosition, type: TokenType.sysvariable, longName, isExcludedVariable: true });
					result.position += sysvariable.length;
				} else {
					result = this._checkVar(line, result.position, false, false, true);
				}
				braceComplete = true;
				if (line[result.position] === ')') {
					result.position++;
					break;
				}
				if (line[result.position] !== ',') {
					result.text = 'Unecpected Character';
					throw result;
				} else {
					result.position++;
				}
				braceComplete = false;
			} while (!this._isEndOfArgument(line, result.position))
			if (!braceComplete) {
				result.text = 'Missing ")" or Name';
				throw result;
			}
		} else {
			if (line.substring(result.position).match(isv)) {
				const sysvariable = line.substring(result.position).match(isv)![0];
				let longName = sysvariable.toUpperCase();
				if (isvExpansions[longName.substring(1)] !== undefined) {
					longName = "$" + isvExpansions[longName.substring(1)];
				}
				this._tokens.push({ name: sysvariable, position: position + this.linePosition, type: TokenType.sysvariable, longName, isExcludedVariable: false });
				result.position += sysvariable.length;
			} else {
				result = this._checkVar(line, result.position, false);
			}
		}
		return result;
	}
	private _checkRead(line: string, position: number): ErrorInformation {
		//(glvn|*glvn|glvn#intexpr)[:numexpr]|strlit|fcc[,...]
		let result: ErrorInformation = { text: '', position };
		let starDetected = false;
		let mat: string[] | null;
		if (line[result.position] === '*') {
			result.position++;
			starDetected = true;
		}
		try {
			const provResult = this._checkVar(line, result.position);
			result.position = provResult.position;
			if (line[result.position] === '#') {
				result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
				if (result.text !== '') {
					return result;
				}
			}
			if (line[result.position] === ':') {
				result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
			}
			return result;
		} catch {
			if (starDetected) {
				result.text = 'Variable expected';
				throw result;
			}
			if (mat = line.substring(result.position).match(strlit)) {
				result.position += mat[0].length;
				return result;
			} else if (mat = line.substring(result.position).match(/^(#|!)+/)) {
				result.position += mat[0].length;
			}
			if (line[result.position] === '?') {
				result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
				return result;
			}
		}
		return result;
	}
	private _checkSet(line: string, position: number): ErrorInformation {
		//setleft=expr | (setleft[,...])=expr | *lvn=lname | aliascontainer[,...]
		let result: ErrorInformation = { text: '', position };
		let mat: string[] | null;
		let isBraced = false;
		if (line[result.position] === '*') { //*lvn=lname
			result = this._checkVar(line, ++result.position, false);
			if (line[result.position] !== '=') {
				result.text = 'Equal-Sign expected';
				throw result;
			}
			const savePosition = ++result.position;
			try {
				result = this._checkVar(line, result.position, false);
			} catch (varResult) {
				if (line[savePosition] !== '$') {
					result.text = "Local Variable or Aliascontainer expected";
				} else {
					result = this._evaluateExpression(expressiontype.Standard, line, savePosition)
				}
			}
			return result;
		}
		if (line[result.position] === '(') {
			isBraced = true;
			result.position++;
		}
		do {
			if (line[result.position] === '@') {
				try {
					const provResult = this._checkVar(line, result.position);
					result.position = provResult.position;
					if (this._isEndOfArgument(line, result.position) || line[result.position] === ',') {
						return result;
					}
				} catch {
					result = this._evaluateExpression(expressiontype.Atom, line, ++result.position);
					if (this._isEndOfArgument(line, result.position) || line[result.position] === ',') {
						return result;
					}
				}
			} else if (mat = line.substring(result.position).match(/^\$Z?(PIECE|P|EXTRACT|E)\(/i)) {
				let functionname = mat[0].substring(1, mat[0].length - 1).toUpperCase();
				result.position += functionname.length + 2
				if (funcExpansions[functionname] !== undefined) {
					this._tokens.push({ name: "$" + functionname, position: result.position - functionname.length - 2, type: TokenType.ifunction, longName: "$" + funcExpansions[functionname] });
					functionname = funcExpansions[functionname];
				}
				result = this._checkFunction(functionname, line, result.position);
			} else if (mat = line.substring(result.position).match(isv)) {
				result.position += mat[0].length;
			} else {
				result = this._checkVar(line, result.position, true);
			}
			if (line[result.position] === ',' && isBraced) {
				result.position++;
				continue;
			}
			if (line[result.position] === ')' && isBraced) {
				isBraced = false;
				result.position++;
			}
		} while (!this._isEndOfArgument(line, result.position) && isBraced);
		if (line[result.position] !== '=') {
			result.text = 'Equal-Sign expected';
			throw result;
		}
		result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
		return result;
	}
	private _checkTstart(line: string, position: number): ErrorInformation {
		//[([lvn...])|lvn|*|][:keyword|(keyword...)]
		let result: ErrorInformation = { text: '', position };
		if (line[result.position] === '(') {
			result.position++;
			if (line[result.position] !== ')') {
				let braceComplete = false;
				do {
					braceComplete = true;
					result = this._checkVar(line, result.position, false, false);
					if (line[result.position] === ')') {
						result.position++;
						break;
					}
					if (line[result.position] !== ',') {
						result.text = 'Unecpected Character';
						throw result;
					} else {
						result.position++;
					}
					braceComplete = false;
				} while (!this._isEndOfArgument(line, result.position))
				if (!braceComplete) {
					result.text = 'Missing ")" or Name';
					throw result;
				}
			}
		} else {
			if (line[result.position] === '*') {
				result.position++;
			} else {
				result = this._checkVar(line, result.position, false, false);
			}
		}
		if (line[result.position] === ':') {
			result.position++;
			if (line[result.position] === '(') {
				result.position++;
				let braceComplete = false;
				do {
					result = this._checkKeyword(tstartkeywords, line, result.position);
					braceComplete = true;
					if (line[result.position] === ')') {
						result.position++;
						break;
					}
					if (line[result.position] !== ':') {
						result.text = 'Unecpected Character';
						throw result;
					} else {
						result.position++;
					}
					braceComplete = false;
				} while (result.position < line.length)
				if (!braceComplete) {
					result.text = 'Missing ")" or Keyword';
					throw result;
				}
			} else {
				result = this._checkKeyword(tstartkeywords, line, result.position);
			}
		}

		return result;
	}
	private _checkView(line: string, position: number): ErrorInformation {
		//keyword[:expr[:...]][,...]
		let result: ErrorInformation = { text: '', position };
		result = this._evaluateExpression(expressiontype.Standard, line, result.position);
		while (line[result.position] === ':') {
			result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
		}
		return result;
	}
	private _checkWrite(line: string, position: number): ErrorInformation {
		//expr|*intexpr|fcc[,...]
		let result: ErrorInformation = { text: '', position };
		let mat: string[] | null;
		if (line[result.position] === '*') {
			result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
			return result;
		}
		if (line.substring(result.position).match(/^\/(EOF|PASS|ACCEPT|LISTEN|L|TLS|WAIT|W)/i)) {
			result = this._checkWriteSocket(line, result.position);
			return result;
		}
		if (mat = line.substring(result.position).match(/^(#|!)+/)) {
			result.position += mat[0].length;
			if (line[result.position] === '?') {
				result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
			}
			return result;
		}
		if (line[result.position] === '?') {
			result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
			return result;
		}
		result = this._evaluateExpression(expressiontype.Standard, line, result.position);
		return result;
	}
	private _checkWriteSocket(line: string, position: number): ErrorInformation {
		let result: ErrorInformation = { text: '', position };
		let mat: string[] | null;
		if (mat = line.substring(result.position).match(/^\/(EOF|PASS|ACCEPT|LISTEN|L|TLS|WAIT|W)/i)) {
			result.position += mat[0].length;
			const fname = mat![0].toUpperCase();
			if (fname === '/EOF') {
				return result;
			}
			if (line[result.position] !== '(') {
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
					if (line[result.position] !== '.') {
						result.text = 'Local Variablereference expected (.lvn)';
						throw result
					}
					result = this._checkVar(line, ++result.position, false, false);
				} else {
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
				}
				braceComplete = true;
				if (line[result.position] === ',') {
					braceComplete = false;
					continue;
				}
				if (line[result.position] === ')') {
					result.position++;
					break;
				}
			} while (!this._isEndOfArgument(line, result.position))
			if (!braceComplete) {
				result.text = 'Missing Parameter or ")"';
				throw result;
			}
		}
		return result;
	}
	private _checkXecute(line: string, position: number): ErrorInformation {
		let result: ErrorInformation = { text: '', position };
		result = this._evaluateExpression(expressiontype.Standard, line, result.position);
		if (line[result.position] === ':') {
			result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
		}
		return result;
	}
	private _checkZbreak(line: string, position: number): ErrorInformation {
		//[-]entryref[:[expr][:intexpr]][,...]
		let result: ErrorInformation = { text: '', position };
		if (line[result.position] === '-') {
			result.position++;
			if (line[result.position] === '*') {
				result.position++;
				return result;
			}
		}
		result = this._checkEntryRef(line, result.position, false);
		if (line[result.position] === ':') {
			result.position++;
			if (line[result.position] === ':') {
				result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
			} else {
				result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
				if (line[result.position] === ':') {
					result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
				}
			}
		}
		return result;
	}
	private _checkZprint(line: string, position: number): ErrorInformation {
		// 'parameter': '[entryref[:label[+intexpr]][,...]'
		let result: ErrorInformation = { text: '', position };
		result = this._checkEntryRef(line, result.position, false);
		if (line[result.position] === ':') {
			result = this._checkEntryRef(line, ++result.position, false);
		}
		return result;
	}
	private _checkZstep(line: string, position: number): ErrorInformation {
		// 'parameter': '[keyword[:expr]][,...]'
		let result: ErrorInformation = { text: '', position };
		let mat: string[] | null;

		if (mat = line.substring(result.position).match(/^(INTO|OUTOF|OU|OVER|OV)/i)) {
			result.position += mat[0].length;
		} else {
			result.text = 'Invalid ZSTEP Qualifier';
			throw result;
		}
		if (line[result.position] === ':') {
			result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
		}
		return result;
	}
	private _checkCommand(line: string, longcmd: string, code: TmpFunction): ErrorInformation {
		const para = cmdParams[longcmd];
		let position = code.pcPosition
		const postcondPossible = para.postcondition;
		const argFormat = para.parameter;
		let result: ErrorInformation = { text: '', position: 0 }
		if (!postcondPossible && code.mPostCondition !== '') {
			throw { text: 'Poscondition not allowed', position }
		} else if (code.mPostCondition !== '') {
			result = this._evaluateExpression(expressiontype.Standard, line, position);
		}
		position = code.argPosition;
		if (code.mArguments === '') {
			if (argFormat === '' || argFormat[0] === '[') {
				return { text: '', position }
			} else {
				throw { text: 'Argument for command ' + code.mCommand + " required", position }
			}
		}
		result.position = position;
		let argCount = 0;
		do {
			argCount++;
			switch (longcmd) {
				case 'BREAK':
					result = this._checkBreak(line, result.position);
					break;
				case 'CLOSE':
					result = this._checkOUC(closekeywords, line, result.position);
					break;
				case 'DO':
					result = this._checkEntryRefAndPostcondition(line, result.position, true);
					break;
				case 'ELSE':
					if (line !== '') {
						throw { text: 'No Argument expected', position }
					}
					break;
				case 'FOR':
					result = this._checkFor(line, result.position, argCount);
					break;
				case 'GOTO':
					result = this._checkEntryRefAndPostcondition(line, result.position, false);
					break;
				case 'HANG':
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					break;
				case 'IF':
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					break;
				case 'JOB':
					result = this._checkJob(line, result.position);
					break;
				case 'KILL':
					result = this._checkKill(line, result.position);
					break;
				case 'LOCK':
					result = this._checkLock(line, result.position, true);
					break;
				case 'MERGE':
					result = this._checkMerge(line, result.position);
					break;
				case 'NEW':
					result = this._checkNew(line, result.position);
					break;
				case 'OPEN':
					result = this._checkOUC(openkeywords, line, result.position);
					break;
				case 'QUIT':
					if (argCount > 1) {
						result.text = 'Quit allows only one Argument'
						throw result;
					} else {
						if (line[result.position] === '*') {
							result = this._checkVar(line, ++result.position, false);
						} else {
							result = this._evaluateExpression(expressiontype.Standard, line, result.position);
						}
					}
					break;
				case 'READ':
					result = this._checkRead(line, result.position);
					break;
				case 'SET':
					result = this._checkSet(line, result.position);
					break;
				case 'TROLLBACK':
					if (argCount > 1) {
						result.text = 'TROLLBACK allows only one Argument'
					} else {
						result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					}
					break;
				case 'TSTART':
					result = this._checkTstart(line, result.position);
					break;
				case 'USE':
					result = this._checkOUC(usekeywords, line, result.position);
					break;
				case 'VIEW':
					result = this._checkView(line, result.position);
					break;
				case 'WRITE':
					result = this._checkWrite(line, result.position);
					break;
				case 'XECUTE':
					result = this._checkXecute(line, result.position);
					break;
				case 'ZALLOCATE':
					result = this._checkLock(line, result.position, false);
					break;
				case 'ZBREAK':
					result = this._checkZbreak(line, result.position);
					break;
				case 'ZCOMPILE':
					// 'abbreviation': 'ZCOM',
					// 'postcondition': true,
					// 'parameter': 'expr[,...]'
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					break;
				case 'ZDEALLOCATE':
					result = this._checkVar(line, result.position);
					// 'abbreviation': 'ZD',
					// 'postcondition': true,
					// 'parameter': '[nref[,...]]'
					break;
				case 'ZEDIT':
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					// 'abbreviation': 'ZED',
					// 'postcondition': true,
					// 'parameter': '[expr[,...]]'
					break;
				case 'ZGOTO':
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					if (line[result.position] === ':') {
						result = this._checkEntryRefAndPostcondition(line, ++result.position, false);
					}
					// 'abbreviation': 'ZG',
					// 'postcondition': true,
					// 'parameter': '[[intexpr][:entryref[:tvexpr]],...]'
					break;
				case 'ZHALT':
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					// 'abbreviation': 'ZHALT',
					// 'postcondition': true,
					// 'parameter': '[intexpr]'
					break;
				case 'ZHELP':
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					if (line[result.position] === ':') {
						result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
					}
					// 'abbreviation': 'ZH',
					// 'postcondition': true,
					// 'parameter': '[expr1[:expr2],...]'
					break;
				case 'ZKILL':
					result = this._checkVar(line, result.position);
					// 'abbreviation': 'ZK',
					// 'postcondition': true,
					// 'parameter': 'glvn'
					break;
				case 'ZLINK':
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					if (line[result.position] === ':') {
						result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
					}
					// 'abbreviation': 'ZL',
					// 'postcondition': true,
					// 'parameter': '[expr1[:expr2][,...]]'
					break;
				case 'ZMESSAGE':
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					while (line[result.position] === ':') {
						result = this._evaluateExpression(expressiontype.Standard, line, ++result.position);
					}
					// 'abbreviation': 'ZM',
					// 'postcondition': true,
					// 'parameter': 'intexpr[:expr2][:...]'
					break;
				case 'ZPRINT':
					// 'abbreviation': 'ZP',
					// 'postcondition': true,
					// 'parameter': '[entryref[:label[+intexpr]][,...]'
					result = this._checkZprint(line, result.position);
					break;
				case 'ZRUPDATE':
					// 'abbreviation': 'ZRUP',
					// 'postcondition': true,
					// 'parameter': 'expr[,...]'
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					break;
				case 'ZSHOW':
					// 'abbreviation': 'ZSH',
					// 'postcondition': true,
					// 'parameter': '[expr[:glvn][,...]]'
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					if (line[result.position] === ':') {
						result = this._checkVar(line, ++result.position);
					}
					break;
				case 'ZSTEP':
					// 'abbreviation': 'ZST',
					// 'postcondition': true,
					// 'parameter': '[keyword[:expr]][,...]'
					result = this._checkZstep(line, result.position);
					break;
				case 'ZSYSTEM':
					// 'abbreviation': 'ZSY',
					// 'postcondition': true,
					// 'parameter': '[expr][,...]]'
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					break;
				case 'ZTCOMMIT':
					// 'abbreviation': 'ZTC',
					// 'postcondition': true,
					// 'parameter': '[intexpr]'
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					break;
				case 'ZTRIGGER':
					// 'abbreviation': 'ZTR',
					// 'postcondition': true,
					// 'parameter': 'gvn'
					result = this._checkVar(line, result.position, true, false);
					if (!result.globalFound) {
						result.text = 'Global Variable expected';
						throw result;
					}
					break;
				case 'ZWITHDRAW':
					// 'abbreviation': 'ZWI',
					// 'postcondition': true,
					// 'parameter': 'glvn'
					result = this._checkVar(line, result.position);
					break;
				case 'ZWRITE':
					//'abbreviation': 'ZWR',
					//'postcondition': true,
					//'parameter': '[zwrglvn[,...]]'
					//not separately tested because ZWRITE is for debugging and should not appear in normal code
					result.position += line.length;
					break;
				default:
					result.position = line.length;
					break;
			}
			if (line[result.position] === ',') {
				result.position++;
				if (result.position === line.length) {
					if (argFormat !== '' && argFormat[0] !== '[') {
						throw { text: 'Argument for command ' + code.mCommand + " required", position: result.position }
					}
				}
				continue;
			} else if (line[result.position] !== undefined) {
				const char = line[result.position];
				if (char === " " || char === "\t" || char === ";") { break; }
				result.text = 'Unexpected Character "' + line[result.position] + '"';
				throw result;
			}
		} while (result.position < line.length)
		return result;
	}
	private _checkFunction(longfunc: string, line: string, position: number): ErrorInformation {
		let result: ErrorInformation = { text: '', position: position };
		const params = funcParams[longfunc];
		if (params === undefined) {
			result.text = "Unknown Function " + longfunc;
			throw result;
		}
		const minArguments = params.minparams !== undefined ? params.minparams : 1;
		const formats = params.format !== undefined ? params.format.split(',') : undefined;
		let argCount = 0;
		longfunc = '$' + longfunc;
		if (minArguments === 0 && line[result.position] === ')') {
			result.position++;
			return result;
		}
		do {
			let format = (formats !== undefined && formats[argCount] !== undefined) ? formats[argCount] : 'expr';
			if (longfunc === '$SELECT') {
				format = 'special';
			}
			if (format === 'glvn' || format === 'gvn' || format === 'glvn(' || format === 'lvn') {
				result = this._checkVar(line, result.position);
				if (format === 'glvn(' && (!result.indexFound && !result.indirectionFound)) {
					result.text = 'Variable with Index expected for ' + longfunc;
					throw result;
				}
				if (format === 'lvn' && result.globalFound) {
					result.text = 'Local variable expected';
					throw result;
				}
			} else if (format === 'entryref') {
				result = this._checkEntryRef(line, result.position, false);
			} else if (format === 'expr') {
				result = this._evaluateExpression(expressiontype.Standard, line, result.position);
			} else if (format === 'bool') {
				if (line[result.position] !== '0' && line[result.position] !== '1') {
					result.text = '0/1 expected';
					throw result;
				} else {
					result.position++;
				}
			} else if (format === 'special') {
				if (longfunc === '$SELECT') {
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
					if (line[result.position] !== ':') {
						result.text = 'Missing Expression';
						throw result;
					}
					result.position++
					result = this._evaluateExpression(expressiontype.Standard, line, result.position);
				}
			}
			argCount++;
			const char = line[result.position];
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
		} while (!this._isEndOfArgument(line, result.position));

		return result;
	}
	private _evaluateExpression(exType: number, line: string, position: number, level?: number | undefined): ErrorInformation {
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
				const result = this._evaluateExpression(subExType, line, ++position, level + 1);
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
				const evalString = line.substring(position);
				if (evalString.match(lvn)) {
					const localname = evalString.match(lvn)![0];
					this._tokens.push({ type: TokenType.local, name: localname, position: position + this.linePosition });
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
					const operator = line.substring(position).match(binoperator)![0];
					this._tokens.push({ name: operator, position: position + this.linePosition, type: TokenType.operator });
					position += operator.length;
					expressionComplete = false;
					if (operator === '?' || operator === "'?") {
						const result = this._evaluatePattern(line, position);
						position = result.position;
						expressionComplete = true;
						lastExpression = 'pattern';
					}
					continue;
				} else {
					return { text: '', position }
				}
			}
			const evalString = line.substring(position);
			try {
				const provResult = this._checkVar(line, position);
				expressionComplete = true;
				position = provResult.position;
			} catch (provResult) {
				if (evalString.substring(0, 2) === '$$') {
					position += 2;
					// eslint-disable-next-line no-ex-assign
					provResult = this._checkEntryRef(line, position, true, true);
					expressionComplete = true;
					position = provResult.position;
					expressionComplete = true;
				} else if (evalString.match(nonMfunction)) {
					const functionname = evalString.match(nonMfunction)![0];
					this._tokens.push({ type: TokenType.nonMfunction, name: functionname, position });
					position += functionname.length;
					lastExpression = 'exfunction'
					expressionComplete = true;
				} else if (evalString.match(ifunction)) {
					const functionname = evalString.match(ifunction)![0].substring(1).toUpperCase();
					position += functionname.length + 2
					let longName = functionname;
					if (funcExpansions[functionname] !== undefined) {
						longName = funcExpansions[functionname];
					}
					this._tokens.push({ name: "$" + functionname, position: position - functionname.length - 2, type: TokenType.ifunction, longName: "$" + longName });
					const result = this._checkFunction(longName, line, position);
					position = result.position;
					lastExpression = '';
					expressionComplete = true;
				} else if (evalString.match(isv)) {
					const specialvarname = evalString.match(isv)![0];
					let longName = specialvarname.toUpperCase();
					if (isvExpansions[longName.substring(1)] !== undefined) {
						longName = "$" + isvExpansions[longName.substring(1)];
					}
					this._tokens.push({ name: specialvarname, position: position + this.linePosition, type: TokenType.sysvariable, longName });
					position += specialvarname.length
					expressionComplete = true;
				} else if (evalString.match(numlit) && evalString.match(numlit)![0] !== '') {
					const numericliteral = evalString.match(numlit)![0];
					this._tokens.push({ name: numericliteral, type: TokenType.number, position: position + this.linePosition });
					position += numericliteral.length;
					expressionComplete = true;
				} else if (evalString.match(strlit)) {
					const stringlit = evalString.match(strlit)![0];
					this._tokens.push({ name: stringlit, type: TokenType.string, position: position + this.linePosition });
					position += stringlit.length;
					expressionComplete = true;
				} else if (char.match(unaryoperator)) {
					this._tokens.push({ name: char, type: TokenType.operator, position: position + this.linePosition });
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

	/**
 * Checks Mumps-patterns, throws error when error found in pattern
 * @param line: Line to be analyzed
 * @param position: startposition
 * @param level: is used for nested Patterns
 * @returns ErrorInformation, text empty when no error found, position is set behind pattern
 */
	private _evaluatePattern(line: string, position: number, level?: number): ErrorInformation {
		let result = { text: '', position }
		let patternComplete = false;
		if (level === undefined) {
			level = 0;
		}
		do {
			if (line[position] === '@') {
				result = this._evaluateExpression(expressiontype.Standard, line, ++position);
				patternComplete = true;
				break;
			}
			if (line.substring(result.position).match(repititionCount)) {
				const repCount = line.substring(result.position).match(repititionCount)![0];
				if (repCount !== '') {
					patternComplete = false;
					result.position += repCount.length;
					if (line.substring(result.position).match(patcode)) {
						patternComplete = true;
						result.position += line.substring(result.position).match(patcode)![0].length;
						continue;
					} else if (line[result.position] === '(') {
						result = this._evaluatePattern(line, ++result.position, level + 1);
						patternComplete = true;
						continue;
					}
				} else if (line[result.position] === ')') {
					if (!patternComplete) {
						result.text = 'Incomplete pattern';
						throw result;
					}
					if (level > 0) {
						result.position++;
					}
					return result;
				} else if (line[result.position] === ',' && level > 0) {
					result.position++;
					continue;
				} else {
					break;
				}
			} else if (line[result.position] === ')') {
				if (!patternComplete) {
					result.text = 'Incomplete pattern';
					throw result;
				} else {
					result.position++;
				}
				return result;
			} else if (line[result.position] === ',' && level > 0) {
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
		} while (position < line.length)
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

	//Extract M-Commands.
	//Assumes inputLine has extracted comments/spacing/indentation.
	private _extractCommands(inputObject: LineObject): LineObject {

		let tmpFunction: TmpFunction;
		const tmpFunctionArray: Array<TmpFunction> = [];
		//Divide Routines and Arguments.
		const splitLine = this._splitCommandsAndArguments(inputObject);
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
				const ii = i + 1;
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
		const postConditionFunctionArray = this._extractPostConditional(tmpFunctionArray);
		if (postConditionFunctionArray.length > 0) {
			inputObject.lineRoutines = postConditionFunctionArray;
		}
		return inputObject;
	}

	//Extract Comments.
	private _extractComment(inputObject: LineObject): LineObject {
		const inputLine = inputObject.lineExpression!;
		//Semicolon identifies comments.
		if (inputLine.search(";") >= 0) {
			let isInsideString = false;
			for (let i = 0; i < inputLine.length; i++) {
				if (inputLine[i] === ";") {
					if (!isInsideString) {
						inputObject.lineExpression = inputLine.substring(0, i);
						inputObject.lineComment = { comment: inputLine.substring(i).substring(1), position: i + inputObject.expressionPosition };
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

		const lineIndentationArray: string[] = [];
		let lineIndentation = 0;
		const inputLine = inputObject.lineExpression!;
		let spacer = '';
		let i = 0;
		for (i = 0; i <= inputLine.length; i++) {
			const char = inputLine[i];
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
	private _extractLabel(inputObject: LineObject): LineObject {
		inputObject.lineLabel = '';
		const inputLine = inputObject.lineExpression;
		inputObject.lineExpression = '';
		if (inputLine.match(label)) {
			inputObject.lineLabel = inputLine.match(label)![0];
		}
		const position = inputObject.lineLabel.length;
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
		if (i !== (inputLine.length)) {
			inputObject.lineExpression = inputLine.substring(i);
			inputObject.expressionPosition = i;
		}
		return inputObject;
	}

	//Extracts Post-Conditionals from Routines, used by extractRoutines.
	private _extractPostConditional(tmpFunctionArray: TmpFunction[]): TmpFunction[] {

		//Assign to new variable to truncate Routines.
		const tmpObject = tmpFunctionArray;
		for (let i = 0; i < tmpObject.length; i++) {
			//Colon indicates Post-Conditionals.
			const tmpIndex = tmpObject[i].mCommand!.indexOf(":");
			if (tmpIndex > -1) {
				tmpObject[i].mPostCondition = tmpObject[i].mCommand.substring(tmpIndex + 1);
				tmpObject[i].mCommand = tmpObject[i].mCommand.substring(0, tmpIndex);
				tmpObject[i].pcPosition = tmpObject[i].cmdPosition + tmpIndex + 1;
			}
		}
		return tmpObject;
	}

	private _isEndOfArgument(line: string, position: number): boolean {
		let isEndOfArgument = false;
		const char = line[position];
		if (char === undefined || char === " " || char === "\t" || char === ";") { isEndOfArgument = true; }
		return isEndOfArgument;
	}
	/**
 * Divde inputString into Label, commands and comments and return corresponding LineObject
 * @param inputString
 * @returns LineObject
 */
	public parseLine(inputString: string): LineObject {

		let tmpObject: LineObject = { lineExpression: inputString, expressionPosition: 0 };

		//Parsing must be performed sequentially.
		tmpObject = this._extractLabel(tmpObject);
		if (tmpObject.errorText) {
			return tmpObject;
		}
		tmpObject = this._extractComment(tmpObject);
		tmpObject = this._extractIndentation(tmpObject);
		tmpObject = this._extractCommands(tmpObject);

		//Line Expression is no longer needed.
		tmpObject.lineExpression = '';
		return tmpObject;
	}

	//Divide commands and arguments into array, used by extractRoutines.
	private _splitCommandsAndArguments(inputObject: LineObject): LineComand[] {

		const lineCommands: LineComand[] = [];
		let tmpCursor = 0;
		let isInsideString = false;
		const inputLine = inputObject.lineExpression!;
		const start = inputObject.expressionPosition!;
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
		const i = inputLine.length;
		if (inputLine.substring(tmpCursor, i).length > 0) {
			lineCommands.push({ command: inputLine.substring(tmpCursor, i), position: start + tmpCursor });
			//Gather empty commands from end of line.
		} else if (i === tmpCursor && (inputLine.substring(i - 1, i) === " " || inputLine.substring(i - 1, i) === "/t")) {
			lineCommands.push({ command: '', position: start + tmpCursor });
		}
		return lineCommands;
	}

	private _splitLabelAndParameters(label: string) {
		if (label.indexOf('(') === -1) {
			this._tokens.push({ name: label, position: 0, type: TokenType.label });
		} else {
			const labelparts = label.split('(');
			const labeltext = labelparts[0];
			this._tokens.push({ name: labeltext, position: 0, type: TokenType.label });
			const parameters = labelparts[1].split(')')[0];
			const parameterVars = parameters.split(',');
			let position = labeltext.length + 1		// Position = lengths of Label + trailing "("
			for (let i = 0; i < parameterVars.length; i++) {
				this._tokens.push({ name: parameterVars[i], position, type: TokenType.local });
				position += parameterVars[i].length + 1
			}
		}
	}

}
/*
const test = new MumpsLineParser();
const dir = "x:\\";
let erg: Array<ErrorInformation> = [];
fs.readdir(dir, function (err, files) {
	//handling error
	if (err) {
		return console.log('Unable to scan directory: ' + err);
	}
	//listing all files using forEach
	files.forEach(function (file: string) {
		if (file.substring(file.length - 2) === ".m") {
			erg = test.checkFile(dir + file);
			console.log(file);
			if (erg.length) {
				console.log(erg);
			}
		}
	});
});
let test = new MumpsLineParser();
let expanded = test.expandCompressFile("t:\\KTEST93.m", true);
console.log(expanded);
let lines = expanded.split("\n");
for (let i = 0; i < lines.length; i++) {
	console.log(test.expandCompressLine(lines[i], false).lineText);
}

let result = test.checkLine('	S VGZR=$E(YDL(2),5,6)-1 S:VGZR=0 VGZR=12_($E(YDL(2),1,4)-1)');
console.log(result);
*/
export { ifunction, isv, MumpsLineParser }