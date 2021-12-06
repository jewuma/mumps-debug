import * as vscode from 'vscode';

export default class MumpsConfigurationProvider implements vscode.DebugConfigurationProvider {

	/**
	 * Message a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	*/
	resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined,
		config: vscode.DebugConfiguration): vscode.ProviderResult<vscode.DebugConfiguration> {

		// if launch.json is missing or empty
		if (!config.type && !config.request && !config.name) {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.languageId === 'mumps') {
				config.type = 'mumps';
				config.name = 'Launch';
				config.request = 'launch';
				config.program = '${file}';
				config.stopOnEntry = true;
				config.hostname = '192.168.0.1';
				config.localRoutinesPath = 'y:\\';
				config.port = 9000;
			}
		}

		if (!config.program) {
			return vscode.window.showInformationMessage("Cannot find a program to debug").then(_ => {
				return undefined;	// abort launch
			});
		}

		return config;
	}
}
