

import {isPath, isJSON} from '../payloadUtil'

test("isPath('./foo/bar')", () => {
  expect(isPath('./foo/bar')).toBeTruthy()
})
test("isPath('/foo/bar')", () => {
  expect(isPath('/foo/bar')).toBeTruthy()
})
test("isPath('foo/bar')", () => {
  expect(isPath('foo/bar')).toBeTruthy()
})
test(`isPath('{"foo":"bar"}')`, () => {
  expect(isPath('{"foo":"bar"}')).not.toBeTruthy()
})
test(`isPath('[{"foo":"bar"}]')`, () => {
  expect(isPath('[{"foo":"bar"}]')).not.toBeTruthy()
})

test(`isJSON('{"foo":"bar"}')`, () => {
  expect(isJSON('{"foo":"bar"}')).toBeTruthy()
})
test(`isJSON('[{"foo":"bar"}]')`, () => {
  expect(isJSON('[{"foo":"bar"}]')).toBeTruthy()
})

test(`isJSON('[{"foo":"bar"\n}]')`, () => {
  expect(isJSON('[{"foo":"bar"\n}]')).toBeTruthy()
})
test(`isJSON('[{"foo":"bar"}')`, () => {
  expect(isJSON('[{"foo":"bar"}')).not.toBeTruthy()
})
test(`isJSON('{"foo":"bar"}]')`, () => {
  expect(isJSON('{"foo":"bar"}]')).not.toBeTruthy()
})
