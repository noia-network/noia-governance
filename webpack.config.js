const path = require('path');

module.exports = {
  entry: './sdk/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'noia-governance-sdk.js'
  }
}
