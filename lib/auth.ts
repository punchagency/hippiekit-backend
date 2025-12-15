import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { emailOTP, bearer } from 'better-auth/plugins';
import { MongoClient } from 'mongodb';
import { sendEmail } from './emailService';

// Lazy initialization - create auth instance only when first accessed
let authInstance: ReturnType<typeof betterAuth> | null = null;

function getAuth() {
  if (!authInstance) {
    // Use ATLAS_URL which is already in your .env file
    const mongoUri = process.env.MONGODB_URI || process.env.ATLAS_URL;

    if (!mongoUri) {
      throw new Error(
        'MongoDB URI is not defined. Please set MONGODB_URI or ATLAS_URL in your .env file'
      );
    }

    const client = new MongoClient(mongoUri);

    authInstance = betterAuth({
      baseURL: process.env.APP_URL || 'http://localhost:8000',
      database: mongodbAdapter(client.db()),
      plugins: [
        bearer(),
        emailOTP({
          otpLength: 4,
          expiresIn: 300, // 5 minutes
          async sendVerificationOTP({ email, otp, type }) {
            const clientURL = process.env.CLIENT_URL || 'http://localhost:5173';

            if (type === 'forget-password') {
              // Send OTP for password reset
              await sendEmail({
                to: email,
                subject: 'Reset your password - Hippiekit',
                text: `Hi there,\n\nYour password reset verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request a password reset, you can safely ignore this email.\n\nBest regards,\nThe Hippiekit Team`,
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <div style="background-color: #650084; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Hippiekit</h1>
                      </div>
                      <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                        <div style="background-color: white; padding: 30px; border-radius: 5px;">
                          <h2 style="color: #650084; margin-top: 0;">Reset Your Password</h2>
                          <p>Hi there,</p>
                          <p>We received a request to reset your password. Use the verification code below:</p>
                          <div style="text-align: center; margin: 30px 0;">
                            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; display: inline-block;">
                              <span style="font-size: 32px; font-weight: bold; color: #650084; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                            </div>
                          </div>
                          <p style="color: #666; font-size: 14px; text-align: center;">This code will expire in 5 minutes.</p>
                          <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request a password reset, you can safely ignore this email.</p>
                        </div>
                        <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                          © ${new Date().getFullYear()} Hippiekit. All rights reserved.
                        </p>
                      </div>
                    </body>
                  </html>
                `,
              });
            } else if (type === 'email-verification') {
              // Send OTP for email verification
              await sendEmail({
                to: email,
                subject: 'Verify your email - Hippiekit',
                text: `Hi there,\n\nYour email verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you didn't create an account, you can safely ignore this email.\n\nBest regards,\nThe Hippiekit Team`,
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <div style="background-color: #650084; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Hippiekit</h1>
                      </div>
                      <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                        <div style="background-color: white; padding: 30px; border-radius: 5px;">
                          <h2 style="color: #650084; margin-top: 0;">Verify Your Email</h2>
                          <p>Hi there,</p>
                          <p>Welcome to Hippiekit! Use the verification code below to verify your email:</p>
                          <div style="text-align: center; margin: 30px 0;">
                            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; display: inline-block;">
                              <span style="font-size: 32px; font-weight: bold; color: #650084; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                            </div>
                          </div>
                          <p style="color: #666; font-size: 14px; text-align: center;">This code will expire in 5 minutes.</p>
                          <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't create an account, you can safely ignore this email.</p>
                        </div>
                        <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                          © ${new Date().getFullYear()} Hippiekit. All rights reserved.
                        </p>
                      </div>
                    </body>
                  </html>
                `,
              });
            } else if (type === 'sign-in') {
              // Send OTP for sign-in
              await sendEmail({
                to: email,
                subject: 'Sign in to Hippiekit',
                text: `Hi there,\n\nYour sign-in verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you didn't try to sign in, you can safely ignore this email.\n\nBest regards,\nThe Hippiekit Team`,
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <div style="background-color: #650084; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Hippiekit</h1>
                      </div>
                      <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                        <div style="background-color: white; padding: 30px; border-radius: 5px;">
                          <h2 style="color: #650084; margin-top: 0;">Sign In to Hippiekit</h2>
                          <p>Hi there,</p>
                          <p>Use the verification code below to sign in:</p>
                          <div style="text-align: center; margin: 30px 0;">
                            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; display: inline-block;">
                              <span style="font-size: 32px; font-weight: bold; color: #650084; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                            </div>
                          </div>
                          <p style="color: #666; font-size: 14px; text-align: center;">This code will expire in 5 minutes.</p>
                          <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't try to sign in, you can safely ignore this email.</p>
                        </div>
                        <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                          © ${new Date().getFullYear()} Hippiekit. All rights reserved.
                        </p>
                      </div>
                    </body>
                  </html>
                `,
              });
            }
          },
        }),
      ],
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url, token }, request) => {
          // Replace the default callbackURL with our custom one
          const clientURL = process.env.CLIENT_URL || 'http://localhost:5173';
          const redirectURL = `${clientURL}/reset-password?success=true`;

          // Add callback URL to reset password link
          const urlObj = new URL(url);
          urlObj.searchParams.set('callbackURL', redirectURL);
          const resetURL = urlObj.toString();

          await sendEmail({
            to: user.email,
            subject: 'Reset your password - Hippiekit',
            text: `Hi ${
              user.name || 'there'
            },\n\nWe received a request to reset your password. Click the link below to create a new password:\n\n${resetURL}\n\nThis link will expire in 1 hour.\n\nIf you didn't request a password reset, you can safely ignore this email.\n\nBest regards,\nThe Hippiekit Team`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background-color: #650084; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Hippiekit</h1>
                  </div>
                  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <div style="background-color: white; padding: 30px; border-radius: 5px;">
                      <h2 style="color: #650084; margin-top: 0;">Reset Your Password</h2>
                      <p>Hi ${user.name || 'there'},</p>
                      <p>We received a request to reset your password. Click the button below to create a new password:</p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetURL}" style="background-color: #650084; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
                      </div>
                      <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
                      <p style="color: #666; font-size: 12px; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">${resetURL}</p>
                      <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
                    </div>
                    <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                      © ${new Date().getFullYear()} Hippiekit. All rights reserved.
                    </p>
                  </div>
                </body>
              </html>
            `,
          });
        },
      },
      emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url, token }, request) => {
          // Replace the default callbackURL with our custom one
          const clientURL = process.env.CLIENT_URL || 'http://localhost:5173';
          const redirectURL = `${clientURL}/signin?verified=true`;

          // Remove existing callbackURL parameter and add our own
          const urlObj = new URL(url);
          urlObj.searchParams.set('callbackURL', redirectURL);
          const verificationURL = urlObj.toString();

          await sendEmail({
            to: user.email,
            subject: 'Verify your email address - Hippiekit',
            text: `Hi ${
              user.name || 'there'
            },\n\nWelcome to Hippiekit! Please verify your email address by clicking the link below:\n\n${verificationURL}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.\n\nBest regards,\nThe Hippiekit Team`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background-color: #650084; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Hippiekit</h1>
                  </div>
                  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                    <div style="background-color: white; padding: 30px; border-radius: 5px;">
                      <h2 style="color: #650084; margin-top: 0;">Verify Your Email Address</h2>
                      <p>Hi ${user.name || 'there'},</p>
                      <p>Welcome to Hippiekit! We're excited to have you on board. Please verify your email address by clicking the button below:</p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationURL}" style="background-color: #650084; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email</a>
                      </div>
                      <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
                      <p style="color: #666; font-size: 12px; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">${verificationURL}</p>
                      <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
                    </div>
                    <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                      © ${new Date().getFullYear()} Hippiekit. All rights reserved.
                    </p>
                  </div>
                </body>
              </html>
            `,
          });
        },
      },
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
        facebook: {
          clientId: process.env.FACEBOOK_CLIENT_ID as string,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
        },
      },
      account: {
        accountLinking: {
          enabled: true,
          trustedProviders: ['google', 'facebook'],
        },
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day (update session every day)
        cookieCache: {
          enabled: false, // Disable cookie-based sessions - using bearer tokens only
        },
      },
      user: {
        additionalFields: {
          phoneNumber: {
            type: 'string',
            required: false,
          },
        },
        changeEmail: {
          enabled: true,
          sendChangeEmailVerification: async ({ user, newEmail, url }) => {
            // Send verification email to current email to approve the change
            await sendEmail({
              to: user.email,
              subject: 'Approve email change - Hippiekit',
              text: `Hi ${
                user.name || 'there'
              },\n\nYou requested to change your email to ${newEmail}.\n\nClick the link below to approve this change:\n\n${url}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this change, please ignore this email and contact support.\n\nBest regards,\nThe Hippiekit Team`,
              html: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  </head>
                  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #650084; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                      <h1 style="color: white; margin: 0; font-size: 28px;">Hippiekit</h1>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                      <div style="background-color: white; padding: 30px; border-radius: 5px;">
                        <h2 style="color: #650084; margin-top: 0;">Approve Email Change</h2>
                        <p>Hi ${user.name || 'there'},</p>
                        <p>You requested to change your email address to:</p>
                        <div style="text-align: center; margin: 20px 0;">
                          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; display: inline-block;">
                            <span style="font-size: 16px; font-weight: bold; color: #650084;">${newEmail}</span>
                          </div>
                        </div>
                        <p>Click the button below to approve this change:</p>
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${url}" style="background-color: #650084; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Approve Email Change</a>
                        </div>
                        <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
                        <p style="color: #666; font-size: 12px; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 3px;">${url}</p>
                        <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour. If you didn't request this change, please ignore this email and contact support immediately.</p>
                      </div>
                      <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
                        © ${new Date().getFullYear()} Hippiekit. All rights reserved.
                      </p>
                    </div>
                  </body>
                </html>
              `,
            });
          },
        },
      },
      trustedOrigins: [
        process.env.CLIENT_URL as string,
        process.env.APP_URL as string,
        'http://localhost:5173',
        'https://localhost',
        'capacitor://localhost',
        'http://localhost',
      ].filter(Boolean),
      advanced: {
        useSecureCookies: false, // Cookies disabled - using bearer tokens
        crossSubDomainCookies: {
          enabled: false,
        },
        disableCSRFCheck: true, // Not needed for bearer token auth
      },
    });
  }

  return authInstance;
}

export const auth = getAuth();
