NETWORK=local

build: build-sdk

build-contracts:
	TRUFFLE_NETWORK=$(NETWORK) \
	npm run truffle -- compile

build-sdk:
	TRUFFLE_NETWORK=$(NETWORK) \
	npm run truffle -- build

.PHONY: build build-contracts build-sdk

test:
	TRUFFLE_NETWORK=$(NETWORK) \
	npm run truffle -- test

.PHONY: test
