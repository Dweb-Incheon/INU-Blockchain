// App.jsx
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import ABI from "../abi.json";

const CONTRACT_ADDRESS = "0xB7A30D30E70a4cE21769B2D44efff8C367C237D1";

function App() {
  const [account, setAccount] = useState(null);
  const [count, setCount] = useState(0);
  const [pending, setPending] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask가 설치되어 있지 않습니다.");
      return;
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    setAccount(accounts[0]);
    await loadCount(provider);
  };

  const getContract = (providerOrSigner) => {
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, providerOrSigner);
  };

  const loadCount = async (provider) => {
    try {
      const contract = getContract(provider);
      const value = await contract.retrieve();
      setCount(Number(value));
    } catch (e) {
      console.error(e);
    }
  };

  const like = async () => {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = getContract(signer);

    try {
      setPending(true);
      const tx = await contract.store(count + 1);
      await tx.wait();
      await loadCount(provider);
    } catch (e) {
      console.error(e);
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      loadCount(provider);
    }
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", textAlign: "center", marginTop: 50 }}>
      <h1>👍 Like Counter DApp</h1>
      {account ? (
        <p>
          Connected: {account.slice(0, 6)}...{account.slice(-4)}
        </p>
      ) : (
        <button onClick={connectWallet}>지갑 연결</button>
      )}
      <h2>현재 카운트: {count}</h2>
      <button onClick={like} disabled={!account || pending}>
        {pending ? "트랜잭션 진행중..." : "좋아요 👍"}
      </button>
    </div>
  );
}

export default App;
