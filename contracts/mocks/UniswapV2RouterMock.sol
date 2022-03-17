// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity >=0.7.5;

contract UniswapV2RouterMock {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        uint256[] memory amountArray;
        return amountArray;
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (
        uint amountA,
        uint amountB,
        uint liquidity
    ) {
        return (0, 0, 0);
    }
        
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (
        uint amountA,
        uint amountB
    ) {
        return (0, 0);
    }
}