use anchor_lang::prelude::*;

use crate::errors::VotingError;
use crate::state::*;

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(
        mut,
        seeds = [POLL_SEED, poll.authority.as_ref(), &poll.poll_id.to_le_bytes()],
        bump = poll.bump
    )]
    pub poll: Account<'info, Poll>,
    // `init` fails if the account already exists -> second vote is impossible.
    #[account(
        init,
        payer = voter,
        space = 8 + VoteRecord::INIT_SPACE,
        seeds = [VOTE_SEED, poll.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Vote<'info> {
    pub fn handler(&mut self, option_index: u8, bump: u8) -> Result<()> {
        let poll = &mut self.poll;
        require!(!poll.is_closed, VotingError::PollClosed);

        let idx = option_index as usize;
        require!(idx < poll.options.len(), VotingError::InvalidOption);

        poll.votes[idx] = poll.votes[idx]
            .checked_add(1)
            .ok_or(VotingError::Overflow)?;
        poll.total_votes = poll
            .total_votes
            .checked_add(1)
            .ok_or(VotingError::Overflow)?;

        let record = &mut self.vote_record;
        record.poll = poll.key();
        record.voter = self.voter.key();
        record.option_index = option_index;
        record.bump = bump;

        emit!(VoteCast {
            poll: poll.key(),
            voter: self.voter.key(),
            option_index,
        });
        Ok(())
    }
}

#[event]
pub struct VoteCast {
    pub poll: Pubkey,
    pub voter: Pubkey,
    pub option_index: u8,
}
