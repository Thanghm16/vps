import { ObjectId } from 'mongodb';

export interface FavoriteDocument {
  _id?: ObjectId;
  userId: ObjectId;
  accountId: ObjectId;
  accountCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PopulatedFavoriteItem {
  id: string;
  favoriteId: string;
  accountId: string;
  code: string;
  title: string;
  gameSlug: string;
  gameName: string;
  price: number;
  originalPrice: number;
  thumbnail: string;
  images: string[];
  status: 'available' | 'sold' | 'reserved' | 'hidden';
  tags: string[];
  favoritedAt: string;
}
