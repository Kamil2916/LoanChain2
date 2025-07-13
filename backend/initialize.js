import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import anchor from '@project-serum/anchor'; // Correct CommonJS import
import idl from './idl.json' assert { type: 'json' }; // Works in ESM with Node 20+
import bs58 from 'bs58';

// Destructure the required parts from anchor
const { AnchorProvider, Program, web3, BN } = anchor;

const programId = new PublicKey('HtAW8C72Sg2Aoxqa5pG4yTPnXeGaVj1qjSB5BrDxQ8yR'); // Your actual deployed program ID
const network = clusterApiUrl('devnet');

export default async function handler(req, res) {
  try {
    const { privateKey } = req.body;

    if (!privateKey) {
      return res.status(400).json({ success: false, message: 'Private key missing' });
    }

    const secretKey = bs58.decode(privateKey);

    // Validate private key length (must be 64 bytes)
    if (secretKey.length !== 64) {
      return res.status(400).json({ success: false, message: 'Invalid private key length' });
    }

    const wallet = Keypair.fromSecretKey(secretKey);

    const connection = new Connection(network, 'confirmed');

    // Check wallet balance (minimum 0.01 SOL to cover fees)
    const balance = await connection.getBalance(wallet.publicKey);
    if (balance < 1e7) {
      return res.status(400).json({ success: false, message: 'Insufficient funds in wallet' });
    }

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: async (tx) => {
          tx.partialSign(wallet);
          return tx;
        },
        signAllTransactions: async (txs) => {
          txs.forEach((tx) => tx.partialSign(wallet));
          return txs;
        },
      },
      { commitment: 'confirmed' }
    );

    const program = new Program(idl, programId, provider);
    const newAccount = Keypair.generate();

    await program.methods
      .initialize(new BN(42000))
      .accounts({
        newAccount: newAccount.publicKey,
        signer: wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([wallet, newAccount])
      .rpc();

    return res.status(200).json({
      success: true,
      message: 'Account initialized successfully',
      account: newAccount.publicKey.toBase58(),
    });
  } catch (e) {
    console.error('Error in initialize:', e);
    return res.status(500).json({ success: false, message: 'Server error', error: e.toString() });
  }
}
