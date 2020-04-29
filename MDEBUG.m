MDEBUG  			;Debugging Routine for M by Jens Wulf
	;License: LGPL
	W "Debugger starts!",!
	S $ZSTEP="ZSHOW ""VIS"":^%MDEBUG($J) S %STEP=$$WAIT^MDEBUG($ZPOS) ZST:%STEP=""I"" INTO ZST:%STEP=""O"" OVER ZST:%STEP=""F"" OUTOF ZC:%STEP=""C"""
	D INIT
	F  S %STEP=$$WAIT("") Q:%STEP["^"
	D RELINK(%STEP)
	Q
RELINK(%PROG)			;LINK Sourcefile again and Start over
	S %PROGNAME=%PROG
	K (%PROGNAME)
	ZGOTO 1:RELINK1
RELINK1				;Entry after Stack-Clearance
	D REFRESHBP
	ZLINK $TR(%PROGNAME,"^")
	D BPRESET
	D @%PROGNAME X $ZSTEP
	Q
INIT    			;Open TCP-Communication-Port
	N %IO,%DEV,%PORT,%SOCKET,%ZTFORM
	;J REFRESHALLLABELS
	S %IO=$I,%PORT=9000,%DEV="|TCP|"_%PORT_"|"_$J
	O %DEV:(ZLISTEN=%PORT_":TCP":NODELIMITER:ATTACH="listener")::"SOCKET"
	E  Q
	U %DEV
	W /LISTEN(1)
	; wait for connection, $KEY will be "CONNECT|socket_handle|remote_ipaddress"
	F  W /WAIT Q:$KEY]""
	S %SOCKET=$P($KEY,"|",2)
	KILL ^%MDEBUG($J)
	S ^%MDEBUG($J,"SOCKET")=%SOCKET
	S ^%MDEBUG($J,"DEV")=%DEV
	D OUT("Debugger connected")
	S:$ZTRAP="B" $ZTRAP=$ZSTEP
	S $ZSTATUS=""
	U %IO
	Q
