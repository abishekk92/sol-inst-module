const { HSMSigner } = require('./hsm-signer-interface');
const { Keypair, PublicKey } = require('@solana/web3.js');

/**
 * Mock HSM Signer for development and testing
 * 
 * WARNING: This implementation stores keys in memory and is NOT secure.
 * It is intended only for development and testing purposes.
 * 
 * In production, replace this with actual HSM integration that:
 * - Never exposes private keys outside the HSM
 * - Implements proper authentication and authorization
 * - Provides audit logging
 * - Handles HSM-specific error cases
 */
class MockHSMSigner extends HSMSigner {
  constructor(seedPhrase = 'test-seed') {
    super();
    this.seedPhrase = seedPhrase;
    this.keypair = null;
  }

  async connect() {
    console.warn('⚠️  Using MockHSMSigner - FOR DEVELOPMENT ONLY!');
    
    // Generate deterministic keypair from seed
    const seed = Buffer.alloc(32);
    seed.write(this.seedPhrase);
    
    this.keypair = Keypair.fromSeed(seed);
    this._publicKey = this.keypair.publicKey;
    
    console.log('Mock HSM connected');
    console.log('Public key:', this._publicKey.toBase58());
  }

  async signTransaction(transaction) {
    if (!this.keypair) {
      throw new Error('Mock HSM not connected');
    }

    // Simulate HSM processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Sign the transaction
    transaction.partialSign(this.keypair);
    return transaction;
  }

  async disconnect() {
    this.keypair = null;
    this._publicKey = null;
    console.log('Mock HSM disconnected');
  }
}

module.exports = { MockHSMSigner };