// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract Counter {
    uint256 public number;

    event Incremented(
        address indexed caller,
        uint256 newNumber
    );

    function increment() external {
        number++;

        emit Incremented(
            msg.sender,
            number
        );
    }
}