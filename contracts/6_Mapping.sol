// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

contract Mapping {
    mapping(address=>string) public names;

    function setName(string calldata _name) public {
        names[msg.sender] = _name; 
    } 
    
    function DeleteName() public {
        delete names[msg.sender]; 
    } 
}