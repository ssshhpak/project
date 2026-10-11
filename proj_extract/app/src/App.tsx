import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { pollPda, useProgram, votePda } from "./useProgram";

type PollView = {
  address: PublicKey;
  authority: PublicKey;
  question: string;
  options: string[];
  votes: number[];
  totalVotes: number;
  isClosed: boolean;
};

export function App() {
  const program = useProgram();
  const { publicKey } = useWallet();
  const [polls, setPolls] = useState<PollView[]>([]);
  const [status, setStatus] = useState("");
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");

  const load = useCallback(async () => {
    const all = await program.account.poll.all();
    setPolls(
      all
        .map(({ publicKey: address, account: a }) => ({
          address,
          authority: a.authority,
          question: a.question,
          options: a.options,
          votes: a.votes.map((v: BN) => v.toNumber()),
          totalVotes: a.totalVotes.toNumber(),
          isClosed: a.isClosed,
        }))
        .reverse()
    );
  }, [program]);

  useEffect(() => {
    load().catch((e) => setStatus(String(e)));
  }, [load]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      setStatus(`${label}...`);
      await fn();
      setStatus(`${label}: done`);
      await load();
    } catch (e: any) {
      setStatus(e?.error?.errorMessage ?? e?.message ?? String(e));
    }
  };

  const createPoll = () =>
    run("Creating poll", async () => {
      if (!publicKey) throw new Error("Connect your wallet first");
      const options = optionsText.split("\n").map((s) => s.trim()).filter(Boolean);
      const id = new BN(Date.now());
      await program.methods
        .createPoll(id, question.trim(), options)
        .accounts({
          poll: pollPda(program.programId, publicKey, id),
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      setQuestion("");
      setOptionsText("");
    });

  const vote = (p: PollView, index: number) =>
    run("Voting", async () => {
      if (!publicKey) throw new Error("Connect your wallet first");
      await program.methods
        .vote(index)
        .accounts({
          poll: p.address,
          voteRecord: votePda(program.programId, p.address, publicKey),
          voter: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

  const closePoll = (p: PollView) =>
    run("Closing poll", async () => {
      if (!publicKey) throw new Error("Connect your wallet first");
      await program.methods
        .closePoll()
        .accounts({ poll: p.address, authority: publicKey })
        .rpc();
    });

  return (
    <main>
      <header>
        <h1>On-chain Voting</h1>
        <WalletMultiButton />
      </header>

      <section className="card">
        <h2>New poll</h2>
        <input
          placeholder="Question (max 100 bytes)"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <textarea
          placeholder={"One option per line (2-4)"}
          rows={4}
          value={optionsText}
          onChange={(e) => setOptionsText(e.target.value)}
        />
        <button onClick={createPoll} disabled={!publicKey || !question.trim()}>
          Create poll
        </button>
      </section>

      {status && <p className="status">{status}</p>}

      {polls.map((p) => (
        <section className="card" key={p.address.toBase58()}>
          <h2>
            {p.question} {p.isClosed && <span className="badge">closed</span>}
          </h2>
          {p.options.map((o, i) => {
            const pct = p.totalVotes ? Math.round((p.votes[i] / p.totalVotes) * 100) : 0;
            return (
              <div className="option" key={i}>
                <div className="bar" style={{ width: `${pct}%` }} />
                <span>{o}</span>
                <span>
                  {p.votes[i]} ({pct}%)
                </span>
                <button onClick={() => vote(p, i)} disabled={!publicKey || p.isClosed}>
                  Vote
                </button>
              </div>
            );
          })}
          <footer>
            <small>Total votes: {p.totalVotes}</small>
            {publicKey?.equals(p.authority) && !p.isClosed && (
              <button className="secondary" onClick={() => closePoll(p)}>
                Close poll
              </button>
            )}
          </footer>
        </section>
      ))}
    </main>
  );
}
