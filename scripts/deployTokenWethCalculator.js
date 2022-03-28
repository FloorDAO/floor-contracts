const {ethers} = require("hardhat");
const token = '0x87931E7AD81914e7898d07c68F145fC0A553D8Fb'; // the paired token
const weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account: " + deployer.address);

  const BondingCalculator = await ethers.getContractFactory("TokenWethCalculator");
  const bondingCalculator = await BondingCalculator.deploy(token, weth, 50000); // 50% of SLP reserves value

  console.log("TokenWethCalculator:", bondingCalculator.address);

  console.log('Deployment complete');
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
