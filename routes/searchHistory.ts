import express from 'express';
import {
  getSearchHistory,
  addSearchHistory,
  clearSearchHistory,
  deleteSearchTerm,
} from '../controllers/searchHistoryController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get search history
router.get('/', getSearchHistory);

// Add search term
router.post('/', addSearchHistory);

// Clear all search history
router.delete('/', clearSearchHistory);

// Delete specific search term
router.delete('/term', deleteSearchTerm);

export default router;
