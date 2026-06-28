import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User,
  ConfirmationResult
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * Sign in an admin with email and password.
 */
export const signInAdmin = async (email: string, password: string): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

/**
 * Initializes a RecaptchaVerifier for Phone Authentication (used for customer/pharmacy OTP).
 */
export const initRecaptcha = (elementId: string): RecaptchaVerifier => {
  return new RecaptchaVerifier(auth, elementId, {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => {}
  });
};

/**
 * Sends an SMS OTP to the provided phone number.
 */
export const sendSmsOtp = async (
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  try {
    return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  } catch (error) {
    console.error('Error sending SMS OTP:', error);
    throw error;
  }
};

/**
 * Verifies the SMS OTP and completes the sign-in process.
 */
export const verifySmsOtp = async (
  confirmationResult: ConfirmationResult,
  otpCode: string
): Promise<User> => {
  try {
    const result = await confirmationResult.confirm(otpCode);
    return result.user;
  } catch (error) {
    console.error('Error verifying SMS OTP:', error);
    throw error;
  }
};
