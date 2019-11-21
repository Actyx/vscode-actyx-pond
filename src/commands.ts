import * as vscode from 'vscode'
import {
  createEnum,
  createEnumContent,
  createTypes,
  createUnion,
  createUnionContent,
  Definitions,
  eol,
  TextPos,
} from './common'

const ON_COMMAND_IDENTIFIER = 'export const onCommand: OnCommand<State, Command, Event> = ('
const ENUM_COMMAND_TYPE_IDENTIFIER = 'export enum CommandType {'
const TYPE_COMMAND_IDENTIFIER = 'export type Command ='
const SWITCH_CASE_IDENTIFIER = (n: string) => 'Command) => {' + n + '  switch (command.type) {'
const header = (n: string) => '/**' + n + ' * Fish Commands' + n + ' */' + n + ''

const createOnCommandCases = (defs: Definitions, n: string): string =>
  defs.map(d => `    case CommandType.${d.name}: {${n}      return []${n}    }`).join(n)

const createOnCommandFunction = (defs: Definitions, n: string) => {
  const definition =
    'export const onCommand: OnCommand<State, Command, Event> = (_state: State, command: Command) => {'
  const sw = `  switch (command.type) {${n}${createOnCommandCases(defs, n)}${n}  }${n}  return []`
  return definition + n + sw + n + '}'
}

export const buildCommands = async (
  editor: vscode.TextEditor,
  pos: TextPos,
  commands: Definitions,
) => {
  return new Promise(async resolve => {
    const idx = editor.document.getText().indexOf(ON_COMMAND_IDENTIFIER)
    if (idx === -1) {
      editor
        .edit(edit => {
          const n = eol(editor.document)
          edit.insert(
            pos,
            header(n) +
              createEnum('Command', commands) +
              createTypes('Command', commands) +
              createUnion('Command', commands) +
              n +
              createOnCommandFunction(commands, n),
          )
        })
        .then(_ => resolve())
    } else {
      await updateCommandStructure(editor, commands)
      resolve()
    }
  })
}

const updateCommandStructure = (
  editor: vscode.TextEditor,
  commands: Definitions,
): Promise<void> => {
  return new Promise(resolve => {
    const {
      document,
      document: { getText, positionAt, lineAt },
    } = editor

    const n = eol(document)
    // find positions in text
    const enumCommandTypeIdxOf = getText().indexOf(ENUM_COMMAND_TYPE_IDENTIFIER)
    if (enumCommandTypeIdxOf === -1) {
      vscode.window.showInformationMessage(
        'enum CommandType is not existing in your fish definition',
      )
      return
    }

    const typeCommandIdxOf = getText().indexOf(TYPE_COMMAND_IDENTIFIER)
    if (typeCommandIdxOf === -1) {
      vscode.window.showInformationMessage('type Command is not existing in your fish definition')
      return
    }

    const switchCaseIdxOf = getText().indexOf(SWITCH_CASE_IDENTIFIER(n))
    if (switchCaseIdxOf === -1) {
      vscode.window.showInformationMessage('onCommand switch-case not found')
      return
    }

    // helper to move to the end of the Type Enumeration
    const getEnumEnd = (lineNr: number): number =>
      lineAt(lineNr).text.endsWith('}') ? lineNr : getEnumEnd(lineNr + 1)

    // map of all data to insert in the editor
    const insertData: ReadonlyArray<readonly [number, string]> = [
      [positionAt(switchCaseIdxOf).line + 2, createOnCommandCases(commands, n) + n],
      [positionAt(typeCommandIdxOf).line + 1, createUnionContent('Command', commands) + n],
      [getEnumEnd(positionAt(enumCommandTypeIdxOf).line) + 1, createTypes('Command', commands)],
      [positionAt(enumCommandTypeIdxOf).line + 1, createEnumContent(commands) + ',' + n],
    ]

    // insert the editor. The positions change after the transaction :+1: :-)
    editor
      .edit(edit =>
        insertData.forEach(([line, text]) => edit.insert(new vscode.Position(line, 0), text)),
      )
      .then(_ => resolve())
  })
}
