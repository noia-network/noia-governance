const path = require('path');

module.exports = {
  entry: './sdk/src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'noia-governance-sdk.js'
  }
}
