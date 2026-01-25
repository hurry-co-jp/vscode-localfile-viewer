import * as vscode from 'vscode';
import * as path from 'path';
import { startServer, stopServer } from './server';

export function activate(context: vscode.ExtensionContext) {
    let currentPanel: vscode.WebviewPanel | undefined = undefined;

    context.subscriptions.push(
        vscode.commands.registerCommand('vscode-localfile-viewer.open', async (uri?: vscode.Uri) => {

            // Determine Root Path
            let rootPath = '';
            if (uri) {
                rootPath = uri.fsPath;
            } else {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (workspaceFolder) {
                    rootPath = workspaceFolder.uri.fsPath;
                }
            }

            if (!rootPath) {
                vscode.window.showErrorMessage('Local File Viewer: No folder selected or workspace open.');
                return;
            }

            // Start Server
            const mediaPath = path.join(context.extensionPath, 'media');
            let port = 0;
            const config = vscode.workspace.getConfiguration('localFileViewer');
            const preferredPort = config.get<number>('serverPort') || 8080;
            const autoOpenBrowser = config.get<boolean>('autoOpenBrowser') || false;
            const fileGroups = config.get<any>('fileGroups') || {};
            const enabledGroups = config.get<any>('enabledGroups') || {};
            const defaultTheme = config.get<string>('defaultTheme') || 'system';

            try {
                // Pass configuration to server
                port = await startServer(rootPath, mediaPath, preferredPort, fileGroups, enabledGroups);

                vscode.window.showInformationMessage(`Local File Viewer running at http://localhost:${port}`, 'Open in Browser')
                    .then(selection => {
                        if (selection === 'Open in Browser') {
                            vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}`));
                        }
                    });

                if (autoOpenBrowser) {
                    vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}`));
                }

            } catch (err: any) {
                vscode.window.showErrorMessage(`Failed to start local server on port ${preferredPort}: ${err.message}`);
                return;
            }

            // Create or Reveal Webview
            const column = vscode.window.activeTextEditor
                ? vscode.window.activeTextEditor.viewColumn
                : undefined;

            if (currentPanel) {
                currentPanel.reveal(column);
                // Update iframe source with theme param
                currentPanel.webview.html = getWebviewContent(port, defaultTheme);
            } else {
                currentPanel = vscode.window.createWebviewPanel(
                    'localFileViewer',
                    'Local File Viewer',
                    column || vscode.ViewColumn.One,
                    {
                        enableScripts: true,
                        retainContextWhenHidden: true,
                        localResourceRoots: []
                    }
                );

                currentPanel.webview.html = getWebviewContent(port, defaultTheme);

                currentPanel.onDidDispose(
                    () => {
                        currentPanel = undefined;
                        stopServer();
                    },
                    null,
                    context.subscriptions
                );
            }
        })
    );
}

function getWebviewContent(port: number, defaultTheme: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Local File Viewer</title>
    <style>
        body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background-color: #fff; }
        iframe { width: 100%; height: 100%; border: none; display: block; }
    </style>
</head>
<body>
    <iframe src="http://localhost:${port}/?theme=${defaultTheme}"></iframe>
</body>
</html>`;
}

export function deactivate() {
    stopServer();
}
