import { Account, Client, Databases, ID } from 'react-native-appwrite';

export const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT! || 'https://nyc.cloud.appwrite.io/v1')
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID! || '68c4200f0032a05b1600')
  .setPlatform(process.env.EXPO_PUBLIC_APPWRITE_PLATFORM! || 'com.Admin.Todo');
  

const account = new Account(client);
const databases = new Databases(client);

// Auth types
export interface User {
  $id: string;
  name: string;
  email: string;
  emailVerification: boolean;
  prefs: Record<string, any>;
}

export interface AuthError {
  message: string;
  code?: string;
  type?: string;
}

// Authentication functions
export const auth = {
  // Get current user session
  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await account.get();
      return user as User;
    } catch (error: any) {
      console.log('No active session:', error.message);
      return null;
    }
  },

  // Sign up new user
  async signUp(email: string, password: string, name: string): Promise<User> {
    try {
      // Create account
      await account.create(ID.unique(), email, password, name);
      
      // Sign in the user immediately after signup
      await account.createEmailPasswordSession(email, password);
      
      // Return the user data
      const user = await account.get();
      return user as User;
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw {
        message: error.message || 'Failed to create account',
        code: error.code,
        type: error.type
      } as AuthError;
    }
  },

  // Sign in existing user
  async signIn(email: string, password: string): Promise<User> {
    try {
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      return user as User;
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw {
        message: error.message || 'Failed to sign in',
        code: error.code,
        type: error.type
      } as AuthError;
    }
  },

  // Sign out user
  async signOut(): Promise<void> {
    try {
      await account.deleteSession('current');
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw {
        message: error.message || 'Failed to sign out',
        code: error.code,
        type: error.type
      } as AuthError;
    }
  },

  // Delete all sessions (sign out from all devices)
  async signOutAll(): Promise<void> {
    try {
      await account.deleteSessions();
    } catch (error: any) {
      console.error('Sign out all error:', error);
      throw {
        message: error.message || 'Failed to sign out from all devices',
        code: error.code,
        type: error.type
      } as AuthError;
    }
  },

  // Send password recovery email
  async sendPasswordRecovery(email: string): Promise<void> {
    try {
      await account.createRecovery(email, 'https://your-app.com/reset-password');
    } catch (error: any) {
      console.error('Password recovery error:', error);
      throw {
        message: error.message || 'Failed to send recovery email',
        code: error.code,
        type: error.type
      } as AuthError;
    }
  },

  // Update user name
  async updateName(name: string): Promise<User> {
    try {
      const user = await account.updateName(name);
      return user as User;
    } catch (error: any) {
      console.error('Update name error:', error);
      throw {
        message: error.message || 'Failed to update name',
        code: error.code,
        type: error.type
      } as AuthError;
    }
  },

  // Update user email
  async updateEmail(email: string, password: string): Promise<User> {
    try {
      const user = await account.updateEmail(email, password);
      return user as User;
    } catch (error: any) {
      console.error('Update email error:', error);
      throw {
        message: error.message || 'Failed to update email',
        code: error.code,
        type: error.type
      } as AuthError;
    }
  },

  // Update user password
  async updatePassword(newPassword: string, oldPassword: string): Promise<User> {
    try {
      const user = await account.updatePassword(newPassword, oldPassword);
      return user as User;
    } catch (error: any) {
      console.error('Update password error:', error);
      throw {
        message: error.message || 'Failed to update password',
        code: error.code,
        type: error.type
      } as AuthError;
    }
  }
};

export { account, databases };
