"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
const util_1 = require("util");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const exec = (0, util_1.promisify)(cp.exec);
// This method is called when your extension is activated
function activate(context) {
    console.log('SQL Formatter extension is now active');
    // Register the formatter command
    const formatCommand = vscode.commands.registerCommand('sql-formatter.format', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        try {
            await formatDocument(editor);
            vscode.window.showInformationMessage('SQL formatted successfully');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to format SQL: ${error.message}`);
        }
    });
    // Register the formatter provider for SQL
    const formatterProvider = vscode.languages.registerDocumentFormattingEditProvider('sql', {
        async provideDocumentFormattingEdits(document) {
            try {
                const formatted = await formatSql(document.getText(), getConfiguration());
                const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
                return [vscode.TextEdit.replace(fullRange, formatted)];
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to format SQL: ${error.message}`);
                return [];
            }
        }
    });
    // Also register formatting for selection
    const rangeFormatterProvider = vscode.languages.registerDocumentRangeFormattingEditProvider('sql', {
        async provideDocumentRangeFormattingEdits(document, range) {
            try {
                const text = document.getText(range);
                const formatted = await formatSql(text, getConfiguration());
                return [vscode.TextEdit.replace(range, formatted)];
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to format SQL selection: ${error.message}`);
                return [];
            }
        }
    });
    // Add subscriptions
    context.subscriptions.push(formatCommand, formatterProvider, rangeFormatterProvider);
}
// Get extension configuration
function getConfiguration() {
    const config = vscode.workspace.getConfiguration('sql-formatter');
    return {
        dialect: config.get('dialect', 'ansi'),
        rules: config.get('rules', []),
        verboseLogging: config.get('verboseLogging', false)
    };
}
// Create output channel for logging
const outputChannel = vscode.window.createOutputChannel('SQL Formatter');
// Log message if verbose logging is enabled
function log(message, config) {
    if (config.verboseLogging) {
        outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
    }
}
// Check if SQLFluff is installed and get its path
async function getSqlFluffPath() {
    try {
        // Try to get the absolute path to sqlfluff
        const { stdout } = await exec('which sqlfluff');
        const sqlfluffPath = stdout.trim();
        // Verify it works
        await exec(`${sqlfluffPath} --version`);
        return sqlfluffPath;
    }
    catch (error) {
        return null;
    }
}
// Format SQL with SQLFluff
async function formatSql(sql, config) {
    // Always show output channel for troubleshooting
    outputChannel.clear();
    if (config.verboseLogging) {
        outputChannel.show();
    }
    outputChannel.appendLine(`Starting SQL formatting with dialect: ${config.dialect}`);
    outputChannel.appendLine(`SQL to format (${sql.length} chars):\n${sql.substring(0, 500)}${sql.length > 500 ? '...' : ''}`);
    // Get SQLFluff path
    const sqlfluffPath = await getSqlFluffPath();
    if (!sqlfluffPath) {
        outputChannel.appendLine('SQLFluff is not installed or not in PATH');
        outputChannel.show(); // Always show for errors
        const action = await vscode.window.showErrorMessage('SQLFluff is not installed or not in PATH. Install it with "pip install sqlfluff".', 'Install SQLFluff');
        if (action === 'Install SQLFluff') {
            // Open terminal with install command
            const terminal = vscode.window.createTerminal('SQLFluff Installation');
            terminal.sendText('pip install sqlfluff');
            terminal.show();
            outputChannel.appendLine('Opening terminal for SQLFluff installation');
            throw new Error('Please try again after installing SQLFluff');
        }
        else {
            throw new Error('SQLFluff is required for formatting');
        }
    }
    outputChannel.appendLine(`Found SQLFluff at: ${sqlfluffPath}`);
    // Use a simpler temporary file approach
    const currentTime = new Date().toISOString().replace(/[:.]/g, '-');
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `vscode-sql-formatter-${currentTime}.sql`);
    try {
        // Write the SQL to the temporary file - use synchronous version for simplicity
        outputChannel.appendLine(`Creating temp file at: ${tmpFile}`);
        fs.writeFileSync(tmpFile, sql, { encoding: 'utf8' });
        // Verify the file was created and has content
        if (!fs.existsSync(tmpFile)) {
            throw new Error(`Failed to create temporary file: ${tmpFile}`);
        }
        const fileStats = fs.statSync(tmpFile);
        outputChannel.appendLine(`Temp file created, size: ${fileStats.size} bytes`);
        // Read file contents to verify
        const fileContent = fs.readFileSync(tmpFile, 'utf8');
        outputChannel.appendLine(`Temp file content (first 100 chars): ${fileContent.substring(0, 100)}`);
        // Build the SQLFluff command with the absolute path
        let command = `"${sqlfluffPath}" fix --dialect ${config.dialect} `;
        // Add rules if specified
        if (config.rules && config.rules.length > 0) {
            const rulesArg = config.rules.map(rule => `--rules ${rule}`).join(' ');
            command += rulesArg + ' ';
        }
        // Add verbose flag for debugging
        command += '-v ';
        // Add the file path (in quotes to handle spaces)
        command += `"${tmpFile}"`;
        // Log the command being executed
        outputChannel.appendLine(`Executing SQLFluff command: ${command}`);
        try {
            // Execute SQLFluff with a timeout (30 seconds)
            const result = await exec(command, { timeout: 30000 });
            outputChannel.appendLine(`SQLFluff command completed successfully`);
            if (result.stdout) {
                outputChannel.appendLine(`SQLFluff stdout:\n${result.stdout}`);
            }
            if (result.stderr) {
                outputChannel.appendLine(`SQLFluff stderr:\n${result.stderr}`);
            }
            // Read the formatted SQL
            const formatted = fs.readFileSync(tmpFile, 'utf8');
            outputChannel.appendLine(`Formatted SQL (${formatted.length} chars):\n${formatted.substring(0, 100)}...`);
            // Success!
            return formatted;
        }
        catch (err) {
            // Show the output channel for any errors
            outputChannel.show();
            outputChannel.appendLine(`SQLFluff execution error: ${err.message}`);
            // Get more detailed error information
            if (err.stdout) {
                outputChannel.appendLine(`Error stdout: ${err.stdout}`);
            }
            if (err.stderr) {
                outputChannel.appendLine(`Error stderr: ${err.stderr}`);
            }
            // Try to run a simpler SQLFluff command to test if it's responsive
            try {
                outputChannel.appendLine(`Testing basic SQLFluff functionality...`);
                const { stdout } = await exec(`"${sqlfluffPath}" --version`);
                outputChannel.appendLine(`SQLFluff basic test: ${stdout}`);
            }
            catch (e) {
                outputChannel.appendLine(`SQLFluff basic test failed: ${e.message}`);
            }
            // Parse the error message for a user-friendly response
            let errorMessage = "Error running SQLFluff (see Output panel for details)";
            if (err.stderr) {
                if (err.stderr.includes('parsing errors')) {
                    errorMessage = `SQLFluff found syntax errors in your SQL. See Output panel for details.`;
                }
                else if (err.stderr.includes('Permission denied')) {
                    errorMessage = `Permission denied accessing temporary file. See Output panel for details.`;
                }
                else {
                    errorMessage = `SQLFluff error: ${err.stderr.split('\n')[0]}`;
                }
            }
            // Try to read the file to see if it was modified even with error
            try {
                const currentContent = fs.readFileSync(tmpFile, 'utf8');
                if (currentContent !== sql) {
                    outputChannel.appendLine(`SQLFluff did modify the file despite error. Returning modified content.`);
                    return currentContent;
                }
            }
            catch (e) {
                outputChannel.appendLine(`Could not read the temp file after error: ${e}`);
            }
            throw new Error(errorMessage);
        }
    }
    catch (error) {
        // Rethrow with more context
        outputChannel.appendLine(`Error during formatting: ${error.message}`);
        throw new Error(`SQL formatting failed: ${error.message}`);
    }
    finally {
        // Clean up the temporary file
        try {
            if (fs.existsSync(tmpFile)) {
                fs.unlinkSync(tmpFile);
                outputChannel.appendLine(`Removed temporary file: ${tmpFile}`);
            }
        }
        catch (e) {
            // Log cleanup errors
            outputChannel.appendLine(`Failed to clean up temporary file: ${e.message}`);
        }
    }
}
// Format the current document or selected text
async function formatDocument(editor) {
    const document = editor.document;
    const selection = editor.selection;
    const config = getConfiguration();
    // Format the whole document if no selection
    if (selection.isEmpty) {
        const fullText = document.getText();
        const formatted = await formatSql(fullText, config);
        await editor.edit(editBuilder => {
            const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(fullText.length));
            editBuilder.replace(fullRange, formatted);
        });
    }
    else {
        // Format only the selected text
        const selectedText = document.getText(selection);
        const formatted = await formatSql(selectedText, config);
        await editor.edit(editBuilder => {
            editBuilder.replace(selection, formatted);
        });
    }
}
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map