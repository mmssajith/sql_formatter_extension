# SQL Formatter Extension for VS Code

This extension provides SQL formatting capabilities in VS Code using [SQLFluff](https://github.com/sqlfluff/sqlfluff), an open-source SQL linter and formatter.

## Features

- Format SQL files with SQLFluff
- Format selected SQL code snippets
- Support for automatic formatting on save
- Integration with VS Code's built-in formatting commands

## Requirements

This extension requires [SQLFluff](https://github.com/sqlfluff/sqlfluff) to be installed on your system:

```bash
pip install sqlfluff
```

If SQLFluff is not installed, the extension will prompt you to install it when you attempt to format SQL code.

## Usage

### Format Document or Selection

1. Open a SQL file or select SQL code
2. Use one of the following methods to format:
   - Press `Shift+Alt+F` (or `Shift+Option+F` on macOS)
   - Right-click and select "Format Document" or "Format Selection"
   - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS) and run "Format Document" or "Format Selection"
   - Use the custom command "Format SQL with SQLFluff" from the Command Palette

### Format on Save

To enable formatting on save:

1. Go to Settings (`Ctrl+,` or `Cmd+,` on macOS)
2. Search for "Format On Save"
3. Check the box to enable it for all languages or just for SQL

## Extension Settings

This extension contributes the following settings:

* `sql-formatter.dialect`: SQL dialect to use for formatting (default: "ansi")

## Known Issues

- The extension currently uses a temporary file for formatting, which may cause issues with very large SQL files.
- Some SQL dialects may not be fully supported by SQLFluff.

## Release Notes

### 0.0.1

- Initial release with basic SQL formatting functionality using SQLFluff

## About SQLFluff

[SQLFluff](https://github.com/sqlfluff/sqlfluff) is an open-source SQL linter and formatter. For more information, visit the [SQLFluff documentation](https://docs.sqlfluff.com/).
