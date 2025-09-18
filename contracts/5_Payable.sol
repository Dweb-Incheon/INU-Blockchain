// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimplePayable {
    // 컨트랙트에 들어온 Ether의 총량 확인
    uint public balance;

    // 이 함수는 payable 이라서, 호출할 때 ETH를 함께 보낼 수 있음
    function deposit() public payable {
        balance += msg.value; // msg.value는 보내진 Ether 양(wei 단위)
    }

    // 컨트랙트에 있는 잔액을 특정 주소로 보내기
    function withdraw(address payable _to, uint _amount) public {
        require(_amount <= balance, "Not enough balance");
        balance -= _amount;
        _to.transfer(_amount); // payable 주소로만 전송 가능
    }

    // 컨트랙트 주소로 직접 ETH를 전송했을 때 처리하는 함수 (external 컨트랙트 내부에서 호출 불가/외부에서만 호출)
    receive() external payable {
        balance += msg.value;
    }
}
