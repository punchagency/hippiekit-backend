import express from 'express';
import {
  saveScanResult,
  getScanResults,
  getScanResultById,
  getScanResultsByBarcode,
  deleteScanResult,
  deleteAllScanResults,
  getScanStats,
} from '../controllers/scanResultController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get scan statistics
router.get('/stats', getScanStats);

// Get all scan results and save new scan result
router
  .route('/')
  .get(getScanResults)
  .post(saveScanResult)
  .delete(deleteAllScanResults);

// Get scan results by barcode
router.get('/barcode/:barcode', getScanResultsByBarcode);

// Get and delete specific scan result
router.route('/:id').get(getScanResultById).delete(deleteScanResult);

export default router;
