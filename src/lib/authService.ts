import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  User,
  ConfirmationResult
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * Initializes a RecaptchaVerifier for Phone Authentication.
 * @param elementId - The ID of the HTML element to render the reCAPTCHA in.
 * @returns A RecaptchaVerifier instance.
 */
export const initRecaptcha = (elementId: string): RecaptchaVerifier => {
  return new RecaptchaVerifier(auth, elementId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved - will proceed with submit function
    },
    'expired-callback': () => {
      // Response expired. Ask user to solve reCAPTCHA again.
    }
  });
};

/**
 * Sends an SMS OTP to the provided phone number.
 * @param phoneNumber - The user's phone number in E.164 format (e.g. +966500000000)
 * @param recaptchaVerifier - The initialized RecaptchaVerifier instance
 * @returns A ConfirmationResult to be used for verifying the code.
 */
export const sendSmsOtp = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    return confirmationResult;
  } catch (error) {
    console.error("Error sending SMS OTP:", error);
    throw error;
  }
};

/**
 * Verifies the SMS OTP and completes the sign-in process.
 */
export const verifySmsOtp = async (confirmationResult: ConfirmationResult, otpCode: string): Promise<User> => {
  try {
    const result = await confirmationResult.confirm(otpCode);
    return result.user;
  } catch (error) {
    console.error("Error verifying SMS OTP:", error);
    throw error;
  }
};
