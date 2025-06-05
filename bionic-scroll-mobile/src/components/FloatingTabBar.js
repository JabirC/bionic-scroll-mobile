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
import { useSettings } from '../contexts/SettingsContext';

const { width } = Dimensions.get('window');

const FloatingTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const [selectedTab, setSelectedTab] = useState(state.index);
  
  const animatedValues = state.routes.map((_, i) => React.useRef(new Animated.Value(i === state.index ? 1 : 0)).current);

  useEffect(() => {
    // Animate tab selection
    state.routes.forEach((_, i) => {
      Animated.timing(animatedValues[i], {
        toValue: i === state.index ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
    
    setSelectedTab(state.index);
  }, [state.index]);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) + 15 }]}>
      <View style={[
        styles.tabContainer,
        settings.isDarkMode && styles.tabContainerDark
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
                return 'library';
              case 'Settings':
                return 'settings-sharp';
              default:
                return 'circle';
            }
          };
          
          const scale = animatedValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0.85, 1],
            extrapolate: 'clamp',
          });
          
          const opacity = animatedValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0.6, 1],
            extrapolate: 'clamp',
          });

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.6}
              onPress={onPress}
              style={[
                styles.tab,
                isFocused && [
                  styles.tabFocused,
                  settings.isDarkMode ? styles.tabFocusedDark : styles.tabFocusedLight
                ]
              ]}
            >
              <Animated.View style={{
                transform: [{ scale }],
                opacity,
              }}>
                <Ionicons
                  name={getIconName()}
                  size={isFocused ? 24 : 22}
                  color={
                    isFocused 
                      ? (settings.isDarkMode ? '#000000' : '#ffffff')
                      : settings.isDarkMode 
                        ? '#888888' 
                        : '#777777'
                  }
                />
              </Animated.View>
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
    zIndex: 1000,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 15,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    backdropFilter: 'blur(20px)',
  },
  tabContainerDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabFocusedLight: {
    backgroundColor: '#000000',
  },
  tabFocusedDark: {
    backgroundColor: '#ffffff',
  },
});

export default FloatingTabBar;