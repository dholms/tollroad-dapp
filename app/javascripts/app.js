// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import regulator_artifacts from '../../build/contracts/Regulator.json'
import operator_artifacts from '../../build/contracts/TollBoothOperator.json'

var Regulator = contract(regulator_artifacts);
var Operator = contract(operator_artifacts);

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;

var tollRoadApp = angular.module('tollRoadApp', ['ngRoute']);

tollRoadApp.controller('regulatorController', ['$scope', '$location', function($scope, $location){
  $scope.operators = [];
  $scope.isPaused

  $scope.addVehicle = function(vehicleAddress, vehicleType){
    Regulator.deployed().then(function(instance){
      return instance.setVehicleType(vehicleAddress,parseInt(vehicleType),{from:account});
    })
    .then(function(tx){
      showAlert("addVehicleSuccess");
    })
    .catch(function(error){
      console.error(error);
      showAlert("addVehicleError");
    })
  }

  $scope.createNewOperator = function(operatorOwner, operatorDeposit){
    Regulator.deployed().then(function(instance){
      return instance.createNewOperator(operatorOwner, operatorDeposit, {from:account,gas:3000000});
    })
    .then(function(tx){
      showAlert("newOperatorSuccess");
    })
    .catch(function(error){
      console.error(error);
      showAlert("newOperatorError");
    })
  }

  $scope.goto = function(url){
    $location.path(url);
  }

  var showAlert = function(alertName){
    $scope[alertName] = true;
    $scope.$apply();
    setTimeout(function(){
      $scope[alertName] = false;
      $scope.$apply();
    },4000);
  }

  var initCtrl = function(){
    // for dev
    // account = accounts[0];
    $scope.accountAddress = account;
    var meta;
    Regulator.deployed().then(function(instance){
      meta = instance;
      let createEvent = meta.LogTollBoothOperatorCreated({}, {fromBlock: 0, toBlock:'latest'});
      createEvent.watch(function(error, result){
        let operator = result.args.newOperator;        
        $scope.operators.push(operator);
        $scope.$apply();
        let deleteEvent = meta.LogTollBoothOperatorRemoved({operator: operator}, {fromBlock: 0, toBlock:'latest'});
        deleteEvent.watch(function(error, result){
          $scope.operators.splice($scope.operators.indexOf(result.args.operator), 1);
          $scope.$apply();
        })
      })
    })
  }

  var addEventListeners = function(){
    var meta = Regulator.deployed().then(function(instance){
      var vehicleTypeSet = instance.LogVehicleTypeSet({fromBlock:"latest"});
      vehicleTypeSet.watch(function(error, result){
        if(!error){

        }
        console.log(result);
      })
    })
  }
  if(accounts && accounts.length > 0){
    initCtrl();
  }
  document.addEventListener('accountsReady', function(e){
    initCtrl();
  }, false);
}]);

tollRoadApp.controller('operatorController', ['$scope','$routeParams', '$location',function($scope,$routeParams, $location){
  $scope.operatorAddress = $routeParams.operatorAddress;
  $scope.isPaused;
  var operator;

  $scope.getOperator = function(operatorAddressInput){
    $scope.operatorAddress = operatorAddressInput;
    console.log($scope.operatorAddress);
    Operator.at(operatorAddressInput).then(function(instance){
      operator = instance;
      return operator.isPaused({from:account});
    })
    .then(function(isPaused){
      $scope.isPaused = isPaused;
      $scope.$apply();
      let pausedEvent = operator.LogPausedSet({},{fromBlock: 'latest'});
      pausedEvent.watch(function(error, result){
        $scope.isPaused = result.args.newPausedState;
        $scope.$apply();
      })
    })
  }

  $scope.setPause = function(isPaused){
    console.log(isPaused);
    operator.setPaused(isPaused, {from:account}).then(function(tx){
      console.log(tx);
    })
  }

  $scope.addTollBooth = function(newTollBoothAddress){
    operator.addTollBooth(newTollBoothAddress, {from:account}).then(function(tx){
      showAlert("addTollBoothSuccess");
    })
    .catch(function(error){
      console.error(error);
      showAlert("addTollBoothError");
    })
  }

  $scope.setBaseRoutePrice = function(entryBooth, exitBooth, routePrice){
    operator.setRoutePrice(entryBooth, exitBooth, routePrice, {from:account, gas:1000000}).then(function(tx){
      showAlert("setPriceSuccess");
    })
    .catch(function(error){
      console.error(error);
      showAlert("setPriceError");
    })
  }

  $scope.setMultiplier = function(vehicleType, multiplier){
    operator.setMultiplier(vehicleType, multiplier, {from:account}).then(function(tx){
      showAlert("setMultiplierSuccess");
    })
    .catch(function(error){
      console.error(error);
      showAlert("setMultiplierError");
    })
  }

  $scope.goto = function(url){
    $location.path(url);
  }

  var showAlert = function(alertName){
    $scope[alertName] = true;
    $scope.$apply();
    setTimeout(function(){
      $scope[alertName] = false;
      $scope.$apply();
    },4000);
  }

  var initCtrl = function(){
    // for dev
    // account = accounts[1]
    $scope.accountAddress = account;
    if($scope.operatorAddress){
      $scope.getOperator($scope.operatorAddress);
    }
  }
  if(accounts && accounts.length > 0){
    initCtrl();
  }
  document.addEventListener('accountsReady', function(e){    
    initCtrl();
  }, false);
}]);

