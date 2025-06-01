// src/components/FloatingTabBar.js
import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { SettingsManager } from '../utils/settingsManager';

const { width } = Dimensions.get('window');

const FloatingTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const settingsManager = new SettingsManager();

  useFocusEffect(
    React.useCallback(() => {
      loadTheme();
      
      // Set up listener for settings changes
      const interval = setInterval(loadTheme, 100);
      
      return () => {
        clearInterval(interval);
      };
    }, [])
  );

  const loadTheme = async () => {
    const settings = await settingsManager.getSettings();
    setIsDarkMode(settings.isDarkMode);
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) + 15 }]}>
      <View style={[
        styles.tabContainer,
        isDarkMode && styles.tabContainerDark
      ]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const getIconName = () => {
            switch (route.name) {
              case 'Library':
                return 'book';
              case 'Settings':
                return 'settings-sharp';
              default:
                return 'circle';
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.6}
              onPress={onPress}
              style={[
                styles.tab,
                isFocused && [
                  styles.tabFocused,
                  isDarkMode ? styles.tabFocusedDark : styles.tabFocusedLight
                ]
              ]}
            >
              <Ionicons
                name={getIconName()}
                size={isFocused ? 24 : 22}
                color={
                  isFocused 
                    ? '#ffffff'
                    : isDarkMode 
                      ? '#64748b' 
                      : '#9ca3af'
                }
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabContainerDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(71, 85, 105, 0.2)',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 60,
    marginHorizontal: 2,
  },
  tabFocused: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabFocusedLight: {
    backgroundColor: '#2563eb',
  },
  tabFocusedDark: {
    backgroundColor: '#1e40af',
  },
});

export default FloatingTabBar;