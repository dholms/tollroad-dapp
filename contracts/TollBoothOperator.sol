pragma solidity ^0.4.13;

import "./Owned.sol";
import "./Pausable.sol";
import "./DepositHolder.sol";
import "./TollBoothHolder.sol";
import "./MultiplierHolder.sol";
import "./RoutePriceHolder.sol";
import "./Regulated.sol";

contract TollBoothOperator is Pausable, Regulated, DepositHolder, MultiplierHolder, RoutePriceHolder {

  uint internal collectedFees;

  mapping(bytes32 => VehicleEntry) internal vehicleEntries;
  mapping(bytes32 => bytes32[]) internal pendingEntries;

  struct VehicleEntry{
    address vehicle;
    uint vehicleType;
    address entryBooth;
    address exitBooth;
    uint depositedWeis;
  }

  event LogRoadEntered(address indexed vehicle, address indexed entryBooth, bytes32 indexed exitSecretHashed, uint depositedWeis);
  event LogRoadExited(address indexed exitBooth, bytes32 indexed exitSecretHashed, uint finalFee, uint refundWeis);
  event LogPendingPayment(bytes32 indexed exitSecretHashed, address indexed entryBooth, address indexed exitBooth);
  event LogFeesCollected(address indexed owner, uint amount);

  function TollBoothOperator(bool isPaused, uint initialDeposit, address initialRegulator)
    Pausable(isPaused)
    DepositHolder(initialDeposit)
    Regulated(initialRegulator){

  }

  function hashSecret(bytes32 secret) constant public returns(bytes32 hashed){
    return keccak256(secret);
  }

  function enterRoad(address entryBooth, bytes32 exitSecretHashed) public whenNotPaused payable returns (bool success){
    require(isTollBooth(entryBooth));
    uint vehicleType = getRegulator().getVehicleType(msg.sender);
    require(vehicleType > 0);
    require(msg.value >= getDeposit() * getMultiplier(vehicleType));
    require(vehicleEntries[exitSecretHashed].vehicle==0);

    VehicleEntry memory newEntry;
    newEntry.vehicle = msg.sender;
    newEntry.vehicleType = vehicleType;
    newEntry.entryBooth = entryBooth;
    newEntry.depositedWeis = msg.value;
    vehicleEntries[exitSecretHashed] = newEntry;
    
    LogRoadEntered(msg.sender, entryBooth, exitSecretHashed, msg.value);
    return true;
  }

  function getVehicleEntry(bytes32 exitSecretHashed) constant public returns(address vehicle, address entryBooth, uint depositedWeis){
    vehicle = vehicleEntries[exitSecretHashed].vehicle;
    entryBooth = vehicleEntries[exitSecretHashed].entryBooth;
    depositedWeis = vehicleEntries[exitSecretHashed].depositedWeis;
  }

  function reportExitRoad(bytes32 exitSecretClear) public whenNotPaused returns (uint status){
    require(isTollBooth(msg.sender));
    bytes32 hashedSecret = hashSecret(exitSecretClear);
    VehicleEntry memory entry = vehicleEntries[hashedSecret];
    address entryBooth = entry.entryBooth;
    require(entryBooth > 0);
    require(entryBooth != msg.sender);
    require(entry.exitBooth == 0);
    bytes32 routeHash = keccak256(entryBooth, msg.sender);
    vehicleEntries[hashedSecret].exitBooth = msg.sender;
    uint price = routePrices[routeHash] * getMultiplier(entry.vehicleType);
    if(price > 0){
      //in case vehicle deposited less than route price
      if(price > entry.depositedWeis){
        price = entry.depositedWeis;
      }
      collectedFees += price;
      uint diff = entry.depositedWeis - price;
      LogRoadExited(msg.sender,hashedSecret,price,diff);
      if(diff > 0){
        vehicleEntries[hashedSecret].depositedWeis = 0;        
        entry.vehicle.transfer(diff);
      }
      return 1;
    }else{
        pendingEntries[routeHash].push(hashSecret(exitSecretClear));
        LogPendingPayment(hashedSecret, entryBooth, msg.sender);
        return 2;
    }
  }

  function getPendingPaymentCount(address entryBooth, address exitBooth) constant public returns (uint count){
      return pendingEntries[keccak256(entryBooth, exitBooth)].length;
  }

  function clearSomePendingPayments(address entryBooth, address exitBooth, uint count) public whenNotPaused returns (bool success){
      require(isTollBooth(entryBooth));
      require(isTollBooth(exitBooth));
      bytes32 routeHash = keccak256(entryBooth,exitBooth);
      uint routePrice = routePrices[routeHash];
      require(routePrice > 0);
      require(count > 0);
      bytes32[] storage pending = pendingEntries[routeHash];
      require(count <= pending.length);
      for(uint i=0;i<count;i++){
          bytes32 entryHash = pending[0];
          VehicleEntry memory entry = vehicleEntries[entryHash];
          //shift all pending over for FIFO queue
          for(uint j=0;j<pending.length-1;j++){
            pending[j] = pending[j+1];
          }
          delete pending[pending.length-1];
          pending.length--;
          uint price = routePrice * getMultiplier(entry.vehicleType);
          if(price > entry.depositedWeis){
            price = entry.depositedWeis;
          }
          collectedFees += price;
          uint diff = entry.depositedWeis - price;
          LogRoadExited(exitBooth,entryHash,price,diff);
          if(diff > 0){
            vehicleEntries[entryHash].depositedWeis = 0;
            entry.vehicle.transfer(diff);
          }
      }

      return true;
  }

  function getCollectedFeesAmount() constant public returns(uint amount){
    return collectedFees;
  }

  function withdrawCollectedFees() fromOwner returns(bool success){
    require(collectedFees > 0);
    collectedFees = 0;
    LogFeesCollected(msg.sender, collectedFees);
    msg.sender.transfer(collectedFees);
    return true;
  }

  function setRoutePrice(address entryBooth, address exitBooth, uint priceWeis) fromOwner returns(bool success){
    super.setRoutePrice(entryBooth, exitBooth, priceWeis);
    uint pendingLength = pendingEntries[keccak256(entryBooth,exitBooth)].length;
    if(pendingLength > 0){
      clearSomePendingPayments(entryBooth, exitBooth, 1);
    }
    return true;
  }

   function(){
     revert();
   }

  // TODO refund vehicles fully when problem on the road
}
