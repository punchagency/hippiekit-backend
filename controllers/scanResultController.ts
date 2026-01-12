import { Request, Response } from 'express';
import ScanResult from '../models/ScanResult.js';

type AsyncHandler = (req: Request, res: Response) => Promise<any>;

// @desc    Save scan result
// @route   POST /api/scan-results
// @access  Private
export const saveScanResult: AsyncHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      barcode,
      productName,
      productBrand,
      productImage,
      safeIngredients,
      harmfulIngredients,
      packaging,
      packagingSummary,
      packagingSafety,
      recommendations,
      chemicalAnalysis,
    } = req.body;

    // Validate required fields
    if (!barcode || !productName) {
      return res.status(400).json({
        success: false,
        message: 'Barcode and product name are required',
      });
    }

    // Get user ID from authenticated request
    const userId = (req as any).user._id;

    // Create scan result
    const scanResult = await ScanResult.create({
      userId,
      barcode,
      productName,
      productBrand,
      productImage,
      safeIngredients: safeIngredients || [],
      harmfulIngredients: harmfulIngredients || [],
      packaging: packaging || [],
      packagingSummary,
      packagingSafety,
      recommendations: recommendations || [],
      chemicalAnalysis,
    });

    res.status(201).json({
      success: true,
      data: scanResult,
    });
  } catch (error: any) {
    console.error('Error saving scan result:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save scan result',
      error: error.message,
    });
  }
};

// @desc    Get all scan results for authenticated user
// @route   GET /api/scan-results
// @access  Private
export const getScanResults: AsyncHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const scanResults = await ScanResult.find({ userId })
      .sort({ scannedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ScanResult.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: scanResults,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching scan results:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scan results',
      error: error.message,
    });
  }
};

// @desc    Get scan result by ID
// @route   GET /api/scan-results/:id
// @access  Private
export const getScanResultById: AsyncHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user._id;
    const { id } = req.params;

    const scanResult = await ScanResult.findOne({ _id: id, userId });

    if (!scanResult) {
      return res.status(404).json({
        success: false,
        message: 'Scan result not found',
      });
    }

    res.status(200).json({
      success: true,
      data: scanResult,
    });
  } catch (error: any) {
    console.error('Error fetching scan result:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scan result',
      error: error.message,
    });
  }
};

// @desc    Get scan results by barcode
// @route   GET /api/scan-results/barcode/:barcode
// @access  Private
export const getScanResultsByBarcode: AsyncHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user._id;
    const { barcode } = req.params;

    const scanResults = await ScanResult.find({ userId, barcode }).sort({
      scannedAt: -1,
    });

    res.status(200).json({
      success: true,
      data: scanResults,
    });
  } catch (error: any) {
    console.error('Error fetching scan results by barcode:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scan results',
      error: error.message,
    });
  }
};

// @desc    Delete scan result
// @route   DELETE /api/scan-results/:id
// @access  Private
export const deleteScanResult: AsyncHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user._id;
    const { id } = req.params;

    const scanResult = await ScanResult.findOneAndDelete({ _id: id, userId });

    if (!scanResult) {
      return res.status(404).json({
        success: false,
        message: 'Scan result not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Scan result deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting scan result:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete scan result',
      error: error.message,
    });
  }
};

// @desc    Delete all scan results for user
// @route   DELETE /api/scan-results
// @access  Private
export const deleteAllScanResults: AsyncHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user._id;

    await ScanResult.deleteMany({ userId });

    res.status(200).json({
      success: true,
      message: 'All scan results deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting all scan results:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete scan results',
      error: error.message,
    });
  }
};

// @desc    Get scan statistics for user
// @route   GET /api/scan-results/stats
// @access  Private
export const getScanStats: AsyncHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user._id;

    const totalScans = await ScanResult.countDocuments({ userId });
    const uniqueProducts = await ScanResult.distinct('barcode', { userId });

    // Get most scanned products
    const mostScanned = await ScanResult.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$barcode',
          count: { $sum: 1 },
          productName: { $first: '$productName' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalScans,
        uniqueProducts: uniqueProducts.length,
        mostScanned,
      },
    });
  } catch (error: any) {
    console.error('Error fetching scan statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scan statistics',
      error: error.message,
    });
  }
};
