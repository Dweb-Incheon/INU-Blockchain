// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

contract OwnerTest {
    address public owner;

    event OwnerSet(address indexed oldOwner, address indexed newOwner);

    constructor() {
        owner = msg.sender;
    }

    function changeOwner(address newOwner) public {
        address old = owner;
        owner = newOwner;
        emit OwnerSet(old, newOwner); // 이벤트 발생
    }
}
