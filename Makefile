export NETWORK=local
MODE=development

build: build-sdk

build-contracts:
	npm run truffle -- compile

build-sdk: build-contracts
	npm run webpack -- --mode $(MODE)

.PHONY: build build-contracts build-sdk

ifeq ($(CONTRACTS_TESTS),)
CONTRACTS_TESTS=test/contracts/all.js
endif

ifeq ($(SDK_TESTS),)
SDK_TESTS=test/sdk/all.js
endif

test: test-contracts test-sdk

test-contracts:
	npm run truffle test -- $(CONTRACTS_TESTS)

test-sdk: build-contracts
	npm run truffle test -- $(SDK_TESTS)

test-sdk-e2e: build-contracts
	mocha test -- $(SDK_TESTS)

.PHONY: test test-contracts test-sdk test-sdk-e2e
