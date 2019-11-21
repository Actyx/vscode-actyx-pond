import { TextDecoder, TextEncoder } from 'util'
import * as vscode from 'vscode'
import { extractEditorFileInfo, extractStringFileInfo, toPascalCase } from './common'

type FishFileMetaData = {
  fishName: string
  fileName: string
  hasCommand: boolean
  hasCommandType: boolean
  hasEvent: boolean
  hasEventType: boolean
  hasName: boolean
}
const parseFishDefinitionFile = (
  fileName: string,
  content: string,
): FishFileMetaData | undefined => {
  const [fishDef] = content.split('\n').filter(l => l.includes('Fish = FishType.of<State,'))
  if (!fishDef) {
    vscode.window.showWarningMessage(`can't find fish definition in ${fileName}`)
    return undefined
  }
  const hasCommand = content.includes('export type Command')
  const hasCommandType = content.includes('export enum CommandType')
  const hasEvent = content.includes('export type Event')
  const hasEventType = content.includes('export enum EventType')
  const hasName = content.includes('export const Name')
  const [fishDefName] = fishDef.substr('export const '.length).split('=')
  return {
    fishName: fishDefName.trim(),
    fileName,
    hasCommand,
    hasCommandType,
    hasEvent,
    hasEventType,
    hasName,
  }
}

export const createExportForAllFishes = async (editor: vscode.TextEditor) => {
  const uri = editor.document.uri
  const indexFileInfo = extractEditorFileInfo(editor)
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Export is only supported when you open a workspace')
    throw new Error('expect Workspace')
  }

  vscode.workspace.fs.readDirectory(vscode.Uri.parse(indexFileInfo.path)).then(
    async content => {
      const fishFiles = content.filter(
        ([name, type]) =>
          type === vscode.FileType.File &&
          name.endsWith('.ts') &&
          name.toLowerCase().includes('fish') &&
          name !== 'index.ts',
      )

      const files = await Promise.all<FishFileMetaData>(
        fishFiles.map(
          ([name]) =>
            new Promise(res =>
              vscode.workspace.fs
                .readFile(extractStringFileInfo(name, editor))
                .then(cont => res(parseFishDefinitionFile(name, new TextDecoder().decode(cont)))),
            ),
        ),
      )

      await exportToIndexTs(
        uri,
        files.filter(x => x),
      )
    },
    e => vscode.window.showErrorMessage(e),
  )
}

export const createFishExport = async (editor: vscode.TextEditor) => {
  const { window, workspace } = vscode

  const file = extractEditorFileInfo(editor)
  const workspaceFolder = workspace.getWorkspaceFolder(file.uri)
  if (!workspaceFolder) {
    window.showErrorMessage('Export is only supported when you open a workspace')
    return false
  }

  const fishDef = parseFishDefinitionFile(file.fileName, editor.document.getText())
  if (!fishDef) {
    window.showErrorMessage('Your current file do not contain a Fish definition', { modal: true })
    return
  }

  if (file.isRoot) {
    window
      .showWarningMessage<vscode.MessageItem>(
        'You are in your project root, do you like to export the fish types in your index.ts',
        { modal: true },
        { title: 'Yes', isCloseAffordance: false },
        { title: 'No', isCloseAffordance: true },
      )
      .then(async x => {
        if (x && x.title === 'Yes') {
          await exportToIndexTs(vscode.Uri.parse(file.path + '/index.ts'), [fishDef])
        }
      })
  } else {
    await exportToIndexTs(vscode.Uri.parse(file.path + '/index.ts'), [fishDef])
  }
  return true
}

const exportToIndexTs = (indexUri: vscode.Uri, fishDefs: readonly FishFileMetaData[]) => {
  return new Promise(res => {
    const { workspace } = vscode
    const createContent = (content: string) =>
      fishDefs.reduce((newContent, fishDef) => {
        return newContent.includes(fishDef.fishName)
          ? newContent
          : newContent + '\n' + createFishExportBody(fishDef)
      }, content)

    workspace.openTextDocument(indexUri).then(
      doc => {
        const content = doc.getText()
        const newContent = createContent(content)
        if (content === newContent) {
          res()
        }

        workspace.fs.writeFile(indexUri, new TextEncoder().encode(newContent)).then(_ => res())
      },
      _ => {
        const newContent = createContent('')
        workspace.fs.writeFile(indexUri, new TextEncoder().encode(newContent)).then(__ => res())
      },
    )
  })
}

const createFishExportBody = (fishDef: FishFileMetaData): string => {
  const [filename] = fishDef.fileName.split('.ts')
  const fishName = fishDef.fishName
  const name = toPascalCase(
    fishName.endsWith('Fish') ? fishName.substr(0, fishName.length - 4) : fishName,
  )
  const optionalContent = [
    `  ${fishDef.hasCommand ? `Command as ${name}Command,` : ''}`,
    `  ${fishDef.hasCommandType ? `CommandType as ${name}CommandType,` : ''}`,
    `  ${fishDef.hasEvent ? `Event as ${name}Event,` : ''}`,
    `  ${fishDef.hasEventType ? `EventType as ${name}EventType,` : ''}`,
    `  ${fishDef.hasName ? `Name as ${name}Name,` : ''}`,
  ]
    .filter(x => x.trim())
    .join('\n')

  const defaultContent = `export {
  ${name}Fish,${optionalContent ? '\n' + optionalContent : ''}
  State as ${name}State,
  PublicState as Public${name}State,
} from './${filename}'
`
  return defaultContent
}
