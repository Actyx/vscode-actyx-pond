import * as assert from 'assert'

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode'
import {
  convertToDefinitions,
  removeFileExtension,
  toDefPascalCase,
  toPascalCase,
} from '../../common'
// import * as myExtension from '../extension';

suite('Common test', () => {
  vscode.window.showInformationMessage('Start common utils tests.')

  test('removeFileExtension', () => {
    assert.equal(removeFileExtension(''), '')
    assert.equal(removeFileExtension('file.ts'), 'file')
    assert.equal(removeFileExtension('file.test.ts'), 'file.test')
  })

  test('toPascalCase', () => {
    assert.equal(toPascalCase('overViewFish'), 'OverViewFish')
    assert.equal(toPascalCase('OverViewFish'), 'OverViewFish')
    assert.equal(toPascalCase('_verViewFish'), '_verViewFish')
    assert.equal(toPascalCase(''), '')
    assert.equal(toPascalCase('O'), 'O')
  })

  test('toDefPascalCase', () => {
    assert.equal(toDefPascalCase({ name: 'overViewFish', parameters: [] }), 'OverViewFish')
    assert.equal(toDefPascalCase({ name: 'OverViewFish', parameters: [] }), 'OverViewFish')
    assert.equal(toDefPascalCase({ name: '_verViewFish', parameters: [] }), '_verViewFish')
    assert.equal(toDefPascalCase({ name: '', parameters: [] }), '')
    assert.equal(toDefPascalCase({ name: 'O', parameters: [] }), 'O')
  })

  test('convertToDefinitions empty', () => {
    assert.equal(convertToDefinitions('').length, 0)
  })

  test('convertToDefinitions no params', () => {
    assert.deepEqual(convertToDefinitions('login'), [{ name: 'login', parameters: [] }])
    assert.deepEqual(convertToDefinitions('login()'), [{ name: 'login', parameters: [] }])
    assert.deepEqual(convertToDefinitions('login\nlogoff'), [
      { name: 'login', parameters: [] },
      { name: 'logoff', parameters: [] },
    ])
    assert.deepEqual(convertToDefinitions('\rlogin\r\n\n\r\nlogoff\n\n\r'), [
      { name: 'login', parameters: [] },
      { name: 'logoff', parameters: [] },
    ])
  })

  test('convertToDefinitions params no type', () => {
    assert.deepEqual(convertToDefinitions('login()'), [{ name: 'login', parameters: [] }])
    assert.deepEqual(convertToDefinitions('login(name)'), [
      { name: 'login', parameters: [{ name: 'name', dataType: 'unknown' }] },
    ])
    assert.deepEqual(convertToDefinitions('login(name, device)\nlogoff(name)'), [
      {
        name: 'login',
        parameters: [
          { name: 'name', dataType: 'unknown' },
          { name: 'device', dataType: 'unknown' },
        ],
      },
      { name: 'logoff', parameters: [{ name: 'name', dataType: 'unknown' }] },
    ])

    assert.deepEqual(convertToDefinitions('login(name, device,)\nlogoff(,)'), [
      {
        name: 'login',
        parameters: [
          { name: 'name', dataType: 'unknown' },
          { name: 'device', dataType: 'unknown' },
        ],
      },
      { name: 'logoff', parameters: [] },
    ])
  })

  test('convertToDefinitions params with type', () => {
    assert.deepEqual(convertToDefinitions('login( : )'), [{ name: 'login', parameters: [] }])
    assert.deepEqual(convertToDefinitions('login(name : )'), [
      { name: 'login', parameters: [{ name: 'name', dataType: 'unknown' }] },
    ])
    assert.deepEqual(convertToDefinitions('login(name : string, device : Device)\nlogoff(name)'), [
      {
        name: 'login',
        parameters: [
          { name: 'name', dataType: 'string' },
          { name: 'device', dataType: 'Device' },
        ],
      },
      { name: 'logoff', parameters: [{ name: 'name', dataType: 'unknown' }] },
    ])
  })
})
