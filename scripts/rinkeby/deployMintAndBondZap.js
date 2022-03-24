const {ethers} = require("hardhat");
const authority = '0x1e444cA8fE42EEaCEf964d355047B05FEde189d2';
const floorBondDepository = '0xF7A479A8AAA02BFD00229A37F858647366969d05';
const nftxFactory = '0xbbc53022Af15Bb973AD906577c84784c47C14371';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts to Rinkeby with the account: " + deployer.address);

  const MintAndBond = await ethers.getContractFactory("MintAndBondZap");
  const mintAndBond = await MintAndBond.deploy(authority, floorBondDepository, nftxFactory, 600); // 10 minute timelock

  console.log("MintAndBondZap:", mintAndBond.address);

  console.log('Deployment complete');
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
