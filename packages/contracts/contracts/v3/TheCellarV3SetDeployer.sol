// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TheCellarV3Upgrade.sol";

/**
 * @title TheCellarV3SetDeployer
 * @notice Upgrade to add setDeployerAddress function
 * @dev This upgrade adds the ability to set deployerAddress after deployment
 *      Extends TheCellarV3Upgrade to maintain storage layout compatibility
 */
contract TheCellarV3SetDeployer is TheCellarV3Upgrade {

    /**
     * @notice Set the deployer address that receives harvested fees
     * @dev Can only be called by owner
     * @param _deployerAddress The address to receive harvested fees
     */
    function setDeployerAddress(address _deployerAddress) external onlyOwner {
        require(_deployerAddress != address(0), "Invalid address");
        deployerAddress = _deployerAddress;
    }

}

