import * as assert from 'assert'

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode'
import { removeFileExtension, toPascalCase } from '../../common'
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
})
