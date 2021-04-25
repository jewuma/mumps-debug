MDEBUG  ;Debugging Routine for GT.M/YottaDB by Jens Wulf
	;Version 0.8.1
	;2021-04-25
	;License: LGPL
	;Usage on your own Risk - No garanties
	;
	;
	;Do Initialization and start Loop to Wait for Debugger-Commands
	S $ZSTEP="ZSHOW ""VIS"":^%MDEBUG($J,""VARS"") S %STEP=$$WAIT^MDEBUG($ZPOS) ZST:%STEP=""I"" INTO ZST:%STEP=""O"" OVER ZST:%STEP=""F"" OUTOF ZC:%STEP=""C"""
	D INIT
	F  S %STEP=$$WAIT("") Q:%STEP["^"
	;Relink and recognize Source-Changes
	D RELINK(%STEP)
	Q
RELINK(%PROG)			;LINK Sourcefile again and Start over
	S %PROGNAME=%PROG
	K (%PROGNAME)		;Clean-Up Variables
	ZGOTO 1:RELINK1		;Clean-Up Stack
RELINK1				;Entry after Stack-Clearance
	D REFRESHBP		;Remember Breakpoints
	I $P(%PROGNAME,"^",2)=$T(+0) G ENDPROGRAM	;Debugging of this Program not possible
	ZLINK $TR(%PROGNAME,"^")
	D BPRESET		;Set Breakpoints again after Relink
	D @%PROGNAME X $ZSTEP	;Start Program and get back into Wait-Loop
	Q
INIT    			;Open TCP-Communication-Port
	N %IO,%DEV,%PORT,%SOCKET,%ZTFORM
	USE $P:(EXCEPTION="D BYE":CTRAP=$C(3))	;Ensure Clean-Up when Ctrl-C is pressed
	S %IO=$I,%PORT=9000,%DEV="|TCP|"_%PORT_"|"_$J
	O %DEV:(ZLISTEN=%PORT_":TCP":NODELIMITER:ATTACH="listener"):5:"SOCKET"
	E  U 0 W "DEBUG-Port could not be opened.",! HALT
	U %DEV
	W /LISTEN(1)
	; wait for connection, $KEY will be "CONNECT|socket_handle|remote_ipaddress"
	F  W /WAIT Q:$KEY]""
	S %SOCKET=$P($KEY,"|",2)
	KILL ^%MDEBUG($J)
	S ^%MDEBUG($J,"SOCKET")=%SOCKET
	S ^%MDEBUG($J,"DEV")=%DEV
	D OUT("Debugger connected")
	;If there's no explicit Error-Handling show Errors in Debugger
	S:$ZTRAP="B" $ZTRAP=$ZSTEP
	S $ZSTATUS=""
	;Set IO back to origin IO
	U %IO
	Q
