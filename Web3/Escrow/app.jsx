import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import ABI from "../abi.json";

const CONTRACT_ADDRESS = "0x2dFb0fC8839CC1A62c8bc26EfccfF32c8F9bB609";

export default function App() {
  const [account, setAccount] = useState(null);
  const [contractBalEth, setContractBalEth] = useState("0.0");
  const [depositEth, setDepositEth] = useState("");
  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [withdrawEth, setWithdrawEth] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState("");

  const hasMM = typeof window !== "undefined" && window.ethereum;

  const provider = useMemo(() => {
    if (!hasMM) return null;
    return new ethers.BrowserProvider(window.ethereum);
  }, [hasMM]);

  const getContractRead = useMemo(() => {
    if (!provider) return null;
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  }, [provider]);

  const refreshBalance = async () => {
    if (!getContractRead) return;
    try {
      const bal = await getContractRead.balance(); // uint256 -> bigint
      setContractBalEth(ethers.formatEther(bal));
    } catch (e) {
      setErr(e?.message || String(e));
    }
  };

  const connect = async () => {
    try {
      setErr("");
      if (!provider) throw new Error("MetaMask가 필요합니다.");
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      await refreshBalance();
    } catch (e) {
      setErr(e?.message || String(e));
    }
  };

  const deposit = async () => {
    try {
      setErr("");
      setPending(true);
      if (!provider) throw new Error("Provider 없음");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      // deposit()은 payable → value에 ETH 지정
      const value = ethers.parseEther(depositEth || "0");
      const tx = await contract.deposit({ value });
      await tx.wait();
      setDepositEth("");
      await refreshBalance();
    } catch (e) {
      setErr(e?.info?.error?.message || e?.message || String(e));
    } finally {
      setPending(false);
    }
  };

  const withdraw = async () => {
    try {
      setErr("");
      setPending(true);
      if (!provider) throw new Error("Provider 없음");
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      const amt = ethers.parseEther(withdrawEth || "0");
      const tx = await contract.withdraw(withdrawAddr, amt);
      await tx.wait();
      setWithdrawEth("");
      await refreshBalance();
    } catch (e) {
      setErr(e?.info?.error?.message || e?.message || String(e));
    } finally {
      setPending(false);
    }
  };

  // 초기 로드 시 잔액 조회
  useEffect(() => {
    if (provider) refreshBalance();
  }, [provider]);

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>💳 SimplePayable DApp</h1>

      {/* 연결 상태 */}
      <div style={{ marginTop: 12 }}>
        {account ? (
          <div style={{ padding: "8px 12px", background: "#f5f5f5", borderRadius: 10 }}>
            Connected: {account.slice(0, 6)}…{account.slice(-4)}
          </div>
        ) : (
          <button onClick={connect} style={btn()}>
            MetaMask 연결
          </button>
        )}
      </div>

      {/* 컨트랙트 잔액 */}
      <div style={{ marginTop: 20, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <div style={{ fontSize: 14, color: "#666" }}>Contract Balance</div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{contractBalEth} ETH</div>
        <button onClick={refreshBalance} style={{ ...btn("ghost"), marginTop: 10 }}>
          새로고침
        </button>
      </div>

      {/* 입금 */}
      <div style={{ marginTop: 20, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>입금 (deposit)</h3>
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <input
            type="number"
            placeholder="ETH (예: 0.01)"
            value={depositEth}
            onChange={(e) => setDepositEth(e.target.value)}
            style={input()}
          />
          <button disabled={!account || pending || !depositEth} onClick={deposit} style={btn()}>
            {pending ? "진행중..." : "입금"}
          </button>
        </div>
        <div style={{ fontSize: 12, color: "#777", marginTop: 6 }}>
          * deposit()은 payable이므로 입력한 ETH가 함께 전송됩니다.
        </div>
      </div>

      {/* 출금 */}
      <div style={{ marginTop: 20, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>출금 (withdraw)</h3>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="text"
            placeholder="수령 주소 (0x...)"
            value={withdrawAddr}
            onChange={(e) => setWithdrawAddr(e.target.value)}
            style={input()}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              placeholder="ETH (예: 0.005)"
              value={withdrawEth}
              onChange={(e) => setWithdrawEth(e.target.value)}
              style={input()}
            />
            <button
              disabled={!account || pending || !withdrawAddr || !withdrawEth}
              onClick={withdraw}
              style={btn()}
            >
              {pending ? "진행중..." : "출금"}
            </button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#777", marginTop: 6 }}>
          * 컨트랙트에 충분한 잔액이 있어야 하며, <code>withdraw(_to, _amount)</code> 호출
          권한/로직은 컨트랙트에 정의된 그대로 적용됩니다.
        </div>
      </div>

      {/* 에러 */}
      {err && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#fff4f4",
            border: "1px solid #ffd6d6",
            color: "#b10000",
            borderRadius: 10,
          }}
        >
          {err}
        </div>
      )}
    </div>
  );
}

function btn(variant = "primary") {
  if (variant === "ghost") {
    return {
      padding: "8px 12px",
      borderRadius: 10,
      border: "1px solid #ddd",
      background: "#fff",
      cursor: "pointer",
    };
  }
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "black",
    color: "white",
    cursor: "pointer",
  };
}

function input() {
  return {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
  };
}
