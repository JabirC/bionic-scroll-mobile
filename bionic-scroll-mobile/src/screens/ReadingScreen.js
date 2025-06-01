// src/screens/ReadingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import TextRenderer from '../components/TextRenderer';
import { TextProcessor } from '../utils/textProcessor';
import { StorageManager } from '../utils/storageManager';

const { height: screenHeight } = Dimensions.get('window');

const ReadingScreen = ({ navigation, route }) => {
  const { book, bookData, settings } = route.params;
  
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [isPageMode, setIsPageMode] = useState(false);

  const textProcessor = useRef(new TextProcessor()).current;
  const storageManager = useRef(new StorageManager()).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const uiOpacity = useRef(new Animated.Value(1)).current;
  const lastScrollTime = useRef(Date.now());

  // Hide navigation bar on screen focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Hide the tab bar when entering reading screen
      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({
          tabBarStyle: { display: 'none' }
        });
      }
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      // Show the tab bar when leaving reading screen
      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: 'center',
          }
        });
      }
    });

    return () => {
      unsubscribe();
      unsubscribeBlur();
    };
  }, [navigation]);

  useEffect(() => {
    initializeSections();
  }, []);

  useEffect(() => {
    if (sections.length > 0 && !isPageMode) {
      const progress = ((currentSectionIndex + 1) / sections.length) * 100;
      storageManager.updateReadingProgress(book.id, {
        sectionIndex: currentSectionIndex,
        percentage: progress,
        lastRead: new Date().toISOString(),
      });
    }
  }, [currentSectionIndex, sections.length]);

  const initializeSections = () => {
    if (bookData.extractionFailed) {
      // Handle page mode for failed extraction
      setIsPageMode(true);
      if (bookData.pages) {
        setSections(bookData.pages);
      } else {
        Alert.alert('Error', 'Unable to display this book');
        navigation.goBack();
      }
      return;
    }

    if (!bookData.text) {
      Alert.alert('Error', 'No content available');
      navigation.goBack();
      return;
    }

    textProcessor.setFontSize(settings.fontSize || 22);
    const rawSections = textProcessor.splitTextIntoScreenSections(bookData.text);
    const processedSections = rawSections.map(section => 
      textProcessor.processSection(section, settings.bionicMode || false)
    );
    
    setSections(processedSections);
    
    if (book.readingPosition && book.readingPosition.sectionIndex) {
      setCurrentSectionIndex(book.readingPosition.sectionIndex);
    }
  };

  const toggleUI = () => {
    setShowUI(!showUI);
    Animated.timing(uiOpacity, {
      toValue: showUI ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const handleGestureStateChange = ({ nativeEvent }) => {
    const { state, translationY, velocityY } = nativeEvent;
    
    if (state === State.END) {
      const now = Date.now();
      if (now - lastScrollTime.current < 200) {
        resetTranslation();
        return;
      }
      lastScrollTime.current = now;

      if (isTransitioning) {
        resetTranslation();
        return;
      }

      const threshold = 100;
      const shouldNavigate = Math.abs(translationY) > threshold || Math.abs(velocityY) > 500;

      if (shouldNavigate) {
        if (translationY < 0 && currentSectionIndex < sections.length - 1) {
          navigateToSection(currentSectionIndex + 1, 'next');
          return;
        } else if (translationY > 0 && currentSectionIndex > 0) {
          navigateToSection(currentSectionIndex - 1, 'prev');
          return;
        }
      }

      resetTranslation();
    }
  };

  const resetTranslation = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const navigateToSection = (newIndex, direction) => {
    setIsTransitioning(true);
    
    const slideDistance = direction === 'next' ? -screenHeight : screenHeight;
    
    Animated.timing(translateY, {
      toValue: slideDistance,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentSectionIndex(newIndex);
      translateY.setValue(direction === 'next' ? screenHeight : -screenHeight);
      
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsTransitioning(false);
      });
    });
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const currentSection = sections[currentSectionIndex];
  const progress = sections.length > 0 ? ((currentSectionIndex + 1) / sections.length) * 100 : 0;

  return (
    <View style={[styles.container, settings.isDarkMode && styles.containerDark]}>
      <StatusBar hidden />
      
      {/* Progress Bar */}
      <Animated.View 
        style={[
          styles.progressBar, 
          settings.isDarkMode && styles.progressBarDark,
          { opacity: uiOpacity }
        ]}
      >
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </Animated.View>

      {/* Back Button */}
      <SafeAreaView edges={['top']} style={styles.backButtonContainer}>
        <Animated.View style={[styles.backButtonWrapper, { opacity: uiOpacity }]}>
          <TouchableOpacity 
            style={[styles.backButton, settings.isDarkMode && styles.backButtonDark]}
            onPress={handleBackPress}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={settings.isDarkMode ? '#f8fafc' : '#1f2937'} 
            />
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>

      {/* Main Content */}
      <TouchableWithoutFeedback onPress={toggleUI}>
        <View style={styles.contentWrapper}>
          <PanGestureHandler
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handleGestureStateChange}
          >
            <Animated.View 
              style={[
                styles.content,
                { transform: [{ translateY }] }
              ]}
            >
              {currentSection && !isPageMode && (
                <TextRenderer
                  section={currentSection}
                  settings={settings}
                  isDarkMode={settings.isDarkMode}
                />
              )}
              
              {isPageMode && currentSection && (
                <View style={styles.pageContainer}>
                  <Text style={[
                    styles.pageMessage, 
                    settings.isDarkMode && styles.pageMessageDark
                  ]}>
                    Document Viewer
                  </Text>
                  <Text style={[
                    styles.pageNote,
                    settings.isDarkMode && styles.pageNoteDark
                  ]}>
                    This document is displayed in its original format as text extraction was not possible.
                  </Text>
                  <Text style={[
                    styles.pageCounter,
                    settings.isDarkMode && styles.pageCounterDark
                  ]}>
                    Page {currentSectionIndex + 1} of {sections.length}
                  </Text>
                </View>
              )}
            </Animated.View>
          </PanGestureHandler>
        </View>
      </TouchableWithoutFeedback>

      {/* Section Counter */}
      <SafeAreaView edges={['bottom']} style={styles.sectionCounterContainer}>
        <Animated.View style={[
          styles.sectionCounter,
          settings.isDarkMode && styles.sectionCounterDark,
          { opacity: uiOpacity }
        ]}>
          <Text style={[
            styles.sectionText, 
            settings.isDarkMode && styles.sectionTextDark
          ]}>
            {currentSectionIndex + 1} of {sections.length}
          </Text>
          {progress > 0 && !isPageMode && (
            <Text style={[
              styles.progressText,
              settings.isDarkMode && styles.progressTextDark
            ]}>
              {Math.round(progress)}% complete
            </Text>
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
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
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  progressBarDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1000,
  },
  backButtonWrapper: {
    paddingTop: 24,
    paddingLeft: 24,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  backButtonDark: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
  contentWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 140,
    paddingBottom: 120,
    paddingHorizontal: 28,
  },
  pageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  pageMessage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
  },
  pageMessageDark: {
    color: '#e5e7eb',
  },
  pageNote: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  pageNoteDark: {
    color: '#9ca3af',
  },
  pageCounter: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
  },
  pageCounterDark: {
    color: '#60a5fa',
  },
  sectionCounterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    paddingBottom: 40,
  },
  sectionCounter: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionCounterDark: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
  sectionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  sectionTextDark: {
    color: '#e5e7eb',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  progressTextDark: {
    color: '#9ca3af',
  },
});

export default ReadingScreen;