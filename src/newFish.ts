import * as vscode from 'vscode'
import { getFileName, removeFileExtension, toPascalCase, toSemantics } from './common'

export const createNewFish = (editor: vscode.TextEditor, fishName: string): Promise<void> =>
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
  ).replace(/[^a-zA-Z]/g, '_')
}

const createFishBody = (fishName: string, semantics: string): string => `import {
  Envelope,
  FishType,
  InitialState,
  OnEvent,
  OnCommand,
  OnStateChange,
  Semantics,
  Subscription,
} from 'ada'

/*
 * Fish State
 */
export type State = {}
export type PublicState = State
const initialState: InitialState<State> = (_name, _sourceId) => ({
  state: {},
  subscriptions: [Subscription.of(${fishName}.semantics)],
})

// EVENTS
event1(param1:type)
event2(param1:type, param2:type)
event3

// COMMANDS
command1(param1:type, param2:type)
command2(param1:type)
command3

/*
 * Local Snapshot
 */
const localSnapshot: SnapshotFormat<State> = {
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
}
`
