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
    function getNonce(
        address sender,
        uint192 key
    )
        external
        view
        returns (uint256);

    function getUserOpHash(
        PackedUserOperation calldata userOp
    )
        external
        view
        returns (bytes32);
}

contract MyAccount {

    IEntryPoint public immutable entryPoint;
    address public immutable owner;

    constructor(
        address _entryPoint,
        address _owner
    ) {
        entryPoint = IEntryPoint(_entryPoint);
        owner = _owner;
    }


    modifier onlyEntryPoint() {
        require(
            msg.sender == address(entryPoint),
            "only EntryPoint"
        );

        _;
    }


    /*
        EntryPoint가 UserOperation 검증 시 호출
    */
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    )
        external
        onlyEntryPoint
        returns (uint256)
    {
        /*
            Paymaster가 가스를 부담
            Paymaster가 있으면 EntryPoint가 missingAccountFunds = 0 으로 전달.
        */
        require(
            missingAccountFunds == 0,
            "Paymaster required"
        );


        address signer =
            recoverSigner(
                userOpHash,
                userOp.signature
            );


        // ERC-4337 convention
        // 0 = success
        // 1 = signature failure
        if (signer != owner) {
            return 1;
        }


        return 0;
    }


    /*
        UserOperation 실행
    */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    )
        external
        onlyEntryPoint
    {
        (bool success, bytes memory result) =
            target.call{value: value}(data);

        if (!success) {
            assembly {
                revert(
                    add(result, 32),
                    mload(result)
                )
            }
        }
    }


    function recoverSigner(
        bytes32 hash,
        bytes calldata signature
    )
        internal
        pure
        returns (address)
    {
        if (signature.length != 65) {
            return address(0);
        }

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(
                add(signature.offset, 32)
            )

            v := byte(
                0,
                calldataload(
                    add(signature.offset, 64)
                )
            )
        }


        bytes32 signedHash =
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    hash
                )
            );


        return ecrecover(
            signedHash,
            v,
            r,
            s
        );
    }


    receive() external payable {}
}