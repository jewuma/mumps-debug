import * as vscode from 'vscode';

/**
 * Implements the CompletionItem returned by autocomplete
 *
 * @class CompletionItem
 * @extends {vscode.CompletionItem}
 */
export class CompletionItem extends vscode.CompletionItem {
	file: string;
	line: number;
	count: number;
	details: string[];
	constructor(word: string | vscode.CompletionItemLabel, file: string) {
		super(word);
		this.kind = vscode.CompletionItemKind.Text;
		this.count = 1;
		this.file = file;
	}

	static copy(item: CompletionItem) {
		const newItem = new CompletionItem(item.label, item.file);
		newItem.count = item.count;
		newItem.details = item.details;
		return newItem;
	}
}