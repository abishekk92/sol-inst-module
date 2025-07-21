use anchor_lang::prelude::*;

// Declare program ID (will be auto-generated when you build)
declare_id!("GK9MqqiyWWThZHsQwcnvmZHZY5KoGn3sdg9ii8xocidr");

#[program]
pub mod quartz_counter {
    use super::*;

    /// Initialize a new counter account
    pub fn initialize(ctx: Context<Initialize>, initial_value: u64) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.authority = ctx.accounts.authority.key();
        counter.count = initial_value;
        counter.last_updated = Clock::get()?.unix_timestamp;
        
        msg!("Counter initialized with value: {}", initial_value);
        Ok(())
    }

    /// Increment the counter
    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        
        // Overflow protection
        counter.count = counter.count.checked_add(1)
            .ok_or(ErrorCode::Overflow)?;
        
        counter.last_updated = Clock::get()?.unix_timestamp;
        
        msg!("Counter incremented to: {}", counter.count);
        Ok(())
    }

    /// Transfer counter authority (ownership)
    pub fn transfer_authority(
        ctx: Context<TransferAuthority>, 
        new_authority: Pubkey
    ) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.authority = new_authority;
        
        msg!("Authority transferred to: {}", new_authority);
        Ok(())
    }

    /// Get current counter value (view function)
    pub fn get_count(ctx: Context<GetCount>) -> Result<u64> {
        Ok(ctx.accounts.counter.count)
    }
}

// ========================================
// ACCOUNT STRUCTURES
// ========================================

/// Counter account structure
#[account]
#[derive(Default)]
pub struct Counter {
    pub authority: Pubkey,    // 32 bytes - Who can modify this counter
    pub count: u64,           // 8 bytes  - Current count value
    pub last_updated: i64,    // 8 bytes  - Unix timestamp of last update
}

// Calculate space: 8 (discriminator) + 32 + 8 + 8 = 56 bytes

// ========================================
// INSTRUCTION CONTEXTS
// ========================================

/// Context for initialize instruction
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,                          // Create new account
        payer = authority,             // Who pays for account creation
        space = 8 + 32 + 8 + 8,       // Account size in bytes
        seeds = [b"counter", authority.key().as_ref()],
        bump                           // Use canonical bump
    )]
    pub counter: Account<'info, Counter>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Context for increment instruction
#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(
        mut,                           // Account will be modified
        has_one = authority,           // Verify authority matches
        seeds = [b"counter", authority.key().as_ref()],
        bump
    )]
    pub counter: Account<'info, Counter>,
    
    pub authority: Signer<'info>,
}

/// Context for transfer authority
#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    #[account(
        mut,
        has_one = authority,
        seeds = [b"counter", authority.key().as_ref()],
        bump
    )]
    pub counter: Account<'info, Counter>,
    
    pub authority: Signer<'info>,
}

/// Context for reading counter (no signer required)
#[derive(Accounts)]
pub struct GetCount<'info> {
    pub counter: Account<'info, Counter>,
}

// ========================================
// ERROR CODES
// ========================================

#[error_code]
pub enum ErrorCode {
    #[msg("Counter overflow")]
    Overflow,
}
