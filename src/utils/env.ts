import Constants from 'expo-constants';

type Extra = {
  firebase?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
  useFirebaseEmulators?: boolean;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const env = {
  firebase: extra.firebase!,
  useEmulators: !!extra.useFirebaseEmulators && __DEV__,
  isDev: __DEV__,
};
