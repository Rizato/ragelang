import * as vscode from "vscode";
import { FallingProcessor } from "./fallingProcessor";

// Diagnostic collection for falling characters
let fallingDiagnostics: vscode.DiagnosticCollection;

// Decoration type for falling characters
let fallingDecorationType: vscode.TextEditorDecorationType;

// Preview panel
let previewPanel: vscode.WebviewPanel | undefined;
let previewSourceUri: vscode.Uri | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log("Ragelang extension is now active");

  // Create diagnostic collection
  fallingDiagnostics = vscode.languages.createDiagnosticCollection("ragelang");
  context.subscriptions.push(fallingDiagnostics);

  // Create decoration type for falling characters
  updateDecorationStyle();

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("ragelang")) {
        updateDecorationStyle();
        // Re-analyze all open ragelang documents
        for (const editor of vscode.window.visibleTextEditors) {
          if (editor.document.languageId === "ragelang") {
            analyzeDocument(editor.document, editor);
          }
        }
      }
    })
  );

  // Analyze document on open
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.languageId === "ragelang") {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === document) {
          analyzeDocument(document, editor);
        }
      }
    })
  );

  // Analyze document on change
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === "ragelang") {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === event.document) {
          analyzeDocument(event.document, editor);
        }
        // Update preview if this is the source document
        if (
          previewPanel &&
          previewSourceUri &&
          event.document.uri.toString() === previewSourceUri.toString()
        ) {
          updatePreview(event.document);
        }
      }
    })
  );

  // Analyze document when editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.languageId === "ragelang") {
        analyzeDocument(editor.document, editor);
      }
    })
  );

  // Analyze all currently open ragelang documents
  for (const editor of vscode.window.visibleTextEditors) {
    if (editor.document.languageId === "ragelang") {
      analyzeDocument(editor.document, editor);
    }
  }

  // Register hover provider for falling characters
  context.subscriptions.push(
    vscode.languages.registerHoverProvider("ragelang", {
      provideHover(document, position) {
        const processor = new FallingProcessor(document.getText());
        const unsupported = processor.getUnsupportedPositions();

        // Check if hover position is on an unsupported character
        const char = unsupported.find(
          (p) => p.row === position.line && p.col === position.character
        );

        if (char) {
          const charAtPos = document.getText(
            new vscode.Range(
              position.line,
              position.character,
              position.line,
              position.character + 1
            )
          );
          return new vscode.Hover(
            new vscode.MarkdownString(
              `⚠️ **Unsupported Character**\n\n` +
                `This character \`${charAtPos}\` will fall because it has no support beneath it.\n\n` +
                `In Ragelang, characters must be supported by characters directly below ` +
                `or diagonally adjacent below them, all the way down to the foundation (\`#\`).`
            )
          );
        }

        return null;
      },
    })
  );

  // Register command to show falling preview (opens in side panel)
  context.subscriptions.push(
    vscode.commands.registerCommand("ragelang.showFallingPreview", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "ragelang") {
        vscode.window.showWarningMessage("Open a Ragelang file to see falling preview");
        return;
      }

      showPreviewPanel(context, editor.document);
    })
  );

  // Register command to toggle preview (like markdown preview toggle)
  context.subscriptions.push(
    vscode.commands.registerCommand("ragelang.togglePreview", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "ragelang") {
        vscode.window.showWarningMessage("Open a Ragelang file to toggle preview");
        return;
      }

      if (
        previewPanel &&
        previewSourceUri &&
        editor.document.uri.toString() === previewSourceUri.toString()
      ) {
        // Close preview if it's already showing this document
        previewPanel.dispose();
        previewPanel = undefined;
        previewSourceUri = undefined;
      } else {
        // Show preview
        showPreviewPanel(context, editor.document);
      }
    })
  );

  // Register command to toggle falling character highlighting
  context.subscriptions.push(
    vscode.commands.registerCommand("ragelang.toggleFallingHighlight", async () => {
      const config = vscode.workspace.getConfiguration("ragelang");
      const currentValue = config.get<boolean>("enableFallingHighlight", true);

      // Toggle the setting
      await config.update(
        "enableFallingHighlight",
        !currentValue,
        vscode.ConfigurationTarget.Global
      );

      // Show notification
      const newState = !currentValue ? "enabled" : "disabled";
      vscode.window.showInformationMessage(`Ragelang: Falling character highlighting ${newState}`);
    })
  );
}

function showPreviewPanel(context: vscode.ExtensionContext, document: vscode.TextDocument) {
  const columnToShowIn = vscode.ViewColumn.Beside;

  if (previewPanel) {
    // If we already have a panel, show it in the target column
    previewPanel.reveal(columnToShowIn);
    previewSourceUri = document.uri;
    updatePreview(document);
  } else {
    // Create a new panel
    previewPanel = vscode.window.createWebviewPanel(
      "ragelangPreview",
      "Ragelang Preview",
      columnToShowIn,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    previewSourceUri = document.uri;

    // Set icon
    previewPanel.iconPath = vscode.Uri.joinPath(context.extensionUri, "icon.png");

    // Update content
    updatePreview(document);

    // Handle panel disposal
    previewPanel.onDidDispose(
      () => {
        previewPanel = undefined;
        previewSourceUri = undefined;
      },
      null,
      context.subscriptions
    );
  }
}

function updatePreview(document: vscode.TextDocument) {
  if (!previewPanel) return;

  const processor = new FallingProcessor(document.getText());
  const processedCode = processor.process();

  previewPanel.title = `Preview: ${getFileName(document.uri)}`;
  previewPanel.webview.html = getPreviewHtml(processedCode);
}

function getFileName(uri: vscode.Uri): string {
  const parts = uri.path.split("/");
  return parts[parts.length - 1];
}

function getPreviewHtml(processed: string): string {
  // Escape HTML entities
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ragelang Preview</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-editor-font-family, 'Consolas', 'Courier New', monospace);
            font-size: var(--vscode-editor-font-size, 14px);
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 0;
            line-height: 1.5;
        }
        pre {
            padding: 12px;
            margin: 0;
            white-space: pre;
            font-family: inherit;
        }
    </style>
</head>
<body><pre>${escapeHtml(processed)}</pre></body>
</html>`;
}

function updateDecorationStyle() {
  // Dispose old decoration type if it exists
  if (fallingDecorationType) {
    fallingDecorationType.dispose();
  }

  const config = vscode.workspace.getConfiguration("ragelang");
  const backgroundColor = config.get<string>("fallingHighlightColor", "rgba(255, 100, 100, 0.3)");

  fallingDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: backgroundColor,
    borderRadius: "2px",
    isWholeLine: false,
    overviewRulerColor: "rgba(255, 100, 100, 0.8)",
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  });
}

function analyzeDocument(document: vscode.TextDocument, editor: vscode.TextEditor) {
  const config = vscode.workspace.getConfiguration("ragelang");
  const enableHighlight = config.get<boolean>("enableFallingHighlight", true);

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
    diagnostic.source = "ragelang";
    diagnostic.code = "falling-character";
    diagnostics.push(diagnostic);

    // Create decoration
    decorations.push({
      range,
      hoverMessage: `This character will fall - no support beneath it`,
    });
  }

  fallingDiagnostics.set(document.uri, diagnostics);
  editor.setDecorations(fallingDecorationType, decorations);
}

export function deactivate() {
  if (fallingDecorationType) {
    fallingDecorationType.dispose();
  }
  if (previewPanel) {
    previewPanel.dispose();
  }
}
