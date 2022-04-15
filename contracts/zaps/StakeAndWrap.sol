// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;

import "../interfaces/IStaking.sol";
import "../interfaces/IERC20.sol";
import "../libraries/SafeERC20.sol";

contract StakeAndWrap {

  using SafeERC20 for IERC20;

  IStaking public immutable staking;
  IERC20 public immutable FLOOR;
  IERC20 public immutable sFLOOR;

  event Zapped(address user, uint256 amount, uint256 received);

  constructor (
    address _staking,
    address _floor,
    address _sFloor
  ) {
    staking = IStaking(_staking);
    FLOOR = IERC20(_floor);
    sFLOOR = IERC20(_sFloor);
  }

  function approve() external override {
    FLOOR.approve(address(staking), type(uint256).max);
    sFLOOR.approve(address(staking), type(uint256).max);
  }

  /** 
   * @notice             mints into nftx and bonds maximum into floordao
   * @param _vaultId     the nftx vault id
   * @param _ids[]       the nft ids
   * @param _bondId      the floor bond id
   * @param _to          the recipient of bond payout
   * @param _maxPrice    the max bond price to account for slippage
   * @return remaining_  remaining vtokens to send back to user
   */
  function stakeAndWrap(
    address _to,
    uint256 _amount
  ) external override returns (uint256 gFloorReceived) {
    FLOOR.safeTransferFrom(msg.sender, address(this), _amount);
    staking.stake(address(this), _amount, false, false);
    uint256 gFloorReceived = staking.wrap(_to, _amount);
  }
}
