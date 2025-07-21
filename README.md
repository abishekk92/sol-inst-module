# Solana Integration Exercises

A comprehensive collection of Solana blockchain exercises covering fundamental operations, token management, smart contracts, multisig wallets, and secure signing patterns. Each exercise is a standalone Node.js module with its own dependencies and examples.

## 🏗️ Repository Structure

```
solana-exercises/
├── README.md                    # This file
├── .gitignore                   # Git ignore rules
├── 01-basics/                   # Basic Solana Operations
│   ├── package.json
│   ├── basic-sol-transfer.js
│   └── README.md
├── 02-spl-tokens/              # SPL Token Operations
│   ├── package.json
│   ├── token-operations.js
│   └── README.md
├── 03-anchor/                  # Anchor Smart Contracts
│   ├── package.json
│   ├── Anchor.toml
│   ├── programs/quartz_counter/
│   ├── tests/
│   └── (full Anchor project structure)
├── 05-multisig/                # Multisig Wallets
│   ├── package.json
│   ├── multisig-operations.js
│   └── README.md
└── 06-hsm-integration/         # HSM Integration Patterns
    ├── package.json
    ├── hsm-signer-interface.js
    ├── mock-hsm-signer.js
    ├── hsm-sol-transfer.js
    └── README.md
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js v18+**
2. **Solana CLI**:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash
   ```
3. **Rust** (for Anchor):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
4. **Anchor CLI** (for smart contracts):
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install latest && avm use latest
   ```

### Running Exercises

Each module is independent. Navigate to any exercise directory and run:

```bash
cd 01-basics
npm install
npm start
```

For local development, start the test validator first:
```bash
# In a separate terminal
solana-test-validator
```

## 📚 Exercise Modules

### 1. Basic Operations (`01-basics/`)
**Learn**: Fundamental Solana operations
```bash
cd 01-basics
npm install
npm start          # Run on localnet
npm run devnet     # Run on devnet
```

**Covers**:
- Network connections (localnet, devnet, mainnet)
- Keypair generation and management
- SOL transfers and balance checking
- Transaction signing and confirmation

### 2. SPL Token Operations (`02-spl-tokens/`)
**Learn**: Token creation and management
```bash
cd 02-spl-tokens
npm install
npm start          # Complete token operations demo
```

**Covers**:
- Creating custom tokens (mints)
- Token accounts vs Associated Token Accounts
- Minting and transferring tokens
- Separate fee payer patterns

### 3. Anchor Smart Contracts (`03-anchor/`)
**Learn**: Smart contract development with Anchor
```bash
cd 03-anchor
npm install
anchor build       # Build the program
anchor test        # Run tests
```

**Covers**:
- Counter program (Rust)
- Program Derived Addresses (PDAs)
- Account validation and constraints
- TypeScript client integration
- Testing patterns

### 4. Multisig Wallets (`05-multisig/`)
**Learn**: Multi-signature wallet management
```bash
cd 05-multisig
npm install
npm start          # Create and use multisig wallet
```

**Covers**:
- Creating multisig wallets with Squads Protocol
- Member management and permissions
- Proposal creation and approval workflow
- Transaction execution

### 5. HSM Integration (`06-hsm-integration/`)
**Learn**: Secure signing patterns for production
```bash
cd 06-hsm-integration
npm install
npm run sol-transfer    # SOL transfer with HSM
npm run token-transfer  # Token transfer with HSM
```

**Covers**:
- HSM signer interface design
- Mock implementation for development
- Production signing patterns
- Transaction security best practices

## 🌐 Network Configuration

All exercises support multiple networks via environment variables:

```bash
# Local development (default)
SOLANA_ENV=localnet npm start

# Solana devnet
SOLANA_ENV=devnet npm start

# Mainnet (use with extreme caution)
SOLANA_ENV=mainnet-beta npm start
```

## 🔧 Development Workflow

### 1. Set up Local Environment
```bash
# Start local validator
solana-test-validator

# Check configuration
solana config get
```

### 2. Run Individual Exercises
Each exercise is self-contained:
```bash
cd [exercise-directory]
npm install
npm start
```

### 3. Network Switching
```bash
# Switch to devnet
solana config set --url devnet

# Get test SOL
solana airdrop 2

# Check balance
solana balance
```

## ⚡ Testing All Modules

> **Note**: A test script exists but is gitignored for security

To test all modules work correctly:
1. Start local validator: `solana-test-validator`
2. Test each module individually following the instructions above
3. Each module includes error handling and validation

## 🔐 Security Considerations

- **Mock HSM**: The HSM integration uses a mock implementation for development only
- **Key Management**: Never use `Keypair.generate()` in production
- **Network Safety**: Always verify recipient addresses before transfers
- **Enterprise RPC**: Use enterprise RPC endpoints for production, not public ones
- **Error Handling**: All exercises include proper error handling patterns

## 🎯 Learning Path

**Recommended order for beginners**:

1. **01-basics** → Understand Solana fundamentals
2. **02-spl-tokens** → Learn token operations
3. **03-anchor** → Smart contract development
4. **05-multisig** → Multi-signature security
5. **06-hsm-integration** → Production security patterns

## 📖 Key Concepts Covered

### Solana Fundamentals
- Accounts, Programs, and Instructions
- Transaction structure and lifecycle
- Rent and account management
- Network endpoints and RPCs

### Token Standards
- SPL Token program
- Mint accounts vs Token accounts
- Associated Token Accounts (ATAs)
- Token decimals and raw amounts

### Smart Contracts
- Anchor framework patterns
- Program Derived Addresses (PDAs)
- Cross-Program Invocation (CPI)
- Account validation and security

### Security Patterns
- Multi-signature wallets
- Hardware Security Module (HSM) integration
- Secure signing workflows
- Production deployment patterns

## 🔗 Additional Resources

- [Solana Documentation](https://docs.solana.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Anchor Framework](https://www.anchor-lang.com/)
- [SPL Token Program](https://spl.solana.com/token)
- [Squads Multisig](https://squads.so/)

## 🛠️ Troubleshooting

### Common Issues

**"Connection refused"**:
- Start local validator: `solana-test-validator`
- Check port 8899 is available

**"Airdrop failed on devnet"**:
- Devnet has rate limits
- Try smaller amounts: `solana airdrop 1`
- Wait between requests

**Anchor build errors**:
- Ensure Rust and Anchor are installed
- Update program ID after first build
- Clear target directory: `rm -rf target/`

**Token account errors**:
- Ensure sufficient SOL for rent (≈0.002 SOL per account)
- Verify mint addresses are correct
- Check account ownership

### Getting Help

- Check individual module READMEs for specific guidance
- Verify network configuration with `solana config get`
- Use Solana Explorer to investigate transaction failures
- Test on localnet first before other networks

## 📝 License

MIT License - See individual modules for details.

---
