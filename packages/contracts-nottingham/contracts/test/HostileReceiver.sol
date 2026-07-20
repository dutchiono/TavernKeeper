// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISheriffsOffice {
    function takeOffice(
        uint256 epochId,
        uint256 deadline,
        uint256 maxPrice,
        string calldata proclamation
    ) external payable returns (uint256);

    function withdrawCredits() external;
}

/**
 * @dev Test-only. A sheriff that refuses ETH, used to prove the office cannot be bricked
 *      by an unpayable holder (FIX-6). `accept` toggles so the same address can also
 *      demonstrate collecting escrowed credits afterwards.
 */
contract HostileReceiver {
    bool public accept;

    function setAccept(bool _accept) external {
        accept = _accept;
    }

    function seize(address office, uint256 value) external payable {
        ISheriffsOffice(office).takeOffice{value: value}(
            0,
            type(uint256).max,
            type(uint256).max,
            "you cannot remove me"
        );
    }

    function collect(address office) external {
        ISheriffsOffice(office).withdrawCredits();
    }

    receive() external payable {
        require(accept, "HostileReceiver: rejecting ETH");
    }
}
