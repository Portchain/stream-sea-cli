const moment = require('moment')
const diff = require('jest-diff')
const logger = require('logacious')()

// Disable logacious logging
logger.disable()

// Add toEqualDate matcher
// https://gist.github.com/robwise/1b36656e6ed7645ae33716dfb19fb60a
// https://facebook.github.io/jest/docs/expect.html#expectextendmatchers
expect.extend({
  toEqualDate(unparsedReceived, unparsedExpected) {
    const received = moment(unparsedReceived)
    const expected = moment(unparsedExpected)

    const receivedAsString = received.toISOString()
    const expectedAsString = expected.toISOString()

    const pass = received.isSame(expected)

    const message = pass
      ? () =>
          `${this.utils.matcherHint('.not.toBe')}\n\n` +
          'Expected moment not to be:\n' +
          `  ${this.utils.printExpected(expectedAsString)}\n` +
          'Received:\n' +
          `  ${this.utils.printReceived(receivedAsString)}`
      : () => {
          const diffString = diff(expectedAsString, receivedAsString, {
            expand: this.expand,
          })
          return (
            `${this.utils.matcherHint('.toBe')}\n\n` +
            'Expected moment to be:\n' +
            `  ${this.utils.printExpected(expectedAsString)}\n` +
            'Received:\n' +
            `  ${this.utils.printReceived(receivedAsString)}${diffString ? `\n\nDifference:\n\n${diffString}` : ''}`
          )
        }
    return { actual: received, message, pass }
  },
})
