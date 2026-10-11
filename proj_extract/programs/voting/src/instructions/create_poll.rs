use anchor_lang::prelude::*;

use crate::errors::VotingError;
use crate::state::*;

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct CreatePoll<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Poll::INIT_SPACE,
        seeds = [POLL_SEED, authority.key().as_ref(), &poll_id.to_le_bytes()],
        bump
    )]
    pub poll: Account<'info, Poll>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreatePoll<'info> {
    pub fn handler(
        &mut self,
        poll_id: u64,
        question: String,
        options: Vec<String>,
        bump: u8,
    ) -> Result<()> {
        require!(
            (MIN_OPTIONS..=MAX_OPTIONS).contains(&options.len()),
            VotingError::InvalidOptionsCount
        );
        require!(
            question.len() <= MAX_QUESTION_LEN,
            VotingError::QuestionTooLong
        );
        require!(
            options.iter().all(|o| o.len() <= MAX_OPTION_LEN),
            VotingError::OptionTooLong
        );

        let poll = &mut self.poll;
        poll.authority = self.authority.key();
        poll.poll_id = poll_id;
        poll.question = question;
        poll.votes = vec![0; options.len()];
        poll.options = options;
        poll.total_votes = 0;
        poll.is_closed = false;
        poll.bump = bump;

        emit!(PollCreated {
            poll: poll.key(),
            authority: poll.authority,
            poll_id,
        });
        Ok(())
    }
}

#[event]
pub struct PollCreated {
    pub poll: Pubkey,
    pub authority: Pubkey,
    pub poll_id: u64,
}
