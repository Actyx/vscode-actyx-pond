import * as assert from 'assert'
import * as vscode from 'vscode'
import { createTypes, createUnion } from '../../common'

suite('BuildDefinition test', () => {
  test('createUnion', () => {
    assert.equal(
      createUnion('Event', [{ name: 'login', parameters: [] }]),
      'export type Event =\n  | LoginEvent\n',
    )
    assert.equal(
      createUnion('Event', [
        { name: 'login', parameters: [] },
        { name: 'logoff', parameters: [] },
        { name: 'restart', parameters: [] },
      ]),
      'export type Event =\n  | LoginEvent\n  | LogoffEvent\n  | RestartEvent\n',
    )
  })
  test('createTypes', () => {
    assert.equal(
      createTypes('Event', [{ name: 'login', parameters: [] }]),
      'export type LoginEvent = {\n  type: EventType.login\n}\n',
    )

    assert.equal(
      createTypes('Event', [
        { name: 'login', parameters: [] },
        { name: 'logoff', parameters: [] },
        { name: 'restart', parameters: [] },
      ]),
      'export type LoginEvent = {\n  type: EventType.login\n}\nexport type LogoffEvent = {\n  type: EventType.logoff\n}\nexport type RestartEvent = {\n  type: EventType.restart\n}\n',
    )
  })
  test('createTypes one with params', () => {
    assert.equal(
      createTypes('Event', [
        {
          name: 'login',
          parameters: [
            { name: 'username', dataType: 'string' },
            { name: 'password', dataType: 'string' },
          ],
        },
      ]),
      'export type LoginEvent = {\n  type: EventType.login\n  username: string\n  password: string\n}\n',
    )
  })
  test('createTypes many with params', () => {
    assert.equal(
      createTypes('Event', [
        {
          name: 'login',
          parameters: [
            { name: 'username', dataType: 'string' },
            { name: 'password', dataType: 'string' },
          ],
        },
        {
          name: 'logoff',
          parameters: [
            { name: 'username', dataType: 'string' },
            { name: 'terminal', dataType: 'string' },
          ],
        },
        {
          name: 'restart',
          parameters: [{ name: 'terminal', dataType: 'string' }],
        },
        {
          name: 'powerOff',
          parameters: [
            { name: 'username', dataType: 'string' },
            { name: 'terminal', dataType: 'string' },
          ],
        },
      ]),
      'export type LoginEvent = {\n  type: EventType.login\n  username: string\n  password: string\n}\nexport type LogoffEvent = {\n  type: EventType.logoff\n  username: string\n  terminal: string\n}\nexport type RestartEvent = {\n  type: EventType.restart\n  terminal: string\n}\nexport type PowerOffEvent = {\n  type: EventType.powerOff\n  username: string\n  terminal: string\n}\n',
    )
  })
})
