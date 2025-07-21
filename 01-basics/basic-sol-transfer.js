const {
  Connection,
  clusterApiUrl,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  PublicKey,
  LAMPORTS_PER_SOL
} = require('@solana/web3.js');

async function main() {
  // ========================================
  // 1. SETUP CONNECTION
  // ========================================
  
  // Determine which network to connect to based on environment variable
  const environment = process.env.SOLANA_ENV || 'localnet';
  
  let connection;
  switch (environment) {
    case 'localnet':
      // Connects to your local test validator (must be running)
      connection = new Connection('http://localhost:8899', 'confirmed');
      break;
    case 'devnet':
      // Connects to Solana's public development network
      connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      break;
    case 'mainnet-beta':
      // For production, use enterprise RPC endpoints instead of public ones
      connection = new Connection(
        process.env.RPC_ENDPOINT || clusterApiUrl('mainnet-beta'),
        'confirmed'
      );
      break;
    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
  
  // Verify we're connected
  console.log(`Connected to ${environment}`);
  const version = await connection.getVersion();
  console.log('Solana version:', version);
  
  // ========================================
  // 2. CREATE WALLETS
  // ========================================
  
  // Generate new keypairs for sender and recipient
  // NOTE: In production, use secure key management (HSM), never Keypair.generate()
  const sender = Keypair.generate();
  const recipient = Keypair.generate();
  
  console.log('Sender address:', sender.publicKey.toBase58());
  console.log('Recipient address:', recipient.publicKey.toBase58());
  
  // Example: Save keypair to file (NEVER do this in production!)
  // const fs = require('fs');
  // fs.writeFileSync('wallet.json', JSON.stringify(Array.from(sender.secretKey)));
  
  // Example: Load keypair from file
  // const savedKeypair = JSON.parse(fs.readFileSync('wallet.json'));
  // const loadedWallet = Keypair.fromSecretKey(new Uint8Array(savedKeypair));
  
  // ========================================
  // 3. FUND SENDER WALLET (Development Only)
  // ========================================
  
  if (environment === 'localnet' || environment === 'devnet') {
    console.log('\nRequesting airdrop of 2 SOL...');
    
    try {
      // Request 2 SOL from the network faucet
      // Note: Only available on localnet and devnet
      const airdropSignature = await connection.requestAirdrop(
        sender.publicKey,
        2 * LAMPORTS_PER_SOL // Convert SOL to lamports (1 SOL = 1e9 lamports)
      );
      
      // Wait for the airdrop transaction to be confirmed
      await connection.confirmTransaction(airdropSignature);
      console.log('Airdrop successful!');
      
    } catch (error) {
      // Common error: Rate limiting on devnet (429 Too Many Requests)
      console.error('Airdrop failed:', error.message);
      if (error.message.includes('429')) {
        console.log('You are rate limited. Try again in a few seconds.');
      }
      return;
    }
  }
  
  // ========================================
  // 4. CHECK BALANCES
  // ========================================
  
  // Get balance in lamports and convert to SOL for display
  const senderBalance = await connection.getBalance(sender.publicKey);
  console.log(`\nSender balance: ${senderBalance / LAMPORTS_PER_SOL} SOL`);
  
  // Only proceed if we have funds
  if (senderBalance === 0) {
    console.log('No balance to send. Exiting.');
    return;
  }
  
  // ========================================
  // 5. SEND SOL TRANSACTION
  // ========================================
  
  console.log('\nSending 0.5 SOL to recipient...');
  
  // Create a new transaction object
  const transaction = new Transaction();
  
  // Add a transfer instruction to the transaction
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,    // Source account
      toPubkey: recipient.publicKey,   // Destination account
      lamports: 0.5 * LAMPORTS_PER_SOL // Amount in lamports
    })
  );
  
  // Optional: Add a memo instruction for tracking purposes
  // This is useful for applications to track transactions
  // const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  // transaction.add(
  //   new TransactionInstruction({
  //     keys: [],
  //     programId: memoProgram,
  //     data: Buffer.from('Withdrawal #12345', 'utf-8')
  //   })
  // );
  
  try {
    // Send transaction and wait for confirmation
    // The function handles getting recent blockhash and signing automatically
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [sender] // Array of signers (in production, this would be the HSM signer)
    );
    
    console.log('Transaction successful!');
    console.log('Signature:', signature);
    
    // You can view this transaction on Solana Explorer:
    if (environment === 'devnet') {
      console.log(`View on Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    }
    
  } catch (error) {
    console.error('Transaction failed:', error);
    
    // Common errors:
    // - "Blockhash not found" - Transaction expired, need fresh blockhash
    // - "Insufficient funds" - Not enough SOL for transfer + fees
    // - "Account does not exist" - Invalid recipient address
  }
  
  // ========================================
  // 6. VERIFY FINAL BALANCES
  // ========================================
  
  console.log('\nFinal balances:');
  
  const finalSenderBalance = await connection.getBalance(sender.publicKey);
  const finalRecipientBalance = await connection.getBalance(recipient.publicKey);
  
  console.log(`Sender: ${finalSenderBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(`Recipient: ${finalRecipientBalance / LAMPORTS_PER_SOL} SOL`);
  
  // Note the sender balance is reduced by 0.5 SOL + transaction fee (~0.000005 SOL)
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };