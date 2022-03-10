// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;

import "../interfaces/IBondDepository.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/INFTXVault.sol";
import "../interfaces/INFTXVaultFactory.sol";
import "../interfaces/IMintAndBond.sol";
import "../interfaces/ITreasury.sol";
import "../interfaces/IUniswapV2Router.sol";
import "../interfaces/IWETH.sol";

import "../libraries/ReentrancyGuard.sol";
import "../libraries/SafeERC20.sol";
import "../libraries/SafeMath.sol";


contract MintAndBond is IMintAndBond, ReentrancyGuard {

  using SafeERC20 for IERC20;
  using SafeMath for uint256;
  
  IWETH public immutable WETH;
  INFTXVaultFactory public immutable nftxFactory;
  IUniswapV2Router public immutable sushiRouter;
  IBondDepository public immutable bondDepository;
  ITreasury public immutable treasury;

  uint256 constant BASE = 1e18;

  event Bond721(uint256[] ids, address receiver);

  constructor (
    address _bondDepository,
    address _nftxFactory,
    address _sushiRouter,
    address _WETH,
    address _treasury
  ) {
    WETH = IWETH(_WETH);
    treasury = ITreasury(_treasury);
    nftxFactory = INFTXVaultFactory(_nftxFactory);
    sushiRouter = IUniswapV2Router(_sushiRouter);
    bondDepository = IBondDepository(_bondDepository);
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
    require(ids.length.mul(1e18).sub(amountToBond) > 1 ether);

    // Convert ERC721 to ERC20
    (address vault, uint256 vaultBalance) = _mint721(vaultId, ids);

    // Bond ERC20 in FloorDAO
    _bondVaultToken(bondId, amountToBond, maxPrice);

    // Return remaining ERC20
    uint256 remaining = IERC20(vault).balanceOf(address(this));
    IERC20(vault).safeTransfer(to, remaining);

    emit Bond721(ids, to);
  }

  function _mint721(uint256 vaultId, uint256[] memory ids) internal returns (address, uint256) {
    // Get our vault by ID
    address vault = nftxFactory.vault(vaultId);

    // Transfer tokens to zap and mint to NFTX
    address assetAddress = INFTXVault(vault).assetAddress();
    uint256 length = ids.length;

    IERC721 erc721 = IERC721(assetAddress);

    for (uint256 i; i < length; ++i) {
        erc721.transferFrom(msg.sender, vault, ids[i]);
    }

    // Ignored for ERC721 vaults
    uint256[] memory emptyIds;
    INFTXVault(vault).mint(ids, emptyIds);

    uint256 count = ids.length;
    uint256 balance = (count * BASE) - (count * INFTXVault(vault).mintFee()); 
    
    return (vault, balance);
  }

  function _bondVaultToken(uint256 bondId, uint256 amountToBond, uint256 maxPrice) internal {
    bondDepository.deposit(bondId, amountToBond, maxPrice, msg.sender, address(0)); 
  }

}
