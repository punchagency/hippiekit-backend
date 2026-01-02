import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: IUser;
}

interface JWTPayload {
  id: string;
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      console.log(
        '🔍 Server received Authorization header:',
        req.headers.authorization.substring(0, 30) + '...'
      );
      console.log(
        '🔍 Extracted token (first 20 chars):',
        token?.substring(0, 20) + '...'
      );
      console.log('🔍 Token length:', token?.length);
      console.log('🔍 Token type:', typeof token);
      console.log(
        '🔍 Token format check:',
        token?.split('.').length === 3
          ? 'Valid JWT format'
          : 'INVALID JWT FORMAT'
      );

      if (!process.env.JWT_SECRET) {
        res.status(500).json({
          success: false,
          message: 'JWT_SECRET is not configured',
        });
        return;
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      (req as AuthRequest).user = user;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({
        success: false,
        message: 'Not authorized, token failed',
      });
      return;
    }
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authorized, no token',
    });
    return;
  }
};
