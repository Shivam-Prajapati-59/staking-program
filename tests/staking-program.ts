import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StakingProgram } from "../target/types/staking_program";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

describe("staking-program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const payer = provider.wallet as anchor.Wallet;
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  const mintKeypair = Keypair.fromSecretKey(
    new Uint8Array([
      242, 204, 96, 167, 54, 99, 140, 82, 20, 219, 46, 127, 42, 23, 47, 8, 172,
      2, 177, 109, 41, 139, 158, 251, 222, 50, 152, 38, 83, 216, 211, 19, 115,
      149, 197, 92, 65, 232, 86, 117, 65, 27, 190, 185, 183, 47, 57, 134, 20,
      90, 83, 118, 39, 197, 111, 132, 151, 215, 124, 95, 54, 51, 199, 170,
    ])
  );

  const program = anchor.workspace.stakingProgram as Program<StakingProgram>;

  async function createMintToken() {
    const mint = await createMint(
      connection,
      payer.payer,
      payer.publicKey,
      payer.publicKey,
      9,
      mintKeypair
    );
    console.log("Mint Token:", mint);
  }

  it("Is initialized!", async () => {
    // await createMintToken();

    let [vaultAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );

    // Add your test here.
    const tx = await program.methods
      .initialize()
      .accounts({
        signer: payer.publicKey,
        tokenVault: vaultAccount,
        mint: mintKeypair.publicKey,
      } as any)
      .rpc();
    console.log("Your transaction signature", tx);

    // Fund the vault with tokens for rewards
    let [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );

    let userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeypair.publicKey,
      payer.publicKey
    );

    // Mint tokens to user first
    await mintTo(
      connection,
      payer.payer,
      mintKeypair.publicKey,
      userTokenAccount.address,
      payer.payer,
      1e15 // Large amount for testing
    );

    // Transfer tokens to vault for rewards
    const { transfer } = await import("@solana/spl-token");
    await transfer(
      connection,
      payer.payer,
      userTokenAccount.address,
      vaultPDA,
      payer.payer,
      1e14 // Fund vault with rewards
    );

    console.log("Vault funded with rewards");
  });

  it("stake", async () => {
    let userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeypair.publicKey,
      payer.publicKey
    );

    let [stakeInfo] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake"), payer.publicKey.toBuffer()],
      program.programId
    );

    let [stakeAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("token"), payer.publicKey.toBuffer()],
      program.programId
    );

    try {
      const tx = await program.methods
        .stake(new anchor.BN(1))
        .accounts({
          stakeInfoAccount: stakeInfo,
          stakeAccount: stakeAccount,
          userTokenAccount: userTokenAccount.address,
          mint: mintKeypair.publicKey,
          signer: payer.publicKey,
        } as any)
        .rpc();

      console.log("Stake transaction signature", tx);
    } catch (error) {
      // If already staked, destake first then stake again
      if (error.toString().includes("IsStaked")) {
        console.log("Already staked, destaking first...");

        let [vaultAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from("vault")],
          program.programId
        );

        await program.methods
          .destake()
          .accounts({
            stakeAccount: stakeAccount,
            stakeInfoAccount: stakeInfo,
            userTokenAccount: userTokenAccount.address,
            tokenVault: vaultAccount,
            signer: payer.publicKey,
            mint: mintKeypair.publicKey,
          } as any)
          .rpc();

        console.log("Destaked successfully, now staking again...");

        const tx = await program.methods
          .stake(new anchor.BN(1))
          .accounts({
            stakeInfoAccount: stakeInfo,
            stakeAccount: stakeAccount,
            userTokenAccount: userTokenAccount.address,
            mint: mintKeypair.publicKey,
            signer: payer.publicKey,
          } as any)
          .rpc();

        console.log("Stake transaction signature", tx);
      } else {
        throw error;
      }
    }
  });

  it("destake", async () => {
    // Wait a bit to accumulate some slots for rewards
    await new Promise((resolve) => setTimeout(resolve, 2000));

    let userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer.payer,
      mintKeypair.publicKey,
      payer.publicKey
    );

    let [stakeInfo] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake"), payer.publicKey.toBuffer()],
      program.programId
    );

    let [stakeAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("token"), payer.publicKey.toBuffer()],
      program.programId
    );

    let [vaultAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );

    const tx = await program.methods
      .destake()
      .accounts({
        stakeAccount: stakeAccount,
        stakeInfoAccount: stakeInfo,
        userTokenAccount: userTokenAccount.address,
        tokenVault: vaultAccount,
        signer: payer.publicKey,
        mint: mintKeypair.publicKey,
      } as any)
      .rpc();

    console.log("Destake transaction signature", tx);
  });
});
