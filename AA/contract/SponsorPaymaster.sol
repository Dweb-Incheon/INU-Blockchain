// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

struct PackedUserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    bytes32 accountGasLimits;
    uint256 preVerificationGas;
    bytes32 gasFees;
    bytes paymasterAndData;
    bytes signature;
}

interface IEntryPoint {
    function depositTo(address account) external payable;

    function balanceOf(address account)
        external
        view
        returns (uint256);
}

contract SponsorPaymaster {

    address public immutable entryPoint;
    address public immutable owner;

    constructor(address _entryPoint) {
        entryPoint = _entryPoint;
        owner = msg.sender;
    }

    modifier onlyEntryPoint() {
        require(
            msg.sender == entryPoint,
            "only EntryPoint"
        );
        _;
    }

    /*
        모든 UserOperation을 sponsor함
    */
    function validatePaymasterUserOp(
        PackedUserOperation calldata,
        bytes32,
        uint256
    )
        external
        onlyEntryPoint
        returns (
            bytes memory context,
            uint256 validationData
        )
    {
        context = "";
        validationData = 0;
    }

    /*
        EntryPoint에 ETH 예치
    */
    function deposit() external payable {
        IEntryPoint(entryPoint)
            .depositTo{value: msg.value}(
                address(this)
            );
    }

    function getDeposit()
        external
        view
        returns (uint256)
    {
        return
            IEntryPoint(entryPoint)
                .balanceOf(address(this));
    }
}