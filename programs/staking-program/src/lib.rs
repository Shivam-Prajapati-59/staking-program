use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("GKtxxUvShPBjxx8Mv5rMLzzAt59TzEFcqexkJ1y1QgA1");

pub mod constants {
    pub const VAULT_SEED: &[u8] = b"vault";
    pub const STAKE_SEED: &[u8] = b"stake";
    pub const TOKEN_SEED: &[u8] = b"token";
}

#[program]
pub mod staking_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn stake(ctx: Context<Initialize>, amount: u64) -> Result<()> {
        msg!("Staking {} tokens", amount);
        Ok(())
    }

    pub fn destake(ctx: Context<Initialize>, amount: u64) -> Result<()> {
        msg!("Destaking {} tokens", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init_if_needed,
        seeds = [constants::VAULT_SEED],
        bump,
        payer = signer,
        token::mint = mint,
        token::authority = token_vault,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
