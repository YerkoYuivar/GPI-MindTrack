export type JournalStackParamList = {
  JournalList: { searchQuery?: string } | undefined;
  JournalFavorites: undefined;
  JournalDetail: { entryId: string } | undefined;
  JournalEditor: {
    entryId?: string;
    template?: 'abc' | '3good' | 'tension-release';
    prefill?: { title?: string; content?: string; mood?: number };
  } | undefined;
  JournalTrash: undefined;
  JournalSearch: undefined;
  JournalExport: undefined;
  Diagnostics: undefined;
};

export type DiscoverStackParamList = {
  DiscoverHome: undefined;
  DiscoverDashboard: undefined;
  DiscoverGraph: undefined;
  DiscoverFeed: undefined;
  EntryInsights: { entryId: string };
};

export type ChatStackParamList = {
  ChatHome: undefined;
  ChatSupport: { conversationId?: string };
  ChatMemory: undefined;
  QuickExercise: {
    key: 'walk-10' | 'micro-break-2' | 'body-scan-5';
  };
};

export type AuthStackParamList = {
  AuthSignIn: undefined;
  AuthSignUp: undefined;
  AuthProfile: undefined;
};

export type AppTabParamList = {
  JournalTab: undefined;
  DiscoverTab: undefined;
  ChatTab: undefined;
  ProfileTab: undefined;
};

// Backwards compatibility with existing imports
export type RootTabParamList = AppTabParamList;
