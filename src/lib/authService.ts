import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  linkWithCredential,
  EmailAuthProvider,
  PhoneAuthProvider,
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
 * Signs up a new user with Email and Password.
 */
export const signUpWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing up with email:", error);
    throw error;
  }
};

/**
 * Signs in an existing user with Email and Password.
 */
export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in with email:", error);
    throw error;
  }
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

/**
 * Links a Phone number credential to an active Email/Password user session.
 * This function initiates the SMS verification flow for linking.
 */
export const linkPhoneToEmail = async (
  user: User, 
  phoneNumber: string, 
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  try {
    // 1. We must verify the phone number first using a PhoneAuthProvider
    const phoneProvider = new PhoneAuthProvider(auth);
    const verificationId = await phoneProvider.verifyPhoneNumber(phoneNumber, recaptchaVerifier);
    
    // We return a mock ConfirmationResult-like object that the UI can use to confirm the code
    return {
      verificationId,
      confirm: async (code: string) => {
        const credential = PhoneAuthProvider.credential(verificationId, code);
        try {
          const result = await linkWithCredential(user, credential);
          return result;
        } catch (error: any) {
          handleLinkingError(error);
          throw error;
        }
      }
    } as unknown as ConfirmationResult;
  } catch (error) {
    console.error("Error initiating phone linking:", error);
    throw error;
  }
};

/**
 * Links an Email/Password credential to an active Phone session.
 */
export const linkEmailToPhone = async (user: User, email: string, password: string): Promise<User> => {
  try {
    const credential = EmailAuthProvider.credential(email, password);
    const userCredential = await linkWithCredential(user, credential);
    return userCredential.user;
  } catch (error: any) {
    handleLinkingError(error);
    throw error;
  }
};

/**
 * Helper utility to handle common credential linking errors.
 */
const handleLinkingError = (error: any) => {
  switch (error.code) {
    case 'auth/credential-already-in-use':
      console.error("This credential is already linked to a different user account.");
      break;
    case 'auth/provider-already-linked':
      console.error("The user is already linked to this provider.");
      break;
    case 'auth/account-exists-with-different-credential':
      console.error("An account already exists with the same email address but different sign-in credentials.");
      break;
    default:
      console.error("An unexpected error occurred during account linking:", error);
  }
};
