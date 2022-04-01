const {ethers} = require("hardhat");
const weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

async function main() {
  const BondingCalculator = await ethers.getContractFactory("TokenWethCalculator");
  const bondingCalculator = await BondingCalculator.deploy(weth, 50000); // 50% of SLP reserves value
  console.log("TokenWethCalculator:", bondingCalculator.address);
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
