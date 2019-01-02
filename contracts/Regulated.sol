pragma solidity ^0.4.13;

import "./interfaces/RegulatorI.sol";
import "./interfaces/RegulatedI.sol";

contract Regulated is RegulatedI{

    address internal regulator;

    event LogRegulatorSet(address indexed previousRegulator, address indexed newRegulator);

    modifier fromRegulator(){require(msg.sender == regulator); _;}

    function Regulated(address initialRegulator){
        require(initialRegulator > 0);
      regulator = initialRegulator;
    }

    function setRegulator(address newRegulator) fromRegulator returns(bool success){
      require(newRegulator != 0);
      require(newRegulator != regulator);
      LogRegulatorSet(regulator, newRegulator);
      regulator = newRegulator;
      return true;
    }

    function getRegulator() constant public returns(RegulatorI currentRegulator){
      return RegulatorI(regulator);
    }
}
