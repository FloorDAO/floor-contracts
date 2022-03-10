const { expect } = require("chai");
const { ethers } = require("hardhat");

const { smock } = require("@defi-wonderland/smock");

const { round } = require("lodash");

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';


/**
 * ..
 */

describe("MintAndBond", function () {

    // Set up our test users
    let deployer, alice, bob, carol;

    // Set up our factories and contracts to deploy
    let authFactory, depositoryFactory, erc20Factory, erc721Factory, floorFactory, gFloorFactory, treasuryFactory;

    // Bond depository constructor variables
    let capacity = 10000e9;
    let initialPrice = 400e9;
    let buffer = 2e5;

    let vesting = 100;
    let timeToConclusion = 60 * 60 * 24;
    let conclusion = round((Date.now() / 1000), 0) + timeToConclusion;

    let depositInterval = 60 * 60 * 4;
    let tuneInterval = 60 * 60;

    let authority;
    let floor;
    let depository, bondDepository;
    let treasury;
    let gFLOOR;
    let staking;

    let mintAndBondFactory;

    let nftxVaultFactoryFactory, nftxVaultFac;
    let nftxVaultFactory, nftxVault;


    /**
     * ..
     */

    before(async function () {
        [deployer, alice, bob, carol] = await ethers.getSigners();

        authFactory = await ethers.getContractFactory("FloorAuthority");
        erc20Factory = await smock.mock("MockERC20");
        erc721Factory = await ethers.getContractFactory("ERC721Mock");
        gFloorFactory = await smock.mock("MockGFloor");
        floorFactory = await ethers.getContractFactory("FloorERC20Token");
        treasuryFactory = await ethers.getContractFactory("TreasuryMock");
        depositoryFactory = await ethers.getContractFactory("FloorBondDepository");
        staking = await smock.fake("IStaking");

        mintAndBondFactory = await ethers.getContractFactory("MintAndBond");
    });


    /**
     * ..
     */

    beforeEach(async function () {
        // We need to get our FLOOR contract and authority contract to use in treasury deployment
        authority = await authFactory.deploy(deployer.address, deployer.address, deployer.address, deployer.address);

        // Set up some tokens
        floor = await floorFactory.deploy(authority.address);
        weth = await erc20Factory.deploy("Weth", "WETH", 18);
        cryptopunk = await erc721Factory.deploy("CryptoPunk", "PUNK");
        // punk = await erc20Factory.deploy("Punk", "PUNK", 18);

        // Get the ContractFactory for the Treasury contract
        treasury = await treasuryFactory.deploy(floor.address, "0", authority.address);

        await authority.pushVault(treasury.address, true);

        // Mint some floor to treasury
        await treasury.enable(2, floor.address, NULL_ADDRESS);
        await floor.mint(treasury.address, "10000000000000");

        // Deploy some gFLOOR (needed?)
        gFLOOR = await gFloorFactory.deploy("50000000000");

        // Add depository
        depository = await depositoryFactory.deploy(
            authority.address,
            floor.address,
            gFLOOR.address,
            staking.address,
            treasury.address
        );

        // Reward manager
        await treasury.enable(9, depository.address, NULL_ADDRESS);

        // Create our NFTX factory and a vault instance. The vault instance is then passed
        // to the factory to be referenced in the `.vault()` method call.
        nftxVaultFactoryFactory = await smock.mock("NFTXVaultFactoryMock");
        nftxVaultFac = await smock.mock("NFTXVaultMock");

        nftxVaultFactory = await nftxVaultFactoryFactory.deploy();
        nftxVault = await nftxVaultFac.deploy();

        await nftxVaultFactory.setVault(nftxVault.address);
        await nftxVault.setAssetAddress(cryptopunk.address);

        // Create a bond
        bondDepository = await depository.create(
          nftxVault.address,
          [capacity, initialPrice, buffer],
          [false, true],
          [vesting, conclusion],
          [depositInterval, tuneInterval]
        );

        // Set up our Sushi router (this is the same as a Uniswap router)
        let sushiRouterFactory = await smock.mock("UniswapV2RouterMock");
        let sushiRouter = await sushiRouterFactory.deploy();

        // Set up our Mint and Bond zap
        mintAndBond = await mintAndBondFactory.deploy(
            depository.address,
            nftxVaultFactory.address,
            sushiRouter.address,
            weth.address,
            treasury.address
        );

        // Give user alice 5 ERC721 tokens
        await cryptopunk.mint(alice.address, 0);
        await cryptopunk.mint(alice.address, 1);
        await cryptopunk.mint(alice.address, 2);
        await cryptopunk.mint(alice.address, 3);
        await cryptopunk.mint(alice.address, 4);
    });


    /**
     * ..
     */

    it("Should not be able to mint with too little `amountToBond`", async function () {
        // Confirm our user owns the expected 5 ERC721s
        expect(await cryptopunk.balanceOf(alice.address)).to.equal(5);

        // We have to approve outside of the contract (??)
        await cryptopunk.connect(alice).setApprovalForAll(mintAndBond.address, true);
        await nftxVault.mintCoins(alice.address, "100000000000000000000000");
        await nftxVault.connect(alice).approve(mintAndBond.address, "100000000000000000000000");
        const vaultId = await nftxVault.vaultId();
        // Try and mint too many IDs
        await mintAndBond.connect(alice).mintAndBond721(
            vaultId,                        // vaultId
            [1, 2, 4],                      // ids
            '30000000000000000',            // amountToBond (0.03)
            parseInt(bondDepository.value), // bondId
            alice.address,                  // to
            '31000000000000000'             // maxPrice (0.031)
        )
    });

    xit("Should not be able to bond with un-owned ERC721", async function () {
        // Try to mint and bond an ID that user does not own
        await mintAndBond.mintAndBond721(
            await nftxVault.vaultId(),  // vaultId
            [3],                        // ids
            '10000000000000000',        // amountToBond (0.01)
            parseInt(bondDepository.value),             // bondId
            bob.address,                // to
            '11000000000000000'         // maxPrice (0.011)
        )
    });


    xit("Should be able to mint and bond a valid ERC721", async function () {
        // Give a user 5 ERC721 tokens

        // Give user some ETH

        // Confirm we can mint and bond with correct amount to bond
        await mintAndBond.mintAndBond721(
            await nftxVault.vaultId(),  // vaultId
            [1, 2, 4],                  // ids
            '2030000000000000000',      // amountToBond (2.03)
            parseInt(bondDepository.value),             // bondId
            alice.address,              // to
            '2031000000000000000'       // maxPrice (2.031)
        )

        // Confirm user no longer has specified ERC721s

        // Confirm user still has 3 and 5

        // Confirm ERC20 returned

        // Confirm vault holds the ERC721s

        // Confirm bond depository holdings

    });

});
