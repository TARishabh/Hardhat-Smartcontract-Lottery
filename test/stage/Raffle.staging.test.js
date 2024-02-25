// const { assert, expect } = require("chai");
// const { network, deployments, ethers, getNamedAccounts, } = require("hardhat");
// const {developmentChains,networkConfig} = require("../../helper-hardhat.config");


// // developmentChains.includes(network.name) ? () : ()
// developmentChains.includes(network.name) 
//     ? describe.skip
//     : describe("Raffle Unit Tests",()=>{
//         let raffle,raffleEntranceFee,deployer;

//         beforeEach(async ()=>{
//             deployer = (await getNamedAccounts()).deployer
//             raffle = await ethers.getContract("Raffle",deployer);
//             raffleEntranceFee = await raffle.getEntranceFee();
//         });
//         describe('fulfillRandomWords', () => {
//             it("workds with live Chainlink Keepers and Chainlink VRF, we get a random winner",async()=>{
//                 // enter the raffle;
//                 const startingTimeStamp = await raffle.getLatestTimeStamp();
//                 const accounts = await ethers.getSigners();

//                 // setting up the listener
//                 await new Promise(async(resolve, reject)=>{
//                     raffle.once("Winner Picked",async ()=>{
//                         console.log("Winner Picket event fired")
//                         try {
//                             const recentWinner = await raffle.getRecentWinner();
//                             const raffleState = await raffle.getRaffleState();
//                             const winnerBalance = await accounts[0].getBalance();
//                             const endingTimeStamp = await raffle.getLatestTimeStamp();

//                             await expect(raffle.getPlayer(0)).to.be.reverted
//                             assert.equal(recentWinner.toString(),accounts[0].address.toString());
//                             assert.equal(raffleState.toString(),"0");
//                             assert.equal(winnerBalance.toString(),winnerStartingBalance.add(raffleEntranceFee).toString());
//                             assert(endingTimeStamp > startingTimeStamp);
//                         } catch (error) {
//                             reject(error);
//                         }
//                         resolve();
//                     })
//                     // then entering the raffle
//                     await raffle.enterRaffle({value: raffleEntranceFee});
//                     const winnerStartingBalance = await accounts[0].getBalance();
//                     // and this code WONT COMPLETE until our listener has finished listening.
//                 })

//                 // setup listener before we enter the raffle
//                 // Just in case the blockchain moves REALLY FAST
//                 // await raffle.enterRaffle({value: raffleEntranceFee});
//             })
//         })
        
//     })



const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network } = require("hardhat")
// const { developmentChains } = require("../../helper-hardhat-config")
const { developmentChains } = require("../../helper-hardhat.config");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", function () {
          let raffle, raffleEntranceFee, deployer

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
          })

          describe("fulfillRandomWords", function () {
              it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                  // enter the raffle
                  console.log("Setting up test...")
                  const startingTimeStamp = await raffle.getLatestTimeStamp()
                  const accounts = await ethers.getSigners()

                  console.log("Setting up Listener...")
                  await new Promise(async (resolve, reject) => {
                      // setup listener before we enter the raffle
                      // Just in case the blockchain moves REALLY fast
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              // add our asserts here
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const endingTimeStamp = await raffle.getLatestTimeStamp()

                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              )
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })
                      // Then entering the raffle
                      console.log("Entering Raffle...")
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                      await tx.wait(1)
                      console.log("Ok, time to wait...")
                      const winnerStartingBalance = await accounts[0].getBalance()

                      // and this code WONT complete until our listener has finished listening!
                  })
              })
          })
      })