WAIT(%ZPOS)   			;Wait for next Command from Editor
	N %DEV,%IO,%CMD,%ACTION,%CMDS,%CMDLINE,%SOCKET,%LABEL,%I,%VAR
	S %CMDS="START;QUIT;EXIT;INTO;OUTOF;OVER;CONTINUE;SETBP;VARS;INTERNALS;CLEARBP;REQUESTBP;RESET;GETVAR;ERRCHK;RESTART;GETHINT"
	S %IO=$I
	S %DEV=^%MDEBUG($J,"DEV"),%SOCKET=^%MDEBUG($J,"SOCKET")
	U %DEV:(SOCKET=%SOCKET:DELIM=$C(10))
	I %ZPOS[("^"_$T(+0)) W "***ENDPROGRAM",! G RESET
	S:$ZTRAP="B" $ZTRAP=$ZSTEP
	W "***STARTVAR",!
	S %I="" F  S %I=$O(^%MDEBUG($J,"I",%I)) Q:%I=""  S %VAR=^%MDEBUG($J,"I",%I) S:%VAR[$C(10) %VAR=$$MTR(VAR,$C(10),"_$C(10)_") W "I:",%VAR,!
	S %I="" F  S %I=$O(^%MDEBUG($J,"V",%I)) Q:%I=""  S %VAR=^%MDEBUG($J,"V",%I) S:%VAR[$C(10) %VAR=$$MTR(VAR,$C(10),"_$C(10)_") W "V:",%VAR,!
	S %I="" F  S %I=$O(^%MDEBUG($J,"S",%I)) Q:%I=""  S %VAR=^%MDEBUG($J,"S",%I) W "S:",%VAR,!
	W "***ENDVAR",!
READLOOP			;Wait for next Command from Editor
	U %DEV:(SOCKET=%SOCKET:DELIM=$C(10))
	F  R %CMDLINE S %CMD=$P(%CMDLINE,";",1) Q:$P(%CMD,";",1)'=""&(%CMDS[$TR(%CMD,";"))
	;D OUT(%CMDLINE)
	I %CMD="REQUESTBP" W "***STARTBP",! ZSHOW "B" W "***ENDBP",! G READLOOP
	I %CMD="GETVAR" D GETVAR($P(%CMDLINE,";",2,999)) G READLOOP
	I %CMD="GETHINT" D GETHINT($P(%CMDLINE,";",2)) G READLOOP
	I %CMD="SETBP" D SETBP($P(%CMDLINE,";",2),$P(%CMDLINE,";",3)) G READLOOP
	I %CMD="CLEARBP" D CLEARBP($P(%CMDLINE,";",2),$P(%CMDLINE,";",3)) G READLOOP
	I %CMD="RESET" G RESET
	I %CMD="ERRCHK" D ERRCHK G READLOOP
	U %IO
	I %CMD="INTO" Q:$D(^%MDEBUG($J,"BP",$$POSCONV(%ZPOS))) "O" Q "I"
	Q:%CMD="INTO" "I"
	Q:%CMD="OUTOF" "F"
	Q:%CMD="OVER" "O"
	Q:%CMD="CONTINUE" "C"
	Q:%CMD="START"&(%CMDLINE'["/"&(%CMDLINE'["\")) $P(%CMDLINE,";",2)
	Q:%CMD="START" "^"_$$RNAME($P(%CMDLINE,";",2))
	D:%CMD="RESTART" RELINK("^"_$$RNAME($P(%CMDLINE,";",2)))
	I %CMD="EXIT"!(%CMD="QUIT") KILL ^%MDEBUG($J) C %DEV HALT
	;Shouldn't get here
	HALT
SETBP(FILE,LINE)        	;Set Breakpoint
	N ROUTINE,ZBPOS,ZBCMD,IO,BP,$ZTRAP
	S IO=$I
	I FILE'["/"&(FILE'["\") S ZBPOS=$P($P(FILE,"^",1)_"+"_LINE_"^"_$P(FILE,"^",2),"(",1)
	E  S ROUTINE=$$RNAME(FILE) Q:ROUTINE=""  S ZBPOS="+"_LINE_"^"_ROUTINE
	S ZBCMD="ZB "_ZBPOS_":""ZSHOW """"VIS"""":^%MDEBUG($J) S %STEP=$$WAIT^MDEBUG($ZPOS) ZST:%STEP=""""I"""" INTO ZST:%STEP=""""O"""" OVER ZST:%STEP=""""F"""" OUTOF ZC:%STEP=""""C""""  H:%STEP=""""H"""""""
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
GETHINT(PART)			;Send Label-Suggestions to Editor
	W "***STARTHINTS",!
	I PART'="" S SEARCH=PART D
	. F  S SEARCH=$O(^%MDEBUG("LABELS",SEARCH)) Q:SEARCH=""!($E(SEARCH,1,$L(PART))'=PART)  D
	. . W SEARCH,";",^%MDEBUG("LABELS",SEARCH),!
	. I $E(PART,1)="^" S SEARCH=PART D
	. . F  S SEARCH=$O(^%MDEBUG("ROUTINES",SEARCH)) Q:SEARCH=""!($E(SEARCH,1,$L(PART))'=PART)  D
	. . . S LABEL="" F  S LABEL=$O(^%MDEBUG("ROUTINES",SEARCH,LABEL)) Q:LABEL=""  D
	. . . . W LABEL,";",$G(^%MDEBUG("LABELS",LABEL)),!
	W "***ENDHINTS",!
	Q
RESET   			;Clean up and wait for new Connection
	KILL ^%MDEBUG($J)
	C %DEV
	ZGOTO 1:MDEBUG
	Q
REFRESHBP       		;Remember Breakpoint-Positions to avoid Collisions between ZSTEP INTO and ZBREAK
	N BP
	ZSHOW "B":^%MDEBUG($J)
	KILL ^%MDEBUG($J,"BP")
	S BP="" F  S BP=$O(^%MDEBUG($J,"B",BP)) Q:BP=""  D
	.S ^%MDEBUG($J,"BP",^%MDEBUG($J,"B",BP))=""
	KILL ^%MDEBUG($J,"B")
	Q
BPRESET				;Set BPs again after Recompile
	N BP,ZBCMD
	ZB -*
	S BP="" F  S BP=$O(^%MDEBUG($J,"BP",BP)) Q:BP=""  D
	.S ZBCMD="ZB "_BP_":""ZSHOW """"VIS"""":^%MDEBUG($J) S %STEP=$$WAIT^MDEBUG($ZPOS) ZST:%STEP=""""I"""" INTO ZST:%STEP=""""O"""" OVER ZST:%STEP=""""F"""" OUTOF ZC:%STEP=""""C""""  H:%STEP=""""H"""""""
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
	D GETROUTINELIST(.RLIST)
	Q:'$D(RLIST)
	S FILE="" F  S FILE=$O(RLIST(FILE)) Q:FILE=""  D
	. S ROUTINE=$$RNAME(FILE)
	. S DATE=RLIST(FILE)
	. I '$D(^%MDEBUG("ROUTINES",ROUTINE)) D REFRESHLABELS(FILE) S ^%MDEBUG("ROUTINES",ROUTINE,"***DATE")=DATE Q
	. Q:DATE'>^%MDEBUG("ROUTINES",ROUTINE,"***DATE")
	. D REFRESHLABELS(FILE) S ^%MDEBUG("ROUTINES",ROUTINE,"***DATE")=DATE
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
	.O DEV:(COMMMAND=CMD:READONLY)::"PIPE" U DEV
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