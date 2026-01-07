import express, { Router, Request, Response } from 'express';
import axios from 'axios';

const router: Router = express.Router();

const WP_BASE_URL =
  'https://dodgerblue-otter-660921.hostingersite.com/wp-json/wp/v2';

// Proxy WordPress API requests
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const { slug, parent } = req.query;

    let allCategories: any[] = [];
    let page = 1;
    let hasMore = true;

    // Fetch all pages of categories
    while (hasMore) {
      let url = `${WP_BASE_URL}/product-categories?per_page=100&page=${page}`;
      if (slug) url += `&slug=${slug}`;
      if (parent !== undefined) url += `&parent=${parent}`;

      const response = await axios.get(url);

      const categories = Array.isArray(response.data) ? response.data : [];

      if (categories.length === 0) {
        hasMore = false;
      } else {
        allCategories = allCategories.concat(categories);
        page++;

        // Check if there are more pages using the header
        const totalPages = response.headers['x-wp-totalpages'];
        if (totalPages && page > parseInt(totalPages)) {
          hasMore = false;
        }
      }
    }

    // Defensive filter in case WP ignores the parent param
    const filtered =
      parent !== undefined
        ? allCategories.filter((c: any) => Number(c.parent) === Number(parent))
        : allCategories;

    res.json(filtered);
  } catch (error) {
    console.error('WordPress API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
    });
  }
});

router.get('/products', async (req: Request, res: Response) => {
  try {
    const { page = '1', per_page = '6', search, category_id } = req.query;
    let url = `${WP_BASE_URL}/products?page=${page}&per_page=${per_page}&_embed`;

    if (search) url += `&search=${encodeURIComponent(search as string)}`;
    if (category_id) url += `&product-categories=${category_id}`;

    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('WordPress API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
});

// Fetch single product by ID with _embed
router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const url = `${WP_BASE_URL}/products/${encodeURIComponent(id)}?_embed`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('WordPress API error:', error);
    const status = (error as any)?.response?.status || 500;
    if (status === 404) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
    });
  }
});

router.get('/media/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`${WP_BASE_URL}/media/${id}`);
    res.json(response.data);
  } catch (error) {
    console.error('WordPress API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch media',
    });
  }
});

export default router;
