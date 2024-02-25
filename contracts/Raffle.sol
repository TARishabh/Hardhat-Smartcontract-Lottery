// Raffe.sol

// MY UNDERSTANDING
// Create a Enter lottery button, so that user can enter the lottery, by paying some ETH
// After some time Declare a winner of the lottery. 
// Store all the entered people address into an array


// Patrick's Understanding

// Enter the lottery (paying some amount)
// Pick a random winner (verifiably random)
// winner to be selected every X minutes -> completely automated
// Chainlink Oracle -> Randomness, Automated Execution (they will listen to the event) (ChainLink Keeper)


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;


// import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
// import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";


import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
// import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";
// import "@chainlink/contracts/src/v0.7/interfaces/KeeperCompatibleInterface.sol";

error Raffle__SendMoreToEnterRaffle();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/**
 * @title A sample Raffle Contract
 * @author Rishabh Sharma
 * @notice This contract is for creating an untamperable decentralized smart contract
 * @dev This implements Chainlink VRF V2 and Chainlink Keepers
 */

contract Raffle is VRFConsumerBaseV2,  AutomationCompatibleInterface{
    
    /* Types Declarations */
    enum RaffleState {
        OPEN,
        CALCULATING
    } // uint256 0 = OPEN, 1 = CALCULATING

    /* State Variables */
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callBackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    /* Lottery Variables */
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    /* Events */
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    /* Functions */
    constructor(address vrfCoordinatorV2 /* Contract */, uint256 entryFee, bytes32 gasLane, uint64 subscriptionId, uint32 callBackGasLimit, uint256 interval) VRFConsumerBaseV2(vrfCoordinatorV2){
        i_entranceFee = entryFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;  
        i_callBackGasLimit = callBackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterRaffle() payable public {
        if (msg.value < i_entranceFee){
            revert Raffle__SendMoreToEnterRaffle();
        }
        if (s_raffleState != RaffleState.OPEN){
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev This is the function that the Chainlink Keeper nodes call
     * they look for the `upKeepNeeded` to return true.
     * The following should be true in order to return true:
     * 
     * 1. Our time interval should have passed.
     * 2. The lottery should have atleast 1 player and have some ETH.
     * 3. Our subscription is funded with LINK.
     * 4. The lottery should be in OPEN state.
     */

    function checkUpkeep(bytes memory /* checkData */) public override returns (bool upkeepNeeded, bytes memory /* performData */ ) {
        bool isOpen =  (RaffleState.OPEN == s_raffleState);
        // block.timestamp - last blocktimestamp > interval
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = address(this).balance > 0;

        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    }

    function performUpkeep (bytes calldata /* performData */) external override {
        // Request the random number
        // Once we get it, do something with it
        (bool upkeepNeeded,) = checkUpkeep("");
        if(!upkeepNeeded){
            revert Raffle__UpkeepNotNeeded(address(this).balance, s_players.length, uint256(s_raffleState));
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, // gasLane
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callBackGasLimit,
            NUM_WORDS
        );
        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords(uint256 /*_requestId*/ ,uint256[] memory _randomWords) internal override{
        // s_players size 10
        // randomNumber 202
        // 202 % 10 = 2 

        uint256 indexOfWinner = _randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if(!success){
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    /* Rishabh Won't Be able to become a successful developer, cause he lacks mentality bro, you are just a fucking BIG MOUTH KID, who is NOT MADE FOR BIG TASKS, JUST RANT LIKE AMAY AND AVI, STAY MINIMALISTIC FUCKING KID, FUCKING JUST NEEDS SEX FROM ALL THE LADIES BITCHES */
    /* View / Pure functions */

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayers(uint256 index)  public view returns (address){
        return s_players[index];
    }

    function getRecentWinner() public view returns (address){
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState){
        return s_raffleState;
    }

    // since it returns a constant variable and it doesnt read from storage, we can make it pure
    function getNumWords() public pure returns (uint256){
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256){
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256){
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256){
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256){
        return i_interval;
    }

    function getSubscriptionId() public view returns (uint256){
        return i_subscriptionId;
    }
}
