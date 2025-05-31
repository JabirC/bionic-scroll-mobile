// src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { SettingsManager } from '../utils/settingsManager';
import { StorageManager } from '../utils/storageManager';

const ProfileScreen = () => {
  const [settings, setSettings] = useState({
    isDarkMode: false,
    fontSize: 22,
    bionicMode: false,
  });

  const settingsManager = new SettingsManager();
  const storageManager = new StorageManager();

  useEffect(() => {
    loadSettings();
  }, []);

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
    { label: 'Small', value: 18 },
    { label: 'Medium', value: 22 },
    { label: 'Large', value: 26 },
    { label: 'Extra Large', value: 30 },
  ];

  const renderSettingRow = (icon, title, content, onPress) => (
    <TouchableOpacity 
      style={[styles.settingRow, settings.isDarkMode && styles.settingRowDark]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <Ionicons 
          name={icon} 
          size={20} 
          color={settings.isDarkMode ? '#94a3b8' : '#6b7280'} 
        />
        <Text style={[styles.settingTitle, settings.isDarkMode && styles.settingTitleDark]}>
          {title}
        </Text>
      </View>
      <View style={styles.settingRight}>
        {content}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView 
      style={[
        styles.container,
        settings.isDarkMode && styles.containerDark
      ]}
      edges={['top']}
    >
      <StatusBar 
        style={settings.isDarkMode ? 'light' : 'dark'}
        backgroundColor={settings.isDarkMode ? '#0f172a' : '#ffffff'}
      />

      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={[styles.header, settings.isDarkMode && styles.headerDark]}>
          <Text style={[styles.title, settings.isDarkMode && styles.titleDark]}>
            Settings
          </Text>
        </View>

        {/* Reading Preferences */}
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
              thumbColor={settings.isDarkMode ? '#ffffff' : '#f3f4f6'}
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
              thumbColor={settings.isDarkMode ? '#ffffff' : '#f3f4f6'}
              ios_backgroundColor="#d1d5db"
            />
          )}

          {renderSettingRow(
            'text',
            'Font Size',
            <Text style={[styles.settingValue, settings.isDarkMode && styles.settingValueDark]}>
              {fontSizes.find(f => f.value === settings.fontSize)?.label || 'Medium'}
            </Text>,
            () => {
              Alert.alert(
                'Font Size',
                'Choose your preferred font size',
                fontSizes.map(font => ({
                  text: font.label,
                  onPress: () => updateSetting('fontSize', font.value),
                }))
              );
            }
          )}
        </View>

        {/* Library Management */}
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

        {/* App Info */}
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

          {renderSettingRow(
            'flash',
            'Read Faster',
            <Text style={[styles.settingValue, settings.isDarkMode && styles.settingValueDark]}>
              Mobile App
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerDark: {
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  titleDark: {
    color: '#f3f4f6',
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  sectionTitleDark: {
    color: '#e5e7eb',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingRowDark: {
    borderBottomColor: '#1e293b',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
    fontWeight: '500',
  },
  settingTitleDark: {
    color: '#f3f4f6',
  },
  settingRight: {
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  settingValueDark: {
    color: '#94a3b8',
  },
});

export default ProfileScreen;