import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const network = clusterApiUrl('devnet');

export default async function handler(req, res) {
  try {
    const { walletId } = req.body;
    if (!walletId) {
      return res.status(400).json({ success: false, message: 'Wallet ID missing' });
    }

    const publicKey = new PublicKey(walletId);
    const connection = new Connection(network, 'confirmed');
    const balanceLamports = await connection.getBalance(publicKey);
    const balanceSOL = balanceLamports / 1e9;

    return res.status(200).json({ success: true, balance: balanceSOL });
  } catch (e) {
    console.error('Balance fetch error:', e);
    return res.status(500).json({ success: false, message: 'Server error fetching balance' });
  }
}
