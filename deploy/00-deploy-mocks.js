const { network, ethers } = require("hardhat");
const {networkConfig,developmentChains} = require("../helper-hardhat.config");

module.exports = async function ({getNamedAccounts, deployments}){
    const {deploy, log} = deployments;
    const {deployer} = await getNamedAccounts();
    const BASE_FEE = ethers.utils.parseEther("0.25");
    const GAS_PRICE_LINK = 1e9;
    const args = [BASE_FEE,GAS_PRICE_LINK]

    if (developmentChains.includes(network.name)){
        log("Local Network Detected");
        // deploy a mock vrfCoordinator..
        await deploy("VRFCoordinatorV2Mock",{
            from:deployer,
            log:true,
            args:args,
            // waitConfirmation
        });
        log("Mocks Deployed");
        log("--------------------------------------------------------------");
    }
}

module.exports.tags = ["all","mocks"]