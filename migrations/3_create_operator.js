var Regulator = artifacts.require("./Regulator.sol");
var TollBoothOperator = artifacts.require("./TollBoothOperator.sol");

module.exports = function(deployer, network, accounts) {
  var meta;
  Regulator.deployed().then(function(instance){
    meta = instance
    return instance.createNewOperator(accounts[1], 50, {from:accounts[0]});
  })
  .then(function(tx){
    var newOperator = tx.logs[1].args.newOperator;
    return TollBoothOperator.at(newOperator).setPaused(false, {from:accounts[1]});
  });
};