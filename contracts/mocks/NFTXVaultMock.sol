// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;


contract NFTXVaultMock {

    address public vaultAssetAddress;

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
        return 1;
    }

}