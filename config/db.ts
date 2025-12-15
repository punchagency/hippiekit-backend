import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.ATLAS_URL) {
      throw new Error('ATLAS_URL is not defined in environment variables');
    }

    const conn = await mongoose.connect(process.env.ATLAS_URL);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    process.exit(1);
  }
};

export default connectDB;
