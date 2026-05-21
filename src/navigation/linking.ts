// import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';
import type { RootTabParamList } from './types';

export const linking: LinkingOptions<RootTabParamList> = {
  // Mantener solo el esquema custom para evitar issues con URL en ciertas plataformas
  prefixes: ['emotionaljournal://'],
  config: {
    screens: {
      JournalTab: {
        screens: {
          JournalHome: 'journal',
        },
      },
      DiscoverTab: {
        screens: {
          DiscoverHome: 'discover',
        },
      },
      ChatTab: {
        screens: {
          ChatHome: 'chat',
        },
      },
    },
  },
};
