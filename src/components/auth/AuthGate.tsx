import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import AuthRequiredScreen from '@screens/Auth/AuthRequiredScreen';
import { useAuthListener } from '@features/auth/hooks';
import { useMigrateDrafts } from '@features/journal/useMigrateDrafts';

type Props = {
  requireAuth?: boolean;
  children: React.ReactNode;
};

export default function AuthGate({ requireAuth = true, children }: Props) {
  const { user, loading } = useAuthListener();
  const { migrating, migratedCount } = useMigrateDrafts();

  if (loading || migrating) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {loading ? 'Verificando sesión...' : `Migrando ${migratedCount !== null ? migratedCount : ''} entradas...`}
        </Text>
      </View>
    );
  }

  if (requireAuth && !user) {
    return <AuthRequiredScreen />;
  }

  return <View style={{ flex: 1 }}>{children}</View>;
}

export { useCurrentUser } from '@features/auth/hooks';
