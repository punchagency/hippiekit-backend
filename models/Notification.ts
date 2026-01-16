import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'barcode_scan' | 'photo_scan';
  title: string;
  message: string;
  productName: string;
  productImage?: string;
  scanResultId: mongoose.Types.ObjectId;
  barcode?: string; // For barcode scans
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['barcode_scan', 'photo_scan'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    productImage: {
      type: String,
    },
    scanResultId: {
      type: Schema.Types.ObjectId,
      ref: 'ScanResult',
      required: true,
    },
    barcode: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.model<INotification>(
  'Notification',
  notificationSchema
);

export default Notification;
