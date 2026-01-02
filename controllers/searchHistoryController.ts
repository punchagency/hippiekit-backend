import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';

// Get user's search history
export const getSearchHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId).select('searchHistory');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      data: user.searchHistory || [],
    });
  } catch (error) {
    console.error('Error fetching search history:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Add search term to history
export const addSearchHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { searchTerm } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!searchTerm || typeof searchTerm !== 'string' || !searchTerm.trim()) {
      return res.status(400).json({ message: 'Search term is required' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize searchHistory if it doesn't exist
    if (!user.searchHistory) {
      user.searchHistory = [];
    }

    // Remove the search term if it already exists (to avoid duplicates)
    user.searchHistory = user.searchHistory.filter(
      (term) => term !== searchTerm.trim()
    );

    // Add the new search term at the beginning
    user.searchHistory.unshift(searchTerm.trim());

    // Keep only the last 10 items
    if (user.searchHistory.length > 10) {
      user.searchHistory = user.searchHistory.slice(0, 10);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      data: user.searchHistory,
    });
  } catch (error) {
    console.error('Error adding search history:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Clear search history
export const clearSearchHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.searchHistory = [];
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Search history cleared',
      data: [],
    });
  } catch (error) {
    console.error('Error clearing search history:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Delete specific search term
export const deleteSearchTerm = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { searchTerm } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!searchTerm || typeof searchTerm !== 'string') {
      return res.status(400).json({ message: 'Search term is required' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.searchHistory) {
      user.searchHistory = [];
    }

    user.searchHistory = user.searchHistory.filter(
      (term) => term !== searchTerm
    );

    await user.save();

    return res.status(200).json({
      success: true,
      data: user.searchHistory,
    });
  } catch (error) {
    console.error('Error deleting search term:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
