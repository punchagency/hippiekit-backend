import mongoose, { Schema, model, Types } from 'mongoose';

const { models } = mongoose;

export interface IFavoriteCategorySnapshot {
  id: number;
  name: string;
  slug: string;
  image?: string;
}

export interface IFavoriteProductSnapshot {
  title: string;
  image: string;
  priceText?: string;
}

export interface IFavorite {
  userId: Types.ObjectId;
  productId: number; // WordPress product ID
  product: IFavoriteProductSnapshot;
  categories: IFavoriteCategorySnapshot[];
  createdAt?: Date;
  updatedAt?: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    productId: { type: Number, required: true },
    product: {
      title: { type: String, required: true },
      image: { type: String, required: true },
      priceText: { type: String, required: false },
    },
    categories: [
      {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        slug: { type: String, required: true },
        image: { type: String, required: false },
      },
    ],
  },
  { timestamps: true }
);

// Ensure a user can only favorite a product once
FavoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });
FavoriteSchema.index({ userId: 1, createdAt: -1 });

const Favorite =
  models.Favorite || model<IFavorite>('Favorite', FavoriteSchema);

export default Favorite;
