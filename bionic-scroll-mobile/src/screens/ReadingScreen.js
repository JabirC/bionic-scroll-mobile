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
import { useFocusEffect } from '@react-navigation/native';
import { WebView } from 'react-native-webview';

import TextRenderer from '../components/TextRenderer';
import { TextProcessor } from '../utils/textProcessor';
import { StorageManager } from '../utils/storageManager';
import { SettingsManager } from '../utils/settingsManager';

const { height: screenHeight } = Dimensions.get('window');

const ReadingScreen = ({ navigation, route }) => {
  const { book, bookData } = route.params;
  
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [isPageMode, setIsPageMode] = useState(false);
  const [isOriginalReader, setIsOriginalReader] = useState(false);
  const [settings, setSettings] = useState({
    isDarkMode: false,
    fontSize: 22,
    bionicMode: false,
    useOriginalReader: false,
  });

  const textProcessor = useRef(new TextProcessor()).current;
  const storageManager = useRef(new StorageManager()).current;
  const settingsManager = useRef(new SettingsManager()).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const uiOpacity = useRef(new Animated.Value(1)).current;
  const lastScrollTime = useRef(Date.now());

  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
      
      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({
          tabBarStyle: { display: 'none' }
        });
      }

      return () => {
        const parent = navigation.getParent();
        if (parent) {
          parent.setOptions({
            tabBarStyle: undefined
          });
        }
      };
    }, [navigation])
  );

  const loadSettings = async () => {
    const userSettings = await settingsManager.getSettings();
    setSettings(userSettings);
    
    // Determine reading mode
    const useOriginal = userSettings.useOriginalReader || bookData.extractionFailed;
    setIsOriginalReader(useOriginal);
    
    if (useOriginal && bookData.originalPages) {
      setSections(bookData.originalPages);
      setIsPageMode(true);
    } else if (sections.length > 0 && !useOriginal) {
      textProcessor.setFontSize(userSettings.fontSize || 22);
      const rawSections = textProcessor.splitTextIntoScreenSections(bookData.text);
      const processedSections = rawSections.map(section => 
        textProcessor.processSection(section, userSettings.bionicMode || false)
      );
      setSections(processedSections);
      setIsPageMode(false);
    }
  };

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

  const initializeSections = async () => {
    const userSettings = await settingsManager.getSettings();
    setSettings(userSettings);

    const useOriginal = userSettings.useOriginalReader || bookData.extractionFailed;
    setIsOriginalReader(useOriginal);

    if (useOriginal) {
      setIsPageMode(true);
      if (bookData.originalPages && bookData.originalPages.length > 0) {
        setSections(bookData.originalPages);
      } else {
        Alert.alert('Error', 'Unable to display this book in original format');
        navigation.goBack();
      }
      return;
    }

    if (!bookData.text) {
      Alert.alert('Error', 'No content available');
      navigation.goBack();
      return;
    }

    textProcessor.setFontSize(userSettings.fontSize || 22);
    const rawSections = textProcessor.splitTextIntoScreenSections(bookData.text);
    const processedSections = rawSections.map(section => 
      textProcessor.processSection(section, userSettings.bionicMode || false)
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
      duration: 200,
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
      tension: 150,
      friction: 8,
    }).start();
  };

  const navigateToSection = (newIndex, direction) => {
    setIsTransitioning(true);
    
    const slideDistance = direction === 'next' ? -screenHeight : screenHeight;
    
    Animated.timing(translateY, {
      toValue: slideDistance,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrentSectionIndex(newIndex);
      translateY.setValue(direction === 'next' ? screenHeight : -screenHeight);
      
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setIsTransitioning(false);
      });
    });
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const renderOriginalContent = (section) => {
    if (section.type === 'html') {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 20px;
              background-color: ${settings.isDarkMode ? '#0f172a' : '#ffffff'};
              color: ${settings.isDarkMode ? '#f3f4f6' : '#111827'};
              font-size: ${settings.fontSize}px;
            }
            img { max-width: 100%; height: auto; }
            a { color: ${settings.isDarkMode ? '#60a5fa' : '#2563eb'}; }
          </style>
        </head>
        <body>
          ${section.content}
        </body>
        </html>
      `;

      return (
        <WebView
          source={{ html: htmlContent }}
          style={styles.originalWebView}
          startInLoadingState={true}
          scalesPageToFit={false}
        />
      );
    } else if (section.type === 'pdf') {
      return (
        <View style={styles.pageContainer}>
          <Text style={[
            styles.pageMessage, 
            settings.isDarkMode && styles.pageMessageDark
          ]}>
            PDF Viewer
          </Text>
          <Text style={[
            styles.pageNote,
            settings.isDarkMode && styles.pageNoteDark
          ]}>
            PDF viewing in original format coming soon! For now, you can view the document page by page.
          </Text>
        </View>
      );
    }

    return null;
  };

  const currentSection = sections[currentSectionIndex];
  const progress = sections.length > 0 ? ((currentSectionIndex + 1) / sections.length) * 100 : 0;

  return (
    <View style={[styles.container, settings.isDarkMode && styles.containerDark]}>
      <StatusBar hidden />
      
      <View style={[styles.progressBar, settings.isDarkMode && styles.progressBarDark]}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <SafeAreaView edges={['top']} style={styles.closeButtonContainer}>
        <Animated.View style={[styles.closeButtonWrapper, { opacity: uiOpacity }]}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleBackPress}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="close" 
              size={24} 
              color={settings.isDarkMode ? '#f8fafc' : '#1f2937'} 
            />
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>

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
              {currentSection && isOriginalReader ? (
                renderOriginalContent(currentSection)
              ) : currentSection && !isPageMode ? (
                <TextRenderer
                  section={currentSection}
                  settings={settings}
                  isDarkMode={settings.isDarkMode}
                />
              ) : currentSection ? (
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
                    This document is displayed in its original format.
                  </Text>
                  <Text style={[
                    styles.pageCounter,
                    settings.isDarkMode && styles.pageCounterDark
                  ]}>
                    Page {currentSectionIndex + 1} of {sections.length}
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          </PanGestureHandler>
        </View>
      </TouchableWithoutFeedback>

      <Animated.View style={[
        styles.sectionCounter,
        { opacity: uiOpacity }
      ]}>
        <Text style={[
          styles.sectionText, 
          settings.isDarkMode && styles.sectionTextDark
        ]}>
          {currentSectionIndex + 1} of {sections.length}
        </Text>
      </Animated.View>
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
  closeButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1000,
  },
  closeButtonWrapper: {
    paddingTop: 8,
    paddingRight: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 120,
    paddingHorizontal: 28,
  },
  originalWebView: {
    flex: 1,
    backgroundColor: 'transparent',
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
  sectionCounter: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  sectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  sectionTextDark: {
    color: '#94a3b8',
  },
});

export default ReadingScreen;