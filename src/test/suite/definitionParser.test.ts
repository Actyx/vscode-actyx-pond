import * as assert from 'assert'
import * as vscode from 'vscode'
import { convertToDefinitions, toDefPascalCase } from '../../definitionParser'

suite('DefinitionParser test', () => {
  test('toDefPascalCase', () => {
    assert.equal(toDefPascalCase({ name: 'overViewFish', parameters: [] }), 'OverViewFish')
    assert.equal(toDefPascalCase({ name: 'OverViewFish', parameters: [] }), 'OverViewFish')
    assert.equal(toDefPascalCase({ name: '_verViewFish', parameters: [] }), '_verViewFish')
    assert.equal(toDefPascalCase({ name: '', parameters: [] }), '')
    assert.equal(toDefPascalCase({ name: 'O', parameters: [] }), 'O')
  })

  test('convertToDefinitions empty', () => {
    assert.equal(convertToDefinitions('// test\n        \n\n').length, 0)
  })

  test('convertToDefinitions no params', () => {
    assert.deepEqual(convertToDefinitions('login'), [{ name: 'login', parameters: [] }])
    assert.deepEqual(convertToDefinitions('login()'), [{ name: 'login', parameters: [] }])
    assert.deepEqual(convertToDefinitions('login()logoff'), [
      { name: 'login', parameters: [] },
      { name: 'logoff', parameters: [] },
    ])
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
    assert.deepEqual(convertToDefinitions('login(:)'), [{ name: 'login', parameters: [] }])
    assert.deepEqual(convertToDefinitions('login( :)'), [{ name: 'login', parameters: [] }])
    assert.deepEqual(convertToDefinitions('login(: )'), [{ name: 'login', parameters: [] }])
    assert.deepEqual(convertToDefinitions('login( : )'), [{ name: 'login', parameters: [] }])
    assert.deepEqual(convertToDefinitions('login(name:)'), [
      { name: 'login', parameters: [{ name: 'name', dataType: 'unknown' }] },
    ])
    assert.deepEqual(convertToDefinitions('login(name :)'), [
      { name: 'login', parameters: [{ name: 'name', dataType: 'unknown' }] },
    ])
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

  test('convertToDefinitions params with complex Types', () => {
    assert.deepEqual(convertToDefinitions('login(name: {first:string, last:string} )'), [
      { name: 'login', parameters: [{ name: 'name', dataType: '{first:string, last:string}' }] },
    ])
    assert.deepEqual(
      convertToDefinitions('login(name: {\n  first:string,\n  last:string\n}\n, age: number )'),
      [
        {
          name: 'login',
          parameters: [
            { name: 'name', dataType: '{\n  first:string,\n  last:string\n}' },
            { name: 'age', dataType: 'number' },
          ],
        },
      ],
    )
  })
})

