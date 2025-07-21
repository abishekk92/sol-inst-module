const { Multisig } = require('@sqds/multisig');
const { 
  Connection, 
  Keypair,
  PublicKey, 
  SystemProgram,
  TransactionMessage,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl
} = require('@solana/web3.js');
const {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID
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
  
  // Create keypairs for demo
  const creator = Keypair.generate();
  const member1 = Keypair.generate();
  const member2 = Keypair.generate();
  const member3 = Keypair.generate();
  
  console.log('Creator:', creator.publicKey.toBase58());
  console.log('Member 1:', member1.publicKey.toBase58());
  console.log('Member 2:', member2.publicKey.toBase58());
  console.log('Member 3:', member3.publicKey.toBase58());
  
  // Fund creator account (for localnet/devnet)
  if (environment === 'localnet' || environment === 'devnet') {
    console.log('\nRequesting airdrop...');
    try {
      const airdropSig = await connection.requestAirdrop(
        creator.publicKey,
        5 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSig);
      console.log('Airdrop successful!');
    } catch (error) {
      console.error('Airdrop failed:', error.message);
      return;
    }
  }

  // ========================================
  // 2. CREATE MULTISIG
  // ========================================
  console.log('\nCreating multisig...');
  
  const multisig = new Multisig({ connection });
  
  // Create a unique keypair for multisig creation
  const createKey = Keypair.generate();
  
  // Define members with permissions
  const members = [
    {
      pubkey: creator.publicKey,
      permissions: {
        mask: 7 // Full permissions (Propose, Approve, Execute)
      }
    },
    {
      pubkey: member1.publicKey,
      permissions: {
        mask: 7 // Full permissions
      }
    },
    {
      pubkey: member2.publicKey,
      permissions: {
        mask: 3 // Propose and Approve only
      }
    }
  ];

  // Create the multisig with 2-of-3 threshold
  const signature = await multisig.create({
    createKey,
    members,
    threshold: 2,
    timeLock: 0,
    rentCollector: null,
    memo: "Demo Multisig"
  });

  console.log('Multisig created:', signature);
  
  // Get the multisig PDA
  const [multisigPda] = multisig.getMultisigPda({ 
    createKey: createKey.publicKey 
  });
  console.log('Multisig PDA:', multisigPda.toBase58());

  // Get the vault PDA (where funds will be stored)
  const [vaultPda] = multisig.getVaultPda({ 
    multisigPda,
    index: 0 
  });
  console.log('Vault PDA:', vaultPda.toBase58());

  // ========================================
  // 3. CREATE AND FUND TOKEN ACCOUNT
  // ========================================
  console.log('\nSetting up token...');
  
  // Create a test token
  const mint = await createMint(
    connection,
    creator,
    creator.publicKey,
    null,
    6 // 6 decimals like USDC
  );
  console.log('Token mint:', mint.toBase58());

  // Create token account for the vault
  const vaultTokenAccount = await createAssociatedTokenAccount(
    connection,
    creator,
    mint,
    vaultPda,
    true // Allow PDA owner
  );

  // Mint tokens to the vault
  await mintTo(
    connection,
    creator,
    mint,
    vaultTokenAccount,
    creator,
    1_000_000 * Math.pow(10, 6) // 1M tokens
  );
  console.log('Minted 1M tokens to vault');

  // ========================================
  // 4. CREATE TRANSFER PROPOSAL
  // ========================================
  console.log('\nCreating transfer proposal...');
  
  // Create recipient
  const recipient = Keypair.generate();
  const recipientTokenAccount = await createAssociatedTokenAccount(
    connection,
    creator,
    mint,
    recipient.publicKey
  );

  // Create transfer instruction
  const transferAmount = 100_000 * Math.pow(10, 6); // 100k tokens
  const transferIx = createTransferInstruction(
    vaultTokenAccount,
    recipientTokenAccount,
    vaultPda,
    transferAmount,
    [],
    TOKEN_PROGRAM_ID
  );

  // Build transaction message
  const blockhash = (await connection.getLatestBlockhash()).blockhash;
  const message = new TransactionMessage({
    payerKey: vaultPda,
    recentBlockhash: blockhash,
    instructions: [transferIx]
  });

  // Get current transaction index
  const multisigAccount = await multisig.getMultisig({ multisigPda });
  const transactionIndex = Number(multisigAccount.transactionIndex);

  // Create the proposal
  const proposalTx = await multisig.buildCreateProposalTransaction({
    multisigPda,
    transactionIndex,
    transactionMessage: message,
    memo: "Transfer 100k tokens",
    creator: creator.publicKey
  });

  const createProposalSig = await sendAndConfirmTransaction(
    connection,
    proposalTx,
    [creator]
  );
  console.log('Proposal created:', createProposalSig);
  console.log('Transaction index:', transactionIndex);

  // ========================================
  // 5. APPROVE PROPOSAL
  // ========================================
  console.log('\nApproving proposal...');

  // Member1 approves
  const approveTx = await multisig.buildApproveTransaction({
    multisigPda,
    transactionIndex,
    member: member1.publicKey
  });

  const approveSig = await sendAndConfirmTransaction(
    connection,
    approveTx,
    [member1]
  );
  console.log('Member1 approved:', approveSig);

  // Check proposal status
  const [proposalPda] = multisig.getProposalPda({ 
    multisigPda, 
    transactionIndex: BigInt(transactionIndex) 
  });
  const proposal = await multisig.getProposal({ 
    proposalPda 
  });
  
  console.log('Proposal status:', proposal.status);
  console.log('Approvals:', proposal.approved.length);

  // ========================================
  // 6. EXECUTE TRANSACTION
  // ========================================
  console.log('\nExecuting transaction...');

  const executeTx = await multisig.buildExecuteTransaction({
    multisigPda,
    transactionIndex,
    member: creator.publicKey
  });

  const executeSig = await sendAndConfirmTransaction(
    connection,
    executeTx,
    [creator]
  );
  console.log('Transaction executed:', executeSig);

  // ========================================
  // 7. VERIFY TRANSFER
  // ========================================
  const recipientBalance = await connection.getTokenAccountBalance(
    recipientTokenAccount
  );
  console.log('\nRecipient received:', recipientBalance.value.uiAmount, 'tokens');
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };