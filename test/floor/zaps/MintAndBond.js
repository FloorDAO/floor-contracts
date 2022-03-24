const { expect } = require("chai");
const { ethers } = require("hardhat");

const { smock } = require("@defi-wonderland/smock");

const { round } = require("lodash");

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';


/**
 * ..
 */

describe("MintAndBondZap", function () {

    // Set up our test users
    let deployer, alice, bob, carol;

    // Set up our factories and contracts to deploy
    let authFactory, depositoryFactory, erc20Factory, erc721Factory, gFloorFactory, treasuryFactory, mintAndBondFactory;

    // Bond depository constructor variables
    let capacity = 4000000000000;
    let initialPrice = 3765836;
    let buffer = 60000;

    // Second market for limited deposit amounts
    let altCapacity = 100000
    let altInitialPrice = 1000;

    let vesting = 100;
    let timeToConclusion = 60 * 60 * 24;
    let conclusion = round((Date.now() / 1000), 0) + timeToConclusion;

    let altTimeToConclusion = 60 * 60 * 24 * 1000;
    let altConclusion = round((Date.now() / 1000), 0) + altTimeToConclusion;

    let depositInterval = 60 * 60 * 4;
    let tuneInterval = 60 * 60;

    // Set up our deployed contract variables
    let authority, floor, depository, treasury, gFLOOR, staking;

    // Set up our NFTX vault factories and contracts
    let nftxVaultFactoryFactory, nftxVaultFac;
    let nftxVaultFactory, nftxVault;


    /**
     * Set up our contract factories just the once to save time.
     */

    before(async function () {
        [deployer, alice, bob, carol] = await ethers.getSigners();

        authFactory = await ethers.getContractFactory("FloorAuthority");
        erc20Factory = await smock.mock("MockERC20");
        erc721Factory = await ethers.getContractFactory("ERC721Mock");
        gFloorFactory = await smock.mock("MockGFloor");
        treasuryFactory = await ethers.getContractFactory("TreasuryMock");
        depositoryFactory = await ethers.getContractFactory("FloorBondDepository");
        staking = await smock.fake("IStaking");

        mintAndBondFactory = await ethers.getContractFactory("MintAndBondZap");
    });


    /**
     * Set up our environment and contracts fresh for each test to prevent
     * any cross-test contamination.
     */

    beforeEach(async function () {
        // We need to get our FLOOR contract and authority contract to use in treasury deployment
        authority = await authFactory.deploy(deployer.address, deployer.address, deployer.address, deployer.address);

        // Set up some tokens
        floor = await erc20Factory.deploy("Floor", "FLOOR", 9);
        weth = await erc20Factory.deploy("Weth", "WETH", 18);
        cryptopunk = await erc721Factory.deploy("CryptoPunk", "PUNK");

        // Get the ContractFactory for the Treasury contract
        treasury = await treasuryFactory.deploy(floor.address, "0", authority.address);

        await authority.pushVault(treasury.address, true);

        // Deposit reserves for treasury to allow minting FLOOR
        await treasury.enable(2, weth.address, NULL_ADDRESS);
        await weth.mint(deployer.address, "100000000000000000000"); // mint 100 ETH
        await treasury.enable(0, deployer.address, NULL_ADDRESS);
        await weth.approve(treasury.address, "100000000000000000000");
        await treasury.deposit("100000000000000000000", weth.address, "100000000000000");

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

        // Create a bond 0
        await depository.create(
          nftxVault.address,
          [capacity, initialPrice, buffer],
          [false, true],
          [vesting, conclusion],
          [depositInterval, tuneInterval]
        );

        // Create a bond 1
        await depository.create(
          nftxVault.address,
          [altCapacity, altInitialPrice, buffer],
          [false, true],
          [vesting, altConclusion],
          [depositInterval, tuneInterval]
        );

        // Set up our Sushi router (this is the same as a Uniswap router)
        let sushiRouterFactory = await smock.mock("UniswapV2RouterMock");
        let sushiRouter = await sushiRouterFactory.deploy();

        // Set up our Mint and Bond zap
        mintAndBond = await mintAndBondFactory.deploy(
            authority.address,
            depository.address,
            nftxVaultFactory.address,
            "604800" // 1 week
        );

        // Give user alice 5 ERC721 tokens
        await cryptopunk.mint(alice.address, 0);
        await cryptopunk.mint(alice.address, 1);
        await cryptopunk.mint(alice.address, 2);
        await cryptopunk.mint(alice.address, 3);
        await cryptopunk.mint(alice.address, 4);

        // Confirm our user owns the expected 5 ERC721s
        expect(await cryptopunk.balanceOf(alice.address)).to.equal(5);
    });


    /**
     * Test that a user will not be able to trade their tokens without first approving
     * the mint and bond contract to use them.
     */

    it("Should not allow unapproved tokens to `MintAndBond`", async function () {
        // Try and mint without approval
        await expect(
            mintAndBond.connect(alice).mintAndBond721(
                await nftxVault.vaultId(),      // vaultId
                [1, 2, 4],                      // ids
                0,                              // bondId
                alice.address,                  // to
                '31000000000000000'             // maxPrice (0.031)
            )
        ).to.be.reverted
    });


    /**
     * Test that a user will not be able to deposit tokens that they do not have
     * ownership of.
     */

    it("Should not be able to bond with un-owned ERC721", async function () {
        // Try to mint and bond an ID that user does not own
        await expect(
            mintAndBond.mintAndBond721(
                await nftxVault.vaultId(),      // vaultId
                [3],                            // ids
                0,                               // bondId
                bob.address,                    // to
                '0910000000000000000'           // maxPrice (0.91)
            )
        ).to.be.reverted
    });


    /**
     * Test our happy path to mint and bond a valid ERC721
     */

    it("Should be able to mint and bond a valid ERC721", async function () {
        // We have to approve outside of the contract
        await cryptopunk.connect(alice).setApprovalForAll(mintAndBond.address, true);

        // Confirm we can mint and bond with correct amount to bond
        await expect(
            await mintAndBond.mintAndBond721(
                await nftxVault.vaultId(),      // vaultId
                [1, 4],                         // ids
                1,                              // bondId
                alice.address,                  // to
                '1510000000000000000'           // maxPrice (1.51)
            )
        ).to.emit(mintAndBond, 'CreateNote');

        // Confirm updated ownership of ERC721s
        expect(await cryptopunk.balanceOf(alice.address)).to.equal(3)
        expect(await cryptopunk.balanceOf(mintAndBond.address)).to.equal(2)

        expect(await cryptopunk.ownerOf(0)).to.equal(alice.address);
        expect(await cryptopunk.ownerOf(1)).to.equal(mintAndBond.address);
        expect(await cryptopunk.ownerOf(2)).to.equal(alice.address);
        expect(await cryptopunk.ownerOf(3)).to.equal(alice.address);
        expect(await cryptopunk.ownerOf(4)).to.equal(mintAndBond.address);

        expect(await nftxVault.balanceOf(alice.address)).to.equal("0");
    });

    /**
     * Test our happy path to mint and bond a valid ERC721 limited by max deposit
     */

    it("Should be able to mint and bond a valid ERC721 limited by max deposit", async function () {
      // We have to approve outside of the contract
      await cryptopunk.connect(alice).setApprovalForAll(mintAndBond.address, true);

      // Confirm we can mint and bond with correct amount to bond
      await expect(
        await mintAndBond.mintAndBond721(
          await nftxVault.vaultId(),      // vaultId
          [1, 2, 4],                      // ids
          1,                              // bondId
          alice.address,                  // to
          '1510000000000000000'           // maxPrice (1.51)
        )
      ).to.emit(mintAndBond, 'CreateNote');

      // Confirm updated ownership of ERC721s
      expect(await cryptopunk.balanceOf(alice.address)).to.equal(2)
      expect(await cryptopunk.balanceOf(mintAndBond.address)).to.equal(3)

      expect(await cryptopunk.ownerOf(0)).to.equal(alice.address);
      expect(await cryptopunk.ownerOf(1)).to.equal(mintAndBond.address);
      expect(await cryptopunk.ownerOf(2)).to.equal(mintAndBond.address);
      expect(await cryptopunk.ownerOf(3)).to.equal(alice.address);
      expect(await cryptopunk.ownerOf(4)).to.equal(mintAndBond.address);

      expect(await nftxVault.balanceOf(alice.address)).to.be.any; // TODO: check for bignumber greater than 0
    });

    /**
     * Test our happy path to mint and bond a valid ERC721 limited by max deposit
     */
    it("Should be reverted if user tries to claim before timelock ends", async function () {
      // We have to approve outside of the contract
      await cryptopunk.connect(alice).setApprovalForAll(mintAndBond.address, true);

      // Confirm we can mint and bond with correct amount to bond
      await expect(
        mintAndBond.mintAndBond721(
          await nftxVault.vaultId(),         // vaultId
          [1, 2, 4],                         // ids
          1,                                 // bondId
          alice.address,                     // to
          '1510000000000000000'              // maxPrice (1.51)
        )
      ).to.emit(mintAndBond, 'CreateNote');

      await expect(mintAndBond.claim(alice.address, [0], nftxVault.address)).to.be.revertedWith("Depository: note not matured");
      
    });

    it("Should be succeed if user tries to claim after timelock ends", async function () {
      // We have to approve outside of the contract
      await cryptopunk.connect(alice).setApprovalForAll(mintAndBond.address, true);

      // Confirm we can mint and bond with correct amount to bond
      await expect(
        mintAndBond.mintAndBond721(
          await nftxVault.vaultId(),         // vaultId
          [1, 2, 4],                         // ids
          1,                                 // bondId
          alice.address,                     // to
          '1510000000000000000'              // maxPrice (1.51)
        )
      ).to.emit(mintAndBond, 'CreateNote');
      
      await network.provider.request({
        method: "evm_increaseTime",
        params: [604800]
      });

      await expect(mintAndBond.claim(alice.address, [0], nftxVault.address)).to.emit(mintAndBond, 'ClaimNote').withArgs(alice.address, [0], nftxVault.address);

    });

});
