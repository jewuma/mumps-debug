MDEBUG  ;Debugging Routine for M by Jens Wulf
	;License: LGPL
	S $ZSTEP="ZSHOW ""VIS"":^%MDEBUG($J) S %STEP=$$WAIT^MDEBUG($ZPOS) ZST:%STEP=""I"" INTO ZST:%STEP=""O"" OVER ZST:%STEP=""F"" OUTOF ZC:%STEP=""C"""
	D INIT
RESTART ;
	F  S %STEP=$$WAIT("") Q:%STEP["^"
	D @%STEP X $ZSTEP
	Q
INIT    ;Open TCP-Communication-Port
        N %IO,%DEV,%PORT,%SOCKET,%ZTFORM
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
	S:$ZTRAP="B" $ZTRAP=$ZSTEP
	S $ZSTATUS=""
	U %IO
	Q
WAIT(%ZPOS)   	;Wait for next Command from Editor
        N %DEV,%IO,%CMD,%ACTION,%CMDS,%CMDLINE,%SOCKET,%LABEL,%I,%VAR
        S %CMDS="START;QUIT;EXIT;INTO;OUTOF;OVER;CONTINUE;SETBP;VARS;INTERNALS;CLEARBP;REQUESTBP;RESET;GETVAR"
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
READLOOP	;Wait for next Command from Editor
	U %DEV:(SOCKET=%SOCKET:DELIM=$C(10))
        F  R %CMDLINE S %CMD=$P(%CMDLINE,";",1) Q:$P(%CMD,";",1)'=""&(%CMDS[$TR(%CMD,";"))
	I %CMD="REQUESTBP" W "***STARTBP",! ZSHOW "B" W "***ENDBP",! G READLOOP
	I %CMD="GETVAR" D GETVAR($P(%CMDLINE,";",2,999)) G READLOOP
        I %CMD="SETBP" D SETBP($P(%CMDLINE,";",2),$P(%CMDLINE,";",3)) G READLOOP
        I %CMD="CLEARBP" D CLEARBP($P(%CMDLINE,";",2),$P(%CMDLINE,";",3)) G READLOOP
	I %CMD="RESET" G RESET
        U %IO
        I %CMD="INTO" Q:$D(^%MDEBUG($J,"BP",$$POSCONV(%ZPOS))) "O" Q "I"
        Q:%CMD="INTO" "I"
	Q:%CMD="OUTOF" "F"
	Q:%CMD="OVER" "O"
        Q:%CMD="CONTINUE" "C"
	Q:%CMD="START" "^"_$$RNAME($P(%CMDLINE,";",2))
        I %CMD="EXIT"!(%CMD="QUIT") KILL ^%MDEBUG($J) C %DEV HALT
	;Shouldn't get here
        HALT
SETBP(FILE,LINE)        ;Set Breakpoint
        N ROUTINE,ZBPOS,ZBCMD,IO,BP
	S IO=$I
        S ROUTINE=$$RNAME(FILE)
        Q:ROUTINE=""
        S ZBPOS="+"_LINE_"^"_ROUTINE
	S ZBCMD="ZB "_ZBPOS_":""ZSHOW """"VIS"""":^%MDEBUG($J) S %STEP=$$WAIT^MDEBUG($ZPOS) ZST:%STEP=""""I"""" INTO ZST:%STEP=""""O"""" OVER ZST:%STEP=""""F"""" OUTOF ZC:%STEP=""""C""""  H:%STEP=""""H"""""""
        D REFRESHBP
	U %IO
        X ZBCMD
        Q
CLEARBP(FILE,LINE)      ;Clear Breakpoint
        N ROUTINE,ZBPOS
        S ROUTINE=$$RNAME(FILE)
        I ROUTINE="" ZB -* D REFRESHBP Q     ;Clear all Breakpoints
        S ZBPOS="-+"_LINE_"^"_ROUTINE
        ZB:$T(@$E(ZBPOS,2,99))'="" @ZBPOS
        D REFRESHBP
        Q
GETVAR(%VARNAME)	;Get Variable-Content an pass it to Editor
	N $ZT
	S $ZT="G GETVAR1^"_$T(+0)
	W "***SINGLEVAR",!
	W $G(@%VARNAME),!
GETVAR1	W "***SINGLEEND",!
	Q
RESET   ; Clean up and wait for new Connection
        KILL ^%MDEBUG($J)
        C %DEV
        ZGOTO 1:MDEBUG
        Q
REFRESHBP       ;Remember Breakpoint-Positions to avoid Collisions between ZSTEP INTO and ZBREAK
        N BP
        ZSHOW "B":^%MDEBUG($J)
        KILL ^%MDEBUG($J,"BP")
        S BP="" F  S BP=$O(^%MDEBUG($J,"B",BP)) Q:BP=""  D
        .S ^%MDEBUG($J,"BP",^%MDEBUG($J,"B",BP))=""
        KILL ^%MDEBUG($J,"B")
        Q
POSCONV(ZPOS)	;Convert Position in Form LABEL+n^ROUTINE TO +m^ROUTINE
	Q:$E(ZPOS,1)="+" ZPOS
	N OFFSET,LINE,LABEL,ROUTINE,LABELLEN
	S LABEL=$P(ZPOS,"+",1)
	I LABEL["^" S LABEL=$P(LABEL,"^",1),OFFSET=0
	E  S OFFSET=+$P(ZPOS,"+",2)
	S ROUTINE=$P(ZPOS,"^",2),LABELLEN=$L(LABEL)
	F I=1:1 Q:$E($T(@("+"_I_"^"_ROUTINE)),1,LABELLEN)=LABEL
	Q "+"_(I+OFFSET)_"^"_ROUTINE
RNAME(FILE)	;Get Routinename from filename
	S FILE=$TR(FILE,"\","/")
	Q $TR($P($P(FILE,"/",$L(FILE,"/")),".",1),"_","%")
OUT(VAR)	;DEBUG-Output
	N %IO
	S %IO=$I
	U 0
	W VAR,!
	U %IO
	Q
MTR(VAR,SUCH,ERSETZ)	;Replace one Char in String by several chars
	Q:SUCH="" VAR
	N POS
	S POS=0
	F  S POS=$F(VAR,SUCH,POS) Q:POS=0  D
	.S POS=POS-$L(SUCH)
	.S VAR=$E(VAR,1,POS-1)_ERSETZ_$E(VAR,POS+$L(SUCH),$L(VAR))
	.S POS=POS+$L(ERSETZ)
	Q VAR
