import { Request, Response } from 'express';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.js';
import {
  sendEmail,
  sendVerificationEmail,
  sendOTPEmail,
} from '../lib/emailService.js';
import connectDB from '../config/db.js';
import mongoose from 'mongoose';
import Account from '../models/Account.js';

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
  await connectDB();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { provider, providerAccountId, name, email, password, phoneNumber } =
      req.body;

    // Validate fields for credentials provider
    if (provider === 'credentials' && !password) {
      throw new Error('Password is required for credential provider');
    }

    // Check if user already exists with email
    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
      return;
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user (password hashing handled by pre-save hook)
    const [user] = await User.create(
      [
        {
          name,
          email,
          password: provider === 'credentials' ? password : undefined,
          phoneNumber,
          isVerified: false,
          verificationToken,
          verificationTokenExpiry,
        },
      ],
      { session }
    );

    // Link account (no password stored here)
    const existingAccount = await Account.findOne({
      userId: user._id,
      provider,
      providerAccountId,
    }).session(session);

    if (!existingAccount) {
      await Account.create(
        [
          {
            userId: user._id,
            provider,
            providerAccountId,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
      console.log('✅ Verification email sent to:', email);
    } catch (emailError) {
      console.error('⚠️ Failed to send verification email:', emailError);
      // Continue - user can request resend later
    }

    res.status(201).json({
      success: true,
      message:
        'Registration successful! Please check your email to verify your account.',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    });
    return;
  } catch (error) {
    console.error('Registration error:', error);

    await session.abortTransaction();
    session.endSession();

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    });
    return;
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  await connectDB();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt for:', email);

    // Check for user
    const user = await User.findOne({ email })
      .select('+password')
      .session(session);

    if (!user) {
      console.log('❌ User not found:', email);
      await session.abortTransaction();
      session.endSession();
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      console.log('❌ Password mismatch for:', email);
      await session.abortTransaction();
      session.endSession();
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Check if email is verified
    if (!user.isVerified) {
      console.log('❌ Email not verified for:', email);
      await session.abortTransaction();
      session.endSession();
      res.status(403).json({
        success: false,
        message:
          'Please verify your email before logging in. Check your inbox for the verification link.',
      });
      return;
    }

    // Check/create Account entry for credentials provider
    const existingAccount = await Account.findOne({
      userId: user._id,
      provider: 'credentials',
    }).session(session);

    if (!existingAccount) {
      await Account.create(
        [
          {
            userId: user._id,
            provider: 'credentials',
            providerAccountId: email, // Use email as providerAccountId for credentials
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    const token = generateToken(String(user._id));
    console.log(
      '✅ Login successful for:',
      email,
      '| User ID:',
      String(user._id)
    );

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profileImage: user.profileImage,
        token: token,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    console.log('🔍 getMe request - User authenticated:', !!authReq.user);

    if (!authReq.user) {
      console.log('❌ getMe - No user in request');
      res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
      return;
    }

    const user = await User.findById(authReq.user._id);

    if (!user) {
      console.log('❌ getMe - User not found in DB:', authReq.user._id);
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    console.log('✅ getMe successful for:', user.email);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('❌ getMe error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
      return;
    }

    const user = await User.findById(authReq.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
      user.profileImage = req.body.profileImage || user.profileImage;

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        success: true,
        data: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
          profileImage: updatedUser.profileImage,
          token: generateToken(String(updatedUser._id)),
        },
        message: 'Profile updated successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

// @desc    Native Google Sign-In (Android/iOS)
// @route   POST /api/auth/google-signin
// @access  Public
export const googleSignIn = async (
  req: Request,
  res: Response
): Promise<void> => {
  await connectDB();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { idToken } = req.body;

    if (!idToken) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ success: false, message: 'ID token is required' });
      return;
    }

    // Verify the Google ID token with Google
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${encodeURIComponent(
        idToken
      )}`
    );

    if (!response.ok) {
      await session.abortTransaction();
      session.endSession();
      res.status(401).json({ success: false, message: 'Invalid token' });
      return;
    }

    const tokenInfo = (await response.json()) as {
      email: string;
      name?: string;
      picture?: string;
      sub: string;
    };

    const { email, name, picture, sub } = tokenInfo;

    if (!email) {
      await session.abortTransaction();
      session.endSession();
      res
        .status(400)
        .json({ success: false, message: 'Email not found in token' });
      return;
    }

    // Check if user exists
    let user = await User.findOne({ email }).session(session);

    if (!user) {
      // Create new user
      [user] = await User.create(
        [
          {
            name: name || email.split('@')[0],
            email,
            password: crypto.randomBytes(32).toString('hex'), // Random password for OAuth users
            phoneNumber: '',
            profileImage: picture,
            isVerified: true,
          },
        ],
        { session }
      );

      // Create Account entry
      await Account.create(
        [
          {
            userId: user._id,
            provider: 'google',
            providerAccountId: sub,
          },
        ],
        { session }
      );
    } else {
      // Update existing user
      user.profileImage = picture || user.profileImage;
      user.isVerified = true;
      await user.save({ session });

      // Check if Google account is already linked
      const existingAccount = await Account.findOne({
        userId: user._id,
        provider: 'google',
        providerAccountId: sub,
      }).session(session);

      if (!existingAccount) {
        // Link Google account to existing user
        await Account.create(
          [
            {
              userId: user._id,
              provider: 'google',
              providerAccountId: sub,
            },
          ],
          { session }
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    const token = generateToken(String(user._id));
    console.log(
      '✅ Google sign-in/up success for',
      email,
      'User ID:',
      String(user._id)
    );
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profileImage: user.profileImage,
        token: generateToken(String(user._id)),
      },
      message: 'Google sign-in successful',
    });
  } catch (error) {
    console.error('Google Sign-In error:', error);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

// @desc    Web Google OAuth - Initiate
// @route   GET /api/auth/google
// @access  Public
export const googleOAuthInitiate = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${
      process.env.APP_URL || 'http://localhost:8000'
    }/api/auth/callback/google`;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (!clientId) {
      res
        .status(500)
        .json({ success: false, message: 'Google OAuth not configured' });
      return;
    }

    // Build Google OAuth URL
    const googleAuthUrl = new URL(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    googleAuthUrl.searchParams.append('client_id', clientId);
    googleAuthUrl.searchParams.append('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.append('response_type', 'code');
    googleAuthUrl.searchParams.append('scope', 'email profile');
    googleAuthUrl.searchParams.append('access_type', 'online');
    googleAuthUrl.searchParams.append('state', clientUrl); // Pass client URL in state for redirect

    res.redirect(googleAuthUrl.toString());
  } catch (error) {
    console.error('Google OAuth initiate error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
};

// @desc    Web Google OAuth - Callback
// @route   GET /api/auth/google/callback
// @access  Public
export const googleOAuthCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      const clientUrl =
        (state as string) || process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${clientUrl}?error=${encodeURIComponent(error as string)}`);
      return;
    }

    if (!code) {
      const clientUrl =
        (state as string) || process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${clientUrl}?error=no_code`);
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${
      process.env.APP_URL || 'http://localhost:8000'
    }/api/auth/callback/google`;

    if (!clientId || !clientSecret) {
      const clientUrl =
        (state as string) || process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${clientUrl}?error=oauth_not_configured`);
      return;
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const clientUrl =
        (state as string) || process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${clientUrl}?error=token_exchange_failed`);
      return;
    }

    const tokens = (await tokenResponse.json()) as { id_token: string };
    const { id_token } = tokens;

    // Verify ID token and get user info
    const userInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${id_token}`
    );

    if (!userInfoResponse.ok) {
      const clientUrl =
        (state as string) || process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${clientUrl}?error=invalid_token`);
      return;
    }

    const tokenInfo = (await userInfoResponse.json()) as {
      email: string;
      name?: string;
      picture?: string;
      sub: string;
    };

    const { email, name, picture, sub } = tokenInfo;

    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if user exists or create new user
      let user = await User.findOne({ email }).session(session);

      if (!user) {
        [user] = await User.create(
          [
            {
              name: name || email.split('@')[0],
              email,
              password: crypto.randomBytes(32).toString('hex'),
              phoneNumber: '',
              profileImage: picture,
              isVerified: true,
            },
          ],
          { session }
        );

        // Create Account entry
        await Account.create(
          [
            {
              userId: user._id,
              provider: 'google',
              providerAccountId: sub,
            },
          ],
          { session }
        );
      } else {
        user.profileImage = picture || user.profileImage;
        user.isVerified = true;
        await user.save({ session });

        // Check if Google account is already linked
        const existingAccount = await Account.findOne({
          userId: user._id,
          provider: 'google',
          providerAccountId: sub,
        }).session(session);

        if (!existingAccount) {
          // Link Google account to existing user
          await Account.create(
            [
              {
                userId: user._id,
                provider: 'google',
                providerAccountId: sub,
              },
            ],
            { session }
          );
        }
      }

      await session.commitTransaction();
      session.endSession();

      const jwtToken = generateToken(String(user._id));
      const clientUrl =
        (state as string) || process.env.CLIENT_URL || 'http://localhost:5173';

      console.log('✅ Web Google OAuth success for', email);

      // Redirect to client with token
      res.redirect(`${clientUrl}?token=${jwtToken}`);
    } catch (dbError) {
      await session.abortTransaction();
      session.endSession();
      throw dbError;
    }
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}?error=oauth_failed`);
  }
};

// @desc    Verify email with token
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  await connectDB();

  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Verification token is required',
      });
      return;
    }

    // Find user by verification token
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: new Date() }, // Token must not be expired
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
      });
      return;
    }

    // Mark email as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    console.log('✅ Email verified for:', user.email);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now login.',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
    return;
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    });
    return;
  }
};

