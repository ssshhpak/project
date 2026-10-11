use anchor_lang::prelude::*;

pub const POLL_SEED: &[u8] = b"poll";
pub const VOTE_SEED: &[u8] = b"vote";

pub const MAX_QUESTION_LEN: usize = 100;
pub const MAX_OPTION_LEN: usize = 32;
pub const MIN_OPTIONS: usize = 2;
pub const MAX_OPTIONS: usize = 4;

#[account]
#[derive(InitSpace)]
pub struct Poll {
    pub authority: Pubkey,
    pub poll_id: u64,
    #[max_len(100)]
    pub question: String,
    #[max_len(4, 32)]
    pub options: Vec<String>,
    #[max_len(4)]
    pub votes: Vec<u64>,
    pub total_votes: u64,
    pub is_closed: bool,
    pub bump: u8,
}

/// Existence of this account = "this wallet already voted in this poll".
#[account]
#[derive(InitSpace)]
pub struct VoteRecord {
    pub poll: Pubkey,
    pub voter: Pubkey,
    pub option_index: u8,
    pub bump: u8,
}
