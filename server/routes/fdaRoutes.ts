import { Router } from 'express';
import { fdaMonitoringService } from '../services/fdaMonitoringService';

const router = Router();

// Get all active FDA alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = fdaMonitoringService.getActiveAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching FDA alerts:', error);
    res.status(500).json({ error: 'Failed to fetch FDA alerts' });
  }
});

// Get FDA alerts for specific ticker
router.get('/alerts/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const alerts = fdaMonitoringService.getAlertsForTicker(ticker.toUpperCase());
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching ticker FDA alerts:', error);
    res.status(500).json({ error: 'Failed to fetch ticker FDA alerts' });
  }
});

// Clear expired alerts
router.delete('/alerts/expired', async (req, res) => {
  try {
    fdaMonitoringService.clearExpiredAlerts();
    res.json({ message: 'Expired alerts cleared successfully' });
  } catch (error) {
    console.error('Error clearing expired alerts:', error);
    res.status(500).json({ error: 'Failed to clear expired alerts' });
  }
});

export default router;