use anchor_lang::prelude::*;

use crate::errors::VotingError;
use crate::state::*;

#[derive(Accounts)]
pub struct ClosePoll<'info> {
    #[account(
        mut,
        has_one = authority @ VotingError::Unauthorized,
        seeds = [POLL_SEED, poll.authority.as_ref(), &poll.poll_id.to_le_bytes()],
        bump = poll.bump
    )]
    pub poll: Account<'info, Poll>,
    pub authority: Signer<'info>,
}

impl<'info> ClosePoll<'info> {
    pub fn handler(&mut self) -> Result<()> {
        require!(!self.poll.is_closed, VotingError::PollClosed);
        self.poll.is_closed = true;

        emit!(PollClosed {
            poll: self.poll.key(),
            total_votes: self.poll.total_votes,
        });
        Ok(())
    }
}

#[event]
pub struct PollClosed {
    pub poll: Pubkey,
    pub total_votes: u64,
}
