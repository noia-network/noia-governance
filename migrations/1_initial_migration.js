var Migrations = artifacts.require("./Migrations.sol");
var SampleToken = artifacts.require("./test/SampleToken.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(SampleToken, 0);
};
