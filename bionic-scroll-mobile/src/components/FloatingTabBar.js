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
import { SettingsManager } from '../utils/settingsManager';

const { width } = Dimensions.get('window');

const FloatingTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const settingsManager = new SettingsManager();

  useEffect(() => {
    loadTheme();
    
    // Listen for focus events to update theme
    const unsubscribe = navigation.addListener('state', () => {
      loadTheme();
    });
    
    return unsubscribe;
  }, [navigation]);

  const loadTheme = async () => {
    const settings = await settingsManager.getSettings();
    setIsDarkMode(settings.isDarkMode);
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 15) }]}>
      <Animated.View style={[
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
                return isFocused ? 'library' : 'library-outline';
              case 'Settings':
                return isFocused ? 'settings' : 'settings-outline';
              default:
                return 'circle';
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              onPress={onPress}
              style={[
                styles.tab,
                isFocused && styles.tabFocused,
                isFocused && isDarkMode && styles.tabFocusedDark
              ]}
            >
              <Ionicons
                name={getIconName()}
                size={22}
                color={
                  isFocused 
                    ? '#ffffff' 
                    : isDarkMode 
                      ? '#94a3b8' 
                      : '#6b7280'
                }
              />
            </TouchableOpacity>
          );
        })}
      </Animated.View>
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    backdropFilter: 'blur(10px)',
  },
  tabContainerDark: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 18,
    marginHorizontal: 4,
    minWidth: 50,
  },
  tabFocused: {
    backgroundColor: '#2563eb',
  },
  tabFocusedDark: {
    backgroundColor: '#1e40af',
  },
});

export default FloatingTabBar;