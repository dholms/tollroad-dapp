pragma solidity ^0.4.13;

import "./Owned.sol";
import "./interfaces/DepositHolderI.sol";

contract DepositHolder is DepositHolderI,Owned {

    uint internal depositValue;

    event LogDepositSet(address indexed sender, uint depositWeis);

    function DepositHolder(uint depositWeis){
      require(depositWeis > 0);
      depositValue = depositWeis;
    }

    function setDeposit(uint depositWeis) fromOwner returns(bool success){
      require(depositWeis > 0);
      require(depositWeis != depositValue);
      LogDepositSet(msg.sender, depositWeis);
      depositValue = depositWeis;
      return true;
    }

    function getDeposit() constant public returns(uint weis){
      return depositValue;
    }

}
