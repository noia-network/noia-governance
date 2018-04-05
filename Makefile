NETWORK=local
MODE=development

build: build-sdk

build-contracts:
	TRUFFLE_NETWORK=$(NETWORK) \
	npm run truffle -- compile

build-sdk:
	npm run webpack -- --mode $(MODE)

.PHONY: build build-contracts build-sdk

test:
	TRUFFLE_NETWORK=$(NETWORK) \
	npm run truffle -- test

.PHONY: test
