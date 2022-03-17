// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;


contract NFTXVaultFactoryMock {
  address public vaultAddress;

  function setVault(address _vaultAddress) public {
    // Needs to be passed an INFTXVault address
    vaultAddress = _vaultAddress;
  }

  function vault(uint256 vaultId) external view returns (address) {
    return vaultAddress;
  }
}
