// src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';

import { StorageManager } from '../utils/storageManager';
import { useSettings } from '../contexts/SettingsContext';

const ProfileScreen = ({ navigation }) => {
  const { settings, updateSetting } = useSettings();
  const backgroundColorAnim = React.useRef(new Animated.Value(settings.isDarkMode ? 1 : 0)).current;
  const storageManager = new StorageManager();

  useEffect(() => {
    Animated.timing(backgroundColorAnim, {
      toValue: settings.isDarkMode ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [settings.isDarkMode]);

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
              
              // Force navigation to refresh the Library screen
              if (navigation.getParent()) {
                navigation.getParent().navigate('Library', { refresh: true });
              }
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
            color={settings.isDarkMode ? '#ffffff' : '#000000'} 
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
            settings.fontSize === font.value && styles.fontSizeLabelSelected,
            settings.fontSize === font.value && settings.isDarkMode && styles.fontSizeLabelSelectedDark
          ]}>
            A
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const backgroundColorInterpolate = backgroundColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff', '#0f0f0f'],
  });

  return (
    <Animated.View 
      style={[
        styles.container,
        { backgroundColor: backgroundColorInterpolate }
      ]}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
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
                trackColor={{ false: '#e5e5e5', true: '#000000' }}
                thumbColor='#ffffff'
                ios_backgroundColor="#e5e5e5"
              />
            )}

            {renderSettingRow(
              'eye',
              'Bionic Reading',
              <Switch
                value={settings.bionicMode}
                onValueChange={(value) => updateSetting('bionicMode', value)}
                trackColor={{ false: '#e5e5e5', true: '#000000' }}
                thumbColor='#ffffff'
                ios_backgroundColor="#e5e5e5"
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
                color={settings.isDarkMode ? '#9ca3af' : '#6b7280'} 
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: '#000000',
    letterSpacing: -0.3,
    fontFamily: 'System',
  },
  titleDark: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#6b7280',
    marginBottom: 16,
    fontFamily: 'System',
  },
  sectionTitleDark: {
    color: '#9ca3af',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
  },
  settingRowDark: {
    backgroundColor: '#1a1a1a',
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
    backgroundColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconContainerDark: {
    backgroundColor: '#333333',
  },
  settingTitle: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '400',
    fontFamily: 'System',
  },
  settingTitleDark: {
    color: '#ffffff',
  },
  settingRight: {
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '400',
    marginRight: 8,
    fontFamily: 'System',
  },
  settingValueDark: {
    color: '#9ca3af',
  },
  fontSizeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  fontSizeButton: {
    width: 40,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  fontSizeButtonDark: {
    backgroundColor: '#333333',
    borderColor: '#333333',
  },
  fontSizeButtonSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  fontSizeButtonSelectedDark: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  fontSizeLabel: {
    fontWeight: '500',
    color: '#6b7280',
    fontFamily: 'System',
  },
  fontSizeLabelDark: {
    color: '#9ca3af',
  },
  fontSizeLabelSelected: {
    color: '#ffffff',
  },
  fontSizeLabelSelectedDark: {
    color: '#000000',
  },
});

export default ProfileScreen;