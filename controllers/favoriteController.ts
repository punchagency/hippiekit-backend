import { Request, Response } from 'express';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Favorite from '../models/Favorite.js';
import { AuthRequest } from '../middleware/auth.js';
import { fetchWPProduct, fetchWPCategoriesByIds } from '../lib/wp.js';

// POST /api/favorites/:productId
export const addFavorite = async (
  req: Request,
  res: Response
): Promise<void> => {
  await connectDB();
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    res.status(401).json({ success: false, message: 'Not authorized' });
    return;
  }

  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ success: false, message: 'Invalid productId' });
    return;
  }

  try {
    // Validate and snapshot product
    const wpProduct = await fetchWPProduct(productId);
    if (!wpProduct) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const title = wpProduct.title?.rendered || 'Untitled';
    const image =
      wpProduct._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';
    const priceText = wpProduct.meta?.cta_button_text;

    // Fetch categories for snapshot
    const categoryIds = (wpProduct as any)['product-categories'] || [];
    const categoriesData = await fetchWPCategoriesByIds(categoryIds);
    console.log(
      'Category data before mapping:',
      categoriesData.map((c) => ({
        name: c.name,
        image: c.meta?.featured_image,
      }))
    );
    const categories = categoriesData.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.meta?.featured_image || '',
    }));
    console.log('Categories after mapping:', categories);

    const doc = await Favorite.findOneAndUpdate(
      { userId: authReq.user._id, productId },
      {
        $set: {
          product: { title, image, priceText },
          categories,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res
      .status(201)
      .json({ success: true, data: doc, message: 'Added to favorites' });
  } catch (error) {
    if ((error as any)?.code === 11000) {
      res.status(200).json({ success: true, message: 'Already in favorites' });
      return;
    }
    res.status(500).json({
      success: false,
      message: (error as Error).message || 'An error occurred',
    });
  }
};

// DELETE /api/favorites/:productId
export const removeFavorite = async (
  req: Request,
  res: Response
): Promise<void> => {
  await connectDB();
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    res.status(401).json({ success: false, message: 'Not authorized' });
    return;
  }

  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    res.status(400).json({ success: false, message: 'Invalid productId' });
    return;
  }

  try {
    await Favorite.deleteOne({ userId: authReq.user._id, productId });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message || 'An error occurred',
    });
  }
};

// GET /api/favorites
// Query: page, limit, category (slug), search
export const listFavorites = async (
  req: Request,
  res: Response
): Promise<void> => {
  await connectDB();
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    res.status(401).json({ success: false, message: 'Not authorized' });
    return;
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 15));
  const skip = (page - 1) * limit;
  const category = (req.query.category as string) || '';
  const search = (req.query.search as string) || '';

  const criteria: any = { userId: authReq.user._id };
  if (category) criteria['categories.slug'] = category;
  if (search) criteria['product.title'] = { $regex: search, $options: 'i' };

  try {
    const [items, total] = await Promise.all([
      Favorite.find(criteria).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Favorite.countDocuments(criteria),
    ]);

    res.status(200).json({
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        hasMore: skip + items.length < total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message || 'An error occurred',
    });
  }
};

// GET /api/favorites/categories
export const listFavoriteCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  await connectDB();
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    res.status(401).json({ success: false, message: 'Not authorized' });
    return;
  }

  try {
    const agg = await Favorite.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(String(authReq.user._id)),
        },
      },
      { $unwind: '$categories' },
      {
        $group: {
          _id: {
            id: '$categories.id',
            name: '$categories.name',
            slug: '$categories.slug',
            image: '$categories.image',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const categories = agg.map((a) => ({
      id: a._id.id,
      name: a._id.name,
      slug: a._id.slug,
      image: a._id.image,
      count: a.count,
    }));
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message || 'An error occurred',
    });
  }
};
