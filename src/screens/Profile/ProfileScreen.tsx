/**
 * ProfileScreen
 * 
 * Pantalla de perfil moderna siguiendo estándares de apps móviles.
 * Incluye gestión de tema claro/oscuro.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@contexts/AuthContext';
import { useTheme, ThemeMode } from '@contexts/ThemeContext';
import { Feather } from '@expo/vector-icons';
import Avatar from '@components/ui/Avatar';

// Tipo para las opciones de menú
interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
  showChevron?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

// Componente de ítem de menú
function MenuItem({ 
  icon, 
  label, 
  value, 
  onPress, 
  rightElement, 
  danger = false,
  showChevron = true,
  colors,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.separator }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress && !rightElement}
    >
      <View style={styles.menuItemLeft}>
        <View style={[
          styles.menuIconContainer, 
          { backgroundColor: danger ? colors.danger + '15' : colors.primary + '15' }
        ]}>
          <Feather 
            name={icon} 
            size={18} 
            color={danger ? colors.danger : colors.primary} 
          />
        </View>
        <Text style={[
          styles.menuItemLabel, 
          { color: danger ? colors.danger : colors.text }
        ]}>
          {label}
        </Text>
      </View>
      <View style={styles.menuItemRight}>
        {value && (
          <Text style={[styles.menuItemValue, { color: colors.textSecondary }]}>
            {value}
          </Text>
        )}
        {rightElement}
        {showChevron && onPress && (
          <Feather name="chevron-right" size={20} color={colors.textTertiary} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, userProfile, logout } = useAuth();
  const { mode, isDark, colors, setThemeMode } = useTheme();
  const [showThemeOptions, setShowThemeOptions] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'No se pudo cerrar sesión. Intenta de nuevo.');
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Próximamente', 'La edición de perfil estará disponible pronto.');
  };

  const handlePrivacy = () => {
    Linking.openURL('https://example.com/privacy');
  };

  const handleTerms = () => {
    Linking.openURL('https://example.com/terms');
  };

  const handleHelp = () => {
    Alert.alert('Ayuda', '¿Necesitas ayuda? Contáctanos en support@example.com');
  };

  const getThemeModeLabel = (themeMode: ThemeMode) => {
    switch (themeMode) {
      case 'light': return 'Claro';
      case 'dark': return 'Oscuro';
      case 'system': return 'Sistema';
    }
  };

  const selectThemeMode = (themeMode: ThemeMode) => {
    setThemeMode(themeMode);
    setShowThemeOptions(false);
  };

  // Componente de sección
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
      <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
        {children}
      </View>
    </View>
  );

  const memberSince = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
      })
    : 'N/A';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header con Avatar */}
        <View style={styles.header}>
          <View style={styles.avatarWrapper}>
            <Avatar
              uri={userProfile?.photoURL || user?.photoURL || null}
              name={userProfile?.displayName || user?.displayName || user?.email || 'Usuario'}
              size={100}
            />
            <TouchableOpacity 
              style={[styles.editAvatarButton, { backgroundColor: colors.primary }]}
              onPress={handleEditProfile}
            >
              <Feather name="camera" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.name, { color: colors.text }]}>
            {userProfile?.displayName || user?.displayName || 'Usuario'}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>
            {user?.email}
          </Text>

          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {userProfile?.diaryEntriesCount || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Entradas
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {memberSince !== 'N/A' ? '✓' : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Miembro
              </Text>
            </View>
          </View>
        </View>

        {/* Bio si existe */}
        {userProfile?.bio && (
          <View style={[styles.bioCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.bioText, { color: colors.text }]}>
              "{userProfile.bio}"
            </Text>
          </View>
        )}

        {/* Sección: Cuenta */}
        <Section title="CUENTA">
          <MenuItem
            icon="user"
            label="Editar perfil"
            onPress={handleEditProfile}
            colors={colors}
          />
          <MenuItem
            icon="calendar"
            label="Miembro desde"
            value={memberSince}
            showChevron={false}
            colors={colors}
          />
        </Section>

        {/* Sección: Apariencia */}
        <Section title="APARIENCIA">
          <MenuItem
            icon={isDark ? 'moon' : 'sun'}
            label="Tema"
            value={getThemeModeLabel(mode)}
            onPress={() => setShowThemeOptions(!showThemeOptions)}
            colors={colors}
          />
          {showThemeOptions && (
            <View style={[styles.themeOptions, { borderTopColor: colors.separator }]}>
              {(['light', 'dark', 'system'] as ThemeMode[]).map((themeMode) => (
                <TouchableOpacity
                  key={themeMode}
                  style={[
                    styles.themeOption,
                    mode === themeMode && { backgroundColor: colors.primary + '15' }
                  ]}
                  onPress={() => selectThemeMode(themeMode)}
                >
                  <Feather
                    name={
                      themeMode === 'light' ? 'sun' : 
                      themeMode === 'dark' ? 'moon' : 'smartphone'
                    }
                    size={18}
                    color={mode === themeMode ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[
                    styles.themeOptionText,
                    { color: mode === themeMode ? colors.primary : colors.text }
                  ]}>
                    {getThemeModeLabel(themeMode)}
                  </Text>
                  {mode === themeMode && (
                    <Feather name="check" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Section>

        {/* Sección: Soporte */}
        <Section title="SOPORTE">
          <MenuItem
            icon="help-circle"
            label="Ayuda"
            onPress={handleHelp}
            colors={colors}
          />
          <MenuItem
            icon="shield"
            label="Privacidad"
            onPress={handlePrivacy}
            colors={colors}
          />
          <MenuItem
            icon="file-text"
            label="Términos de uso"
            onPress={handleTerms}
            colors={colors}
          />
        </Section>

        {/* Sección: Sesión */}
        <Section title="SESIÓN">
          <MenuItem
            icon="log-out"
            label="Cerrar sesión"
            onPress={handleLogout}
            danger
            showChevron={false}
            colors={colors}
          />
        </Section>

        {/* Footer con versión */}
        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: colors.textTertiary }]}>
            Emotional Journal v1.0.0
          </Text>
          <Text style={[styles.copyrightText, { color: colors.textTertiary }]}>
            Hecho con 💜 para tu bienestar
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
  },
  bioCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
  },
  bioText: {
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemLabel: {
    fontSize: 16,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemValue: {
    fontSize: 15,
  },
  themeOptions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
  },
  themeOptionText: {
    flex: 1,
    fontSize: 15,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 13,
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
  },
});
