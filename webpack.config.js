const path = require('path');

module.exports = {
  entry: './src/sdk.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'noia-governance-sdk.js'
  }
}
