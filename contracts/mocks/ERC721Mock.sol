// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.7.5;

import {ERC721} from "@rari-capital/solmate/src/tokens/ERC721.sol";

contract ERC721Mock is ERC721 {
    constructor(
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {}

    function mint(address to, uint256 id) public virtual {
        _mint(to, id);
    }

    function burn(uint256 id) public virtual {
        _burn(id);
    }

    function tokenURI(uint256 id) public view virtual override returns (string memory) {
    	return "https://example.com/";
    }
}