const { PublicKey } = require('@solana/web3.js');

/**
 * HSM Signer interface for Solana transactions
 * Implements the same interface expected by @solana/web3.js
 */
class HSMSigner {
  constructor() {
    this._publicKey = null;
  }

  /**
   * Get the public key for this signer
   * @returns {PublicKey} The public key
   */
  get publicKey() {
    if (!this._publicKey) {
      throw new Error('HSM not initialized. Call connect() first.');
    }
    return this._publicKey;
  }

  /**
   * Initialize HSM connection and derive public key
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('connect() must be implemented by subclass');
  }

  /**
   * Sign a transaction
   * @param {Transaction} transaction - The transaction to sign
   * @returns {Promise<Transaction>} The signed transaction
   */
  async signTransaction(transaction) {
    throw new Error('signTransaction() must be implemented by subclass');
  }

  /**
   * Sign multiple transactions
   * @param {Transaction[]} transactions - Array of transactions to sign
   * @returns {Promise<Transaction[]>} Array of signed transactions
   */
  async signAllTransactions(transactions) {
    const signed = [];
    for (const tx of transactions) {
      signed.push(await this.signTransaction(tx));
    }
    return signed;
  }

  /**
   * Disconnect from HSM
   * @returns {Promise<void>}
   */
  async disconnect() {
    // Override if cleanup is needed
  }
}

module.exports = { HSMSigner };