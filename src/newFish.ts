import * as vscode from 'vscode'
import { getFileName, removeFileExtension, toPascalCase, toSemantics } from './common'
import { createFishExport } from './exportFish'

export const createNewFish = (): void => {
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
          .then(async result => {
            if (result && result.title === 'Overwrite') {
              await createNewFishContent(editor, processedFishName).then(_ => {
                window.showInformationMessage(
                  'Fish created. Continue with "Actyx: create event" and "Actyx: create commands" ',
                )
                // save when the file is not saved
                saveFish(editor)
              })
            } else {
              vscode.window.showInformationMessage('Create new fish is canceled by user')
            }
          })
      } else {
        // tslint:disable-next-line: no-floating-promises
        createNewFishContent(editor, processedFishName).then(_ => {
          window.showInformationMessage(
            'Fish created. Continue with "Actyx: create event" and "Actyx: create commands" ',
          )
          saveFish(editor)
        })
      }
    })
  }
}

const saveFish = (editor: vscode.TextEditor) => {
  if (editor.document.isUntitled) {
    editor.document.save()
  }
}

export const createNewFishContent = (editor: vscode.TextEditor, fishName: string): Promise<void> =>
  new Promise(async resolve => {
    const { document } = editor
    const lastLineLength = document.lineAt(document.lineCount - 1).text.length
    const selectAll = new vscode.Selection(0, 0, document.lineCount - 1, lastLineLength)
    const body = createFishBody(toPascalCase(fishName), toSemantics(fishName))

    editor.edit(edit => {
      edit.replace(selectAll, body)
      resolve()
    })
  })

const DEFAULT_PLACE_HOLDER = 'enter fish name'
export const getNewFishPlaceHolder = (editor: vscode.TextEditor): string => {
  return editor.document.isUntitled
    ? DEFAULT_PLACE_HOLDER
    : removeFileExtension(getFileName(editor))
}

export const processFishName = (
  input: string | undefined,
  placeHolder: string,
): string | undefined => {
  if (!input && placeHolder === DEFAULT_PLACE_HOLDER) {
    return undefined
  }
  const inputFishName = input || placeHolder
  return (inputFishName.toUpperCase().endsWith('FISH')
    ? inputFishName
    : inputFishName + 'Fish'
  ).replace(/[^a-zA-Z0-9]/g, '_')
}

const createFishBody = (fishName: string, semantics: string): string => `import {
  Envelope,
  FishType,
  InitialState,
  OnCommand,
  OnEvent,
  OnStateChange,
  Semantics,
  Subscription,
} from '@actyx/pond'
import { SnapshotFormat } from '@actyx/pond/lib/types'

/*
 * Fish State
 */
export type State = {}
export type PublicState = State
const initialState: InitialState<State> = (name, _sourceId) => ({
  state: {},
  subscriptions: [Subscription.of(${fishName}, name)],
})

// EVENTS
// example:
// userLoggedIn(user:User, terminal:string)
// userLoggedOut(terminal:string)

// COMMANDS
// example:
// loginUser(user:string, password: string, terminal:string)
// logoutUser(terminal:string)

/*
 * Local Snapshot
 */
const localSnapshot: SnapshotFormat<State, any> = {
  version: 1,
  serialize: state => state,
  deserialize: state => state as State,
}

/*
 * Fish Definition
 */
export const ${fishName} = FishType.of<State, Command, Event, State>({
  semantics: Semantics.of('ax.${semantics}'),
  initialState,
  onEvent,
  onCommand,
  onStateChange: OnStateChange.publishPrivateState(),
  localSnapshot,
  semanticSnapshot: (_name, _sourceId) => ev => false,
})
`