WAIT(%ZPOS)   			;Wait for next Command from Editor
	N %DEV,%IO,%CMD,%ACTION,%CMDS,%CMDLINE,%SOCKET,%LABEL,%I,%VAR,%MI
	;possible Debugger-Commands
	S %CMDS="START;QUIT;EXIT;INTO;OUTOF;OVER;CONTINUE;SETBP;VARS;INTERNALS;CLEARBP;REQUESTBP;RESET;GETVAR;ERRCHK;RESTART;GETHINT"
	S %IO=$I
	S %DEV=^%MDEBUG($J,"DEV"),%SOCKET=^%MDEBUG($J,"SOCKET")
	U %DEV:(SOCKET=%SOCKET:DELIM=$C(10):EXCEPTION="HALT")
	S:$ZTRAP="B" $ZTRAP=$ZSTEP	;Error-Handling by Debugger if not set by Debuggee
	;D OUT(%ZPOS_" "_$J_" "_^%MDEBUG($J,"DEV"))
	I %ZPOS[("^"_$T(+0))&($ZSTATUS'="") D   ;Prevent Debugger from jumping into this Program
	. S %I="" F  S %I=$O(^%MDEBUG($J,"VARS","I",%I)) Q:%I=""  D
	. . S %VAR=^%MDEBUG($J,"VARS","I",%I) S:$E(%VAR,1,10)="$ZPOSITION" %MI=%I
	. . S:$E(%VAR,1,8)="$ZSTATUS" ^%MDEBUG($J,"VARS","I",%MI)="$ZPOSITION="""_$P(%VAR,",",2)_""""
	I $D(^%MDEBUG($J,"VARS","I")) D	;Sending internal, local Variables and Stack to Debugger
	.W "***STARTVAR",!
	.;D OUT("Sending Vars")
	.S %I="" F  S %I=$O(^%MDEBUG($J,"VARS","I",%I)) Q:%I=""  S %VAR=^%MDEBUG($J,"VARS","I",%I) S:%VAR[$C(10) %VAR=$$MTR(VAR,$C(10),"_$C(10)_") W "I:",%VAR,!
	.S %I="" F  S %I=$O(^%MDEBUG($J,"VARS","V",%I)) Q:%I=""  S %VAR=^%MDEBUG($J,"VARS","V",%I) S:%VAR[$C(10) %VAR=$$MTR(VAR,$C(10),"_$C(10)_") W "V:",%VAR,!
	.S %I="" F  S %I=$O(^%MDEBUG($J,"VARS","S",%I)) Q:%I=""  S %VAR=^%MDEBUG($J,"VARS","S",%I) W:%VAR'[("^"_$T(+0)) "S:",%VAR,!
	.W "***ENDVAR",!
READLOOP			;Wait for next Command from Editor
	U %DEV:(SOCKET=%SOCKET:DELIM=$C(10))
	F  R %CMDLINE S %CMD=$P(%CMDLINE,";",1) Q:$P(%CMD,";",1)'=""&(%CMDS[$TR(%CMD,";"))
	;D OUT(%CMDLINE)
	I %CMD="REQUESTBP" W "***STARTBP",! ZSHOW "B" W "***ENDBP",! G READLOOP	;Transmit Breakpoints to Debugger
	I %CMD="GETVAR" D GETVAR($P(%CMDLINE,";",2,999)) G READLOOP	;Transmit Variables
	I %CMD="GETHINT" D GETHINT($P(%CMDLINE,";",2)) G READLOOP	;Get Hints for Label-Completion
	I %CMD="SETBP" D SETBP($P(%CMDLINE,";",2),$P(%CMDLINE,";",3)) G READLOOP	;Set a new Breakpoint
	I %CMD="CLEARBP" D CLEARBP($P(%CMDLINE,";",2),$P(%CMDLINE,";",3)) G READLOOP	;Clear a Breakpoint
	I %CMD="RESET" G RESET						; Reset States and wait for a new Connection
	I %CMD="ERRCHK" D ERRCHK G READLOOP				; Check following Lines if it's legal Mumps-Code
	U %IO
	I %CMD="INTO" Q:$D(^%MDEBUG($J,"BP",$$POSCONV(%ZPOS))) "O" Q "I"	;Prevent Double-Stop if it's ZSTEP INTO and Breakpoint
	Q:%CMD="INTO" "I"
	Q:%CMD="OUTOF" "F"
	Q:%CMD="OVER" "O"
	Q:%CMD="CONTINUE" "C"
	Q:%CMD="START"&(%CMDLINE'["/"&(%CMDLINE'["\")) $P(%CMDLINE,";",2)	;Start M-Program when in Format ^Routine
	Q:%CMD="START" "^"_$$RNAME($P(%CMDLINE,";",2))				;Start M-Program when given as File-Path
	D:%CMD="RESTART" RELINK("^"_$$RNAME($P(%CMDLINE,";",2)))		;Do a new Link and start over
	I %CMD="EXIT"!(%CMD="QUIT") G BYE					;End of Debugging
	;Shouldn't get here
	HALT
BYE	;Clean Up and end Program
	S %DEV=$G(^%MDEBUG($J,"DEV"))
	C:%DEV'="" %DEV
	K ^%MDEBUG($J)
	H
SETBP(FILE,LINE)        	;Set Breakpoint
	N ROUTINE,ZBPOS,ZBCMD,IO,BP,$ZTRAP
	S IO=$I
	I FILE'["/"&(FILE'["\") S ZBPOS=$P($P(FILE,"^",1)_"+"_LINE_"^"_$P(FILE,"^",2),"(",1)
	E  S ROUTINE=$$RNAME(FILE) Q:ROUTINE=""  S ZBPOS="+"_LINE_"^"_ROUTINE
	Q:ZBPOS[("^"_$T(+0))
	S ZBCMD="ZB "_ZBPOS_":""ZSHOW """"VIS"""":^%MDEBUG($J,""""VARS"""") S %STEP=$$WAIT^MDEBUG($ZPOS) ZST:%STEP=""""I"""" INTO ZST:%STEP=""""O"""" OVER ZST:%STEP=""""F"""" OUTOF ZC:%STEP=""""C""""  H:%STEP=""""H"""""""
	D REFRESHBP
	U IO
	S $ZTRAP="B"
	X ZBCMD
	Q
CLEARBP(FILE,LINE)      	;Clear Breakpoint
	N ROUTINE,ZBPOS,BP
	S ROUTINE=$$RNAME(FILE)
	I ROUTINE="" ZB -* D REFRESHBP Q     ;Clear all Breakpoints
	IF LINE="" D  Q
	.D REFRESHBP
	.S BP="" F  S BP=$O(^%MDEBUG($J,"BP",BP)) Q:BP=""  D
	..I BP[("^"_ROUTINE) S ZBPOS="-"_BP ZB @ZBPOS
	.D REFRESHBP
	S ZBPOS="-+"_LINE_"^"_ROUTINE
	ZB:$T(@$E(ZBPOS,2,99))'="" @ZBPOS
	D REFRESHBP
	Q
GETVAR(%VARNAME)		;Get Variable-Content an pass it to Editor
	N $ZT
	S $ZT="G GETVAR1^"_$T(+0)
	W "***SINGLEVAR",!
	W $NA(@%VARNAME),!
	W "***SINGLEVARCONTENT",!
	W $G(@%VARNAME),!
GETVAR1				;Continue-Label if something fails
	W "***SINGLEEND",!
	Q
ENDPROGRAM			;Stop the Debugge and wait for new Debugger-Connection
	N %DEV
	S %DEV=$G(^%MDEBUG($J,"DEV")),%SOCKET=$G(^%MDEBUG($J,"SOCKET"))
	I %DEV'="" D
	.U %DEV:(SOCKET=%SOCKET:DELIM=$C(10))
	.W "***ENDPROGRAM",!
	D RESET
	Q
RESET   			;Clean up and wait for new Connection
	S %DEV=$G(^%MDEBUG($J,"DEV"))
	KILL ^%MDEBUG($J,"VARS")
	C:%DEV'="" %DEV
	ZGOTO 1:MDEBUG
	Q
REFRESHBP       		;Remember Breakpoint-Positions to avoid Collisions between ZSTEP INTO and ZBREAK
	N BP,BPS
	ZSHOW "B":BPS
	KILL ^%MDEBUG($J,"BP")
	S BP="" F  S BP=$O(BPS("B",BP)) Q:BP=""  D
	.S ^%MDEBUG($J,"BP",BPS("B",BP))=""
	Q
BPRESET				;Set BPs again after Recompile
	N BP,ZBCMD
	ZB -*
	S BP="" F  S BP=$O(^%MDEBUG($J,"BP",BP)) Q:BP=""  D
	.S ZBCMD="ZB "_BP_":""ZSHOW """"VIS"""":^%MDEBUG($J,""""VARS"""") S %STEP=$$WAIT^MDEBUG($ZPOS) ZST:%STEP=""""I"""" INTO ZST:%STEP=""""O"""" OVER ZST:%STEP=""""F"""" OUTOF ZC:%STEP=""""C""""  H:%STEP=""""H"""""""
	.X ZBCMD
	D REFRESHBP
	Q
POSCONV(ZPOS)			;Convert Position in Form LABEL+n^ROUTINE TO +m^ROUTINE
	Q:$E(ZPOS,1)="+" ZPOS
	N OFFSET,LINE,LABEL,ROUTINE,LABELLEN,I
	S LABEL=$P(ZPOS,"+",1)
	I LABEL["^" S LABEL=$P(LABEL,"^",1),OFFSET=0
	E  S OFFSET=+$P(ZPOS,"+",2)
	S ROUTINE=$P(ZPOS,"^",2),LABELLEN=$L(LABEL)
	F I=1:1 Q:$E($T(@("+"_I_"^"_ROUTINE)),1,LABELLEN)=LABEL
	Q "+"_(I+OFFSET)_"^"_ROUTINE
RNAME(FILE)			;Get Routinename from filename
	S FILE=$TR(FILE,"\","/")
	S:$P(FILE,".",$L(FILE,"."))'="m" FILE=""
	Q $TR($P($P(FILE,"/",$L(FILE,"/")),".",1),"_","%")
OUT(VAR)			;DEBUG-Output
	N IO
	S IO=$I
	U 0
	W VAR,!
	U IO
	Q
MTR(VAR,SUCH,ERSETZ)		;Replace one Char in String by several chars
	Q:SUCH="" VAR
	N POS
	S POS=0
	F  S POS=$F(VAR,SUCH,POS) Q:POS=0  D
	.S POS=POS-$L(SUCH)
	.S VAR=$E(VAR,1,POS-1)_ERSETZ_$E(VAR,POS+$L(SUCH),$L(VAR))
	.S POS=POS+$L(ERSETZ)
	Q VAR
ERRCHK()        		;Read Lines and try to Compile
	N LINE,LINES,I,RESULT
	F I=10000:1 R LINE:5 Q:'$T  Q:LINE="***ENDPROGRAM"  D
	.S LINES(I)=LINE
	W "***BEGINERRCHK",!
	D LINECOMPILE(.LINES,.RESULT)
	S I="" F  S I=$O(RESULT(I)) Q:I=""  W RESULT(I),!
	W "***ENDERRCHK",!
	Q
LINECOMPILE(LINES,RESULT)	;Create temporary Mumps-File from given lines
	; Result is passed by Reference and gives back: Array of Column;Line;Error-Message
	N LINE,LINENR,DEV,IO
	S IO=$I
	S DEV="/tmp/tmpmumpsprog"_$J_".m"
	O DEV U DEV
	S LINENR="" F  S LINENR=$O(LINES(LINENR)) Q:LINENR=""  D
	.W LINES(LINENR),!
	C DEV
	D TESTCOMPILE(DEV,.RESULT)
	O DEV C DEV:DELETE
	U IO
	Q
TESTCOMPILE(FILE,RESULT)       	;Compile FILE (no Object File created and return possible Errors in .RESULT
	N IO,PIPE,I
	S IO=$IO
	S PIPE="PIPE"
	KILL RESULT
	O PIPE:(shell="/bin/bash":command="$gtm_dist/mumps -noobject "_FILE_" && echo '***READY'":readonly)::"PIPE"
	U PIPE
	S I=1000
	F  Q:$ZEOF  R LINE Q:LINE="***READY"  D
	.I $E(LINE,1,12)=($C(9,9)_"At column ") S RESULT(I)=$P($P(LINE,"At column ",2),",",1)_";"_$P($P(LINE,"line ",2),",",1)_";"
	.I $E(LINE,1,4)="%YDB"!($E(LINE,1,4)="%GTM") S:$G(RESULT(I))="" RESULT(I)=";;" S RESULT(I)=RESULT(I)_LINE,I=I+1
	C PIPE
	U IO
	Q
	;
REFRESHALLLABELS		;Refresh all Labels in Debug Database
	N RLIST,FILE,ROUTINE,DATE
	L +^%MDEBUG("ROUTINES"):1 E  QUIT	;The Refresh should start once only
	D GETROUTINELIST(.RLIST)
	Q:'$D(RLIST)
	S FILE="" F  S FILE=$O(RLIST(FILE)) Q:FILE=""  D
	. S ROUTINE=$$RNAME(FILE)
	. S DATE=RLIST(FILE)
	. I '$D(^%MDEBUG("ROUTINES",ROUTINE)) D REFRESHLABELS(FILE) S ^%MDEBUG("ROUTINES",ROUTINE,"***DATE")=DATE Q
	. Q:DATE'>^%MDEBUG("ROUTINES",ROUTINE,"***DATE")
	. D REFRESHLABELS(FILE) S ^%MDEBUG("ROUTINES",ROUTINE,"***DATE")=DATE
	L -^%MDEBUG("ROUTINES")
	QUIT
	;
REFRESHLABELS(FILE)		;Refresh all Labels of the given .m-file
	N ROUTINE,LABELS,LABEL
	S ROUTINE=$$RNAME(FILE)
	Q:ROUTINE=""
	I $D(^%MDEBUG("ROUTINES",ROUTINE)) D
	.S LABEL="" F  S LABEL=$O(^%MDEBUG("ROUTINES",ROUTINE,LABEL)) Q:LABEL=""  D
	..KILL ^%MDEBUG("LABELS",LABEL_"^"_ROUTINE)
	..KILL ^%MDEBUG("ROUTINES",ROUTINE,LABEL)
	D GETLABELS(FILE,.LABELS)
	S LABEL="" F  S LABEL=$O(LABELS(LABEL)) Q:LABEL=""  D
	. S ^%MDEBUG("ROUTINES",ROUTINE,LABEL_"^"_ROUTINE)=""
	. S ^%MDEBUG("LABELS",LABEL_"^"_ROUTINE)=LABELS(LABEL)
	;
	Q
GETALLLABELS(LABELLIST)		;Get all Labels in all routines
	KILL LABELLIST
	N LIST,FILE,RNAME,LINE,CHAR,LABEL,I
	D GETROUTINELIST(.LIST)
	S FILE="" F  S FILE=$O(LIST(FILE)) Q:FILE=""  D
	.D GETLABELS(FILE,.LABELS)
	Q
GETLABELS(FILE,LABELS)		;Get all Labels from a single M-File
	N LINE,LABEL,I,CHAR
	KILL LABELS
	O FILE:READONLY U FILE
	F  Q:$ZEOF  R LINE D
	.Q:$E(LINE)=" "!($E(LINE)=$C(9))!(LINE="")
	.S LABEL=$E(LINE)
	.F I=2:1:32 S CHAR=$E(LINE,I) Q:CHAR=""!(CHAR="(")!(CHAR=" ")!(CHAR=";")!(CHAR=$C(9))  S LABEL=LABEL_CHAR
	.S LABELS(LABEL)=$E(LINE,1,250)
	C FILE
	Q
	;
GETROUTINELIST(LIST)		;Get Routinenames and there last Change-Date
	N DIRS,J,CMD,DEV,ZEILE,NAME,TIME
	D PARSEZRO(.DIRS)
	KILL LIST
	S J="" F  S J=$O(DIRS(J)) Q:J=""  D
	.S DEV="PIPE",CMD=" ls -l --time-style=+""%Y%M%d %H%M%S"" "_DIRS(J)_"/*.m -gG"
	.O DEV:(COMMAND=CMD:READONLY)::"PIPE" U DEV
	.F  R ZEILE Q:$DEVICE  D
	..S TIME=$E(ZEILE,22,36)
	..S NAME=$E(ZEILE,38,999)
	..S LIST(NAME)=TIME
	.C DEV
	Q
PARSEZRO(DIR) 			;GET all Sourcedirectories
	N ZRO,PIECE,I,CNT
	S ZRO=$ZROUTINES
	S CNT=1
	KILL DIR
	F  Q:($E(ZRO)'=" ")  S ZRO=$E(ZRO,2,999)
	F I=1:1:$L(ZRO," ") S PIECE=$P(ZRO," ",I) D
	.Q:$P(PIECE,".",2)="so"
	.Q:$P(PIECE,".",2)="o"
	.I PIECE["(" S DIR(CNT)=$P($P(PIECE,"(",2),")",1)
	.E  S DIR(CNT)=PIECE
	.S CNT=CNT+1
	QUIT
	;