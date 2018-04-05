# Setup

## Download and setup ganache-cli

https://github.com/trufflesuite/ganache-cli

## Create config.js

Checkout example at example-config.js

# Test

1. Run ganache-cli
2. `make test`


# Build

```
$ make build
```

# Deployment

## Fresh deployment on ropsten

```
$ TRUFFLE_NETWORK=ropsten npm run truffle migrate --reset
```
