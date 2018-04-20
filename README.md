# Setup

## Download and setup ganache-cli

https://github.com/trufflesuite/ganache-cli

## Create config.js

Checkout example at example-config.js

# Build

```
$ make build
```

# Test Locally

1. Run ganache-cli
2. `$ make test`

# Deployment

## Fresh deployment on ropsten

```
$ TRUFFLE_NETWORK=ropsten npm run truffle migrate -- --reset
```

## Test Deployed Contracts Using SDK

```
$ make test-sdk-e2e NETWORK=ropsten
```
