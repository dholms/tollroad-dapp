const expectedExceptionPromise = require("../utils/expectedException.js");
web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");
Promise = require("bluebird");
Promise.allNamed = require("../utils/sequentialPromiseNamed.js");
const randomIntIn = require("../utils/randomIntIn.js");
const toBytes32 = require("../utils/toBytes32.js");

if (typeof web3.eth.getAccountsPromise === "undefined") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

const Regulator = artifacts.require("./Regulator.sol");
const TollBoothOperator = artifacts.require("./TollBoothOperator.sol");

contract('TollBoothOperator', function(accounts) {

    let regulatorOwner, operatorOwner,
        booth1, booth2,
        vehicle1, vehicle2,
        regulator, operator
    const deposit = randomIntIn(1, 1000);
    const vehicleType1 = randomIntIn(1, 1000);
    const vehicleType2 = vehicleType1 + randomIntIn(1, 1000);
    const multiplier1 = randomIntIn(1, 1000);
    const multiplier2 = multiplier1 + randomIntIn(1, 1000);
    const tmpSecret = randomIntIn(1, 1000);
    const secret0 = toBytes32(tmpSecret);
    const secret1 = toBytes32(tmpSecret + randomIntIn(1, 1000));
    let hashed0, hashed1;

    before("should prepare", function() {
        assert.isAtLeast(accounts.length, 6);
        regulatorOwner = accounts[0];
        operatorOwner = accounts[1];
        booth1 = accounts[2];
        booth2 = accounts[3];
        vehicle1 = accounts[4];
        vehicle2 = accounts[5];
    });

    describe("Vehicle Operations", function() {

        beforeEach("should deploy regulator and operator", function() {
            return Regulator.new({ from: regulatorOwner })
                .then(instance => regulator = instance)
                .then(() => regulator.setVehicleType(vehicle1, vehicleType1, { from: regulatorOwner }))
                .then(tx => regulator.setVehicleType(vehicle2, vehicleType2, { from: regulatorOwner }))
                .then(tx => regulator.createNewOperator(operatorOwner, deposit, { from: regulatorOwner }))
                .then(tx => operator = TollBoothOperator.at(tx.logs[1].args.newOperator))
                .then(() => operator.addTollBooth(booth1, { from: operatorOwner }))
                .then(tx => operator.addTollBooth(booth2, { from: operatorOwner }))
                .then(tx => operator.setMultiplier(vehicleType1, multiplier1, { from: operatorOwner }))
                .then(tx => operator.setMultiplier(vehicleType2, multiplier2, { from: operatorOwner }))                
                .then(tx => operator.setPaused(false, { from: operatorOwner }))
                .then(tx => operator.hashSecret(secret0))
                .then(hash => hashed0 = hash)
                .then(tx => operator.hashSecret(secret1))
                .then(hash => hashed1 = hash);
        });

        describe("Scenario 1", function() {
            it("should not refund a vehicle that pays that exact price", function() {            
                return operator.setRoutePrice(booth1, booth2, deposit, { from: operatorOwner })
                    .then(tx=>{
                        return operator.enterRoad(booth1, hashed0, { from: vehicle1, value: (deposit * multiplier1)})
                    })                    
                    .then(tx => {                   
                        return web3.eth.getBalancePromise(operator.address);
                    })                    
                    .then(balance=> {
                        assert.strictEqual(balance.toNumber(), deposit * multiplier1, "Toll booth did not get full payment");
                        return operator.reportExitRoad(secret0,{from:booth2});
                    })
                    .then(tx => {                   
                        return web3.eth.getBalancePromise(operator.address);
                    })
                    .then(balance => {
                        assert.strictEqual(balance.toNumber(), deposit * multiplier1, "Vehicle should not have been refunded")
                    });
            });
        });

        describe("Scenario 2", function() {
            it("should not refund a vehicle that pays less than the price", function() {            
                return operator.setRoutePrice(booth1, booth2, deposit+1, { from: operatorOwner })
                    .then(tx=>{
                        return operator.enterRoad(booth1, hashed0, { from: vehicle1, value: (deposit * multiplier1)})
                    })
                    .then(tx => {                   
                        return web3.eth.getBalancePromise(operator.address);
                    })                    
                    .then(balance=> {
                        assert.strictEqual(balance.toNumber(), deposit * multiplier1, "Toll booth did not get full payment");
                        return operator.reportExitRoad(secret0,{from:booth2});
                    })
                    .then(tx => {                   
                        return web3.eth.getBalancePromise(operator.address);
                    })
                    .then(balance => {
                        assert.strictEqual(balance.toNumber(), deposit * multiplier1, "Vehicle should not have been refunded")
                    });
            });
        });

        describe("Scenario 3", function() {
            it("should refund a vehicle that pays more than the price", function() {            
                return operator.setRoutePrice(booth1, booth2, deposit - 1, { from: operatorOwner })
                    .then(tx=>{
                        return operator.enterRoad(booth1, hashed0, { from: vehicle1, value: (deposit * multiplier1)})
                    })
                    .then(tx => {                   
                        return web3.eth.getBalancePromise(operator.address);
                    })                    
                    .then(balance=> {
                        assert.strictEqual(balance.toNumber(), deposit * multiplier1, "Toll booth did not get full payment");
                        return operator.reportExitRoad(secret0,{from:booth2});
                    })
                    .then(tx => {                   
                        return web3.eth.getBalancePromise(operator.address);
                    })
                    .then(balance => {
                        assert.strictEqual(balance.toNumber(), (deposit-1) * multiplier1, "Vehicle should have been refunded")
                    });
            });
        });

        describe("Scenario 4", function() {
            it("should refund a vehicle that deposits and pays more than the price", function() {            
                return operator.setRoutePrice(booth1, booth2, deposit, { from: operatorOwner })
                    .then(tx=>{
                        return operator.enterRoad(booth1, hashed0, { from: vehicle1, value: (deposit * multiplier1) + 1})
                    })
                    .then(tx => {                   
                        return web3.eth.getBalancePromise(operator.address);
                    })                    
                    .then(balance=> {
                        assert.strictEqual(balance.toNumber(), deposit * multiplier1 + 1, "Toll booth did not get full payment");
                        return operator.reportExitRoad(secret0,{from:booth2});
                    })
                    .then(tx => {                   
                        return web3.eth.getBalancePromise(operator.address);
                    })
                    .then(balance => {
                        assert.strictEqual(balance.toNumber(), deposit * multiplier1, "Vehicle should have been refunded")
                    });
            });
        });

        describe("Scenario 5", function() {
            it("should refund a vehicle that deposits and pays more than the price when the price wasn't set when the vehicle exited", function() {            
                return operator.enterRoad(booth1, hashed0, { from: vehicle1, value: (deposit * multiplier1) + 1})
                    .then(tx => {                   
                        return web3.eth.getBalancePromise(operator.address);
                    })                    
                    .then(balance=> {
                        assert.strictEqual(balance.toNumber(), deposit * multiplier1 + 1, "Toll booth did not get full payment");
                        return operator.reportExitRoad(secret0,{from:booth2});
                    })
                    .then(tx => {                   
                        return web3.eth.getBalancePromise(operator.address);
                    })
                    .then(balance => {
                        assert.strictEqual(balance.toNumber(), deposit * multiplier1 + 1, "Toll booth should not have sent refund if price not set");
                        return operator.setRoutePrice(booth1, booth2, deposit, { from: operatorOwner });
                    })
                    .then(tx => {
                        return web3.eth.getBalancePromise(operator.address);
                    })
                    .then(balance => {
                        assert.strictEqual(balance.toNumber(), deposit * multiplier1, "Vehicle should have been refunded")
                    });
            });
        });

        describe("Scenario 6", function() {
            it("should handle two vehicles entering and paying the deposit and being refunded after the price is entered", function() {            
                let expectedBalance = 0;
                return operator.enterRoad(booth1, hashed0, { from: vehicle1, value: (deposit * multiplier1) + 1})
                    .then(tx => {                   
                        return web3.eth.getBalancePromise(operator.address);
                    })                    
                    .then(balance=> {
                        expectedBalance += (deposit * multiplier1) + 1;
                        assert.strictEqual(balance.toNumber(), expectedBalance, "Toll booth did not get full payment");
                        return operator.reportExitRoad(secret0,{from:booth2});
                    })
                    .then(tx => {                   
                        return web3.eth.getBalancePromise(operator.address);
                    })
                    .then(balance => {
                        assert.strictEqual(balance.toNumber(), expectedBalance, "Toll booth should not have sent refund if price not set");
                        return operator.enterRoad(booth1, hashed1, { from: vehicle2, value: (deposit * multiplier2)})
                    })
                    .then(tx => {                   
                        return web3.eth.getBalancePromise(operator.address);
                    })                    
                    .then(balance=> {
                        expectedBalance += (deposit * multiplier2);
                        assert.strictEqual(balance.toNumber(), expectedBalance, "Toll booth did not get full payment");
                        return operator.reportExitRoad(secret1,{from:booth2});
                    })
                    .then(tx => {                   
                        return web3.eth.getBalancePromise(operator.address);
                    })
                    .then(balance => {
                        assert.strictEqual(balance.toNumber(), expectedBalance, "Toll booth should not have sent refund if price not set");
                        return operator.setRoutePrice(booth1, booth2, deposit, { from: operatorOwner });
                    })
                    .then(tx => {
                        return web3.eth.getBalancePromise(operator.address);
                    })
                    .then(balance => {
                        expectedBalance -= 1
                        assert.strictEqual(balance.toNumber(), expectedBalance, "Vehicle1 should have been refunded")
                        return operator.clearSomePendingPayments(booth1, booth2, 1, {from: operatorOwner});
                    })
                    .then(tx => {
                        return web3.eth.getBalancePromise(operator.address);
                    })
                    .then(balance =>{
                        assert.strictEqual(balance.toNumber(), expectedBalance, "Vehicle2 should have been refunded");
                    });
            });
        });
    });
});
