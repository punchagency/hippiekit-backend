import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  addFavorite,
  removeFavorite,
  listFavorites,
  listFavoriteCategories,
} from '../controllers/favoriteController.js';

const router = Router();

router.get('/', protect, listFavorites);
router.get('/categories', protect, listFavoriteCategories);
router.post('/:productId', protect, addFavorite);
router.delete('/:productId', protect, removeFavorite);

export default router;
