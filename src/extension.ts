import * as vscode from 'vscode'
import { buildCommands } from './commands'
import { consumeSelectedBlock } from './common'
import { convertToDefinitions } from './definitionParser'
import { buildEvents } from './events'
import { createExportForAllFishes, createFishExport } from './exportFish'
import { createNewFish } from './newFish'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {
  const newFish = vscode.commands.registerCommand('actyx.newFish', async () => createNewFish())

  const exportFish = vscode.commands.registerCommand('actyx.exportFish', async () => {
    const editor = vscode.window.activeTextEditor
    if (editor) {
      if (editor.document.fileName.includes('index.ts')) {
        await createExportForAllFishes(editor)
      } else {
        await createFishExport(editor)
      }
    }
  })

  const eventsCommand = vscode.commands.registerCommand('actyx.events', async () => {
    // The code you place here will be executed every time your command is executed
    const editor = vscode.window.activeTextEditor
    if (editor && !editor.selection.isEmpty) {
      const [definition, position] = await consumeSelectedBlock(editor)
      const events = convertToDefinitions(definition)
      await buildEvents(editor, position, events)
    } else {
      vscode.window.showInformationMessage('Select your events before execute this extension')
    }
  })

  const commandsCommand = vscode.commands.registerCommand('actyx.commands', async () => {
    // The code you place here will be executed every time your command is executed
    const editor = vscode.window.activeTextEditor
    if (editor && !editor.selection.isEmpty) {
      const [definition, position] = await consumeSelectedBlock(editor)
      const commands = convertToDefinitions(definition)
      await buildCommands(editor, position, commands)
    } else {
      vscode.window.showInformationMessage('Select your commands before execute this extension')
    }
  })

  context.subscriptions.push(newFish)
  context.subscriptions.push(exportFish)
  context.subscriptions.push(eventsCommand)
  context.subscriptions.push(commandsCommand)
}

// this method is called when your extension is deactivated
export function deactivate(): void {
  // no deactivate required
}
