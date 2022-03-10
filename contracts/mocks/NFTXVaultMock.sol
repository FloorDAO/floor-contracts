// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;

import "../types/ERC20.sol";

contract NFTXVaultMock is ERC20("NFTX Vault", "VAULT", 18) {

    address public vaultAssetAddress;

    uint256 constant base = 10**18;

    function setAssetAddress(address _vaultAssetAddress) public {
        vaultAssetAddress = _vaultAssetAddress;
    }

    function vaultId() external view returns (uint256) {
        return 1;
    }

    function assetAddress() external view returns (address) {
        return vaultAssetAddress;
    }

    function mintFee() external view returns (uint256) {
        return 1;
    }

    function mint(uint256[] calldata tokenIds, uint256[] calldata amounts) external returns (uint256) {
        return mintTo(tokenIds, amounts, msg.sender);
    }

    function mintTo(
        uint256[] memory tokenIds,
        uint256[] memory amounts, /* ignored for ERC721 vaults */
        address to
    ) public returns (uint256) {
        // Mint to the user.
        _mint(to, tokenIds.length * 1e18);

        return tokenIds.length;
    }

    function mintCoins(address user, uint256 amount) external {
        _mint(user, amount);
    }

}