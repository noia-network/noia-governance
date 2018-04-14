export NETWORK=local
MODE=development

build: build-sdk

build-contracts:
	npm run truffle -- compile

build-sdk: build-contracts
	npm run webpack -- --mode $(MODE)

.PHONY: build build-contracts build-sdk

test: test-contracts test-sdk

test-contracts:
	npm run truffle test -- test/contracts/all.js

test-sdk: build-contracts
	npm run truffle test -- test/sdk/all.js

.PHONY: test test-contracts test-sdk
