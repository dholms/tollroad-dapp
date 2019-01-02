pragma solidity ^0.4.13;

import "./Owned.sol";
import "./interfaces/MultiplierHolderI.sol";

contract MultiplierHolder is MultiplierHolderI,Owned {

    mapping(uint => uint) internal multipliers;

    event LogMultiplierSet(address indexed sender, uint indexed vehicleType, uint multiplier);

    function MultiplierHolder(){

    }

    function setMultiplier(uint vehicleType, uint multiplier) fromOwner returns(bool success){
      require(vehicleType != 0);
      require(multipliers[vehicleType] != multiplier);
      multipliers[vehicleType] = multiplier;
      LogMultiplierSet(msg.sender, vehicleType, multiplier);
      return true;
    }

    function getMultiplier(uint vehicleType) constant public returns(uint multiplier){
      return multipliers[vehicleType];
    }
}
