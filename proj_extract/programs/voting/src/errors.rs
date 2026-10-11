use anchor_lang::prelude::*;

#[error_code]
pub enum VotingError {
    #[msg("Poll is closed")]
    PollClosed,
    #[msg("Invalid option index")]
    InvalidOption,
    #[msg("A poll must have between 2 and 4 options")]
    InvalidOptionsCount,
    #[msg("Question is too long (max 100 bytes)")]
    QuestionTooLong,
    #[msg("Option text is too long (max 32 bytes)")]
    OptionTooLong,
    #[msg("Only the poll author can do this")]
    Unauthorized,
    #[msg("Arithmetic overflow")]
    Overflow,
}
