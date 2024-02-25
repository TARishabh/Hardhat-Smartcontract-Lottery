const { assert, expect } = require("chai");
const { network, deployments, ethers, getNamedAccounts, } = require("hardhat");
// const {developmentChains,networkConfig} = require("../../helper-hardhat.config");
const {developmentChains,networkConfig} = require("../../helper-hardhat.config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle",function(){
        let raffle, vrfCoordinatorV2Mock,raffleEntranceFee,deployer,interval,subscriptionId;
        const chainId = network.config.chainId;
        beforeEach(async () =>{
            deployer  = (await getNamedAccounts()).deployer;
            await deployments.fixture(["all"]);
            raffle = await ethers.getContract("Raffle",deployer);
            subscriptionId = await raffle.getSubscriptionId();
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock",deployer);
            await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
            raffleEntranceFee = await raffle.getEntranceFee();
            interval = await raffle.getInterval();
        });

        describe("constructor", ()=>{
            it("initializes the raffle correctly",async ()=>{
                const raffleState = await raffle.getRaffleState();
                const interval = await raffle.getInterval();
                assert.equal(raffleState.toString(),"0");
                assert.equal(interval.toString(),networkConfig[chainId]["interval"].toString());
            });
            // Ideally we make our tests have just 1 assert per "it";
        });

        describe("enterRaffle", function(){
            it("reverts if we don't pay enough",async function(){
                await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__SendMoreToEnterRaffle");
            });

            it("records player when they enter",async function(){
                await raffle.enterRaffle({value:raffleEntranceFee});
                const playerFromContract = await raffle.getPlayers(0);
                assert.equal(playerFromContract,deployer);
            });

            it("emits an event on enter",async function(){
                await expect(raffle.enterRaffle({value:raffleEntranceFee})).to.emit(raffle,"RaffleEnter")
            });

            // it("doesn't allow entrance when raffle is in calulating state",async function(){
            //     await raffle.enterRaffle({value:raffleEntranceFee})
            //     await network.provider.send("evm_increaseTime",[interval.toNumber() + 1]);
            //     await network.provider.send("evm_mine",[]);

            //     // We pretend to be a Chainlink Keeper
            //     await raffle.performUpkeep([]);
            //     await expect(raffle.enterRaffle({value:raffleEntranceFee})).to.be.revertedWith("Raffle__NotOpen");
            // })
            it("doesn't allow entrance when raffle is calculating", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                // we pretend to be a keeper for a second
                await raffle.performUpkeep([]) // changes the state to calculating for our comparison below
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith( // is reverted as raffle is calculating
                    "Raffle__NotOpen"
                )
            })
        })

        describe('checkUpkeep', () => {
            it("returns false if people haven't sent any ETH",async function(){
                await network.provider.send("evm_increaseTime",[interval.toNumber() + 1]);
                await network.provider.request({ method: "evm_mine", params: [] })
                const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([]);
                assert(!upkeepNeeded);
            });

            it("returns false if raffle isn't open",async function(){
                await raffle.enterRaffle({value: raffleEntranceFee});
                await network.provider.send("evm_increaseTime",[interval.toNumber() + 1]);
                await network.provider.request({ method: "evm_mine", params: [] });
                await raffle.performUpkeep([]);
                const raffleState = await raffle.getRaffleState();
                const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([]);
                assert.equal(raffleState.toString(),"1")
                assert.equal(upkeepNeeded,false);
            });

            it("returns false if enough time hasn't been passed",async function(){
                await raffle.enterRaffle({value: raffleEntranceFee}); 
                await network.provider.send("evm_increaseTime",[interval.toNumber() - 10]);
                await network.provider.request({ method: "evm_mine", params: [] });
                const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([]);
                assert(!upkeepNeeded)
            });

            it("returns true if enough time has been passed, has players, eth, and is open",async function(){
                await raffle.enterRaffle({value: raffleEntranceFee});
                await network.provider.send("evm_increaseTime",[interval.toNumber() + 1]);
                await network.provider.request({ method: "evm_mine", params: [] });
                // const raffleState = await raffle.getRaffleState();
                const {upkeepNeeded} = await raffle.callStatic.checkUpkeep([]);
                assert(upkeepNeeded);
            })
        });
        
        describe("performUpkeep",()=>{
            it("can only run if checkupkeep is true",async function(){
                await raffle.enterRaffle({value: raffleEntranceFee});
                await network.provider.send("evm_increaseTime",[interval.toNumber() + 1]);
                await network.provider.request({ method: "evm_mine", params: [] });
                const tx = await raffle.performUpkeep([]);
                assert(tx);
            });

            it("updates the raffle state and emits a requestId",async function(){
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const txResponse = await raffle.performUpkeep([]) // emits requestId
                const txReceipt = await txResponse.wait(1)
                const raffleState = await raffle.getRaffleState()
                const requestId = txReceipt.events[1].args.requestId
                assert(requestId.toNumber() > 0)
                assert(raffleState == 1);
            })
        });

        describe("fulfillRandomWords",()=>{
            beforeEach(async ()=>{
                await raffle.enterRaffle({value: raffleEntranceFee});
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] });
            });

            it("can only be called after performUpkeep",async()=>{
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be.revertedWith("nonexistent request");
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)).to.be.revertedWith("nonexistent request");
            });

            // Wayyyyy to BIGGGG;
            it("picks a winner, resets the lottery and sends money",async function(){
                const startingIndex = 1;
                const additionalAccounts = 3;
                // const startingBalance = ethers.utils.parseEther("100");
                let startingBalance;
                const accounts = await ethers.getSigners();

                for (let index = startingIndex; index < additionalAccounts + startingIndex; index++) {
                    const raffleConnect = raffle.connect(accounts[index]);
                    await raffleConnect.enterRaffle({value:raffleEntranceFee});
                };
                const startingTimeStamp = await raffle.getLatestTimeStamp();
                

                // performUpkeep (mock being chainlink keepers)
                // fulfillRandomWords (mock being chainlink VRF)
                // We will have to wait for the fulfillRandomWords to be called
                // SO WE SET UP A LISTENER

                await new Promise(async (resolve, reject)=>{
                    raffle.once("WinnerPicked", async ()=>{
                        console.log("Found the Event")
                        try {
                            const recentWinner = await raffle.getRecentWinner();
                            console.log(recentWinner);
                            const raffleState = await raffle.getRaffleState();
                            const endingTimeStamp = await raffle.getLatestTimeStamp();
                            // console.log(endingTimeStamp);
                            const numPlayers  = await raffle.getNumberOfPlayers();
                            const winnerEndingBalance = await accounts[1].getBalance();


                            assert.equal(numPlayers.toString(),"0");
                            assert.equal(raffleState.toString(),"0");
                            // console.log(endingTimeStamp);
                            // console.log(startingTimeStamp);
                            console.log((endingTimeStamp > startingTimeStamp))
                            // assert.equal(true,(endingTimeStamp > startingTimeStamp));
                            assert(endingTimeStamp > startingTimeStamp);
                            assert.equal(winnerEndingBalance.toString(), startingBalance.add(raffleEntranceFee.mul(additionalAccounts).add(raffleEntranceFee)).toString())

                        } catch (error) {
                            reject(error);
                        }
                        resolve();
                    })
                    // Setting up the listener;
                    // below we will fire the event, and the listener will pick it up and resolve;

                    const tx = await raffle.performUpkeep([]);
                    const txReceipt = await tx.wait(1);
                    startingBalance = await accounts[2].getBalance();
                    await vrfCoordinatorV2Mock.fulfillRandomWords(txReceipt.events[1].args.requestId, raffle.address);
                })
            })
        })
    })

    // *
    // **
    // ***
    // ****
    // *****

