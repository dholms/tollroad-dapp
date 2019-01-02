pragma solidity ^0.4.13;

import "./Owned.sol";
import "./interfaces/RegulatorI.sol";
import ".//TollBoothOperator.sol";

contract Regulator is Owned, RegulatorI {

  mapping(address => uint) internal vehicleTypes;
  mapping(address => bool) internal operatorExists;

  event LogVehicleTypeSet(address indexed sender, address indexed vehicle, uint indexed vehicleType);
  event LogTollBoothOperatorCreated(address indexed sender, address indexed newOperator, address indexed owner, uint depositWeis);
  event LogTollBoothOperatorRemoved(address indexed sender, address indexed operator);

  function Regulator(){
    
  }

  function setVehicleType(address vehicle, uint vehicleType) fromOwner returns(bool success){
    require(vehicleTypes[vehicle] != vehicleType);
    require(vehicle != 0);
    vehicleTypes[vehicle] = vehicleType;
    LogVehicleTypeSet(msg.sender, vehicle, vehicleType);
    return true;
  }

  function getVehicleType(address vehicle) constant public returns(uint vehicleType){
    return vehicleTypes[vehicle];
  }

  function createNewOperator(address owner, uint deposit) fromOwner returns(TollBoothOperatorI newOperator){
    require(owner != contractOwner);
    TollBoothOperator operator = new TollBoothOperator(true, deposit, this);
    operator.setOwner(owner);
    operatorExists[operator] = true;
    LogTollBoothOperatorCreated(msg.sender, operator, owner, deposit);
    
    return TollBoothOperatorI(operator);
  }

  function removeOperator(address operator) fromOwner returns(bool success){
    require(isOperator(operator));
    operatorExists[operator] = false;
    LogTollBoothOperatorRemoved(msg.sender, operator);
    return true;
  }

  function isOperator(address operator) constant public returns(bool indeed){
    return operatorExists[operator];
  }
}
