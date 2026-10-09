import "dotenv/config";
import { ethers } from "ethers";

const ENTRY_POINT = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

// --------------------------------------------------
// ENV
// --------------------------------------------------

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC);

const owner = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, provider);

const ACCOUNT = process.env.ACCOUNT_ADDRESS;
const COUNTER = process.env.COUNTER_ADDRESS;
const PAYMASTER = process.env.PAYMASTER_ADDRESS;

// --------------------------------------------------
// ABI
// --------------------------------------------------

const accountInterface = new ethers.Interface([
  "function execute(address target,uint256 value,bytes data)",
]);

const counterInterface = new ethers.Interface(["function increment()"]);

const entryPoint = new ethers.Contract(
  ENTRY_POINT,
  [
    "function getNonce(address sender,uint192 key) view returns(uint256)",

    `function getUserOpHash(
      (
        address sender,
        uint256 nonce,
        bytes initCode,
        bytes callData,
        bytes32 accountGasLimits,
        uint256 preVerificationGas,
        bytes32 gasFees,
        bytes paymasterAndData,
        bytes signature
      ) userOp
    ) view returns(bytes32)`,
  ],
  provider,
);

// --------------------------------------------------
// Bundler RPC
// --------------------------------------------------

async function bundlerRpc(method, params) {
  console.log(`\n>>> ${method}`);

  const response = await fetch(process.env.BUNDLER_RPC, {
    method: "POST",

    headers: {
      "content-type": "application/json",
    },

    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const json = await response.json();

  if (json.error) {
    console.error("\nBundler error:");
    console.dir(json.error, {
      depth: null,
    });

    throw new Error(JSON.stringify(json.error, null, 2));
  }

  return json.result;
}

// --------------------------------------------------
// uint128 + uint128 -> bytes32
// --------------------------------------------------

function packUint128(high, low) {
  const highHex = ethers.zeroPadValue(ethers.toBeHex(high), 16);

  const lowHex = ethers.zeroPadValue(ethers.toBeHex(low), 16);

  return ethers.hexlify(ethers.concat([highHex, lowHex]));
}

// --------------------------------------------------
// Paymaster v0.7 packing
//
// address               20 bytes
// verificationGasLimit  16 bytes
// postOpGasLimit        16 bytes
// data                  variable
// --------------------------------------------------

function packPaymasterAndData(paymaster, verificationGas, postOpGas, paymasterData = "0x") {
  return ethers.hexlify(
    ethers.concat([
      paymaster,

      ethers.zeroPadValue(ethers.toBeHex(verificationGas), 16),

      ethers.zeroPadValue(ethers.toBeHex(postOpGas), 16),

      paymasterData,
    ]),
  );
}

function q(value) {
  return ethers.toQuantity(value);
}

// --------------------------------------------------
// RPC UserOp -> PackedUserOperation
// --------------------------------------------------

function makePackedUserOp(userOp) {
  const accountGasLimits = packUint128(
    BigInt(userOp.verificationGasLimit),
    BigInt(userOp.callGasLimit),
  );

  const gasFees = packUint128(BigInt(userOp.maxPriorityFeePerGas), BigInt(userOp.maxFeePerGas));

  const paymasterAndData = packPaymasterAndData(
    userOp.paymaster,
    BigInt(userOp.paymasterVerificationGasLimit),
    BigInt(userOp.paymasterPostOpGasLimit),
    userOp.paymasterData,
  );

  return {
    sender: userOp.sender,

    nonce: BigInt(userOp.nonce),

    // Account는 이미 배포했으므로
    initCode: "0x",

    callData: userOp.callData,

    accountGasLimits,

    preVerificationGas: BigInt(userOp.preVerificationGas),

    gasFees,

    paymasterAndData,

    // getUserOpHash에서는 signature가 hash에 포함되지 않음
    signature: userOp.signature,
  };
}

// --------------------------------------------------
// 현재 UserOp를 owner가 서명
// --------------------------------------------------

async function signUserOp(userOp) {
  const packed = makePackedUserOp(userOp);

  const userOpHash = await entryPoint.getUserOpHash(packed);

  const signature = await owner.signMessage(ethers.getBytes(userOpHash));

  return {
    userOpHash,
    signature,
  };
}

// --------------------------------------------------

async function main() {
  console.log("\n================================");
  console.log("ERC-4337 Sepolia test");
  console.log("================================");

  console.log("Owner     :", owner.address);
  console.log("Account   :", ACCOUNT);
  console.log("Counter   :", COUNTER);
  console.log("Paymaster :", PAYMASTER);
  console.log("EntryPoint:", ENTRY_POINT);

  // ------------------------------------------------
  // 1. Bundler가 EntryPoint v0.7 지원하는지 확인
  // ------------------------------------------------

  const supported = await bundlerRpc("eth_supportedEntryPoints", []);

  console.log("Supported EntryPoints:", supported);

  const supportsV07 = supported.some((x) => x.toLowerCase() === ENTRY_POINT.toLowerCase());

  if (!supportsV07) {
    throw new Error("Bundler does not support EntryPoint v0.7");
  }

  // ------------------------------------------------
  // 2. Counter.increment() calldata
  // ------------------------------------------------

  const incrementData = counterInterface.encodeFunctionData("increment");

  console.log("\nCounter.increment calldata:", incrementData);

  // ------------------------------------------------
  // 3. MyAccount.execute(...)
  // ------------------------------------------------

  const callData = accountInterface.encodeFunctionData("execute", [COUNTER, 0, incrementData]);

  console.log("MyAccount.execute calldata:", callData);

  // ------------------------------------------------
  // 4. nonce
  // ------------------------------------------------

  const nonce = await entryPoint.getNonce(ACCOUNT, 0);

  console.log("nonce:", nonce.toString());

  // ------------------------------------------------
  // 5. gas fee
  // ------------------------------------------------

  const maxPriorityFeePerGas = ethers.parseUnits("0.1", "gwei");

  const maxFeePerGas = ethers.parseUnits("0.2", "gwei");

  // ------------------------------------------------
  // 6. 임시 UserOperation
  // ------------------------------------------------

  let userOp = {
    sender: ACCOUNT,

    nonce: q(nonce),

    callData,

    callGasLimit: q(150000),

    verificationGasLimit: q(250000),

    preVerificationGas: q(100000),

    maxFeePerGas: q(maxFeePerGas),

    maxPriorityFeePerGas: q(maxPriorityFeePerGas),

    paymaster: PAYMASTER,

    paymasterVerificationGasLimit: q(150000),

    paymasterPostOpGasLimit: q(30000),

    paymasterData: "0x",

    signature: "0x",
  };

  // ------------------------------------------------
  // 7. Estimate용 signature 생성
  // 현재 UserOp를 실제 owner가 서명
  // ------------------------------------------------

  const temporarySign = await signUserOp(userOp);

  userOp.signature = temporarySign.signature;

  console.log("\nTemporary userOpHash:", temporarySign.userOpHash);

  console.log("Temporary signature:", temporarySign.signature);

  // ------------------------------------------------
  // 8. Bundler gas estimation
  // ------------------------------------------------

  const estimate = await bundlerRpc("eth_estimateUserOperationGas", [userOp, ENTRY_POINT]);

  console.log("\nGas estimate:");
  console.dir(estimate, { depth: null });

  // ------------------------------
  // gas 값 적용
  // ------------------------------

  userOp.callGasLimit = estimate.callGasLimit;

  userOp.preVerificationGas = estimate.preVerificationGas;

  userOp.verificationGasLimit = q(60000);

  userOp.paymasterVerificationGasLimit = q(40000);

  userOp.paymasterPostOpGasLimit = q(30000);

  // ------------------------------------------------
  // 9. gas 값이 변경됐으므로 signature 다시 만들어야 함
  // ------------------------------------------------

  userOp.signature = "0x";

  const finalSign = await signUserOp(userOp);

  userOp.signature = finalSign.signature;

  console.log("\nFINAL userOpHash:", finalSign.userOpHash);

  console.log("FINAL signature:", finalSign.signature);

  // ------------------------------------------------
  // 10. 최종 UserOperation 출력
  // ------------------------------------------------

  console.log("\nFinal UserOperation:");

  console.dir(userOp, {
    depth: null,
  });

  // ------------------------------------------------
  // 11. Bundler 제출
  // ------------------------------------------------

  const submittedHash = await bundlerRpc("eth_sendUserOperation", [userOp, ENTRY_POINT]);

  console.log("\nSubmitted userOpHash:", submittedHash);

  // Hash가 같은지 확인
  console.log("Locally calculated hash:", finalSign.userOpHash);

  // ------------------------------------------------
  // 12. Receipt polling
  // ------------------------------------------------

  console.log("\nWaiting for inclusion...");

  for (let i = 0; i < 30; i++) {
    const receipt = await bundlerRpc("eth_getUserOperationReceipt", [submittedHash]);

    if (receipt) {
      console.log("\n✅ UserOperation included!");

      console.dir(receipt, {
        depth: null,
      });

      if (receipt.receipt?.transactionHash) {
        console.log("\nTransaction hash:", receipt.receipt.transactionHash);
      }

      return;
    }

    console.log(`waiting... ${i + 1}/30`);

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\nUserOperation not included yet.");
}

main().catch((error) => {
  console.error("\n❌ FAILED");

  console.error(error);
});
