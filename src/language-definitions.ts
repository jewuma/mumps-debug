interface ParameterDefinition {
	name: string,
	type: string,
	description?: string
	optional?: boolean
}
export interface languageToken {
	name: string,
	type: string,
	abbreviation: string,
	description: string,
	parameters?: ParameterDefinition[],
	returns?: { type: string }
}
export const definitionsArray: languageToken[] =
	[{
		"name": "BREAK",
		"type": "command",
		"abbreviation": "B",
		"description": "Suspend execution or exit a block"
	},
	{
		"name": "CLOSE",
		"type": "command",
		"abbreviation": "C",
		"description": "Release an I/O device"
	},
	{
		"name": "DO",
		"type": "command",
		"abbreviation": "D",
		"description": "Execute a program, section of code or block"
	},
	{
		"name": "ELSE",
		"type": "command",
		"abbreviation": "E",
		"description": "Conditional execution based on $test"
	},
	{
		"name": "FOR",
		"type": "command",
		"abbreviation": "F",
		"description": "Iterative execution of a line or block"
	},
	{
		"name": "GOTO",
		"type": "command",
		"abbreviation": "G",
		"description": "Transfer of control to a label or program"
	},
	{
		"name": "HALT",
		"type": "command",
		"abbreviation": "H",
		"description": "Terminate execution"
	},
	{
		"name": "HANG",
		"type": "command",
		"abbreviation": "H",
		"description": "Delay execution for a specified period of time"
	},
	{
		"name": "IF",
		"type": "command",
		"abbreviation": "I",
		"description": "Conditional execution of remainder of line"
	},
	{
		"name": "JOB",
		"type": "command",
		"abbreviation": "J",
		"description": "Start an independent process"
	},
	{
		"name": "LOCK",
		"type": "command",
		"abbreviation": "L",
		"description": "Exclusive access/release named resource"
	},
	{
		"name": "KILL",
		"type": "command",
		"abbreviation": "K",
		"description": "Deletes a local or global variable"
	},
	{
		"name": "MERGE",
		"type": "command",
		"abbreviation": "M",
		"description": "Copy arrays"
	},
	{
		"name": "NEW",
		"type": "command",
		"abbreviation": "N",
		"description": "Create new copies of local variables"
	},
	{
		"name": "OPEN",
		"type": "command",
		"abbreviation": "O",
		"description": "Obtain ownership of a device"
	},
	{
		"name": "QUIT",
		"type": "command",
		"abbreviation": "Q",
		"description": "End a for loop or exit a block"
	},
	{
		"name": "READ",
		"type": "command",
		"abbreviation": "R",
		"description": "Read from a device"
	},
	{
		"name": "SET",
		"type": "command",
		"abbreviation": "S",
		"description": "Assign a value to a global or local variable"
	},
	{
		"name": "TCOMMIT",
		"type": "command",
		"abbreviation": "TC",
		"description": "Commit a transaction"
	},
	{
		"name": "TRESTART",
		"type": "command",
		"abbreviation": "TRE",
		"description": "Roll back / restart a transaction"
	},
	{
		"name": "TROLLBACK",
		"type": "command",
		"abbreviation": "TRO",
		"description": "Roll back a transaction"
	},
	{
		"name": "TSTART",
		"type": "command",
		"abbreviation": "TS",
		"description": "Begin a transaction"
	},
	{
		"name": "USE",
		"type": "command",
		"abbreviation": "U",
		"description": "Select which device to read/write"
	},
	{
		"name": "VIEW",
		"type": "command",
		"abbreviation": "V",
		"description": "Implementation defined"
	},
	{
		"name": "WRITE",
		"type": "command",
		"abbreviation": "W",
		"description": "Writes to device"
	},
	{
		"name": "XECUTE",
		"type": "command",
		"abbreviation": "X",
		"description": "Dynamically execute strings"
	},
	{
		"name": "ZALLOCATE",
		"type": "command",
		"abbreviation": "ZA",
		"description": "Reserves the specified name"
	},
	{
		"name": "ZBREAK",
		"type": "command",
		"abbreviation": "ZB",
		"description": "Sets or clears a routine breakpoint"
	},
	{
		"name": "ZCOMPILE",
		"type": "command",
		"abbreviation": "ZCOM",
		"description": "Compiles a routine"
	},
	{
		"name": "ZCONTINUE",
		"type": "command",
		"abbreviation": "ZC",
		"description": "Continues excutioen after a break"
	},
	{
		"name": "ZDEALLOCATE",
		"type": "command",
		"abbreviation": "ZD",
		"description": "Release the specified name"
	},
	{
		"name": "ZEDIT",
		"type": "command",
		"abbreviation": "ZE",
		"description": "Invokes editor for routine editing"
	},
	{
		"name": "ZGOTO",
		"type": "command",
		"abbreviation": "ZG",
		"description": "Moves to EntryRef on a given stacklevel"
	},
	{
		"name": "ZHALT",
		"type": "command",
		"abbreviation": "ZHALT",
		"description": "Stops program execution with a return code"
	},
	{
		"name": "ZHELP",
		"type": "command",
		"abbreviation": "ZH",
		"description": "Accessses M help library"
	},
	{
		"name": "ZKILL",
		"type": "command",
		"abbreviation": "ZK",
		"description": "Kills a data value but not the descendants"
	},
	{
		"name": "ZLINK",
		"type": "command",
		"abbreviation": "ZL",
		"description": "Compiles an links a routine to the current process"
	},
	{
		"name": "ZMESSAGE",
		"type": "command",
		"abbreviation": "ZM",
		"description": "Raises an exception specified by given code"
	},
	{
		"name": "ZPRINT",
		"type": "command",
		"abbreviation": "ZP",
		"description": "Displays source code lines"
	},
	{
		"name": "ZRUPDATE",
		"type": "command",
		"abbreviation": "ZRUPDATE",
		"description": "Publishes the new versions of routines to subscribers"
	},
	{
		"name": "ZSHOW",
		"type": "command",
		"abbreviation": "ZSH",
		"description": "Displays information about the current environment"
	},
	{
		"name": "ZSTEP",
		"type": "command",
		"abbreviation": "ZST",
		"description": "Controls routine execution"
	},
	{
		"name": "ZSYSTEM",
		"type": "command",
		"abbreviation": "ZSY",
		"description": "Creates a child of the current process"
	},
	{
		"name": "ZTCOMMIT",
		"type": "command",
		"abbreviation": "ZTC",
		"description": "Marks the end of a logical transaction"
	},
	{
		"name": "ZTRIGGER",
		"type": "command",
		"abbreviation": "ZTR",
		"description": "Invokes specified Global Triggers"
	},
	{
		"name": "ZTSTART",
		"type": "command",
		"abbreviation": "ZTS",
		"description": "Marks the beginning of a logical transaction"
	},
	{
		"name": "ZWITHDRAW",
		"type": "command",
		"abbreviation": "ZWI",
		"description": "Kills a data value but not the descendants"
	},
	{
		"name": "ZWRITE",
		"type": "command",
		"abbreviation": "ZWR",
		"description": "Displays a complete global or local variable"
	},

	{
		"name": "$DEVICE",
		"type": "variable",
		"abbreviation": "$D",
		"description": "Status of the current device"
	},
	{
		"name": "$ECODE",
		"type": "variable",
		"abbreviation": "$EC",
		"description": "List of unresolved error codes"
	},
	{
		"name": "$ESTACK",
		"type": "variable",
		"abbreviation": "$ES",
		"description": "Number of stack levels; NEWing $ESTACK resets it to 0"
	},
	{
		"name": "$ETRAP",
		"type": "variable",
		"abbreviation": "$ET",
		"description": "Code to execute on error"
	},
	{
		"name": "$HOROLOG",
		"type": "variable",
		"abbreviation": "$H",
		"description": "Days,seconds time stamp"
	},
	{
		"name": "$IO",
		"type": "variable",
		"abbreviation": "$I",
		"description": "Current IO unit"
	},
	{
		"name": "$JOB",
		"type": "variable",
		"abbreviation": "$J",
		"description": "Current process ID"
	},
	{
		"name": "$KEY",
		"type": "variable",
		"abbreviation": "$K",
		"description": "String that terminated the most recent READ command"
	},
	{
		"name": "$PRINCIPAL",
		"type": "variable",
		"abbreviation": "$P",
		"description": "Principal I/O device"
	},
	{
		"name": "$QUIT",
		"type": "variable",
		"abbreviation": "$Q",
		"description": "Whether the current block of code was called as an extrinsic function (e.g. via $$)"
	},
	{
		"name": "$STACK",
		"type": "variable",
		"abbreviation": "$ST",
		"description": "Current process stack level"
	},
	{
		"name": "$STORAGE",
		"type": "variable",
		"abbreviation": "$S",
		"description": "Amount of memory available, in bytes"
	},
	{
		"name": "$SYSTEM",
		"type": "variable",
		"abbreviation": "$SY",
		"description": "System ID"
	},
	{
		"name": "$TEST",
		"type": "variable",
		"abbreviation": "$T",
		"description": "Result of prior IF command or READ/OPEN/LOCK command if invoked with a timeout"
	},
	{
		"name": "$TLEVEL",
		"type": "variable",
		"abbreviation": "$TL",
		"description": "Number transactions in process"
	},
	{
		"name": "$TRESTART",
		"type": "variable",
		"abbreviation": "$TR",
		"description": "Number of restarts on current transaction"
	},
	{
		"name": "$X",
		"type": "variable",
		"abbreviation": "$X",
		"description": "Position of horizontal cursor in current I/O device"
	},
	{
		"name": "$Y",
		"type": "variable",
		"abbreviation": "$Y",
		"description": "Position of vertical cursor in current I/O device"
	},

	{
		"name": "$ASCII",
		"type": "function",
		"abbreviation": "$A",
		"description": "ASCII numeric code of a character",
		"parameters": [{
			"name": "VALUE",
			"type": "string",
			"description": "A string to get a code from"
		},
		{
			"name": "POS",
			"type": "number",
			"optional": true,
			"description": "The 1-based position of the character in VALUE; defaults to 1"
		}
		],
		"returns": {
			"type": "number"
		}
	},
	{
		"name": "$CHAR",
		"type": "function",
		"abbreviation": "$C",
		"description": "ASCII character from numeric code",
		"parameters": [{
			"name": "CODE",
			"type": "number",
			"description": "Numeric code to convert to a character"
		},
		{
			"name": "...",
			"type": "number",
			"optional": true,
			"description": "Additional codes to convert to characters"
		}
		],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$DATA",
		"type": "function",
		"abbreviation": "$D",
		"description": "Returns data about a variable: 0: if undefined, 1: if valued but has no descendants, 10: if has descendants but no value; 11: if has both a value and descendants",
		"parameters": [{
			"name": "VAR",
			"type": "reference",
			"description": "The variable to get data about, e.g. ^X"
		}],
		"returns": {
			"type": "number"
		}
	},
	{
		"name": "$EXTRACT",
		"type": "function",
		"abbreviation": "$E",
		"description": "Extract a substring",
		"parameters": [{
			"name": "VALUE",
			"type": "string",
			"description": "The string to get a substring from"
		},
		{
			"name": "START",
			"type": "number",
			"optional": true,
			"description": "The 1-based start index; defaults to 1"
		},
		{
			"name": "END",
			"type": "number",
			"optional": true,
			"description": "The 1-based end index; defaults to 2"
		}
		],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$FIND",
		"type": "function",
		"abbreviation": "$F",
		"description": "Find the 1-based index after the end of a substring or 0 if not found",
		"parameters": [{
			"name": "WITHIN",
			"type": "string",
			"description": "The string to search in"
		},
		{
			"name": "SUBSTRING",
			"type": "string",
			"description": "The substring to search for"
		},
		{
			"name": "START",
			"type": "number",
			"optional": true,
			"description": "The 1-based index to start searching from; defaults to 1"
		}
		],
		"returns": {
			"type": "number"
		}
	},
	{
		"name": "$FNUMBER",
		"type": "function",
		"abbreviation": "$FN",
		"description": "Format a number",
		"parameters": [{
			"name": "NUMBER",
			"type": "number",
			"description": "The number to format"
		},
		{
			"name": "FORMAT",
			"type": "string",
			"description": "One or more of the following: +: forces \"+\" on positive numbers; -: omits the \"-\" on negative numbers; ,: comma-separates the number by thousands; T: puts the sign in the trailing position; P: wraps negative numbers in parentheses and wraps positive numbers in spaces and may only be combined with comma (,)"
		},
		{
			"name": "DIGITS",
			"type": "number",
			"optional": true,
			"description": "The numer of digits after the decimal point"
		}
		],
		"returns": {
			"type": "any"
		}
	},
	{
		"name": "$GET",
		"type": "function",
		"abbreviation": "$G",
		"description": "Get default or actual value",
		"parameters": [{
			"name": "VAR",
			"type": "reference",
			"description": "The variable to query, e.g. ^X(THIS,THAT)"
		},
		{
			"name": "DEFAULT",
			"type": "any",
			"optional": true,
			"description": "A value to use if VAR has no value; defaults to \"\""
		}
		],
		"returns": {
			"type": "any"
		}
	},
	{
		"name": "$JUSTIFY",
		"type": "function",
		"abbreviation": "$J",
		"description": "Right-justify a number or string by prefixing with spaces",
		"parameters": [{
			"name": "VALUE",
			"type": "string",
			"description": "The string to justify"
		},
		{
			"name": "MINLENGTH",
			"type": "number",
			"description": "The minimum length of the result"
		},
		{
			"name": "DIGITS",
			"type": "number",
			"description": "The number of digits after the decimal point; providing this argument makes $JUSTIFY treat VALUE as a number"
		}
		],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$LENGTH",
		"type": "function",
		"abbreviation": "$L",
		"description": "Determine string length",
		"parameters": [{
			"name": "VALUE",
			"type": "string",
			"description": "The string"
		},
		{
			"name": "SUBSTRING",
			"type": "string",
			"optional": true,
			"description": "If present, $LENGTH returns one more than the number of occurences of SUBSTRING in VALUE"
		}
		],
		"returns": {
			"type": "number"
		}
	},
	{
		"name": "$NAME",
		"type": "function",
		"abbreviation": "$NA",
		"description": "Evaluate and describe a variable",
		"parameters": [{
			"name": "VAR",
			"type": "reference",
			"description": "The variable to evaluate, including naked references"
		},
		{
			"name": "MAXSUBSCRIPT",
			"type": "number",
			"optional": true,
			"description": "The maximum number of subscripts to evaluate if VAR is an array"
		}
		],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$ORDER",
		"type": "function",
		"abbreviation": "$O",
		"description": "Find the subscript of the next or previous node",
		"parameters": [{
			"name": "VAR",
			"type": "reference",
			"description": "The array to query, e.g. ^AR"
		},
		{
			"name": "DIRECTION",
			"type": "number",
			"optional": true,
			"description": "1: forward, -1: reverse; defaults to 1"
		}
		],
		"returns": {
			"type": "string|number"
		}
	},
	{
		"name": "$PIECE",
		"type": "function",
		"abbreviation": "$P",
		"description": "Extract substring based on pattern",
		"parameters": [{
			"name": "VALUE",
			"type": "string",
			"description": "The string"
		},
		{
			"name": "SUBSTRING",
			"type": "string",
			"description": "A delimiting string within VALUE"
		},
		{
			"name": "PIECE",
			"type": "number",
			"optional": true,
			"description": "Which 1-based piece of the split string to return; defaults to 1"
		},
		{
			"name": "LASTPIECE",
			"type": "number",
			"optional": true,
			"description": "The 1-based index of the last piece of the split string to return; defaults to PIECE"
		}
		],
		"returns": {
			"type": "any"
		}
	},
	{
		"name": "$QLENGTH",
		"type": "function",
		"abbreviation": "$QL",
		"description": "Number of subscripts in an array reference",
		"parameters": [{
			"name": "VAR",
			"type": "reference",
			"description": "The array to query, e.g. ^AR"
		}],
		"returns": {
			"type": "any"
		}
	},
	{
		"name": "$QSUBSCRIPT",
		"type": "function",
		"abbreviation": "$QS",
		"description": "Value of specified subscript",
		"parameters": [{
			"name": "VAR",
			"type": "reference",
			"description": "The array to query, e.g. ^AR"
		},
		{
			"name": "SUBSCRIPT",
			"type": "number",
			"description": "The 1-based index of the subscript to find; special values include -1: environment and 0: unsubscripted name"
		}
		],
		"returns": {
			"type": "string|number"
		}
	},
	{
		"name": "$QUERY",
		"type": "function",
		"abbreviation": "$Q",
		"description": "Next item in an array; invoke multiple times to iterate the entire array",
		"parameters": [{
			"name": "VAR",
			"type": "reference",
			"description": "The array to query, e.g. ^AR"
		}],
		"returns": {
			"type": "any"
		}
	},
	{
		"name": "$RANDOM",
		"type": "function",
		"abbreviation": "$R",
		"description": "Random number",
		"parameters": [{
			"name": "LIMIT",
			"type": "number",
			"description": "The generated random number will be between 0 (inclusive) and this LIMIT (exclusive)"
		}],
		"returns": {
			"type": "number"
		}
	},
	{
		"name": "$REVERSE",
		"type": "function",
		"abbreviation": "$RE",
		"description": "String in reverse order",
		"parameters": [{
			"name": "VALUE",
			"type": "string",
			"description": "A string to reverse"
		}],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$SELECT",
		"type": "function",
		"abbreviation": "$S",
		"description": "Value of first true argument",
		"parameters": [{
			"name": "TVEXPR",
			"type": "expression",
			"description": "An expression to test for truth, followed by a colon and a value, e.g. i=42:\"Answered!\""
		},
		{
			"name": "...",
			"type": "expression",
			"optional": true,
			"description": "Additional truth value expressions to test; the last expression often starts with 1: to avoid errors"
		}
		],
		"returns": {
			"type": "any"
		}
	},
	{
		"name": "$STACK",
		"type": "function",
		"abbreviation": "$ST",
		"description": "Returns information about the process stack",
		"parameters": [{
			"name": "LEVEL",
			"type": "number",
			"description": "-1: returns the highest stack level; 0: returns information about how the program was started; 1 to $STACK(-1): returns information about how the stack level was created"
		},
		{
			"name": "FIELD",
			"type": "string",
			"optional": true,
			"description": "\"MCODE\": the line of code that was executed; \"PLACE\": location of the executed code; \"ECODE\": the error code(s) added at the stack level, if any"
		}
		],
		"returns": {
			"type": "string|number"
		}
	},
	{
		"name": "$TEXT",
		"type": "function",
		"abbreviation": "$T",
		"description": "Returns the text of a line of M[UMPS] code",
		"parameters": [{
			"name": "REFERENCE",
			"type": "string",
			"description": "A reference to a code location, e.g. 'LABEL' or '+4^PROGRAM' or 'LABEL^PROGRAM', etc."
		}],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$TRANSLATE",
		"type": "function",
		"abbreviation": "$TR",
		"description": "Translate characters in a string",
		"parameters": [{
			"name": "VALUE",
			"type": "string",
			"description": "The value to translate"
		},
		{
			"name": "OLD",
			"type": "string",
			"description": "Characters in VALUE to replace"
		},
		{
			"name": "NEW",
			"type": "string",
			"optional": true,
			"description": "Characters to replace OLD characters with; if not provided then OLD characters will be removed"
		}
		],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$VIEW",
		"type": "function",
		"abbreviation": "$V",
		"description": "Implementation defined"
	},
	{
		"name": "$ZAHANDLE",
		"type": "function",
		"abbreviation": "$ZAH",
		"description": "Returns unique identifier for a name or an alias container",
		"parameters": [{
			"name": "VAR",
			"type": "reference",
			"description": "The variable to find the handle for e.g"
		}],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$ZASCII",
		"type": "function",
		"abbreviation": "$ZA",
		"description": "ASCII numeric code of a 8-bit character",
		"parameters": [{
			"name": "VALUE",
			"type": "string",
			"description": "A string to get a code from"
		},
		{
			"name": "POS",
			"type": "number",
			"optional": true,
			"description": "The 1-based position of the byte in VALUE; defaults to 1"
		}
		],
		"returns": {
			"type": "number"
		}
	},
	{
		"name": "$ZATRANSFORM",
		"type": "function",
		"abbreviation": "$ZATR",
		"description": "Returns the transformed representation of the first argument expr in a normalized form using the alternative transform specified by the second argument intexpr; the return can be used as an operand to the follows (]) or sorts-after (]]) operator such that, if both operands are in the normalized form, the result is independent of alternative collation.",
		"parameters": [{
			"name": "VALUE",
			"type": "string",
			"description": "String to transform"
		},
		{
			"name": "ID",
			"type": "Number",
			"optional": false,
			"description": "ID of the alternative transform to use"
		},
		{
			"name": "NORMALIZE",
			"type": "Number",
			"optional": true,
			"description": "whether the transform is to normalized form, by default or if zero (0), or, if one (1), the reverse transform from the normalized to the native form"
		},
		{
			"name": "MCOLLATION",
			"type": "Number",
			"optional": true,
			"description": "whether to use standard M collation of numbers before strings, the default or zero (0), or to sort all values as strings (1)"
		}
		],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$ZBITAND",
		"type": "function",
		"abbreviation": "$ZBITAND",
		"description": "Performs a logical AND function on two bit strings and returns a bit string equal in length to the shorter of the two arguments (containing set bits in those positions where both of the input strings have set bits). Positions corresponding to positions where either of the input strings have a cleared bit, also have cleared bits in the resulting string",
		"parameters": [{
			"name": "FIRSTEXPR",
			"type": "string",
			"description": "first expression"
		},
		{
			"name": "2NDEXPR",
			"type": "string",
			"optional": false,
			"description": "second expression"
		}
		],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$ZBITCOUNT",
		"type": "function",
		"abbreviation": "$ZBITCOUNT",
		"description": "Returns the number of ON bits in a bit string.",
		"parameters": [{
			"name": "EXPR",
			"type": "string",
			"description": "The expression specifies the bit string to examine"
		}],
		"returns": {
			"type": "number"
		}
	},
	{
		"name": "$ZBITFIND",
		"type": "function",
		"abbreviation": "$ZBITFIND",
		"description": "Performs the analog of $FIND() on a bit string. It returns an integer that identifies the position after the first position equal to a truth-valued expression that occurs at, or after, the specified starting position",
		"parameters": [{
			"name": "VALUE",
			"type": "string",
			"description": "The expression specifies the bit string to examine"
		},
		{
			"name": "TRUTHVALUE",
			"type": "Number",
			"optional": true,
			"description": "The truth-valued expression specifies the bit value for which $ZBITFIND() searches (1 or 0)"
		},
		{
			"name": "POS",
			"type": "Number",
			"optional": true,
			"description": "The optional integer argument specifies the starting position at which to begin the search"
		}
		],
		"returns": {
			"type": "number"
		}
	},
	{
		"name": "$ZBITGET",
		"type": "function",
		"abbreviation": "$ZBITGET",
		"description": "",
		"parameters": [{
			"name": "VALUE",
			"type": "string",
			"description": "The expression specifies the bit string to examine"
		},
		{
			"name": "POS",
			"type": "Number",
			"optional": false,
			"description": "The integer argument specifies the position in the string for which the value is requested"
		}
		],
		"returns": {
			"type": "number"
		}
	},
	{
		"name": "$ZBITLEN",
		"type": "function",
		"abbreviation": "$ZBITLEN",
		"description": "Returns the length of a bit string, in bits",
		"parameters": [{
			"name": "VALUE",
			"type": "string",
			"description": "The expression specifies the bit string to examine"
		}],
		"returns": {
			"type": "number"
		}
	},
	{
		"name": "$ZBITNOT",
		"type": "function",
		"abbreviation": "$ZBITNOT",
		"description": "Returns a copy of the bit string with each input bit position inverted",
		"parameters": [{
			"name": "VALUE",
			"type": "string",
			"description": "The expression specifies the bit string to invert"
		}],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$ZBITOR",
		"type": "function",
		"abbreviation": "$ZBITOR",
		"description": "Performs a bitwise logical OR on two bit strings, and returns a bit string equal in length to the longer of the two arguments (containing set bits in those positions where either or both of the input strings have set bits). Positions that correspond to positions where neither input string has a set bit have cleared bits in the resulting string",
		"parameters": [{
			"name": "FIRSTEXPR",
			"type": "string",
			"description": "first expression"
		},
		{
			"name": "2NDEXPR",
			"type": "string",
			"optional": false,
			"description": "second expression"
		}
		],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$ZBITSET",
		"type": "function",
		"abbreviation": "$ZBITSET",
		"description": "Returns an edited copy of the input bit string with a specified bit set to the value of the truth-valued expression",
		"parameters": [{
			"name": "VALUE",
			"type": "string",
			"description": "The expression specifies the input bit string"
		},
		{
			"name": "POS",
			"type": "Number",
			"optional": false,
			"description": "The integer expression specifies the position of the bit to manipulate. Arguments that are negative, zero, or exceed the length of the bit string produce a run-time error. $ZBIT functions count the first bit as position one (1)"
		},
		{
			"name": "TRUTHVALUE",
			"type": "Number",
			"optional": false,
			"description": "The truth-valued expression specifies the value to which to set the specified bit (0 or 1)"
		}
		],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$ZBITSTR",
		"type": "function",
		"abbreviation": "$ZBITSTR",
		"description": "Returns a bit string of a specified length with all bit positions initially set to either zero or one",
		"parameters": [{
			"name": "LENGTH",
			"type": "Number",
			"description": "The integer expression specifies the length of the bit string to return; arguments that exceed the maximum length of 253,952 produce a run-time error"
		},
		{
			"name": "TRUTHVALUE",
			"type": "Number",
			"optional": true,
			"description": "The optional truth-valued expression specifies the value to which all bit positions should initially be set (0 or 1). If this argument is missing, the bits are set to zero"
		}
		],
		"returns": {
			"type": "number"
		}
	},
	{
		"name": "$ZBITXOR",
		"type": "function",
		"abbreviation": "$ZBITXOR",
		"description": "Performs a bitwise exclusive OR on two bit strings, and returns a bit string equal in length to the shorter of the two arguments (containing set bits in those positions where either (but not both) of the input strings have set bits). Positions that correspond to positions where neither or both input strings have a set bit have cleared bits in the resulting string",
		"parameters": [{
			"name": "FIRSTEXPR",
			"type": "string",
			"description": "first expression"
		},
		{
			"name": "2NDEXPR",
			"type": "string",
			"optional": false,
			"description": "second expression"
		}
		],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$ZCHAR",
		"type": "function",
		"abbreviation": "$ZCH",
		"description": "Returns a string composed of bytes represented by the integer octet values specified in its argument(s).",
		"parameters": [{
			"name": "Integer",
			"type": "Number",
			"description": "The integer expression(s) specify the numeric byte value of the byte(s) $ZCHAR() returns"
		},
		{
			"name": "...",
			"type": "number",
			"optional": true,
			"description": "Additional codes to convert to characters"
		}
		],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$ZCOLLATE",
		"type": "function",
		"abbreviation": "$ZCO",
		"description": "Returns the transformed representation of the first argument glvn in a normalized form using the alternative transform specified by the second argument intexpr; the return can be used as an operand to the follows (]) or sorts-after (]]) operator such that, if both operands are in the normalized form, the result is independent of alternative collation.",
		"parameters": [{
			"name": "var",
			"type": "reference",
			"description": "The subscripted or unsubscripted global or local variable name specifies the key to transform"
		},
		{
			"name": "TransformId",
			"type": "number",
			"description": "Specifies the ID of the alternative transform to use"
		},
		{
			"name": "NormForm",
			"type": "number",
			"optional": true,
			"description": "Specifies whether the transform is to normalized form, by default or if zero (0), or, if one (1), the reverse transform from the normalized to the native form."
		}
		],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$ZCONVERT",
		"type": "function",
		"description": "Returns its first argument as a string or value converted to a different encoding or numeric base. The two argument form changes the encoding for case within the ASCII character set. The three argument form changes the encoding scheme or base. Supported bases are decimal 'DEC' and 'HEX', case insensitive).",
		"abbreviation": "$ZCO",
		"parameters": [{
			"name": "expr1",
			"type": "any",
			"description": "string or value to convert. $ZCONVERT() generates a run-time error if for Unicode conversion if the string contains a code-point value that is not in the character set, or for base conversion if the value to be converted is out of range"
		},
		{
			"name": "expr2",
			"type": "code",
			"description": "Specifies a code that determines the form of the result."
		},
		{
			"name": "expr3",
			"type": "code",
			"optional": true,
			"description": "Code that specifies the character set or base of the result"
		}
		],
		"returns": {
			"type": "string"
		}
	},
	{
		"name": "$ZDATA",
		"type": "function",
		"abbreviation": "$ZDATA",
		"description": "Extends $DATA() to reflect the current alias state of the lvn or name argument to identify alias and alias container variables. It treats variables joined through pass-by-reference as well as TP RESTART variables within a transaction as alias variables. However, it does not distinguish nodes having alias containers among their descendants.",
		"parameters": [{
			"name": "var",
			"type": "reference",
			"description": "Returns data about a variable: 0: if undefined, 1: if valued but has no descendants, 10: if has descendants but no value; 11: if has both a value and descendants; 100; 101; 111"
		}],
		"returns": {
			"type": "number"
		}
	},
	{
		"name": "$ZDATE",
		"type": "function",
		"description": "Returns a date and/or time formatted as text based on an argument formatted in the manner of $HOROLOG",
		"abbreviation": "$ZDATE",
		"parameters": [{
			"name": "expr1",
			"type": "any",
			"description": "$HOROLOG format of the date and/or time"
		},
		{
			"name": "expr2",
			"type": "string",
			"optional": true,
			"description": "Pattern of desired output p.e. 'YEAR-MM-DD'"
		},
		{
			"name": "expr3",
			"type": "string",
			"optional": true,
			"description": "Specifies a list of 12 month codes, separated by commas (,)"
		},
		{
			"name": "expr4",
			"type": "string",
			"optional": true,
			"description": "Specifies a list of seven day codes, separated by commas (,)"
		}
		],
		"returns": {
			"type": "string"
		}
	}, {
		"name": "$ZEXTRACT",
		"type": "function",
		"abbreviation": "$ZE",
		"description": "Returns a byte sequence from a given sequence of octets (8-bit bytes).",
		"parameters": [{
			"name": "expr1",
			"type": "any",
			"description": "Specifies a sequence of octets (8-bit bytes) from which $ZEXTRACT() derives a byte sequence"
		},
		{
			"name": "intexpr1",
			"type": "number",
			"optional": true,
			"description": "Specifies the starting byte position in the byte string"
		},
		{
			"name": "intexpr2",
			"type": "number",
			"optional": true,
			"description": "Specifies the ending byte position for the result"
		}
		],
		"returns": {
			"type": "string"
		}
	}, {
		"name": "$ZFIND",
		"type": "function",
		"abbreviation": "$ZF",
		"description": "Returns an integer byte position that locates the occurrence of a byte sequence within a sequence of octets(8-bit bytes).",
		"parameters": [{
			"name": "expr1",
			"type": "string",
			"description": "Specifies the sequence of octets (8-bit bytes) in which $ZFIND() searches for the byte sequence"
		},
		{
			"name": "expr2",
			"type": "string",
			"description": " specifies the byte sequence for which $ZFIND() searches"
		},
		{
			"name": "expr3",
			"type": "number",
			"optional": true,
			"description": "Identifies the starting byte position for the $ZFIND() search"
		}
		],
		"returns": {
			"type": "number"
		}
	}, {
		"name": "$ZGETJPI",
		"type": "function",
		"description": "Returns job or process information of the specified process",
		"abbreviation": "$ZGETJPI",
		"parameters": [{
			"name": "expr1",
			"type": "any",
			"description": "Identifies the PID of the target job. If expr1 is an empty string (“”), $ZGETJPI() returns information about the current process."
		},
		{
			"name": "expr2",
			"type": "string",
			"description": "Specifies the item keyword identifying the type of information returned"
		}
		],
		"returns": {
			"type": "string"
		}
	}, {
		"name": "$ZJOBEXAM",
		"type": "function",
		"description": "Returns the full specification of the file specified by the optional expr1 argument into which the function places a ZSHOW output specified by expr2",
		"abbreviation": "$ZJOBEXAM",
		"parameters": [{
			"name": "expr1",
			"type": "any",
			"description": "A template output device specification. It can be a device, a file directory, or a file name."
		},
		{
			"name": "expr2",
			"type": "",
			"optional": true,
			"description": "Defaulting to '*', expr2 specifies the ZSHOW Information Codes of data to be included in the output"
		}
		],
		"returns": {
			"type": "string"
		}
	}, {
		"name": "$ZJUSTIFY",
		"type": "function",
		"abbreviation": "$ZJ",
		"description": "",
		"parameters": [{
			"name": "expr1",
			"type": "any",
			"description": "The expression specifies the sequence of octets formatted by $ZJUSTIFY()."
		},
		{
			"name": "expr2",
			"type": "number",
			"description": "Specifies the minimum size of the resulting byte sequence."
		},
		{
			"name": "expr3",
			"type": "",
			"optional": true,
			"description": "The number of digits after the decimal point; providing this argument makes $ZJUSTIFY treat expr1 as a number"
		}
		],
		"returns": {
			"type": "string"
		}
	}, {
		"name": "$ZLENGTH",
		"abbreviation": "$ZL",
		"type": "function",
		"description": "Returns the length of a sequence of octets measured in bytes, or in “pieces” separated by a delimiter specified by one of its arguments",
		"parameters": [{
			"name": "expr1",
			"type": "any",
			"description": "Specifies the sequence of octets that $ZLENGTH() “measures”."
		},
		{
			"name": "expr2",
			"type": "number",
			"optional": true,
			"description": "specifies the delimiter that defines the measure; if this argument is missing, $ZLENGTH() returns the number of bytes in the sequence of octets."
		}
		],
		"returns": {
			"type": "string"
		}
	}, {
		"name": "$ZMESSAGE",
		"type": "function",
		"description": "Returns a message string associated with a specified status code .",
		"abbreviation": "ZM",
		"parameters": [{
			"name": "expr1",
			"type": "number",
			"description": "The integer expression specifies the status code for which $ZMESSAGE() returns error message text ."
		}],
		"returns": {
			"type": "string"
		}
	}, {
		"name": "$ZPARSE",
		"type": "function",
		"description": "Expands a file name to a full pathname and then returns the full pathname or one of its fields (directory, name, or extension).",
		"abbreviation": "$ZPARSE",
		"parameters": [{
			"name": "expr1",
			"type": "any",
			"description": "Specifies the file name; if the file name is not valid, $ZPARSE() returns a null string"
		},
		{
			"name": "expr2",
			"type": "string",
			"optional": true,
			"description": "Specifies the field of the pathname that $ZPARSE() returns"
		},
		{
			"name": "expr3",
			"type": "",
			"optional": true,
			"description": "Specify default values to use during file name expansion for missing fields (directory, name, or extension)"
		},
		{
			"name": "expr4",
			"type": "",
			"optional": true,
			"description": "Specify default values to use during file name expansion for missing fields (directory, name, or extension)"
		},
		{
			"name": "expr5",
			"type": "",
			"optional": true,
			"description": "Specifies the mode or type of parse that $ZPARSE() performs."
		}
		],
		"returns": {
			"type": "string"
		}
	}, {
		"name": "$ZPIECE",
		"abbreviation": "$ZPI",
		"type": "function",
		"description": "Return a sequence of bytes delimited by a specified byte sequence made up of one or more bytes.",
		"parameters": [{
			"name": "expr1",
			"type": "any",
			"description": "specifies the sequence of octets from which $ZPIECE() takes its result."
		},
		{
			"name": "expr2",
			"type": "string",
			"description": "Specifies the delimiting byte sequence that determines the piece 'boundaries'"
		},
		{
			"name": "expr3",
			"type": "",
			"optional": true,
			"description": "Specifies the beginning piece to return"
		},
		{
			"name": "expr4",
			"type": "",
			"optional": true,
			"description": "Specifies the last piece to return"
		}
		],
		"returns": {
			"type": "string"
		}
	}, {
		"name": "$ZPREVIOUS",
		"abbreviation": "$ZP",
		"type": "function",
		"description": "Returns the subscript of the previous local or global variable name in collation sequence within the array level specified by its argument.",
		"parameters": [{
			"name": "glvn",
			"type": "reference",
			"description": "Specifies the node prior to which $ZPREVIOUS() searches backwards for a defined node with data and/or descendants."
		}],
		"returns": {
			"type": "string"
		}
	}, {
		"name": "$ZQGBLMOD",
		"type": "function",
		"description": "Enables an application to determine whether it can safely apply a lost transaction to the database.",
		"abbreviation": "$ZQGBLMOD",
		"parameters": [{
			"name": "gvn",
			"type": "reference",
			"description": "The subscripted or non-subscripted global variable name (gvn) specifies the target node."
		}],
		"returns": {
			"type": "boolean"
		}
	}, {
		"name": "$ZSEARCH",
		"type": "function",
		"description": "Attempts to locate a file matching the specified file name. If the file exists, it returns the file name; if the file does not exist, it returns the null string.",
		"abbreviation": "$ZSEARCH",
		"parameters": [{
			"name": "expr1",
			"type": "any",
			"description": "Contains a file name, with or without wildcards, for which $ZSEARCH() attempts to locate a matching file."
		},
		{
			"name": "expr2",
			"type": "number",
			"optional": true,
			"description": "Specifies an integer expression that is a stream number. It can be any value from 0 to 255 for each search"
		}
		],
		"returns": {
			"type": "string"
		}
	}, {
		"name": "$ZSIGPROC",
		"type": "function",
		"description": "Sends a signal to a process. The format for the $ZSIGPROC function is",
		"abbreviation": "$ZSIGPROC",
		"parameters": [{
			"name": "expr1",
			"type": "number",
			"description": "The pid of the process to which the signal is to be sent."
		},
		{
			"name": "expr2",
			"type": "string",
			"description": "The system signal name (e.g., 'SIGUSR1' or just 'USR1')."
		}
		],
		"returns": {
			"type": "string"
		}
	}, {
		"name": "$ZSOCKET",
		"type": "function",
		"description": "Returns information about a SOCKET device and its attached sockets",
		"abbreviation": "$ZSOCKET",
		"parameters": [{
			"name": "expr1",
			"type": "any",
			"description": "Specifies the SOCKET device name"
		},
		{
			"name": "expr2",
			"type": "string",
			"description": "Specifies a keyword identifying the type of information returned"
		},
		{
			"name": "expr3",
			"type": "number",
			"optional": true,
			"description": "Specifies the index (starting at zero) of a socket attached to the device"
		},
		{
			"name": "expr4",
			"type": "string",
			"optional": true,
			"description": "Specifies an individual delimiter when the second expression specifies DELIMITER."
		}
		],
		"returns": {
			"type": "string"
		}
	}
	];
