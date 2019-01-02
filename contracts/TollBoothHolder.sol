pragma solidity ^0.4.13;

import "./Owned.sol";
import "./interfaces/TollBoothHolderI.sol";

contract TollBoothHolder is TollBoothHolderI,Owned {

    mapping(address => bool) internal tollBoothExists;

    event LogTollBoothAdded(address indexed sender, address indexed tollBooth);
    event LogTollBoothRemoved(address indexed sender, address indexed tollBooth);

    function TollBoothHolder(){

    }

    function addTollBooth(address tollBooth) fromOwner returns(bool success){
      require(!tollBoothExists[tollBooth]);
      require(tollBooth != 0);
      tollBoothExists[tollBooth] = true;
      LogTollBoothAdded(msg.sender, tollBooth);
      return true;
    }

    function isTollBooth(address tollBooth) constant public returns(bool isIndeed){
      return tollBoothExists[tollBooth];
    }

    function removeTollBooth(address tollBooth) fromOwner returns(bool success){
      require(tollBoothExists[tollBooth]);
      require(tollBooth != 0);
      tollBoothExists[tollBooth] = false;
      LogTollBoothRemoved(msg.sender, tollBooth);
      return true;
    }
}
