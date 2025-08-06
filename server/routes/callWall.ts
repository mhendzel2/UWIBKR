import { Router } from 'express';
import { CallWallAnalyzer } from '../services/callWallAnalyzer';

const router = Router();
const analyzer = new CallWallAnalyzer();

// GET /api/call-wall/:ticker?expiry=YYYY-MM-DD
router.get('/call-wall/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const expiry = req.query.expiry as string | undefined;

  if (!expiry) {
    return res.status(400).json({ error: 'expiry query parameter required' });
  }

  try {
    const result = await analyzer.identifyCallWall(ticker.toUpperCase(), expiry);
    res.json(result);
  } catch (error) {
    console.error('Call wall detection failed:', error);
    res.status(500).json({ error: 'Failed to compute call wall' });
  }
});

export default router;
