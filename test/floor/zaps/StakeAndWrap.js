const { expect } = require("chai");
const { ethers } = require("hardhat");

const { smock } = require("@defi-wonderland/smock");

const { round } = require("lodash");

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';


describe("StakeAndWrapZap", function () {

    // Set up our test users
    let deployer, alice, bob, carol;

    // Set up our factories and contracts to deploy
    let erc20Factory, stakeAndWrapFactory;
    let floor, sFloor, staking, stakeAndWrap;


    /**
     * Set up our contract factories just the once to save time.
     */

    before(async function () {
        erc20Factory = await smock.mock("MockERC20")
        staking = await smock.fake("IStaking")

        stakeAndWrapFactory = await ethers.getContractFactory("StakeAndWrapZap")
    });


    /**
     * Set up our environment and contracts fresh for each test to prevent
     * any cross-test contamination.
     */

    beforeEach(async function () {
        // Set up fresh users per test
        [deployer, alice, bob, carol] = await ethers.getSigners()

        // Set up some tokens
        floor = await erc20Factory.deploy("Floor", "FLOOR", 9)
        sFloor = await erc20Factory.deploy("sFloor", "sFLOOR", 9)

        // Set up our Mint and Bond zap
        stakeAndWrap = await stakeAndWrapFactory.deploy(
            staking.address,
            floor.address,
            sFloor.address
        );
    });


    it("Should allow FLOOR to be staked and wrapped", async function () {
        // Mint 500 FLOOR to Alice
        await floor.mint(alice.address, 500)

        // Allow Alice to transfer FLOOR to zap
        await floor.connect(alice).approve(stakeAndWrap.address, 500)

        // Stake 500 FLOOR to be wrapped into gFLOOR
        await stakeAndWrap.connect(alice).stakeAndWrap(alice.address, 500)
        
        await expect(floor.balanceOf(alice.address), 0)
        await expect(sFloor.balanceOf(alice.address), 500)
    });


    it("Should allow FLOOR to be staked and wrapped to another user", async function () {
        // Mint 500 FLOOR to Alice
        await floor.mint(alice.address, 500)

        // Allow Alice to transfer FLOOR to zap
        await floor.connect(alice).approve(stakeAndWrap.address, 500)

        // Stake 500 FLOOR to be wrapped into gFLOOR
        await stakeAndWrap.connect(alice).stakeAndWrap(bob.address, 500)
        
        await expect(floor.balanceOf(alice.address), 0)
        await expect(sFloor.balanceOf(alice.address), 0)
        await expect(floor.balanceOf(bob.address), 0)
        await expect(sFloor.balanceOf(bob.address), 500)
    });

    it("Should allow FLOOR to be staked and wrapped if not approved", async function () {
        // Mint 500 FLOOR to Alice
        await floor.mint(alice.address, 500)

        // Stake 500 FLOOR to be wrapped into gFLOOR
        await expect(
            stakeAndWrap.connect(alice).stakeAndWrap(alice.address, 500)
        ).to.be.reverted
        
        await expect(floor.balanceOf(alice.address), 500)
        await expect(sFloor.balanceOf(alice.address), 0)
    });


    it("Should not allow FLOOR to be staked and wrapped to a null address", async function () {
        // Mint 500 FLOOR to Alice
        await floor.mint(alice.address, 500)

        // Allow Alice to transfer FLOOR to zap
        await floor.connect(alice).approve(stakeAndWrap.address, 500)

        // Try and stake with the recipient as a NULL address
        await expect(
            stakeAndWrap.connect(alice).stakeAndWrap(NULL_ADDRESS, 500)
        ).to.be.reverted

        await expect(floor.balanceOf(alice.address), 500)
        await expect(sFloor.balanceOf(alice.address), 0)
    });


    it("Should not allow user with insufficient FLOOR stake", async function () {
        // Mint 500 FLOOR to Alice
        await floor.mint(alice.address, 100)

        // Allow Alice to transfer FLOOR to zap
        await floor.connect(alice).approve(stakeAndWrap.address, 100)

        // Try to mint and bond an ID that user does not own
        await expect(
            stakeAndWrap.connect(alice).stakeAndWrap(alice.address, 500)
        ).to.be.reverted
    });

});
