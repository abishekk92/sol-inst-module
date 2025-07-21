const {
  Connection,
  Transaction,
  SystemProgram,
  sendAndConfirmRawTransaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl
} = require('@solana/web3.js');
const { MockHSMSigner } = require('./mock-hsm-signer');

async function main() {
  // 1. Initialize connection to Solana
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

  // 2. Initialize HSM signer
  // In production, replace MockHSMSigner with your actual HSM implementation
  const hsmSigner = new MockHSMSigner('my-secure-seed');
  await hsmSigner.connect();

  try {
    // Fund HSM wallet for testing (development only)
    if (environment === 'localnet' || environment === 'devnet') {
      console.log('Requesting airdrop for HSM wallet...');
      try {
        const airdropSignature = await connection.requestAirdrop(
          hsmSigner.publicKey,
          2 * LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(airdropSignature);
        console.log('Airdrop successful!');
      } catch (error) {
        console.error('Airdrop failed:', error.message);
        return;
      }
    }

    // 3. Create a simple transfer transaction
    const recipient = new PublicKey('11111111111111111111111111111111');
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: hsmSigner.publicKey,
        toPubkey: recipient,
        lamports: 0.1 * LAMPORTS_PER_SOL // 0.1 SOL
      })
    );

    // 4. Set transaction properties
    const { blockhash, lastValidBlockHeight } = 
      await connection.getLatestBlockhash();
    
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = hsmSigner.publicKey;

    // 5. Sign transaction with HSM
    console.log('Signing transaction with HSM...');
    const signedTransaction = await hsmSigner.signTransaction(transaction);

    // 6. Send and confirm transaction
    console.log('Sending transaction...');
    const signature = await sendAndConfirmRawTransaction(
      connection,
      signedTransaction.serialize()
    );

    console.log('Transaction successful!');
    console.log('Signature:', signature);
    
    if (environment === 'devnet') {
      console.log(`View on explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } else if (environment === 'localnet') {
      console.log('Transaction completed on localnet');
    }

  } catch (error) {
    console.error('Transaction failed:', error);
  } finally {
    // 7. Always disconnect from HSM
    await hsmSigner.disconnect();
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };