const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl
} = require('@solana/web3.js');

const {
  createMint,
  getMint,
  createAccount,
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
  getAccount,
  mintTo,
  transfer,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createTransferInstruction
} = require('@solana/spl-token');

async function main() {
  // ========================================
  // 1. SETUP
  // ========================================
  const environment = process.env.SOLANA_ENV || 'localnet';
  
  let connection;
  switch (environment) {
    case 'localnet':
      connection = new Connection('http://localhost:8899', 'confirmed');
      break;
    case 'devnet':
      connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      break;
    case 'mainnet-beta':
      connection = new Connection(
        process.env.RPC_ENDPOINT || clusterApiUrl('mainnet-beta'),
        'confirmed'
      );
      break;
    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
  
  console.log(`Connected to ${environment}`);
  
  // Create wallets (in production, use secure key management)
  const payer = Keypair.generate();
  const mintAuthority = Keypair.generate();
  const recipient = Keypair.generate();
  
  console.log('Payer:', payer.publicKey.toBase58());
  console.log('Mint Authority:', mintAuthority.publicKey.toBase58());
  console.log('Recipient:', recipient.publicKey.toBase58());
  
  // Fund payer wallet (development only)
  if (environment === 'localnet' || environment === 'devnet') {
    console.log('\nRequesting airdrop...');
    try {
      const airdropSignature = await connection.requestAirdrop(
        payer.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSignature);
      console.log('Airdrop successful!');
    } catch (error) {
      console.error('Airdrop failed:', error.message);
      return;
    }
  }
  
  // ========================================
  // 2. CREATE A NEW TOKEN (MINT)
  // ========================================
  console.log('\nCreating new token...');
  
  // Create a new token with 6 decimals (like USDC)
  // Parameters: connection, payer, mintAuthority, freezeAuthority, decimals
  const mint = await createMint(
    connection,
    payer,                    // Transaction fee payer
    mintAuthority.publicKey,  // Who can mint new tokens
    null,                     // Freeze authority (null = no freezing)
    6                         // Number of decimals
  );
  
  console.log('Token mint created:', mint.toBase58());
  
  // Get mint information
  const mintInfo = await getMint(connection, mint);
  console.log('Mint info:', {
    supply: mintInfo.supply.toString(),
    decimals: mintInfo.decimals,
    mintAuthority: mintInfo.mintAuthority?.toBase58(),
    isInitialized: mintInfo.isInitialized
  });
  
  // ========================================
  // 3. CREATE TOKEN ACCOUNTS
  // ========================================
  
  // Method 1: Create a regular token account
  console.log('\nCreating token account (method 1)...');
  const tokenAccount = await createAccount(
    connection,
    payer,           // Fee payer
    mint,            // Token mint
    payer.publicKey  // Owner of the token account
  );
  console.log('Token account created:', tokenAccount.toBase58());
  
  // Method 2: Create/Get Associated Token Account (Recommended)
  console.log('\nCreating associated token account (method 2)...');
  
  // First, derive the ATA address
  const recipientATA = await getAssociatedTokenAddress(
    mint,                    // Token mint
    recipient.publicKey,     // Owner wallet
    false,                   // Allow owner off curve (usually false)
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log('Recipient ATA address:', recipientATA.toBase58());
  
  // Create the ATA (will do nothing if it already exists)
  const recipientTokenAccount = await createAssociatedTokenAccount(
    connection,
    payer,                // Fee payer
    mint,                 // Token mint
    recipient.publicKey   // Owner
  );
  console.log('Recipient ATA created:', recipientTokenAccount.toBase58());
  
  // ========================================
  // 4. MINT TOKENS
  // ========================================
  console.log('\nMinting tokens...');
  
  // Mint 1,000,000 tokens (1M with 6 decimals = 1,000,000,000,000 raw units)
  const mintAmount = 1_000_000 * Math.pow(10, 6);
  
  const mintSignature = await mintTo(
    connection,
    payer,              // Fee payer
    mint,               // Token mint
    tokenAccount,       // Destination token account
    mintAuthority,      // Mint authority (must sign)
    mintAmount          // Amount in raw units
  );
  
  console.log('Minted', mintAmount / Math.pow(10, 6), 'tokens');
  console.log('Mint signature:', mintSignature);
  
  // Check balance
  const accountInfo = await getAccount(connection, tokenAccount);
  console.log('Token balance:', Number(accountInfo.amount) / Math.pow(10, 6));
  
  // ========================================
  // 5. TRANSFER TOKENS
  // ========================================
  console.log('\nTransferring tokens...');
  
  // Transfer 100,000 tokens to recipient
  const transferAmount = 100_000 * Math.pow(10, 6);
  
  const transferSignature = await transfer(
    connection,
    payer,                  // Fee payer & owner (must sign)
    tokenAccount,           // Source token account
    recipientTokenAccount,  // Destination token account
    payer,                  // Owner of source account
    transferAmount          // Amount in raw units
  );
  
  console.log('Transferred', transferAmount / Math.pow(10, 6), 'tokens');
  console.log('Transfer signature:', transferSignature);
  
  // ========================================
  // 6. CHECK FINAL BALANCES
  // ========================================
  console.log('\nFinal balances:');
  
  const sourceBalance = await getAccount(connection, tokenAccount);
  const destBalance = await getAccount(connection, recipientTokenAccount);
  
  console.log('Source balance:', Number(sourceBalance.amount) / Math.pow(10, 6));
  console.log('Recipient balance:', Number(destBalance.amount) / Math.pow(10, 6));
  
  // ========================================
  // 7. ADVANCED: TRANSFER WITH SEPARATE FEE PAYER
  // ========================================
  // This pattern is important for custody applications where users might not have SOL
  console.log('\nTransfer with separate fee payer...');
  
  // Create a fee payer account
  const feePayer = Keypair.generate();
  if (environment === 'localnet' || environment === 'devnet') {
    const feePayerAirdrop = await connection.requestAirdrop(
      feePayer.publicKey,
      0.1 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(feePayerAirdrop);
  }
  
  // Build transaction manually for more control
  const transaction = new Transaction();
  
  // Create transfer instruction
  const transferInstruction = createTransferInstruction(
    tokenAccount,          // Source
    recipientTokenAccount, // Destination
    payer.publicKey,       // Owner/Authority
    50_000 * Math.pow(10, 6), // Amount
    [],                    // No multisig
    TOKEN_PROGRAM_ID
  );
  
  transaction.add(transferInstruction);
  
  // Send with custom fee payer
  const customTransferSig = await sendAndConfirmTransaction(
    connection,
    transaction,
    [feePayer, payer], // Fee payer signs first, then owner
    { skipPreflight: false }
  );
  
  console.log('Custom transfer signature:', customTransferSig);
  
  // Final balance check
  const finalSourceBalance = await getAccount(connection, tokenAccount);
  const finalDestBalance = await getAccount(connection, recipientTokenAccount);
  
  console.log('\nFinal balances after custom transfer:');
  console.log('Source balance:', Number(finalSourceBalance.amount) / Math.pow(10, 6));
  console.log('Recipient balance:', Number(finalDestBalance.amount) / Math.pow(10, 6));
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };