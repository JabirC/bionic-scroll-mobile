// src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';

import { SettingsManager } from '../utils/settingsManager';
import { StorageManager } from '../utils/storageManager';

const ProfileScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    isDarkMode: false,
    fontSize: 22,
    bionicMode: false,
    useOriginalReader: false,
  });

  const settingsManager = new SettingsManager();
  const storageManager = new StorageManager();

  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    const userSettings = await settingsManager.getSettings();
    setSettings(userSettings);
  };

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await settingsManager.saveSetting(key, value);
  };

  const handleClearLibrary = () => {
    Alert.alert(
      'Clear Library',
      'Are you sure you want to delete all books? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageManager.clearLibrary();
              Alert.alert('Success', 'Library cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear library');
            }
          },
        },
      ]
    );
  };

  const fontSizes = [
    { label: 'S', value: 18, size: 16 },
    { label: 'M', value: 22, size: 20 },
    { label: 'L', value: 26, size: 24 },
  ];

  const renderSettingRow = (icon, title, content, onPress) => (
    <TouchableOpacity 
      style={[styles.settingRow, settings.isDarkMode && styles.settingRowDark]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, settings.isDarkMode && styles.iconContainerDark]}>
          <Ionicons 
            name={icon} 
            size={20} 
            color={settings.isDarkMode ? '#60a5fa' : '#2563eb'} 
          />
        </View>
        <Text style={[styles.settingTitle, settings.isDarkMode && styles.settingTitleDark]}>
          {title}
        </Text>
      </View>
      <View style={styles.settingRight}>
        {content}
      </View>
    </TouchableOpacity>
  );

  const renderFontSizeSelector = () => (
    <View style={styles.fontSizeContainer}>
      {fontSizes.map(font => (
        <TouchableOpacity 
          key={font.value}
          style={[
            styles.fontSizeButton,
            settings.isDarkMode && styles.fontSizeButtonDark,
            settings.fontSize === font.value && styles.fontSizeButtonSelected,
            settings.fontSize === font.value && settings.isDarkMode && styles.fontSizeButtonSelectedDark
          ]}
          onPress={() => updateSetting('fontSize', font.value)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.fontSizeLabel,
            { fontSize: font.size },
            settings.isDarkMode && styles.fontSizeLabelDark,
            settings.fontSize === font.value && styles.fontSizeLabelSelected
          ]}>
            A
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView 
      style={[styles.container, settings.isDarkMode && styles.containerDark]}
      edges={['top']}
    >
      <View style={[styles.header, settings.isDarkMode && styles.headerDark]}>
        <Text style={[styles.title, settings.isDarkMode && styles.titleDark]}>
          Settings
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, settings.isDarkMode && styles.sectionTitleDark]}>
            Reading Preferences
          </Text>

          {renderSettingRow(
            'moon',
            'Dark Mode',
            <Switch
              value={settings.isDarkMode}
              onValueChange={(value) => updateSetting('isDarkMode', value)}
              trackColor={{ false: '#d1d5db', true: '#2563eb' }}
              thumbColor='#ffffff'
              ios_backgroundColor="#d1d5db"
            />
          )}

          {renderSettingRow(
            'eye',
            'Bionic Reading',
            <Switch
              value={settings.bionicMode}
              onValueChange={(value) => updateSetting('bionicMode', value)}
              trackColor={{ false: '#d1d5db', true: '#2563eb' }}
              thumbColor='#ffffff'
              ios_backgroundColor="#d1d5db"
            />
          )}

          {renderSettingRow(
            'reader',
            'Original Format Reader',
            <Switch
              value={settings.useOriginalReader}
              onValueChange={(value) => updateSetting('useOriginalReader', value)}
              trackColor={{ false: '#d1d5db', true: '#2563eb' }}
              thumbColor='#ffffff'
              ios_backgroundColor="#d1d5db"
            />
          )}

          {renderSettingRow(
            'text',
            'Font Size',
            renderFontSizeSelector()
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, settings.isDarkMode && styles.sectionTitleDark]}>
            Library
          </Text>

          {renderSettingRow(
            'trash',
            'Clear Library',
            <Ionicons 
              name="chevron-forward" 
              size={16} 
              color={settings.isDarkMode ? '#94a3b8' : '#6b7280'} 
            />,
            handleClearLibrary
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, settings.isDarkMode && styles.sectionTitleDark]}>
            About
          </Text>

          {renderSettingRow(
            'information-circle',
            'Version',
            <Text style={[styles.settingValue, settings.isDarkMode && styles.settingValueDark]}>
              {Constants.expoConfig?.version || '1.0.0'}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#fafafa',
  },
  headerDark: {
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  titleDark: {
    color: '#f8fafc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  sectionTitleDark: {
    color: '#e2e8f0',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingRowDark: {
    backgroundColor: '#1e293b',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconContainerDark: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  settingTitle: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  settingTitleDark: {
    color: '#f1f5f9',
  },
  settingRight: {
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginRight: 8,
  },
  settingValueDark: {
    color: '#94a3b8',
  },
  fontSizeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  fontSizeButton: {
    width: 40,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fontSizeButtonDark: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  fontSizeButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  fontSizeButtonSelectedDark: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  fontSizeLabel: {
    fontWeight: '600',
    color: '#6b7280',
  },
  fontSizeLabelDark: {
    color: '#d1d5db',
  },
  fontSizeLabelSelected: {
    color: '#ffffff',
  },
});

export default ProfileScreen;