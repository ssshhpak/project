// Run: anchor run client  (after `anchor build && anchor deploy` on your cluster)
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import * as web3 from "@solana/web3.js";
import type { Voting } from "../target/types/voting";

anchor.setProvider(anchor.AnchorProvider.env());
const provider = anchor.getProvider() as anchor.AnchorProvider;
const program = anchor.workspace.Voting as anchor.Program<Voting>;

async function main() {
  const me = provider.publicKey;
  console.log("My address:", me.toString());
  const balance = await provider.connection.getBalance(me);
  console.log(`My balance: ${balance / web3.LAMPORTS_PER_SOL} SOL`);

  const pollId = new BN(Date.now());
  const [poll] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("poll"), me.toBuffer(), pollId.toArrayLike(Buffer, "le", 8)],
    program.programId
  );
  const [voteRecord] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), poll.toBuffer(), me.toBuffer()],
    program.programId
  );

  await program.methods
    .createPoll(pollId, "Best chain for students?", ["Solana", "Ethereum", "TON"])
    .accounts({ poll, authority: me, systemProgram: web3.SystemProgram.programId })
    .rpc();
  console.log("Poll created:", poll.toString());

  await program.methods
    .vote(0)
    .accounts({ poll, voteRecord, voter: me, systemProgram: web3.SystemProgram.programId })
    .rpc();

  const acc = await program.account.poll.fetch(poll);
  acc.options.forEach((o, i) => console.log(`${o}: ${acc.votes[i].toString()}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
