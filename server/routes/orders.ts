import { Router } from 'express';

const router = Router();

// Short expiry order execution endpoint
router.post('/short-expiry', async (req, res) => {
  try {
    const { ticker, strike, expiry, type, action, quantity, price } = req.body;
    
    // For now, simulate order submission
    // In production, this would integrate with IBKR TWS
    const order = {
      id: `${Date.now()}`,
      ticker,
      strike,
      expiry,
      type,
      action,
      quantity,
      price,
      status: 'submitted',
      timestamp: new Date().toISOString()
    };
    
    console.log(`Short expiry order submitted: ${ticker} ${strike}${type.toUpperCase()} ${action} ${quantity} @ ${price}`);
    
    res.json({
      success: true,
      order,
      message: `Order submitted for ${ticker} ${strike}${type.toUpperCase()}`
    });
  } catch (error) {
    console.error('Error submitting short expiry order:', error);
    res.status(500).json({ error: 'Failed to submit order' });
  }
});

export default router;