// SPDX-License-Identifier: MIT
pragma solidity ^0.7.5;

import "../interfaces/IStaking.sol";
import "../interfaces/IERC20.sol";
import "../libraries/SafeERC20.sol";


/** 
 * Mints into nftx and bonds maximum into floordao
 */

contract StakeAndWrapZap {

  using SafeERC20 for IERC20;

  IStaking public immutable staking;
  IERC20 public immutable FLOOR;
  IERC20 public immutable sFLOOR;

  // Event fired when FLOOR is staked and wrapped
  event FloorStakedAndWrapped(address user, uint256 amount, uint256 received);


  /** 
   * @notice TODO
   *
   * @param _staking     TODO
   * @param _floor       TODO
   * @param _sFloor      TODO
   */

  constructor (address _staking, address _floor, address _sFloor) {
    // Set our staking contract
    staking = IStaking(_staking);

    // Store our FLOOR and sFLOOR ERC20 contracts
    FLOOR = IERC20(_floor);
    sFLOOR = IERC20(_sFloor);
  }


  /** 
   * @notice Approves all FLOOR and sFLOOR in this contract to be
   * used by the staking contract.
   */

  function approve() external {
    FLOOR.approve(address(staking), type(uint256).max);
    sFLOOR.approve(address(staking), type(uint256).max);
  }


  /** 
   * @notice TODO
   *
   * @param _to       The recipient of bond payout
   * @param _amount   The max bond price to account for slippage
   *
   * @return returnedAmount_ Remaining vtokens to send back to user
   */

  function stakeAndWrap(address _to, uint256 _amount) external returns (uint256 returnedAmount_) {
    require(_to != address(0));

    // Transfer FLOOR from sender to our zap contract
    FLOOR.safeTransferFrom(msg.sender, address(this), _amount);

    // Stake the FLOOR transferred from sender without rebasing or claiming
    staking.stake(address(this), _amount, false, false);
    
    // Return the amount of gFLOOR received by `_to`
    returnedAmount_ = staking.wrap(_to, _amount);

    // Emit our event for subgraph visibility
    emit FloorStakedAndWrapped(_to, _amount, returnedAmount_);
  }

}
