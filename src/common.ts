import { EOL } from 'os'
import * as vscode from 'vscode'

export const getFileName = (editor: vscode.TextEditor): string =>
  editor.document.uri.fsPath.split(/[\/\\]/).slice(-1)[0] || ''

export const removeFileExtension = (filename: string): string =>
  filename
    .split('.')
    .slice(0, -1)
    .join('.')

export const toPascalCase = (str: string): string => {
  const [first = '', ...rest] = str
  return `${first.toUpperCase()}${rest.join('')}`
}
export const toDefPascalCase = (def: Definition): string => toPascalCase(def.name)

export const toSemantics = (str: string): string => {
  const [first = '', ...rest] = str
  return `${first.toLowerCase()}${rest.join('')}`
}

const getLastSeparator = (path: string): number => {
  const lastSl = path.lastIndexOf('/')
  const lastBackSl = path.lastIndexOf('\\')
  return Math.max(lastSl, lastBackSl)
}

export const extractEditorFileInfo = (editor: vscode.TextEditor) => {
  const file = editor.document.uri.toString()
  const relFilePath = vscode.workspace.asRelativePath(editor.document.uri)
  const wsPath = vscode.workspace.getWorkspaceFolder(editor.document.uri)!.uri.toString()

  const lastSeparatorFilePath = getLastSeparator(relFilePath)
  const lastSeparator = getLastSeparator(file)

  const relPath = relFilePath.substr(0, lastSeparatorFilePath)
  const fileName = file.substr(lastSeparator + 1)
  const [fishName] = fileName.split('.')

  const res = {
    uri: editor.document.uri,
    fileName,
    fishName,
    relFilePath,
    file,
    relPath,

    path: wsPath + '/' + relPath,
    pathUri: vscode.Uri.parse(wsPath + '/' + relPath),
    isRoot: lastSeparatorFilePath === -1,
  }
  return res
}

export const extractStringFileInfo = (file: string, editor: vscode.TextEditor) => {
  const currentFile = extractEditorFileInfo(editor)
  return vscode.Uri.parse(currentFile.path + '/' + file)
}

export const consumeSelectedBlock = (
  editor: vscode.TextEditor,
): Promise<readonly [string, TextPos]> => {
  return new Promise(resolve => {
    const selection = editor.selection
    const { start, end } = selection
    const lineLength = editor.document.lineAt(end.line).text.length
    const selectionRange = new vscode.Range(start.line, 0, end.line, lineLength)
    const selectedText = editor.document.getText(selectionRange)
    editor
      .edit(edit => {
        edit.delete(selectionRange)
      })
      .then(_ => resolve([selectedText, start]))
  })
}

export type Parameter = {
  name: string
  dataType: string
}
export type Definition = {
  name: string
  parameters: ReadonlyArray<Parameter>
}
export type Definitions = ReadonlyArray<Definition>
export type TextPos = vscode.Position

export const convertToDefinitions = (definition: string): Definitions => {
  return definition
    .replace(/(\r\n)/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length && !line.startsWith('//'))
    .map(line => {
      const [name, param = ''] = line
        .replace(')', '')
        .split('(')
        .map(x => x.trim())
      const parameters = param
        .split(',')
        .map(par => par.trim())
        .filter(par => par && par.trim() !== ':')
        .map(params => {
          const [paramName, dataType = 'unknown'] = params.split(':').map(x => x.trim())
          return { name: paramName, dataType: dataType || 'unknown' }
        })
      return { name, parameters }
    })
}
type Type = 'Event' | 'Command'

export const createEnumContent = (def: Definitions): string =>
  def
    .map(x => `${x.name} = "${x.name}"`)
    .map(x => '\t' + x)
    .join(',\n')

export const createEnum = (t: Type, def: Definitions): string =>
  `export enum ${t}Type {\n${createEnumContent(def)}\n}\n`

export const createTypes = (t: Type, defs: Definitions): string => {
  return defs.map(def => createType(t, def)).join('\n') + '\n'
}

const createType = (t: Type, def: Definition): string => {
  const content: ReadonlyArray<any> = [
    `\ttype: ${t}Type.${def.name}`,
    ...def.parameters.map(x => `\t${x.name}: ${x.dataType}`),
  ]
  return `export type ${toDefPascalCase(def)}${t} = {\n${content.join('\n')}\n}`
}
export const createUnionContent = (t: Type, defs: Definitions): string =>
  defs
    .map(toDefPascalCase)
    .map(x => '\t| ' + x + t)
    .join('\n')

export const createUnion = (t: Type, defs: Definitions): string => {
  return `export type ${t} =\n${createUnionContent(t, defs)}\n`
}

export const eol = (document: vscode.TextDocument) =>
  document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n'
