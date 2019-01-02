var Regulator = artifacts.require("./Regulator.sol");
var TollBoothOperator = artifacts.require("./TollBoothOperator.sol");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(Regulator);
  // Regulator.new({ from: accounts[0] })
  // .then(function(instance){
  //   Regulator.address = instance.address;
  //   console.log("Regulator:",instance.address);
  //   return instance.createNewOperator(accounts[1], 50, {from:accounts[0]});
  // })
  // .then(function(tx){
  //   var newOperator = tx.logs[1].args.newOperator;
  //   console.log("OPeratoer: ", newOperator);
  //   return TollBoothOperator.at(newOperator).setPaused(false, {from:accounts[1]});
  // })
};