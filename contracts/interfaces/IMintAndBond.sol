// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;


interface IMintAndBond {

  function mintAndBond721(
    uint256 vaultId,
    uint256[] calldata ids,
    uint256 amountToBond,
    uint256 bondId,
    address to,
    uint256 maxPrice
  ) external;

}