tollRoadApp.controller('vehicleController', ['$scope', '$routeParams', '$location', function($scope, $routeParams, $location){
  $scope.operatorAddress = $routeParams.operatorAddress;
  $scope.history = {};
  var operator;

  $scope.getOperator = function(operatorAddressInput){
    $scope.operatorAddress = operatorAddressInput;
    Operator.at(operatorAddressInput).then(function(instance){
      operator = instance;
      getHistory();
    });
  }

  $scope.enterTollBooth = function(entryBooth, exitSecretHashed, depositAmount){
    operator.enterRoad(entryBooth, exitSecretHashed, {from:account, value: depositAmount, gas: 1000000}).then(function(tx){
      showAlert('enterTollBoothSuccess');
    })
    .catch(function(error){
      console.error(error);
      showAlert('enterTollBoothError');
    })
  }

  $scope.hashSecret = function(exitSecret){
    operator.hashSecret(exitSecret, {from:account}).then(function(hashedSecret){
      $scope.hashedSecret = hashedSecret;
      $scope.$apply();
    })
  }

  var getHistory = function(){
    let enterEvent = operator.LogRoadEntered({vehicle:account},{fromBlock: 0, toBlock: 'latest'});
    enterEvent.watch(function(err, result){
      console.log('entered ', result);
      let exitHash = result.args.exitSecretHashed;
      $scope.history[exitHash] = {
        entry: result.args.entryBooth
      };
      $scope.$apply();
      let exitEvent = operator.LogRoadExited({exitSecretHashed:exitHash},{fromBlock: 0, toBlock: 'latest'});
      exitEvent.watch(function(err, result){
        $scope.history[result.args.exitSecretHashed].exit = result.args.exitBooth;
        $scope.$apply();
      });
    });
  }

  $scope.goto = function(url){
    $location.path(url);
  }

  var getBalance = function(){
    web3.eth.getBalance(account, function(error, result){
      if(error){
        alert("Error getting balance");
      }else{
        $scope.accountBalance = web3.fromWei(result,'ether').toNumber(10);
        $scope.$apply();
      }
    })
  }

  var showAlert = function(alertName){
    $scope[alertName] = true;
    $scope.$apply();
    setTimeout(function(){
      $scope[alertName] = false;
      $scope.$apply();
    },4000);
  }

  var initCtrl = function(){
    // for dev
    // account = accounts[2]
    $scope.accountAddress = account;
    if($scope.operatorAddress){
      $scope.getOperator($scope.operatorAddress);
    }
    getBalance();
  }
  if(accounts && accounts.length > 0){
    initCtrl();
  }
  document.addEventListener('accountsReady', function(e){
    initCtrl();
  }, false);
}]);

tollRoadApp.controller('tollboothController', ['$scope', '$routeParams', '$location', function($scope, $routeParams, $location){
  $scope.operatorAddress = $routeParams.operatorAddress;
  var operator;

  $scope.getOperator = function(operatorAddressInput){
    $scope.operatorAddress = operatorAddressInput;
    Operator.at(operatorAddressInput).then(function(instance){
      operator = instance;
    });
  }

  $scope.exitRoad = function(exitSecret){
    operator.reportExitRoad(exitSecret,{from:account}).then(function(tx){
      $scope.exitSuccess = true;
      console.log(tx);
      if(tx.logs[0].event == "LogRoadExited"){
        $scope.exitSuccessMessage = "Vehicle successfully exited. Vehicle refunded " + tx.logs[0].args.refundWeis.toNumber(10) + " weis.";
      }else{
        $scope.exitSuccessMessage = "Vehicle successfully exited. No price entered for route so vehicle has not been refunded."
      }
      $scope.$apply();
    })
    .catch(function(error){
      console.error(error);
      $scope.exitError = true;
      $scope.$apply();
    });
  }

  $scope.goto = function(url){
    $location.path(url);
  }

  var showAlert = function(alertName){
    $scope[alertName] = true;
    $scope.$apply();
    setTimeout(function(){
      $scope[alertName] = false;
      $scope.$apply();
    },4000);
  }

  var initCtrl = function(){
    // for dev
    // account = accounts[3];
    $scope.tollboothAddress = account;
    if($scope.operatorAddress){
      $scope.getOperator($scope.operatorAddress);
    }
  }

  if(accounts && accounts.length > 0){
    initCtrl();
  }
  document.addEventListener('accountsReady', function(e){    
    initCtrl();
  }, false);
}]);

tollRoadApp.config(function($routeProvider){
  $routeProvider
  .when('/',{
    templateUrl: '/regulator.html',
    controller: 'regulatorController'
  })
  .when('/operator/:operatorAddress',{
    templateUrl: '/operator.html',
    controller: 'operatorController'
  })
  .when('/vehicle/:operatorAddress',{
    templateUrl: '/vehicle.html',
    controller: 'vehicleController'
  })
  .when('/tollbooth/:operatorAddress',{
    templateUrl: '/tollbooth.html',
    controller: 'tollboothController'
  })
  .otherwise({
    templateUrl: '/regulator.html',
    controller: 'regulatorController'
  })
})

var start = function(){
  var self = this;

  Regulator.setProvider(web3.currentProvider);
  Operator.setProvider(web3.currentProvider);

  // Get the initial account balance so it can be displayed.
  web3.eth.getAccounts(function(err, accs) {
    if (err != null) {
      alert("There was an error fetching your accounts.");
      return;
    }

    if (accs.length == 0) {
      alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
      return;
    }

    accounts = accs;
    account = accounts[0];
    console.log(accounts);
    var event = new Event('accountsReady');
    document.dispatchEvent(event);
  });
}
window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source. If you find that your accounts don't appear or you have 0 MetaCoin, ensure you've configured that source properly. If using MetaMask, see the following link. Feel free to delete this warning. :) http://truffleframework.com/tutorials/truffle-and-metamask")
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

  start();
});