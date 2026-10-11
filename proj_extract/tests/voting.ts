import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import BN from "bn.js";
import { assert } from "chai";
import * as web3 from "@solana/web3.js";
import type { Voting } from "../target/types/voting";

describe("voting", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.Voting as Program<Voting>;

  const authority = provider.wallet.publicKey;

  const pollPda = (owner: web3.PublicKey, id: BN) =>
    web3.PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), owner.toBuffer(), id.toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];

  const votePda = (poll: web3.PublicKey, voter: web3.PublicKey) =>
    web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), poll.toBuffer(), voter.toBuffer()],
      program.programId
    )[0];

  const fundedKeypair = async () => {
    const kp = web3.Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      kp.publicKey,
      2 * web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
    return kp;
  };

  const createPoll = async (id: BN, options = ["Rust", "TypeScript", "Go"]) => {
    const poll = pollPda(authority, id);
    await program.methods
      .createPoll(id, "Favourite language?", options)
      .accounts({
        poll,
        authority,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
    return poll;
  };

  const castVote = (poll: web3.PublicKey, voter: web3.Keypair, option: number) =>
    program.methods
      .vote(option)
      .accounts({
        poll,
        voteRecord: votePda(poll, voter.publicKey),
        voter: voter.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([voter])
      .rpc();

  // Expect an Anchor error code, or (code = undefined) any failure.
  const expectFail = async (p: Promise<unknown>, code?: string) => {
    try {
      await p;
    } catch (err: any) {
      if (code) {
        assert.equal(err.error?.errorCode?.code, code, String(err));
      }
      return;
    }
    assert.fail("Transaction should have failed");
  };

  it("creates a poll", async () => {
    const poll = await createPoll(new BN(1));
    const acc = await program.account.poll.fetch(poll);
    assert.equal(acc.question, "Favourite language?");
    assert.deepEqual(acc.options, ["Rust", "TypeScript", "Go"]);
    assert.deepEqual(
      acc.votes.map((v) => v.toNumber()),
      [0, 0, 0]
    );
    assert.isFalse(acc.isClosed);
    assert.isTrue(acc.authority.equals(authority));
  });

  it("rejects a poll with a wrong number of options", async () => {
    const id = new BN(2);
    await expectFail(
      program.methods
        .createPoll(id, "One option?", ["only"])
        .accounts({
          poll: pollPda(authority, id),
          authority,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc(),
      "InvalidOptionsCount"
    );
  });

  it("accepts a vote and updates counters", async () => {
    const poll = await createPoll(new BN(3));
    const voter = await fundedKeypair();
    await castVote(poll, voter, 1);

    const acc = await program.account.poll.fetch(poll);
    assert.deepEqual(
      acc.votes.map((v) => v.toNumber()),
      [0, 1, 0]
    );
    assert.equal(acc.totalVotes.toNumber(), 1);

    const record = await program.account.voteRecord.fetch(
      votePda(poll, voter.publicKey)
    );
    assert.equal(record.optionIndex, 1);
  });

  it("rejects a second vote from the same wallet", async () => {
    const poll = await createPoll(new BN(4));
    const voter = await fundedKeypair();
    await castVote(poll, voter, 0);
    await expectFail(castVote(poll, voter, 2)); // "account already in use"

    const acc = await program.account.poll.fetch(poll);
    assert.equal(acc.totalVotes.toNumber(), 1);
  });

  it("rejects an invalid option index", async () => {
    const poll = await createPoll(new BN(5));
    const voter = await fundedKeypair();
    await expectFail(castVote(poll, voter, 9), "InvalidOption");
  });

  it("rejects close_poll from a non-author", async () => {
    const poll = await createPoll(new BN(6));
    const stranger = await fundedKeypair();
    await expectFail(
      program.methods
        .closePoll()
        .accounts({ poll, authority: stranger.publicKey })
        .signers([stranger])
        .rpc(),
      "Unauthorized"
    );
    const acc = await program.account.poll.fetch(poll);
    assert.isFalse(acc.isClosed);
  });

  it("lets the author close the poll and blocks further votes", async () => {
    const poll = await createPoll(new BN(7));
    await program.methods.closePoll().accounts({ poll, authority }).rpc();

    const acc = await program.account.poll.fetch(poll);
    assert.isTrue(acc.isClosed);

    const voter = await fundedKeypair();
    await expectFail(castVote(poll, voter, 0), "PollClosed");
  });
});
