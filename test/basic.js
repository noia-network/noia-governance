var SampleToken = artifacts.require("./test/SampleToken.sol");

contract('Basic', function (accounts) {
  let sampleToken;
  let acc0 = accounts[0];
  let acc1 = accounts[1];

  before(async () => {
    sampleToken = await SampleToken.deployed();
    await sampleToken.createTokens(acc0, 1000, 0, { from: acc0 });
    assert.equals((await sampleToken.balanceOf.call(acc1)).valueOf(), 100);
  });

  it("transfer 100 sample tokens t0 acc1", async () => {
    assert.isTrue((await sampleToken.transfer(acc1, 100, { from: acc0 })).valueOf);
    let newBalance = await sampleToken.balanceOf().call(acc1);
    assert.equals(newBalance.valueOf, 100);
  });
});
