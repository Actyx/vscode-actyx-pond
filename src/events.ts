import * as vscode from 'vscode'
import {
  createEnum,
  createEnumContent,
  createTypes,
  createUnion,
  createUnionContent,
  eol,
} from './common'
import { Definitions, TextPos } from './definitionParser'

const ON_EVENT_IDENTIFIER = 'export const onEvent: OnEvent<State, Event> = ('
const ENUM_EVENT_TYPE_IDENTIFIER = 'export enum EventType {'
const TYPE_EVENT_IDENTIFIER = 'export type Event ='
const SWITCH_CASE_IDENTIFIER = (n: string) => '} = event' + n + '  switch (payload.type) {'
const header = (n: string) => '/**' + n + ' * Fish Events' + n + ' */' + n

const createOnEventCases = (defs: Definitions, n: string): string =>
  defs.map(d => `    case EventType.${d.name}: {${n}      return {}${n}    }`).join(n)

const createOnEventFunction = (defs: Definitions, n: string) => {
  const definition =
    'export const onEvent: OnEvent<State, Event> = (state: State, event: Envelope<Event>) => {'
  const destruct = '  const { payload } = event'
  const sw = `  switch (payload.type) {${n}${createOnEventCases(defs, n)}${n}  }${n}  return state`
  return definition + n + destruct + n + sw + n + '}'
}

export const buildEvents = async (editor: vscode.TextEditor, pos: TextPos, events: Definitions) => {
  return new Promise(async resolve => {
    const idx = editor.document.getText().indexOf(ON_EVENT_IDENTIFIER)
    if (idx === -1) {
      editor
        .edit(edit => {
          const n = eol(editor.document)
          edit.insert(
            pos,
            header(n) +
              createEnum('Event', events) +
              createTypes('Event', events) +
              createUnion('Event', events) +
              n +
              createOnEventFunction(events, n),
          )
        })
        .then(_ => resolve())
    } else {
      await updateEventStructure(editor, events)
      resolve()
    }
  })
}

const updateEventStructure = (editor: vscode.TextEditor, events: Definitions): Promise<void> => {
  return new Promise(resolve => {
    const {
      document,
      document: { getText, positionAt, lineAt },
    } = editor

    const n = eol(editor.document)

    // find positions in text
    const enumEventTypeIdxOf = getText().indexOf(ENUM_EVENT_TYPE_IDENTIFIER)
    if (enumEventTypeIdxOf === -1) {
      vscode.window.showInformationMessage('enum EventType is not existing in your fish definition')
      return
    }

    const typeEventIdxOf = getText().indexOf(TYPE_EVENT_IDENTIFIER)
    if (typeEventIdxOf === -1) {
      vscode.window.showInformationMessage('type Event is not existing in your fish definition')
      return
    }

    const switchCaseIdxOf = getText().indexOf(SWITCH_CASE_IDENTIFIER(n))
    if (switchCaseIdxOf === -1) {
      vscode.window.showInformationMessage('onEvent switch-case not found')
      return
    }

    // helper to move to the end of the Type Enumeration
    const getEnumEnd = (lineNr: number): number =>
      lineAt(lineNr).text.endsWith('}') ? lineNr : getEnumEnd(lineNr + 1)

    // map of all data to insert in the editor
    const insertData: ReadonlyArray<readonly [number, string]> = [
      [positionAt(switchCaseIdxOf).line + 2, createOnEventCases(events, n) + n],
      [positionAt(typeEventIdxOf).line + 1, createUnionContent('Event', events) + n],
      [getEnumEnd(positionAt(enumEventTypeIdxOf).line) + 1, createTypes('Event', events)],
      [positionAt(enumEventTypeIdxOf).line + 1, createEnumContent(events) + ',' + n],
    ]

    // insert the editor. The positions change after the transaction :+1: :-)
    editor
      .edit(edit =>
        insertData.forEach(([line, text]) => edit.insert(new vscode.Position(line, 0), text)),
      )
      .then(_ => resolve())
  })
}
