// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;

import "../interfaces/IBondDepository.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/INFTXVault.sol";
import "../interfaces/INFTXVaultFactory.sol";
import "../interfaces/IMintAndBond.sol";

import "../libraries/ReentrancyGuard.sol";
import "../libraries/SafeERC20.sol";
import "../libraries/SafeMath.sol";


contract MintAndBond is IMintAndBond, ReentrancyGuard {

  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  INFTXVaultFactory public immutable nftxFactory;
  IBondDepository public immutable bondDepository;

  event Bond721(uint256[] ids, address receiver);

  constructor (address _bondDepository, address _nftxFactory) {
    bondDepository = IBondDepository(_bondDepository);
    nftxFactory = INFTXVaultFactory(_nftxFactory);
  }

  // Mints the 721s in NFTX and bonds the returned vault tokens
  // because of max payout limits i.e. you might only be able to bond
  // 0.345 PUNK, the excess must be returned to the user.

  function mintAndBond721(
    uint256 vaultId, 
    uint256[] calldata ids, 
    uint256 amountToBond, 
    uint256 bondId,
    address to,
    uint256 maxPrice
  ) external override nonReentrant {
    require(to != address(0) && to != address(this));
    require(ids.length > 0);

    // Ensures that people do not over bond to take advantage of fee exclusion i.e. bond
    // 10 PUNK but max bond is 0.32 so you recieve 9.68 PUNK back without paying NFTX fee
    // ids - 1 < amountToBond < ids
    require(ids.length.mul(1e18) > amountToBond);
    require(ids.length.sub(1).mul(1e18) < amountToBond);

    // Convert ERC721 to ERC20
    // The vault is an ERC20 in itself and can be used to transfer and manage
    address vault = _mint721(vaultId, ids, to);
    IERC20 vaultToken = IERC20(vault);

    // Bond ERC20 in FloorDAO
    vaultToken.approve(address(bondDepository), amountToBond);
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

}
