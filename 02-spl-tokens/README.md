# SPL Token Operations

This module demonstrates comprehensive SPL Token operations including token creation, minting, transfers, and associated token account management.

## What You'll Learn

- Creating custom SPL tokens (mints)
- Understanding token accounts vs associated token accounts
- Minting tokens to accounts
- Transferring tokens between accounts
- Working with different fee payers
- Managing token decimals and raw amounts

## Prerequisites

- Node.js v18+
- Solana CLI installed
- Local test validator running (for localnet testing)
- Basic understanding of Solana accounts

## Setup

```bash
cd 02-spl-tokens
npm install
```

## Usage

### Complete Token Operations Demo
```bash
# Start local validator in another terminal first
solana-test-validator

# Run the complete demo
npm start
# or
npm run dev
```

### Run on Different Networks
```bash
npm run devnet  # Run on devnet
```

## Key Concepts

### Token Mint vs Token Account
- **Mint Account**: Defines the token type (like a token contract)
- **Token Account**: Holds tokens for a specific owner

### Associated Token Accounts (ATA)
ATAs provide deterministic addresses for token accounts:
```javascript
const ata = await getAssociatedTokenAddress(
  mint,           // Token mint
  owner,          // Owner wallet
  false           // Allow owner off curve
);
```

### Token Decimals
Tokens use raw units internally:
```javascript
const decimals = 6;
const humanAmount = 100;
const rawAmount = humanAmount * Math.pow(10, decimals);
```

### Creating a Token
```javascript
const mint = await createMint(
  connection,
  payer,                    // Fee payer
  mintAuthority.publicKey,  // Who can mint tokens
  null,                     // Freeze authority (optional)
  6                         // Decimals
);
```

### Minting Tokens
```javascript
await mintTo(
  connection,
  payer,              // Fee payer
  mint,               // Token mint
  tokenAccount,       // Destination
  mintAuthority,      // Mint authority (signer)
  amount              // Amount in raw units
);
```

### Transferring Tokens
```javascript
await transfer(
  connection,
  payer,            // Fee payer
  sourceAccount,    // Source token account
  destAccount,      // Destination token account
  owner,            // Owner of source (signer)
  amount            // Amount in raw units
);
```

## Advanced Patterns

### Separate Fee Payer
The exercise demonstrates how to use a different account to pay transaction fees - crucial for Quartz custody operations where users might not have SOL.

### Manual Transaction Building
Shows how to build transactions manually for more control over the signing process.

## Common Issues

1. **"Account does not exist"**: Create token accounts before transferring
2. **"Insufficient funds"**: Ensure accounts have enough tokens/SOL
3. **"Invalid mint"**: Verify mint addresses are correct
4. **"Owner does not match"**: Ensure the correct owner signs transfers

## Token Standards

This exercise creates tokens with 6 decimals (like USDC). Common patterns:
- **6 decimals**: Stablecoins (USDC, USDT)
- **9 decimals**: Native tokens (SOL has 9 decimals)
- **0 decimals**: NFTs or whole-number tokens

## Next Steps

After completing this exercise:
1. Try creating tokens with different decimal places
2. Experiment with freeze authority
3. Create multiple token accounts for the same mint
4. Move on to Anchor Framework (03-anchor)