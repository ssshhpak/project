use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

pub use instructions::*;

// Program ID. `anchor keys sync` will replace it with the real one
// (taken from target/deploy/voting-keypair.json).
declare_id!("FoVhRY3nCNuZ6oAP2FPNonoN8HBvkG3ziQtjwA6EKj5B");

#[program]
pub mod voting {
    use super::*;

    /// Create a new poll (2-4 options). PDA: ["poll", authority, poll_id].
    pub fn create_poll(
        ctx: Context<CreatePoll>,
        poll_id: u64,
        question: String,
        options: Vec<String>,
    ) -> Result<()> {
        ctx.accounts
            .handler(poll_id, question, options, ctx.bumps.poll)
    }

    /// Vote for an option. One wallet = one vote (VoteRecord PDA).
    pub fn vote(ctx: Context<Vote>, option_index: u8) -> Result<()> {
        ctx.accounts.handler(option_index, ctx.bumps.vote_record)
    }

    /// Close the poll. Only the author can do it.
    pub fn close_poll(ctx: Context<ClosePoll>) -> Result<()> {
        ctx.accounts.handler()
    }
}
