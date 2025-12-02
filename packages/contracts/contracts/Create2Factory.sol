// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Create2Factory {
    event Deployed(address addr, uint256 salt);

    function deploy(uint256 salt, bytes memory bytecode) public returns (address) {
        address addr;
        assembly {
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }
        emit Deployed(addr, salt);
        return addr;
    }
}
