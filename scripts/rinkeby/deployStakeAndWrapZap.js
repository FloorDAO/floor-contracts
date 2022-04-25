const {ethers} = require("hardhat");

const staking = '0xF7A479A8AAA02BFD00229A37F858647366969d05';
const floor = '0xbbc53022Af15Bb973AD906577c84784c47C14371';
const sFloor = '0xbbc53022Af15Bb973AD906577c84784c47C14371';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts to Rinkeby with the account: " + deployer.address);

  // Deploy the contract
  const StakeAndWrap = await ethers.getContractFactory("StakeAndWrapZap");
  const stakeAndWrap = await StakeAndWrap.deploy(staking, floor, sFloor);

  // Approve contract to transfer FLOOR and sFLOOR to staking contract
  stakeAndWrap.approve();

  console.log("StakeAndWrapZap:", stakeAndWrap.address);
  console.log('Deployment complete');
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
