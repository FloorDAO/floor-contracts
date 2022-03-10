const {ethers} = require("hardhat");
const nftxInventoryStakingAddr = "0x3E135c3E981fAe3383A5aE0d323860a34CfAB893";
const nftxLiquidityStakingAddr = "0x688c3E4658B5367da06fd629E41879beaB538E37";
const punk = '0x269616D549D7e8Eaa82DFb17028d0B212D11232A';
const weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const aFloor = '0x0C3983165E9BcE0a9Bb43184CC4eEBb26dce48fA';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts to Mainnet with the account: " + deployer.address);

  const firstEpochNumber = "0";
  const firstEpochTime = 1646164800; // 28th February 8pm UTC
  console.log("First epoch time:", firstEpochTime);

  const Authority = await ethers.getContractFactory("FloorAuthority");
  const authority = await Authority.deploy(
    deployer.address,
    deployer.address,
    deployer.address,
    deployer.address
  );

  const FLOOR = await ethers.getContractFactory("FloorERC20Token");
  const floor = await FLOOR.deploy(authority.address);

  const SFLOOR = await ethers.getContractFactory("sFLOOR");
  const sFLOOR = await SFLOOR.deploy();

  const FloorTreasury = await ethers.getContractFactory("FloorTreasury");
  const floorTreasury = await FloorTreasury.deploy(floor.address, "0", authority.address);

  const NFTXXTokenCalculator = await ethers.getContractFactory("NFTXXTokenCalculator");
  const nftxXTokenCalculator = await NFTXXTokenCalculator.deploy(
    nftxInventoryStakingAddr,
    floorTreasury.address
  );

  const NFTXXTokenWethCalculator = await ethers.getContractFactory("NFTXXTokenWethCalculator");
  const nftxXTokenWethCalculator = await NFTXXTokenWethCalculator.deploy(
    nftxLiquidityStakingAddr,
    floorTreasury.address
  );

  const BondingCalculator = await ethers.getContractFactory("TokenWethCalculator");
  const bondingCalculator = await BondingCalculator.deploy(punk, weth, 50000); // 50% of SLP reserves value

  const NftxAllocator = await ethers.getContractFactory("NFTXAllocator");
  const nftxAllocator = await NftxAllocator.deploy(authority.address, nftxInventoryStakingAddr, nftxLiquidityStakingAddr, floorTreasury.address);

  const GFLOOR = await ethers.getContractFactory("gFLOOR");
  const gFLOOR = await GFLOOR.deploy(sFLOOR.address);

  const FloorStaking = await ethers.getContractFactory("FloorStaking");
  const staking = await FloorStaking.deploy(
    floor.address,
    sFLOOR.address,
    gFLOOR.address,
    "28800",
    firstEpochNumber,
    firstEpochTime,
    authority.address
  );

  await gFLOOR.initialize(staking.address);

  const Distributor = await ethers.getContractFactory("Distributor");
  const distributor = await Distributor.deploy(
    floorTreasury.address,
    floor.address,
    staking.address,
    authority.address
  );

  await staking.setDistributor(distributor.address);

  // Initialize sFloor
  await sFLOOR.setIndex("1000000000");
  await sFLOOR.setgFLOOR(gFLOOR.address);
  await sFLOOR.initialize(staking.address, floorTreasury.address);

  const BondDepo = await ethers.getContractFactory("FloorBondDepository");
  const bondDepo = await BondDepo.deploy(authority.address, floor.address, gFLOOR.address, staking.address, floorTreasury.address);

  console.log('Setting vault authority as', floorTreasury.address);
  await authority.pushVault(floorTreasury.address, true);

  const AFLOORMigration = await ethers.getContractFactory("AlphaFloorMigration");
  const aFloorMigration = await AFLOORMigration.deploy(authority.address);
  await aFloorMigration.initialize(floor.address, aFloor);

  const PFLOOR = await ethers.getContractFactory("VestingClaim");
  const pFLOOR = await PFLOOR.deploy(floor.address, weth, gFLOOR.address, floorTreasury.address, staking.address, authority.address);

  console.log("FLOOR:", floor.address);
  console.log("gFLOOR:", gFLOOR.address);
  console.log("sFLOOR:", sFLOOR.address);
  console.log("Authority:", authority.address);
  console.log("Treasury:", floorTreasury.address);
  console.log("Staking:", staking.address);
  console.log("Distributor:", distributor.address);
  console.log("BondDepo:", bondDepo.address);

  console.log("aFLOORMigration:", aFloorMigration.address);
  console.log("pFLOOR:", pFLOOR.address);

  console.log("NFTXAllocator:", nftxAllocator.address);

  console.log("PunkWethCalculator:", bondingCalculator.address);
  console.log("NFTXXTokenCalculator:", nftxXTokenCalculator.address);
  console.log("NFTXXTokenWethCalculator:", nftxXTokenWethCalculator.address);

  // Transfer authority to DAO
  await authority.pushGuardian("0xA9d93A5cCa9c98512C8C56547866b1db09090326", true);
  await authority.pushPolicy("0xEFbF837255F854f1e535441391B78114103E0888", true);
  await authority.pushGovernor("0xA9d93A5cCa9c98512C8C56547866b1db09090326", true);

  console.log('Deployment complete');

}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
