import { useMemo } from "react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import idl from "./idl/voting.json";
import type { Voting } from "./idl/voting";

// Must match declare_id! in programs/voting/src/lib.rs (see `anchor keys list`).
export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID ?? "FoVhRY3nCNuZ6oAP2FPNonoN8HBvkG3ziQtjwA6EKj5B"
);

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    const provider = new AnchorProvider(
      connection,
      // Read-only dummy wallet so that polls can be viewed before connecting.
      wallet ?? ({ publicKey: PublicKey.default } as never),
      { commitment: "confirmed" }
    );
    return new Program(idl as Voting, PROGRAM_ID, provider);
  }, [connection, wallet]);
}

export const pollPda = (programId: PublicKey, owner: PublicKey, id: BN) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("poll"), owner.toBuffer(), id.toArrayLike(Buffer, "le", 8)],
    programId
  )[0];

export const votePda = (programId: PublicKey, poll: PublicKey, voter: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), poll.toBuffer(), voter.toBuffer()],
    programId
  )[0];
