import * as vscode from "vscode";
export class MumpsConfig {
  static getHost(): string {
    return vscode.workspace
      .getConfiguration("mumps")
      .get("hostname", "localhost");
  }

  static getPort(): number {
    return vscode.workspace.getConfiguration("mumps").get("port", 8080);
  }
  static getUnreachableCodeWarning(): boolean {
    return vscode.workspace
      .getConfiguration("mumps")
      .get("warnIfCodeIsUnreachable", true);
  }
  static isVariableCheckerEnabled(): boolean {
    return vscode.workspace
      .getConfiguration("mumps")
      .get("enableVariableCheck", true);
  }
  static getvariablesToBeIgnored(): string {
    return vscode.workspace
      .getConfiguration("mumps")
      .get("variablesToBeIgnoredAtNewCheck", "");
  }
}
