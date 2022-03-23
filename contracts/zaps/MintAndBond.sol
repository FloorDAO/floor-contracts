// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;

import "../interfaces/IBondDepository.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/INFTXVault.sol";
import "../interfaces/INFTXVaultFactory.sol";
import "../interfaces/zaps/IMintAndBond.sol";

import "../libraries/ReentrancyGuard.sol";
import "../libraries/SafeERC20.sol";
import "../libraries/SafeMath.sol";

import "../types/FloorAccessControlled.sol";

contract MintAndBondZap is IMintAndBond, ReentrancyGuard, FloorAccessControlled {

  using SafeERC20 for IERC20;
  using SafeMath for uint256;
  using SafeMath for uint64;

  INFTXVaultFactory public immutable nftxFactory;
  IBondDepository public immutable bondDepository;
  uint256 public minBondAmount;

  event Bond721(uint256[] ids, address receiver);

  constructor (
    address _authority,
    address _bondDepository,
    address _nftxFactory,
    uint256 _minBondAmount
  ) FloorAccessControlled(IFloorAuthority(_authority))
  {
    bondDepository = IBondDepository(_bondDepository);
    nftxFactory = INFTXVaultFactory(_nftxFactory);
    minBondAmount = _minBondAmount;
  }

  // Mints the 721s in NFTX and bonds the returned vault tokens
  // because of max payout limits i.e. you might only be able to bond
  // 0.345 PUNK, the excess must be returned to the user.

  function mintAndBond721(
    uint256 vaultId, 
    uint256[] calldata ids, 
    uint256 bondId,
    address to,
    uint256 maxPrice
  ) external override nonReentrant {
    require(to != address(0) && to != address(this));
    require(ids.length > 0);

    uint64 maxPayout = _getMaxPayout(bondId);
    uint256 bondPrice = bondDepository.marketPrice(bondId);
    // Max bond reduced by 5% to account for possible tx-failing maxBond reduction in next block
    uint256 maxBond = maxPayout.mul(bondPrice).div(100).mul(95); // 18 decimal
    uint256 amountToBond = (maxBond > ids.length.mul(1e18))
      ? ids.length.mul(1e18)
      : maxBond;

    require(amountToBond > ids.length.mul(minBondAmount), "Bond amount too small.");

    // Convert ERC721 to ERC20
    // The vault is an ERC20 in itself and can be used to transfer and manage
    address vault = _mint721(vaultId, ids, to);
    IERC20 vaultToken = IERC20(vault);

    
    // Bond ERC20 in FloorDAO
    if (vaultToken.allowance(address(this), address(bondDepository)) < type(uint256).max) {
      vaultToken.approve(address(bondDepository), type(uint256).max);
    }
    bondDepository.deposit(bondId, amountToBond, maxPrice, to, address(0));

    // Return remaining ERC20
    uint256 remaining = vaultToken.balanceOf(address(this));
    vaultToken.safeTransfer(to, remaining);

    emit Bond721(ids, to);
  }

  function _mint721(uint256 vaultId, uint256[] memory ids, address from) internal returns (address) {
    // Get our vault by ID
    address vault = nftxFactory.vault(vaultId);

    // Transfer tokens to zap and mint to NFTX
    address assetAddress = INFTXVault(vault).assetAddress();
    uint256 length = ids.length;

    IERC721 erc721 = IERC721(assetAddress);
    for (uint256 i; i < length; ++i) {
      erc721.transferFrom(from, address(this), ids[i]);
    }

    // Approve tokens to be used by vault
    erc721.setApprovalForAll(vault, true);

    // Ignored for ERC721 vaults
    uint256[] memory emptyIds;
    INFTXVault(vault).mint(ids, emptyIds);

    return vault;
  }

  function _getMaxPayout(uint256 bondId) internal returns (uint64 maxPayout) {
    (,,,,maxPayout,,) = bondDepository.markets(bondId);
  }

  /**
   * @notice                minimum fraction of an NFT that can be bonded
   * @param _minBondAmount  amount in 18 decimal
   */
  function setMinBondAmount(uint256 _minBondAmount) external onlyPolicy {
    require(_minBondAmount > 0, "Amount not set");
    require(_minBondAmount < 1e18, "Amount too high");
    minBondAmount = _minBondAmount;
  }

  function rescue(address token) external onlyGovernor {
      IERC20(token).safeTransfer(
          msg.sender,
          IERC20(token).balanceOf(address(this))
      );
  }

}
