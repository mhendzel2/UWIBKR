import { Router } from 'express';
import { watchlistManager } from '../services/watchlistManager';

const router = Router();

// Get all watchlists
router.get('/watchlists', async (req, res) => {
  try {
    const watchlists = watchlistManager.getAllWatchlists();
    res.json(watchlists);
  } catch (error) {
    console.error('Error getting watchlists:', error);
    res.status(500).json({ error: 'Failed to get watchlists' });
  }
});

// Get current active watchlist
router.get('/watchlists/current', async (req, res) => {
  try {
    const currentWatchlist = watchlistManager.getCurrentWatchlist();
    if (!currentWatchlist) {
      return res.status(404).json({ error: 'No current watchlist found' });
    }
    res.json(currentWatchlist);
  } catch (error) {
    console.error('Error getting current watchlist:', error);
    res.status(500).json({ error: 'Failed to get current watchlist' });
  }
});

// Get specific watchlist by ID
router.get('/watchlists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const watchlist = watchlistManager.getWatchlist(id);
    
    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }
    
    res.json(watchlist);
  } catch (error) {
    console.error('Error getting watchlist:', error);
    res.status(500).json({ error: 'Failed to get watchlist' });
  }
});

// Create new watchlist
router.post('/watchlists', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Watchlist name is required' });
    }
    
    const newWatchlist = await watchlistManager.createWatchlist(name, description);
    res.status(201).json(newWatchlist);
  } catch (error) {
    console.error('Error creating watchlist:', error);
    res.status(500).json({ error: 'Failed to create watchlist' });
  }
});

// Update watchlist info (name, description)
router.put('/watchlists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const success = await watchlistManager.updateWatchlistInfo(id, { name, description });
    
    if (!success) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }
    
    const updatedWatchlist = watchlistManager.getWatchlist(id);
    res.json(updatedWatchlist);
  } catch (error) {
    console.error('Error updating watchlist:', error);
    res.status(500).json({ error: 'Failed to update watchlist' });
  }
});

// Delete watchlist
router.delete('/watchlists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (id === 'default') {
      return res.status(400).json({ error: 'Cannot delete default watchlist' });
    }
    
    const success = await watchlistManager.deleteWatchlist(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }
    
    res.json({ message: 'Watchlist deleted successfully' });
  } catch (error) {
    console.error('Error deleting watchlist:', error);
    res.status(500).json({ error: 'Failed to delete watchlist' });
  }
});

// Set current active watchlist
router.post('/watchlists/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await watchlistManager.setCurrentWatchlist(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }
    
    const currentWatchlist = watchlistManager.getCurrentWatchlist();
    res.json(currentWatchlist);
  } catch (error) {
    console.error('Error setting current watchlist:', error);
    res.status(500).json({ error: 'Failed to set current watchlist' });
  }
});

// Duplicate watchlist
router.post('/watchlists/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'New watchlist name is required' });
    }
    
    const duplicatedWatchlist = await watchlistManager.duplicateWatchlist(id, name);
    res.status(201).json(duplicatedWatchlist);
  } catch (error) {
    console.error('Error duplicating watchlist:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to duplicate watchlist' });
  }
});

// Add symbols to specific watchlist
router.post('/watchlists/:id/symbols', async (req, res) => {
  try {
    const { id } = req.params;
    const { symbols, options } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Symbols array is required' });
    }
    
    await watchlistManager.addSymbolsToWatchlist(id, symbols, options);
    
    const updatedWatchlist = watchlistManager.getWatchlist(id);
    res.json(updatedWatchlist);
  } catch (error) {
    console.error('Error adding symbols to watchlist:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to add symbols' });
  }
});

// Remove symbols from specific watchlist
router.delete('/watchlists/:id/symbols', async (req, res) => {
  try {
    const { id } = req.params;
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Symbols array is required' });
    }
    
    await watchlistManager.removeSymbolsFromWatchlist(id, symbols);
    
    const updatedWatchlist = watchlistManager.getWatchlist(id);
    res.json(updatedWatchlist);
  } catch (error) {
    console.error('Error removing symbols from watchlist:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to remove symbols' });
  }
});

// Legacy endpoints for backward compatibility
router.get('/', async (req, res) => {
  try {
    const currentWatchlist = watchlistManager.getCurrentWatchlist();
    res.json(currentWatchlist ? currentWatchlist.symbols : []);
  } catch (error) {
    console.error('Error getting legacy watchlist:', error);
    res.status(500).json({ error: 'Failed to get watchlist' });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { symbols, options } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Symbols array is required' });
    }
    
    await watchlistManager.addToWatchlist(symbols, options);
    
    const currentWatchlist = watchlistManager.getCurrentWatchlist();
    res.json(currentWatchlist ? currentWatchlist.symbols : []);
  } catch (error) {
    console.error('Error adding symbols:', error);
    res.status(500).json({ error: 'Failed to add symbols' });
  }
});

router.delete('/remove', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'Symbols array is required' });
    }
    
    await watchlistManager.removeFromWatchlist(symbols);
    
    const currentWatchlist = watchlistManager.getCurrentWatchlist();
    res.json(currentWatchlist ? currentWatchlist.symbols : []);
  } catch (error) {
    console.error('Error removing symbols:', error);
    res.status(500).json({ error: 'Failed to remove symbols' });
  }
});

// Import CSV endpoint
router.post('/import-csv', async (req, res) => {
  try {
    // This endpoint expects the CSV to have been processed by /api/data/upload first
    // For now, return success - the actual CSV processing happens in /api/data/upload
    res.json({ 
      success: true, 
      message: 'CSV import endpoint ready. Please use the file upload feature.' 
    });
  } catch (error) {
    console.error('Error with CSV import:', error);
    res.status(500).json({ error: 'Failed to import CSV' });
  }
});

export default router;
