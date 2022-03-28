const {ethers} = require("hardhat");
const authority = '0x618907e21898d0357f0a0bf0b112949b1530cbc1';
const floorBondDepository = '0xe1d71b60642d597e6e3dbf6d0cd106ac3cfa65fa';
const nftxFactory = '0xBE86f647b167567525cCAAfcd6f881F1Ee558216';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts to Rinkeby with the account: " + deployer.address);

  const MintAndBond = await ethers.getContractFactory("MintAndBondZap");
  const mintAndBond = await MintAndBond.deploy(authority, floorBondDepository, nftxFactory, 604800); // 10 minute timelock

  console.log("MintAndBondZap:", mintAndBond.address);

  console.log('Deployment complete');
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
