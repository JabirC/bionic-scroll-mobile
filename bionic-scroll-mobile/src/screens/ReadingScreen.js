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
  ScrollView,
  FlatList,
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

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const ReadingScreen = ({ navigation, route }) => {
  const { book, bookData } = route.params;
  
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [isPageMode, setIsPageMode] = useState(false);
  const [showSectionCarousel, setShowSectionCarousel] = useState(false);
  const [settings, setSettings] = useState({
    isDarkMode: false,
    fontSize: 22,
    bionicMode: false,
  });

  const textProcessor = useRef(new TextProcessor()).current;
  const storageManager = useRef(new StorageManager()).current;
  const settingsManager = useRef(new SettingsManager()).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const uiOpacity = useRef(new Animated.Value(1)).current;
  const carouselOpacity = useRef(new Animated.Value(0)).current;
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
    
    const isPDF = book.type === 'application/pdf';
    setIsPageMode(isPDF || bookData.extractionFailed);
    
    if (isPDF && bookData.originalPages) {
      setSections(bookData.originalPages);
    } else if (sections.length > 0 && !isPDF) {
      textProcessor.setFontSize(userSettings.fontSize || 22);
      const rawSections = textProcessor.splitTextIntoScreenSections(bookData.text);
      const processedSections = rawSections.map(section => 
        textProcessor.processSection(section, userSettings.bionicMode || false)
      );
      setSections(processedSections);
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

    const isPDF = book.type === 'application/pdf';
    setIsPageMode(isPDF || bookData.extractionFailed);

    if (isPDF) {
      if (bookData.originalPages && bookData.originalPages.length > 0) {
        setSections(bookData.originalPages);
      } else {
        Alert.alert('Error', 'Unable to display this PDF');
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
    const newShowUI = !showUI;
    setShowUI(newShowUI);
    setShowSectionCarousel(newShowUI);
    
    Animated.parallel([
      Animated.timing(uiOpacity, {
        toValue: newShowUI ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(carouselOpacity, {
        toValue: newShowUI ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };

  const hideSectionCarousel = () => {
    Animated.parallel([
      Animated.timing(uiOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(carouselOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowSectionCarousel(false);
      setShowUI(true);
    });
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
    hideSectionCarousel();
    
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

  const jumpToSection = (index) => {
    setCurrentSectionIndex(index);
    hideSectionCarousel();
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const renderSectionCarousel = () => {
    if (!showSectionCarousel) return null;

    const renderSectionItem = ({ item, index }) => {
      const isCurrentSection = index === currentSectionIndex;
      const sectionContent = isPageMode 
        ? `Page ${index + 1}`
        : item.content.replace(/<[^>]*>/g, '').substring(0, 120) + '...';

      return (
        <TouchableOpacity
          style={[
            styles.pageItem,
            settings.isDarkMode && styles.pageItemDark,
            isCurrentSection && styles.pageItemActive,
          ]}
          onPress={() => jumpToSection(index)}
          activeOpacity={0.7}
        >
          <Text 
            style={[
              styles.pagePreview,
              settings.isDarkMode && styles.pagePreviewDark,
              isCurrentSection && styles.pagePreviewActive,
              isCurrentSection && settings.isDarkMode && styles.pagePreviewActiveDark
            ]}
            numberOfLines={4}
          >
            {sectionContent}
          </Text>
          <Text style={[
            styles.pageNumber,
            settings.isDarkMode && styles.pageNumberDark,
            isCurrentSection && styles.pageNumberActive,
            isCurrentSection && settings.isDarkMode && styles.pageNumberActiveDark
          ]}>
            {index + 1}
          </Text>
        </TouchableOpacity>
      );
    };

    return (
      <Animated.View 
        style={[
          styles.sectionCarouselContainer,
          { opacity: carouselOpacity }
        ]}
      >
        <FlatList
          data={sections}
          renderItem={renderSectionItem}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
          initialScrollIndex={Math.max(0, currentSectionIndex - 1)}
          getItemLayout={(data, index) => ({
            length: 120,
            offset: 130 * index,
            index,
          })}
        />
      </Animated.View>
    );
  };

  const renderPDFContent = (section) => {
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
          Reading PDF in original format. Swipe up and down to navigate between pages.
        </Text>
        <Text style={[
          styles.pageCounter,
          settings.isDarkMode && styles.pageCounterDark
        ]}>
          Page {currentSectionIndex + 1} of {sections.length}
        </Text>
      </View>
    );
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
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons 
              name="close" 
              size={24} 
              color={settings.isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'} 
            />
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>

      <TouchableWithoutFeedback onPress={toggleUI}>
        <View style={styles.contentWrapper}>
          <PanGestureHandler
            onGestureEvent={handleGestureEvent}
            onHandlerStateChange={handleGestureStateChange}
            enabled={!showSectionCarousel}
          >
            <Animated.View 
              style={[
                styles.content,
                { transform: [{ translateY }] }
              ]}
            >
              {currentSection && isPageMode && book.type === 'application/pdf' ? (
                renderPDFContent(currentSection)
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

      {renderSectionCarousel()}

      <SafeAreaView edges={['bottom']} style={styles.sectionCounterContainer}>
        <Animated.View style={[
          styles.sectionCounter,
          { opacity: uiOpacity }
        ]}>
          <Text style={[
            styles.sectionText, 
            settings.isDarkMode && styles.sectionTextDark
          ]}>
            {showUI ? `${currentSectionIndex + 1} of ${sections.length}` : `${currentSectionIndex + 1}`}
          </Text>
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
    backgroundColor: '#1a1a1a',
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
    backgroundColor: '#000000',
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1000,
  },
  closeButtonWrapper: {
    paddingTop: 12,
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
    paddingHorizontal: 16,
  },
  pageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  pageMessage: {
    fontSize: 24,
    fontWeight: '300',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'System',
  },
  pageMessageDark: {
    color: '#ffffff',
  },
  pageNote: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    fontFamily: 'System',
  },
  pageNoteDark: {
    color: '#9ca3af',
  },
  pageCounter: {
    fontSize: 18,
    fontWeight: '400',
    color: '#000000',
    fontFamily: 'System',
  },
  pageCounterDark: {
    color: '#ffffff',
  },
  sectionCounterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  sectionCounter: {
    paddingBottom: 15,
  },
  sectionText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6b7280',
    fontFamily: 'System',
  },
  sectionTextDark: {
    color: '#9ca3af',
  },
  sectionCarouselContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 999,
  },
  carouselContent: {
    paddingHorizontal: 20,
  },
  pageItem: {
    width: 110,
    height: 160,
    marginRight: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  pageItemDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333333',
  },
  pageItemActive: {
    borderColor: '#3b82f6',
  },
  pagePreview: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 14,
    fontFamily: 'System',
    textAlign: 'left',
  },
  pagePreviewDark: {
    color: '#9ca3af',
  },
  pagePreviewActive: {
    color: '#1f2937',
  },
  pagePreviewActiveDark: {
    color: '#f3f4f6',
  },
  pageNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    fontFamily: 'System',
    marginTop: 8,
  },
  pageNumberDark: {
    color: '#ffffff',
  },
  pageNumberActive: {
    color: '#3b82f6',
  },
  pageNumberActiveDark: {
    color: '#3b82f6',
  },
});

export default ReadingScreen;