// @desc    Request password reset (generates and sends OTP)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  await connectDB();

  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      // For security, don't reveal if user exists
      res.status(200).json({
        success: true,
        message:
          'If an account exists with this email, you will receive a password reset code.',
      });
      return;
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const resetOTPExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save OTP to user
    user.resetOTP = otp;
    user.resetOTPExpiry = resetOTPExpiry;
    await user.save();

    // Send OTP email
    try {
      await sendOTPEmail(email, otp);
      console.log('✅ Password reset OTP sent to:', email);
    } catch (emailError) {
      console.error('⚠️ Failed to send OTP email:', emailError);
      // Still return success to prevent email enumeration
    }

    res.status(200).json({
      success: true,
      message:
        'If an account exists with this email, you will receive a password reset code.',
    });
    return;
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    });
    return;
  }
};

// @desc    Verify OTP for password reset
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  await connectDB();

  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Check if OTP matches and is not expired
    if (
      user.resetOTP !== otp ||
      !user.resetOTPExpiry ||
      new Date() > user.resetOTPExpiry
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
      return;
    }

    // OTP is valid - return success (don't clear OTP yet, wait for reset-password)
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
    });
    return;
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    });
    return;
  }
};

// @desc    Reset password with verified OTP
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  await connectDB();

  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required',
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Verify OTP
    if (
      user.resetOTP !== otp ||
      !user.resetOTPExpiry ||
      new Date() > user.resetOTPExpiry
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
      return;
    }

    // Update password and clear OTP
    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpiry = undefined;
    await user.save(); // pre-save hook will hash the password

    console.log('✅ Password reset for:', email);

    // Generate JWT token for auto-login
    const jwtToken = generateToken(String(user._id));

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You are now logged in.',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: jwtToken,
      },
    });
    return;
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    });
    return;
  }
};
