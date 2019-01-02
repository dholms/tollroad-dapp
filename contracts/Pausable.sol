pragma solidity ^0.4.13;

import "./Owned.sol";
import "./interfaces/PausableI.sol";

contract Pausable is PausableI, Owned {
    /**
     * Event emitted when a new paused state has been set.
     * @param sender The account that ran the action.
     * @param newPausedState The new, and current, paused state of the contract.
     */
    bool internal paused;

    event LogPausedSet(address indexed sender, bool indexed newPausedState);

    modifier whenPaused(){require(paused); _;}
    modifier whenNotPaused(){require(!paused); _;}

    function Pausable(bool isPaused){
      paused = isPaused;
    }

    function setPaused(bool newState) fromOwner returns(bool success){
      require(newState != paused);
      paused = newState;
      LogPausedSet(msg.sender, newState);
      return true;
    }

    function isPaused() constant returns(bool isIndeed){
      return paused;
    }
}
