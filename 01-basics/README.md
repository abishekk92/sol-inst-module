# Basic Solana Operations

This module demonstrates fundamental Solana operations including wallet creation, SOL transfers, and balance checking.

## What You'll Learn

- Setting up connections to different Solana networks (localnet, devnet, mainnet)
- Creating and managing keypairs
- Requesting airdrops on test networks
- Sending SOL between accounts
- Checking account balances
- Basic error handling patterns

## Prerequisites

- Node.js v18+
- Solana CLI installed
- Local test validator running (for localnet testing)

## Setup

```bash
cd 01-basics
npm install
```

## Usage

### Run on Localnet (Default)
```bash
# Start local validator in another terminal first
solana-test-validator

# Run the exercise
npm start
# or
npm run dev
```

### Run on Devnet
```bash
npm run devnet
```

### Run on Mainnet (Use with Caution)
```bash
npm run mainnet
```

## Key Concepts

### Network Configuration
The exercise automatically connects to different networks based on the `SOLANA_ENV` environment variable:
- `localnet` - Your local test validator
- `devnet` - Solana's public test network
- `mainnet-beta` - Solana's production network

### Keypair Generation
```javascript
const sender = Keypair.generate();
```
⚠️ **Production Note**: Quartz uses HSM for secure key management, never `Keypair.generate()`

### SOL Transfer
```javascript
transaction.add(
  SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    toPubkey: recipient.publicKey,
    lamports: 0.5 * LAMPORTS_PER_SOL
  })
);
```

### Balance Checking
```javascript
const balance = await connection.getBalance(publicKey);
console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
```

## Common Issues

1. **"Connection refused"**: Make sure local validator is running
2. **"Airdrop failed"**: Devnet has rate limits, try smaller amounts or wait
3. **"Insufficient funds"**: Make sure account has enough SOL for transfer + fees

## Next Steps

After completing this exercise:
1. Try modifying the transfer amount
2. Experiment with different networks
3. Add memo instructions for transaction tracking
4. Move on to SPL Token operations (02-spl-tokens)