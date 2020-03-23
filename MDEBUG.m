MDEBUG  ;Debugging Routine for M
	S $ZSTEP="ZSHOW ""VIS"":^%MDEBUG($J) S %STEP=$$WAIT^MDEBUG($ZPOS) ZST:%STEP=""I"" INTO ZST:%STEP=""O"" OVER ZST:%STEP=""F"" OUTOF ZC:%STEP=""C""  H:%STEP=""H"""
	D OPEN()
RESTART ;
	S %STEP=$$WAIT("") G:%STEP["^" @%STEP G RESTART
	Q
OPEN()    ;
        N IO,DEV,PORT,SOCKET
        S IO=$I,PORT=9000,DEV="|TCP|"_PORT_"|"_$J
        O DEV:(ZLISTEN=PORT_":TCP":NODELIMITER:ATTACH="listener")::"SOCKET"
	E  Q
        U DEV
        W /LISTEN(1)
        ; wait for connection, $KEY will be "CONNECT|socket_handle|remote_ipaddress"
        F  W /WAIT Q:$KEY]""
        S SOCKET=$P($KEY,"|",2)
        KILL ^%MDEBUG($J)
	S ^%MDEBUG($J,"SOCKET")=SOCKET
	S ^%MDEBUG($J,"DEV")=DEV
	U IO
	Q
WAIT(ZPOS)   ;
        N DEV,IO,CMD,ACTION,CMDS,CMDLINE,SOCKET,LABEL,I,VAR
        S CMDS="START;QUIT;EXIT;INTO;OUTOF;OVER;CONTINUE;SETBP;VARS;INTERNALS;CLEARBP;REQUESTBP;RESET"
        S IO=$I
        S DEV=^%MDEBUG($J,"DEV"),SOCKET=^%MDEBUG($J,"SOCKET")
	U DEV:(SOCKET=SOCKET:DELIM=$C(10))
	W "***STARTVAR",!
	S I="" F  S I=$O(^%MDEBUG($J,"I",I)) Q:I=""  S VAR=^%MDEBUG($J,"I",I) S:VAR[$C(10) VAR=$$MTR(VAR,$C(10),"_$C(10)_") W "I:",VAR,!
	S I="" F  S I=$O(^%MDEBUG($J,"V",I)) Q:I=""  S VAR=^%MDEBUG($J,"V",I) S:VAR[$C(10) VAR=$$MTR(VAR,$C(10),"_$C(10)_") W "V:",VAR,!
	S I="" F  S I=$O(^%MDEBUG($J,"S",I)) Q:I=""  S VAR=^%MDEBUG($J,"S",I) W "S:",VAR,!
        W "***ENDVAR",!
READLOOP	;
	U DEV:(SOCKET=SOCKET:DELIM=$C(10))
        F  R CMDLINE S CMD=$P(CMDLINE,";",1) Q:$P(CMD,";",1)'=""&(CMDS[$TR(CMD,";"))
	;D OUT(CMDLINE)
	I CMD="REQUESTBP" W "***STARTBP",! ZSHOW "B" W "***ENDBP",! G READLOOP
        U IO
        I CMD="INTO" Q:$D(^%MDEBUG($J,"BP",$$POSCONV(ZPOS))) "O" Q "I"
        Q:CMD="INTO" "I"
	Q:CMD="OUTOF" "F"
	Q:CMD="OVER" "O"
        Q:CMD="CONTINUE" "C"
	Q:CMD="START" "^"_$$RNAME($P(CMDLINE,";",2))
        I CMD="EXIT"!(CMD="QUIT") KILL ^%MDEBUG($J) C DEV Q "H"
        I CMD="SETBP" D SETBP($P(CMDLINE,";",2),$P(CMDLINE,";",3)) G READLOOP
        I CMD="CLEARBP" D CLEARBP($P(CMDLINE,";",2),$P(CMDLINE,";",3)) G READLOOP
	I CMD="RESET" KILL ^%MDEBUG($J) C DEV ZGOTO 1:MDEBUG
        Q ACTION
SETBP(FILE,LINE)        ;
        N ROUTINE,ZBPOS,ZBCMD,IO,BP
	S IO=$I
        S ROUTINE=$$RNAME(FILE)
        Q:ROUTINE=""
        S ZBPOS="+"_LINE_"^"_ROUTINE
	S ZBCMD="ZB "_ZBPOS_":""ZSHOW """"VIS"""":^%MDEBUG($J) S %STEP=$$WAIT^MDEBUG($ZPOS) ZST:%STEP=""""I"""" INTO ZST:%STEP=""""O"""" OVER ZST:%STEP=""""F"""" OUTOF ZC:%STEP=""""C""""  H:%STEP=""""H"""""""
        D REFRESHBP
	U IO
        X ZBCMD
        Q
CLEARBP(FILE,LINE)      ;
        N ROUTINE,ZBPOS
        S ROUTINE=$$RNAME(FILE)
        I ROUTINE="" ZB -* D REFRESHBP Q     ;Clear all Breakpoints
        S ZBPOS="-+"_LINE_"^"_ROUTINE
        ZB:$T(@$E(ZBPOS,2,99))'="" @ZBPOS
        D REFRESHBP
        Q
REFRESHBP       ;
        N BP,BPPOS
        ZSHOW "B":^%MDEBUG($J)
        KILL ^%MDEBUG($J,"BP")
        S BP="" F  S BP=$O(^%MDEBUG($J,"B",BP)) Q:BP=""  D
        .S BPPOS=^%MDEBUG($J,"B",BP)
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
RNAME(FILE)	;
	S FILE=$TR(FILE,"\","/")
	Q $TR($P($P(FILE,"/",$L(FILE,"/")),".",1),"_","%")
OUT(VAR)	;
	N IO
	S IO=$I
	U 0
	W VAR,!
	U IO
	Q
MTR(VAR,SUCH,ERSETZ)	;ein Zeichen in VAR durch mehrere ersetzen
	Q:SUCH="" VAR
	N POS
	S POS=0
	F  S POS=$F(VAR,SUCH,POS) Q:POS=0  D
	.S POS=POS-$L(SUCH)
	.S VAR=$E(VAR,1,POS-1)_ERSETZ_$E(VAR,POS+$L(SUCH),$L(VAR))
	.S POS=POS+$L(ERSETZ)
	Q VAR
