// const {ethers} = require("hardhat");

// async function main(){
//     const raffle = await ethers.getContract("Raffle")
//     const entranceFee = await raffle.getEntranceFee();
//     const tx = await raffle.enterRaffle({value: entranceFee + 1});
//     await tx.wait(1);
// }

// main()
// .then(()=>process.exit(0))
// .catch((error)=>{
//     console.log(error);
//     process.exit(1);
// })

const { ethers } = require("hardhat")

async function enterRaffle() {
    const raffle = await ethers.getContract("Raffle")
    const entranceFee = await raffle.getEntranceFee()
    await raffle.enterRaffle({ value: entranceFee + 1 })
    console.log("Entered!")
}

enterRaffle()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })