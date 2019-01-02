pragma solidity ^0.4.13;

import "./interfaces/OwnedI.sol";

contract Owned is OwnedI {

    address internal contractOwner;

    event LogOwnerSet(address indexed previousOwner, address indexed newOwner);

    modifier fromOwner{require(msg.sender == contractOwner); _;}

    function Owned(){
      contractOwner = msg.sender;
    }

    function setOwner(address newOwner) fromOwner returns(bool success){
      require(newOwner != contractOwner);
      require(newOwner != 0);
      LogOwnerSet(contractOwner, newOwner);
      contractOwner = newOwner;
      return true;
    }

    function getOwner() constant returns(address owner){
      return contractOwner;
    }
}
