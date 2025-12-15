import mongoose, { Schema, model, Types, Document } from 'mongoose';

const { models } = mongoose;

export interface IAccount {
  userId: Types.ObjectId;
  provider: string;
  providerAccountId: string;
}

export interface IAccountDoc extends IAccount, Document {}

const AccountSchema = new Schema<IAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
  },
  { timestamps: true }
);

const Account = models?.Account || model<IAccount>('Account', AccountSchema);

export default Account;
