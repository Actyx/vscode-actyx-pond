import { stringify } from 'querystring'
import * as vscode from 'vscode'
import { toPascalCase } from './common'

export const toDefPascalCase = (def: Definition): string => toPascalCase(def.name)

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

type TokenType = 'Name' | 'StartParams' | 'EndParams' | 'Parameter' | 'Type'

type Token = {
  tokenType: TokenType
  text: string
  extTokenLvl: number
}
type Tokens = readonly Token[]
export const cleanupInput = (definition: string): string =>
  definition
    .replace(/(\r\n)/g, '\n')
    .split('\n')
    .filter(l => !l.trim().startsWith('//'))
    .join('\n')
    .trim()

const cca = 'a'.charCodeAt(0)
const ccz = 'z'.charCodeAt(0)
const ccA = 'A'.charCodeAt(0)
const ccZ = 'Z'.charCodeAt(0)
const ccNl = '\n'.charCodeAt(0)
const ccOB = '('.charCodeAt(0)
const ccCB = ')'.charCodeAt(0)
const ccOC = '{'.charCodeAt(0)
const ccCC = '}'.charCodeAt(0)
const ccComma = ','.charCodeAt(0)
const ccCol = ':'.charCodeAt(0)
const ccSp = ' '.charCodeAt(0)
const ccTa = '\t'.charCodeAt(0)

const newToken = (tokenType: TokenType, char?: number): Token => ({
  tokenType,
  text: char === undefined ? '' : String.fromCharCode(char),
  extTokenLvl: char === ccOC ? 1 : 0,
})

const appendTokenText = ({ tokenType, text, extTokenLvl }: Token, char: number): Token => ({
  tokenType,
  text:
    extTokenLvl === 0 && [undefined, ccNl, ccSp, ccTa].includes(char)
      ? text
      : text + String.fromCharCode(char),
  extTokenLvl: char === ccOC ? extTokenLvl + 1 : char === ccCC ? extTokenLvl - 1 : extTokenLvl,
})

const parseNameNext = (char: number, tokens: Tokens, lastToken: Token) => {
  switch (char) {
    case ccNl:
      return {
        tokens: [...tokens, lastToken],
        lastToken: newToken('Name'),
      }
    case ccOB:
      return {
        tokens: [...tokens, lastToken, newToken('StartParams')],
        lastToken: newToken('Parameter'),
      }
    default:
      return {
        tokens,
        lastToken: appendTokenText(lastToken, char),
      }
  }
}
const parseParameterNext = (char: number, tokens: Tokens, lastToken: Token) => {
  switch (char) {
    case ccCB:
      return {
        tokens: [...tokens, lastToken],
        lastToken: newToken('EndParams'),
      }
    case ccComma:
      return {
        tokens: [...tokens, lastToken],
        lastToken: newToken('Parameter'),
      }
    case ccCol:
      return {
        tokens: [...tokens, lastToken],
        lastToken: newToken('Type'),
      }
    default:
      return {
        tokens,
        lastToken: appendTokenText(lastToken, char),
      }
  }
}
const parseTypeNext = (char: number, tokens: Tokens, lastToken: Token) => {
  switch (char) {
    case ccCB:
      return {
        tokens: [...tokens, lastToken],
        lastToken: newToken('EndParams'),
      }
    case ccComma:
      if (lastToken.extTokenLvl === 0) {
        return {
          tokens: [...tokens, lastToken],
          lastToken: newToken('Parameter'),
        }
      } else {
        return {
          tokens,
          lastToken: appendTokenText(lastToken, char),
        }
      }
    default:
      return {
        tokens,
        lastToken: appendTokenText(lastToken, char),
      }
  }
}
const parseEndParamsNext = (char: number, tokens: Tokens, lastToken: Token) => {
  return {
    tokens: [...tokens, lastToken],
    lastToken: newToken('Name', char),
  }
}
export const tokenizeDefinitions = (definition: string): Tokens => {
  const input = cleanupInput(definition)

  const tokenized = [...input]
    .map(c => c.charCodeAt(0))
    .reduce(
      ({ tokens, lastToken }, char) => {
        switch (lastToken.tokenType) {
          case 'Name':
            return parseNameNext(char, tokens, lastToken)
          case 'Parameter':
            return parseParameterNext(char, tokens, lastToken)
          case 'Type':
            return parseTypeNext(char, tokens, lastToken)
          case 'EndParams':
            return parseEndParamsNext(char, tokens, lastToken)
          default:
            return {
              tokens,
              lastToken,
            }
        }
      },
      {
        tokens: [] as readonly Token[],
        lastToken: newToken('Name'),
      },
    )

  return [...tokenized.tokens, tokenized.lastToken]
}
// tslint:disable-next-line: readonly-array
type TokensArray = Tokens[]

const splitDefinitions = (split: TokensArray, rest: readonly Token[]): TokensArray => {
  const nextDef = rest.findIndex((t, i) => i > 0 && t.tokenType === 'Name')
  if (nextDef === -1) {
    return [...split, rest]
  }

  return splitDefinitions([...split, rest.slice(0, nextDef)], rest.slice(nextDef))
}

export const buildDefinition = (tokens: Tokens): Definition => {
  const defs = tokens.reduce(
    ({ name, parameters }, t): Definition => {
      switch (t.tokenType) {
        case 'Name':
          return {
            name: t.text.trim(),
            parameters,
          }
        case 'Parameter':
          return {
            name,
            parameters: [...parameters, { name: t.text.trim(), dataType: 'unknown' }],
          }
        case 'Type':
          if (parameters[parameters.length - 1]) {
            // tslint:disable-next-line: no-object-mutation
            parameters[parameters.length - 1].dataType = t.text || 'unknown'
          }
          return {
            name,
            parameters,
          }
        default:
          return { name, parameters }
      }
    },
    { name: '', parameters: [] } as Definition,
  )
  return {
    name: defs.name,
    parameters: defs.parameters.filter(p => p.name),
  }
}
export const convertToDefinitions = (definition: string): Definitions => {
  const tokenized = tokenizeDefinitions(definition)

  return splitDefinitions([], tokenized)
    .map(buildDefinition)
    .filter(d => Boolean(d.name))
}
