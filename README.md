mkdir "directory name"

yarn add --dev hardhat

yarn add --dev @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers ethers @nomiclabs/hardhat-etherscan @nomiclabs/hardhat-waffle chai ethereum-waffle hardhat hardhat-contract-sizer hardhat-deploy hardhat-gas-reporter prettier prettier-plugin-solidity solhint solidity-coverage dotenv

yarn hardhat -> create an empty hardhat.config.js

now create a folder to store all the contracts, and create the first contract Raffle

Raffle. sol:

Motive -> we have to create a lottery game, so that people can enter and win lottery.s
Enter the lottery (paying some gas amount)
Pick a random winner (verifiably random)
Winner to be selected every X minutes -> completely automated
Chainlink Orcale -> Randomness, Automated Execution (Chainlink Keepers)

so the basic functions which we deduce from the above are:
enterRaffle
pickRandomWinner

now since there will be a entranceFee,
now we have to create a array to store players address

Events -> whenever we change something,or something happens, it is known as an event, and while adding players to the players array is an event, and this is what our chainlink keepers will listen to.

so now create a RaffleEnter event and emit it, whenever a new player is entering the raffle

## (write the deploy scripts and tests as you make the contract and its functions, ITS A GOOD PRACTICE)

now the pickRandomWinner will be automatically called by the chainlink keepers after some interval of time to choose the winner, Now to pick a random winner, we have to do 2 things:

Request a random number from the VRF
Once we get it, do something with it

Now change the name of pickRandomWinner to requestRandomWinner,
and create another function fulfillRandomWords,

import @chainlink/contracts VRF

now this Raffle.sol will be inherited from this VRF

so now the constructor will also be changed according to VRF constructor

Now to call any function automatically, after some time or some event, we need chain keepers
(checkUpkeep -> it checks that the event has happened or not, if it returns true, it calls the function perfomrUpkeep)
(perfomrUpkeep -> )




# STEPS TO DEPLOY AND THIS CONTRACT ON TESTNET.

1. Get our SubId for Chainlink VRF
2. Deploy our contract using the subId
3. Register the contract with chainlink VRF & it's subId
4. Register the contract with Chainlink Keepers
5. Run Staging Test.


before the first stage go to faucets.chain.link to get ETH and LINK.

Now to generate subscription ID go to:
https://vrf.chain.link/sepolia/8985

Deploy our contract (check .env credentials)
yarn hardhat deploy --network sepolia

Add this contract (as consumer) to ch   ainlink VRF as consumer.
so go to https://vrf.chain.link/sepolia/8985 and add consumer and then paste the deployed contract address

Now go to keepers.chain.link -> CREATE NEWUPKEEP -> and then follow the process

Run stating test.

// you can enter the raffle from etherscan (connect wallet -> verify section -> write contract -> and you can see all the functions)

// you can enter raffle it via scripts.

// you can enter raffle from staging test.

// checkUpKeep is called by the chainlink Keepers.

// performUpKeep calls the chainlink VRF.