import * as vscode from 'vscode';
import { FallingProcessor } from './fallingProcessor';

// Diagnostic collection for falling characters
let fallingDiagnostics: vscode.DiagnosticCollection;

// Decoration type for falling characters
let fallingDecorationType: vscode.TextEditorDecorationType;

export function activate(context: vscode.ExtensionContext) {
    console.log('Ragelang extension is now active');

    // Create diagnostic collection
    fallingDiagnostics = vscode.languages.createDiagnosticCollection('ragelang');
    context.subscriptions.push(fallingDiagnostics);

    // Create decoration type for falling characters
    updateDecorationStyle();

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('ragelang')) {
                updateDecorationStyle();
                // Re-analyze all open ragelang documents
                for (const editor of vscode.window.visibleTextEditors) {
                    if (editor.document.languageId === 'ragelang') {
                        analyzeDocument(editor.document, editor);
                    }
                }
            }
        })
    );

    // Analyze document on open
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            if (document.languageId === 'ragelang') {
                const editor = vscode.window.activeTextEditor;
                if (editor && editor.document === document) {
                    analyzeDocument(document, editor);
                }
            }
        })
    );

    // Analyze document on change
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'ragelang') {
                const editor = vscode.window.activeTextEditor;
                if (editor && editor.document === event.document) {
                    analyzeDocument(event.document, editor);
                }
            }
        })
    );

    // Analyze document when editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.languageId === 'ragelang') {
                analyzeDocument(editor.document, editor);
            }
        })
    );

    // Analyze all currently open ragelang documents
    for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document.languageId === 'ragelang') {
            analyzeDocument(editor.document, editor);
        }
    }

    // Register hover provider for falling characters
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('ragelang', {
            provideHover(document, position) {
                const processor = new FallingProcessor(document.getText());
                const unsupported = processor.getUnsupportedPositions();
                
                // Check if hover position is on an unsupported character
                const char = unsupported.find(
                    p => p.row === position.line && p.col === position.character
                );
                
                if (char) {
                    const charAtPos = document.getText(
                        new vscode.Range(position.line, position.character, position.line, position.character + 1)
                    );
                    return new vscode.Hover(
                        new vscode.MarkdownString(
                            `⚠️ **Unsupported Character**\n\n` +
                            `This character \`${charAtPos}\` will fall because it has no support beneath it.\n\n` +
                            `In Ragelang, characters must be supported by characters directly below ` +
                            `or diagonally adjacent below them.`
                        )
                    );
                }
                
                return null;
            }
        })
    );

    // Register command to show falling preview
    context.subscriptions.push(
        vscode.commands.registerCommand('ragelang.showFallingPreview', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.document.languageId !== 'ragelang') {
                vscode.window.showWarningMessage('Open a Ragelang file to see falling preview');
                return;
            }

            const processor = new FallingProcessor(editor.document.getText());
            const result = processor.process();
            
            // Show in a new document
            vscode.workspace.openTextDocument({
                content: result,
                language: 'ragelang'
            }).then(doc => {
                vscode.window.showTextDocument(doc, {
                    viewColumn: vscode.ViewColumn.Beside,
                    preview: true
                });
            });
        })
    );
}

function updateDecorationStyle() {
    // Dispose old decoration type if it exists
    if (fallingDecorationType) {
        fallingDecorationType.dispose();
    }

    const config = vscode.workspace.getConfiguration('ragelang');
    const backgroundColor = config.get<string>('fallingHighlightColor', 'rgba(255, 100, 100, 0.3)');

    fallingDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: backgroundColor,
        borderRadius: '2px',
        isWholeLine: false,
        overviewRulerColor: 'rgba(255, 100, 100, 0.8)',
        overviewRulerLane: vscode.OverviewRulerLane.Right
    });
}

function analyzeDocument(document: vscode.TextDocument, editor: vscode.TextEditor) {
    const config = vscode.workspace.getConfiguration('ragelang');
    const enableHighlight = config.get<boolean>('enableFallingHighlight', true);

    if (!enableHighlight) {
        fallingDiagnostics.clear();
        editor.setDecorations(fallingDecorationType, []);
        return;
    }

    const text = document.getText();
    const processor = new FallingProcessor(text);
    const unsupportedPositions = processor.getUnsupportedPositions();

    // Create diagnostics
    const diagnostics: vscode.Diagnostic[] = [];
    const decorations: vscode.DecorationOptions[] = [];

    for (const pos of unsupportedPositions) {
        const range = new vscode.Range(pos.row, pos.col, pos.row, pos.col + 1);
        const char = document.getText(range);
        
        // Create diagnostic (warning)
        const diagnostic = new vscode.Diagnostic(
            range,
            `Unsupported character '${char}' will fall`,
            vscode.DiagnosticSeverity.Warning
        );
        diagnostic.source = 'ragelang';
        diagnostic.code = 'falling-character';
        diagnostics.push(diagnostic);

        // Create decoration
        decorations.push({
            range,
            hoverMessage: `This character will fall - no support beneath it`
        });
    }

    fallingDiagnostics.set(document.uri, diagnostics);
    editor.setDecorations(fallingDecorationType, decorations);
}

export function deactivate() {
    if (fallingDecorationType) {
        fallingDecorationType.dispose();
    }
}

