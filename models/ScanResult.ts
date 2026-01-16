import mongoose, { Document, Schema } from 'mongoose';

// Interface for ingredient information
interface IIngredient {
  name: string;
  description: string;
}

// Interface for packaging information
interface IPackaging {
  name: string;
  description: string;
}

// Interface for product recommendations
interface IRecommendation {
  id?: string; // WordPress product ID for navigation
  name: string;
  brand: string;
  description: string;
  image_url?: string;
  price?: string;
  permalink?: string;
  source: 'wordpress' | 'ai'; // Track if it's from WordPress DB or AI-generated
}

// Main scan result interface
export interface IScanResult extends Document {
  userId: mongoose.Types.ObjectId;
  scanType: 'barcode' | 'photo'; // Type of scan
  barcode?: string; // Optional for photo scans
  productName: string;
  productBrand?: string;
  productImage?: string;
  scannedImage?: string; // Store the scanned image for photo scans
  safeIngredients: IIngredient[];
  harmfulIngredients: IIngredient[];
  packaging: IPackaging[];
  packagingSummary?: string;
  packagingSafety?: 'safe' | 'harmful' | 'caution' | 'unknown';
  recommendations: IRecommendation[];
  chemicalAnalysis?: {
    safety_score?: number;
    total_harmful?: number;
    total_safe?: number;
  };
  scannedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ingredientSchema = new Schema<IIngredient>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const packagingSchema = new Schema<IPackaging>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
      default: '',
    },
  },
  { _id: false }
);

const recommendationSchema = new Schema<IRecommendation>(
  {
    id: {
      type: String,
    },
    name: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: false,
      default: '',
    },
    description: {
      type: String,
      required: true,
    },
    image_url: {
      type: String,
    },
    price: {
      type: String,
    },
    permalink: {
      type: String,
    },
    source: {
      type: String,
      enum: ['wordpress', 'ai'],
      required: true,
    },
  },
  { _id: false }
);

const scanResultSchema = new Schema<IScanResult>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scanType: {
      type: String,
      enum: ['barcode', 'photo'],
      required: true,
      default: 'barcode',
    },
    barcode: {
      type: String,
      index: true,
    },
    productName: {
      type: String,
      required: true,
    },
    productBrand: {
      type: String,
    },
    productImage: {
      type: String,
    },
    scannedImage: {
      type: String,
    },
    safeIngredients: {
      type: [ingredientSchema],
      default: [],
    },
    harmfulIngredients: {
      type: [ingredientSchema],
      default: [],
    },
    packaging: {
      type: [packagingSchema],
      default: [],
    },
    packagingSummary: {
      type: String,
    },
    packagingSafety: {
      type: String,
      enum: ['safe', 'harmful', 'caution', 'unknown'],
    },
    recommendations: {
      type: [recommendationSchema],
      default: [],
    },
    chemicalAnalysis: {
      safety_score: Number,
      total_harmful: Number,
      total_safe: Number,
    },
    scannedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user and barcode to find user's scans efficiently
scanResultSchema.index({ userId: 1, barcode: 1 });
scanResultSchema.index({ userId: 1, scannedAt: -1 });

const ScanResult = mongoose.model<IScanResult>('ScanResult', scanResultSchema);

export default ScanResult;
