import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import ABI from "../abi.json";

const CONTRACT_ADDRESS = "0xB3db8F37Dd2e10274eA24275c0686139bF0F9F82";

export default function App() {
  const [account, setAccount] = useState(null);
  const [myName, setMyName] = useState("");
  const [newName, setNewName] = useState("");
  const [lookupAddr, setLookupAddr] = useState("");
  const [lookupResult, setLookupResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const hasMM = typeof window !== "undefined" && window.ethereum;

  const provider = useMemo(() => {
    if (!hasMM) return null;
    return new ethers.BrowserProvider(window.ethereum);
  }, [hasMM]);

  const contractRead = useMemo(() => {
    if (!provider) return null;
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  }, [provider]);

  const connect = async () => {
    try {
      setErr("");
      if (!provider) throw new Error("MetaMask 필요");
      const accs = await provider.send("eth_requestAccounts", []);
      setAccount(accs[0]);
      await loadMyName(accs[0]);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  };

  const loadMyName = async (addr = account) => {
    if (!addr || !contractRead) return;
    try {
      const n = await contractRead.names(addr);
      setMyName(n);
    } catch (e) {
      setErr(e?.message || String(e));
    }
  };

  const saveName = async () => {
    if (!provider) return;
    try {
      setLoading(true);
      setErr("");
      const signer = await provider.getSigner();
      const write = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await write.setName(newName.trim());
      await tx.wait();
      setNewName("");
      await loadMyName();
    } catch (e) {
      setErr(e?.info?.error?.message || e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const deleteName = async () => {
    if (!provider) return;
    try {
      setLoading(true);
      setErr("");
      const signer = await provider.getSigner();
      const write = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await write.DeleteName();
      await tx.wait();
      await loadMyName();
    } catch (e) {
      setErr(e?.info?.error?.message || e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const lookup = async () => {
    if (!contractRead) return;
    try {
      setErr("");
      if (!ethers.isAddress(lookupAddr)) throw new Error("유효한 주소 아님");
      const n = await contractRead.names(lookupAddr);
      setLookupResult(n || "(없음)");
    } catch (e) {
      setLookupResult("");
      setErr(e?.message || String(e));
    }
  };

  useEffect(() => {
    if (!provider) return;
    provider.listAccounts().then((accs) => {
      if (accs.length > 0) {
        setAccount(accs[0].address);
        loadMyName(accs[0].address);
      }
    });
  }, [provider]);

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui,sans-serif" }}>
      <h1>📒 On-chain Name DApp</h1>

      {/* 연결 */}
      {account ? (
        <div style={card()}>
          Connected: {account.slice(0, 6)}…{account.slice(-4)}
        </div>
      ) : (
        <button onClick={connect} style={btn()}>
          MetaMask 연결
        </button>
      )}

      {/* 내 이름 */}
      {account && (
        <div style={card()}>
          <h3>내 이름</h3>
          <p>
            현재: <b>{myName || "(등록 안됨)"}</b>
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="새 이름 입력"
              style={input()}
            />
            <button disabled={!newName || loading} onClick={saveName} style={btn()}>
              저장
            </button>
          </div>
          <button
            disabled={loading}
            onClick={deleteName}
            style={{ ...btn("danger"), marginTop: 8 }}
          >
            삭제
          </button>
        </div>
      )}

      {/* 주소로 조회 */}
      <div style={card()}>
        <h3>주소로 이름 조회</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={lookupAddr}
            onChange={(e) => setLookupAddr(e.target.value)}
            placeholder="0x..."
            style={input()}
          />
          <button onClick={lookup} style={btn()}>
            조회
          </button>
        </div>
        {lookupResult && (
          <p>
            결과: <b>{lookupResult}</b>
          </p>
        )}
      </div>

      {/* 에러 */}
      {err && <div style={{ marginTop: 12, color: "red" }}>{err}</div>}
    </div>
  );
}

function card() {
  return { marginTop: 20, padding: 16, border: "1px solid #ddd", borderRadius: 12 };
}
function btn(variant = "primary") {
  if (variant === "danger") {
    return {
      padding: "8px 14px",
      borderRadius: 10,
      border: "none",
      background: "#d11",
      color: "#fff",
      cursor: "pointer",
    };
  }
  return {
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    background: "#000",
    color: "#fff",
    cursor: "pointer",
  };
}
function input() {
  return { flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd" };
}
