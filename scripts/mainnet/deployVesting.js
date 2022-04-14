const {ethers} = require("hardhat");

const floor = '0xf59257E961883636290411c11ec5Ae622d19455e';
const weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const gFloor = '0xb1cc59fc717b8d4783d41f952725177298b5619d';
const treasury = '0x91E453f442d25523F42063E1695390e325076ca2';
const staking = '0x759c6de5bca9ade8a1a2719a31553c4b7de02539';
const authority = '0x618907e21898d0357f0a0bf0b112949b1530cbc1';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account: " + deployer.address);

  console.log("Deploying Vesting...");

  const Vesting = await ethers.getContractFactory("VestingClaim");
  const vesting = await Vesting.deploy(
    floor,
    weth,
    gFloor,
    treasury,
    staking,
    authority,
    1661990400 // September 1st
  );

  console.log("");
  console.log("Vesting:", vesting.address);
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
""