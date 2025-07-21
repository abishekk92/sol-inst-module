import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Counter } from "../target/types/counter";
import { expect } from "chai";

describe("counter", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Counter as Program<Counter>;
  const provider = anchor.getProvider();

  // Test accounts
  let counterKeypair: anchor.web3.Keypair;
  let authorityKeypair: anchor.web3.Keypair;
  let newAuthorityKeypair: anchor.web3.Keypair;

  beforeEach(async () => {
    // Generate fresh keypairs for each test
    counterKeypair = anchor.web3.Keypair.generate();
    authorityKeypair = anchor.web3.Keypair.generate();
    newAuthorityKeypair = anchor.web3.Keypair.generate();

    // Fund the authority accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        authorityKeypair.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      ),
      "confirmed"
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        newAuthorityKeypair.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      ),
      "confirmed"
    );
  });

  describe("Initialize Counter", () => {
    it("Should initialize a counter with initial value", async () => {
      const initialValue = new anchor.BN(42);

      // Derive the PDA for the counter account
      const [counterPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("counter"), authorityKeypair.publicKey.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .initialize(initialValue)
        .accounts({
          counter: counterPda,
          authority: authorityKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([authorityKeypair])
        .rpc();

      console.log("Initialize transaction signature:", tx);

      // Fetch the counter account and verify
      const counterAccount = await program.account.counter.fetch(counterPda);
      expect(counterAccount.count.toString()).to.equal(initialValue.toString());
      expect(counterAccount.authority.toString()).to.equal(
        authorityKeypair.publicKey.toString()
      );
      expect(counterAccount.lastUpdated.toNumber()).to.be.greaterThan(0);
    });

    it("Should initialize a counter with zero value", async () => {
      const initialValue = new anchor.BN(0);

      // Use a different authority to avoid PDA collision
      const testAuthority = anchor.web3.Keypair.generate();
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          testAuthority.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        ),
        "confirmed"
      );

      const [counterPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("counter"), testAuthority.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initialize(initialValue)
        .accounts({
          counter: counterPda,
          authority: testAuthority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([testAuthority])
        .rpc();

      const counterAccount = await program.account.counter.fetch(counterPda);
      expect(counterAccount.count.toString()).to.equal("0");
    });
  });

  describe("Increment Counter", () => {
    let counterPda: anchor.web3.PublicKey;

    beforeEach(async () => {
      // Initialize a counter for increment tests
      [counterPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("counter"), authorityKeypair.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initialize(new anchor.BN(0))
        .accounts({
          counter: counterPda,
          authority: authorityKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([authorityKeypair])
        .rpc();
    });

    it("Should increment the counter", async () => {
      const tx = await program.methods
        .increment()
        .accounts({
          counter: counterPda,
          authority: authorityKeypair.publicKey,
        })
        .signers([authorityKeypair])
        .rpc();

      console.log("Increment transaction signature:", tx);

      const counterAccount = await program.account.counter.fetch(counterPda);
      expect(counterAccount.count.toString()).to.equal("1");
    });

    it("Should increment multiple times", async () => {
      // Increment 5 times
      for (let i = 0; i < 5; i++) {
        await program.methods
          .increment()
          .accounts({
            counter: counterPda,
            authority: authorityKeypair.publicKey,
          })
          .signers([authorityKeypair])
          .rpc();
      }

      const counterAccount = await program.account.counter.fetch(counterPda);
      expect(counterAccount.count.toString()).to.equal("5");
    });

    it("Should fail when wrong authority tries to increment", async () => {
      const wrongAuthority = anchor.web3.Keypair.generate();
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          wrongAuthority.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        ),
        "confirmed"
      );

      try {
        await program.methods
          .increment()
          .accounts({
            counter: counterPda,
            authority: wrongAuthority.publicKey,
          })
          .signers([wrongAuthority])
          .rpc();

        // Should not reach here
        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.message).to.include("has_one");
      }
    });
  });

  describe("Transfer Authority", () => {
    let counterPda: anchor.web3.PublicKey;

    beforeEach(async () => {
      [counterPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("counter"), authorityKeypair.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initialize(new anchor.BN(10))
        .accounts({
          counter: counterPda,
          authority: authorityKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([authorityKeypair])
        .rpc();
    });

    it("Should transfer authority to new owner", async () => {
      const tx = await program.methods
        .transferAuthority(newAuthorityKeypair.publicKey)
        .accounts({
          counter: counterPda,
          authority: authorityKeypair.publicKey,
        })
        .signers([authorityKeypair])
        .rpc();

      console.log("Transfer authority transaction signature:", tx);

      const counterAccount = await program.account.counter.fetch(counterPda);
      expect(counterAccount.authority.toString()).to.equal(
        newAuthorityKeypair.publicKey.toString()
      );
    });

    it("Should allow new authority to increment after transfer", async () => {
      // Transfer authority
      await program.methods
        .transferAuthority(newAuthorityKeypair.publicKey)
        .accounts({
          counter: counterPda,
          authority: authorityKeypair.publicKey,
        })
        .signers([authorityKeypair])
        .rpc();

      // New authority should be able to increment
      await program.methods
        .increment()
        .accounts({
          counter: counterPda,
          authority: newAuthorityKeypair.publicKey,
        })
        .signers([newAuthorityKeypair])
        .rpc();

      const counterAccount = await program.account.counter.fetch(counterPda);
      expect(counterAccount.count.toString()).to.equal("11"); // Was 10, now 11
    });

    it("Should prevent old authority from incrementing after transfer", async () => {
      // Transfer authority
      await program.methods
        .transferAuthority(newAuthorityKeypair.publicKey)
        .accounts({
          counter: counterPda,
          authority: authorityKeypair.publicKey,
        })
        .signers([authorityKeypair])
        .rpc();

      // Old authority should not be able to increment
      try {
        await program.methods
          .increment()
          .accounts({
            counter: counterPda,
            authority: authorityKeypair.publicKey,
          })
          .signers([authorityKeypair])
          .rpc();

        expect.fail("Expected transaction to fail");
      } catch (error) {
        expect(error.message).to.include("has_one");
      }
    });
  });

  describe("Get Count", () => {
    let counterPda: anchor.web3.PublicKey;

    beforeEach(async () => {
      [counterPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("counter"), authorityKeypair.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initialize(new anchor.BN(100))
        .accounts({
          counter: counterPda,
          authority: authorityKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([authorityKeypair])
        .rpc();
    });

    it("Should return the current count", async () => {
      const count = await program.methods
        .getCount()
        .accounts({
          counter: counterPda,
        })
        .view();

      expect(count.toString()).to.equal("100");
    });

    it("Should return updated count after increment", async () => {
      // Increment the counter
      await program.methods
        .increment()
        .accounts({
          counter: counterPda,
          authority: authorityKeypair.publicKey,
        })
        .signers([authorityKeypair])
        .rpc();

      // Check the count
      const count = await program.methods
        .getCount()
        .accounts({
          counter: counterPda,
        })
        .view();

      expect(count.toString()).to.equal("101");
    });
  });

  describe("Error Handling", () => {
    it("Should handle overflow protection", async () => {
      // This test would require setting up a counter with max u64 value
      // For demonstration, we'll test the error exists in the program
      const [counterPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("counter"), authorityKeypair.publicKey.toBuffer()],
        program.programId
      );

      // Initialize with a large number (not max u64 due to practical limitations)
      const largeNumber = new anchor.BN("18446744073709551614"); // u64::MAX - 1

      await program.methods
        .initialize(largeNumber)
        .accounts({
          counter: counterPda,
          authority: authorityKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([authorityKeypair])
        .rpc();

      try {
        // This should succeed (increment to u64::MAX)
        await program.methods
          .increment()
          .accounts({
            counter: counterPda,
            authority: authorityKeypair.publicKey,
          })
          .signers([authorityKeypair])
          .rpc();

        // This should fail (overflow)
        await program.methods
          .increment()
          .accounts({
            counter: counterPda,
            authority: authorityKeypair.publicKey,
          })
          .signers([authorityKeypair])
          .rpc();

        expect.fail("Expected overflow error");
      } catch (error) {
        expect(error.message).to.include("Overflow");
      }
    });
  });
});