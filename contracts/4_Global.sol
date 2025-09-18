// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GlobalExample {
    // 최근 함수 호출 기록 저장
    address public lastSender;
    uint public lastValue;
    uint public lastBlock;
    uint public lastTimestamp;
    address public contractAddress;
    uint public contractBalance;

    // payable 함수 (ETH를 받을 수 있음)
    function recordInfo() public payable {
        lastSender = msg.sender;       // 누가 호출했는지
        lastValue = msg.value;         // 얼마나 보냈는지
        lastBlock = block.number;      // 현재 블록 번호
        lastTimestamp = block.timestamp; // 현재 블록 시간
        contractAddress = address(this);  // 이 컨트랙트 주소
        contractBalance = address(this).balance; // 컨트랙트 보유 ETH 총량
    }
}
