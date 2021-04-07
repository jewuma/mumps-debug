/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
import { MumpsDebugSession } from './mumpsDebug';
import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {
}
MumpsDebugSession.run(MumpsDebugSession);


