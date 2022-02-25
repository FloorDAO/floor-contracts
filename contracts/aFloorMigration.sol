// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "./libraries/SafeERC20.sol";
import "./libraries/SafeMath.sol";
import "./types/FloorAccessControlled.sol";

contract AlphaFloorMigration is FloorAccessControlled {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    uint256 public swapEndBlock;

    IERC20 public FLOOR;
    IERC20 public aFLOOR;
    
    bool public isInitialized;

    modifier onlyInitialized() {
        require(isInitialized, "not initialized");
        _;
    }

    modifier notInitialized() {
        require(!isInitialized, "already initialized" );
        _;
    }

    constructor(
        address _authority
    ) FloorAccessControlled(IFloorAuthority(_authority)) {}

    function initialize (
        address _FLOOR,
        address _aFLOOR,
        uint256 _swapDuration
    ) public notInitialized() onlyGovernor {
        require(_FLOOR != address(0), "_FLOOR: Zero address");
        require(_aFLOOR != address(0), "_aFLOOR: Zero address");

        require(_swapDuration < 2_000_000, "swap duration too long");

        FLOOR = IERC20(_FLOOR);
        aFLOOR = IERC20(_aFLOOR);
        swapEndBlock = block.number.add(_swapDuration);
        isInitialized = true;
    }

    /**
      * @notice swaps aFLOOR for FLOOR
      * @param _amount uint256
      */
    function migrate(uint256 _amount) external onlyInitialized() {
        require(
            aFLOOR.balanceOf(msg.sender) >= _amount,
            "amount above user balance"
        );
        require(block.number < swapEndBlock, "swapping of aFLOOR has ended");

        aFLOOR.safeTransferFrom(msg.sender, address(this), _amount);
        FLOOR.transfer(msg.sender, _amount);
    }

    /**
      * @notice governor can withdraw any remaining FLOOR after swapEndBlock
      */
    function withdraw() external onlyGovernor {
        require(block.number > swapEndBlock, "swapping of aFLOOR is ongoing");
        uint256 amount = FLOOR.balanceOf(address(this));
        FLOOR.transfer(msg.sender, amount);
    }
}