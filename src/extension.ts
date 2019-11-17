import * as vscode from 'vscode'
import { buildCommands } from './commands'
import { consumeSelectedBlock, convertToDefinitions } from './common'
import { buildEvents } from './events'
import { createNewFish, getNewFishPlaceHolder, processFishName } from './newFish'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {
  const newFish = vscode.commands.registerCommand('actyx.newFish', async () => {
    const { window } = vscode
    const editor = window.activeTextEditor
    if (editor) {
      const placeHolder = getNewFishPlaceHolder(editor)
      window.showInputBox({ placeHolder }).then(fishName => {
        // validate user input as fish name
        const processedFishName = processFishName(fishName, placeHolder)
        if (!processedFishName) {
          vscode.window.showInformationMessage('The fish name is mandatory')
          return
        }

        // if there are more than two lines, get approvement from user to delete content
        if (editor.document.lineCount > 2) {
          window
            .showWarningMessage<vscode.MessageItem>(
              'Your current file is not empty. This command will overwrite your content',
              { modal: true },
              { title: 'Overwrite', isCloseAffordance: false },
              { title: 'Cancel', isCloseAffordance: true },
            )
            .then(result => {
              if (result && result.title === 'Overwrite') {
                createNewFish(editor, processedFishName).then(_ => {
                  window.showInformationMessage(
                    'Fish created. Continue with "Actyx: create event" and "Actyx: create commands" ',
                  )
                  // save when the file is not saved
                  if (editor.document.isUntitled) {
                    editor.document.save()
                  }
                }).catch(console.error)
              } else {
                vscode.window.showInformationMessage('Create new fish is canceled by user')
              }
            })
        } else {
          // tslint:disable-next-line: no-floating-promises
          createNewFish(editor, processedFishName).then(_ => {
            window.showInformationMessage(
              'Fish created. Continue with "Actyx: create event" and "Actyx: create commands" ',
            )
            // save when the file is not saved
            if (editor.document.isUntitled) {
              editor.document.save()
            }
          })
        }
      })
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
  context.subscriptions.push(eventsCommand)
  context.subscriptions.push(commandsCommand)
}

// this method is called when your extension is deactivated
export function deactivate(): void {
  // no deactivate required
}
