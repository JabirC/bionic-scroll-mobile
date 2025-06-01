// src/screens/LibraryScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { StorageManager } from '../utils/storageManager';
import { SettingsManager } from '../utils/settingsManager';
import { PDFExtractor } from '../utils/pdfExtractor';
import { EPUBExtractor } from '../utils/epubExtractor';
import BookShelf from '../components/BookShelf';

const LibraryScreen = ({ navigation }) => {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingBooks, setUploadingBooks] = useState(new Map());
  const [settings, setSettings] = useState({
    isDarkMode: false,
    fontSize: 22,
    bionicMode: false,
  });

  const storageManager = new StorageManager();
  const settingsManager = new SettingsManager();
  const pdfExtractor = new PDFExtractor();
  const epubExtractor = new EPUBExtractor();

  useFocusEffect(
    useCallback(() => {
      loadBooks();
      loadSettings();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener('focus', () => {
        loadSettings();
      });
      return unsubscribe;
    }, [navigation])
  );

  const loadBooks = async () => {
    setIsLoading(true);
    try {
      const library = await storageManager.getLibrary();
      setBooks(library.sort((a, b) => new Date(b.lastRead || b.dateAdded) - new Date(a.lastRead || a.dateAdded)));
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    const userSettings = await settingsManager.getSettings();
    setSettings(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(userSettings)) {
        return userSettings;
      }
      return prev;
    });
  };

  const handleBookPress = async (book) => {
    if (uploadingBooks.has(book.id)) {
      return; // Prevent opening while uploading
    }

    try {
      const bookData = await storageManager.getBookContent(book.id);
      navigation.navigate('Reading', { 
        book, 
        bookData
      });
    } catch (error) {
      Alert.alert('Error', 'Could not open book');
    }
  };

  const handleDeleteBook = async (bookId) => {
    Alert.alert(
      'Remove Book',
      'Are you sure you want to remove this book from your library?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageManager.deleteBook(bookId);
              loadBooks();
            } catch (error) {
              Alert.alert('Error', 'Could not remove book');
            }
          },
        },
      ]
    );
  };

  const updateUploadProgress = (tempId, progress) => {
    setUploadingBooks(prev => {
      const newMap = new Map(prev);
      if (progress >= 100) {
        newMap.delete(tempId);
      } else {
        newMap.set(tempId, progress);
      }
      return newMap;
    });
  };

  const handleUploadPress = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/epub+zip'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        await processFile(file);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const processFile = async (file) => {
    const tempId = Date.now().toString();
    
    try {
      // Create temporary book entry for upload progress
      const tempBook = {
        id: tempId,
        name: file.name,
        type: file.mimeType,
        isUploading: true,
        dateAdded: new Date().toISOString(),
        coverImage: null,
        readingPosition: { percentage: 0 }
      };

      setBooks(prev => [tempBook, ...prev]);
      setUploadingBooks(prev => new Map(prev.set(tempId, 0)));

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadingBooks(prev => {
          const current = prev.get(tempId) || 0;
          const next = Math.min(current + Math.random() * 20, 90);
          const newMap = new Map(prev);
          newMap.set(tempId, next);
          return newMap;
        });
      }, 300);

      let extractionResult;
      
      if (file.mimeType === 'application/pdf') {
        extractionResult = await pdfExtractor.extractText(file.uri);
      } else if (file.mimeType === 'application/epub+zip') {
        extractionResult = await epubExtractor.extractText(file.uri);
      } else {
        throw new Error('Unsupported file type');
      }

      clearInterval(progressInterval);
      updateUploadProgress(tempId, 100);

      const wordCount = extractionResult.text 
        ? extractionResult.text.split(/\s+/).length 
        : 0;
      
      const bookId = await storageManager.saveBook(
        file.uri,
        {
          name: file.name,
          size: file.size,
          type: file.mimeType,
          metadata: {
            uploadedAt: new Date().toISOString(),
            wordCount,
            extractionFailed: extractionResult.extractionFailed,
            originalFormat: extractionResult.originalFormat
          }
        },
        extractionResult
      );

      // Remove temp book and reload library
      setTimeout(() => {
        setBooks(prev => prev.filter(book => book.id !== tempId));
        loadBooks();
      }, 500);
      
    } catch (error) {
      console.error('Error processing file:', error);
      
      // Remove temp book on error
      setBooks(prev => prev.filter(book => book.id !== tempId));
      setUploadingBooks(prev => {
        const newMap = new Map(prev);
        newMap.delete(tempId);
        return newMap;
      });
      
      Alert.alert('Upload Failed', error.message || 'Failed to process the document');
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={settings.isDarkMode ? ['#1e293b', '#0f172a'] : ['#f8fafc', '#e2e8f0']}
        style={styles.emptyGradient}
      >
        <View style={styles.emptyContent}>
          <View style={[styles.emptyIcon, settings.isDarkMode && styles.emptyIconDark]}>
            <Ionicons 
              name="book" 
              size={32} 
              color={settings.isDarkMode ? '#60a5fa' : '#2563eb'} 
            />
          </View>
          <Text style={[
            styles.emptyTitle, 
            settings.isDarkMode && styles.emptyTitleDark
          ]}>
            Start Your Reading Journey
          </Text>
          <Text style={[
            styles.emptySubtitle,
            settings.isDarkMode && styles.emptySubtitleDark
          ]}>
            Upload your first book to begin reading with our enhanced experience
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Good Night';
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  return (
    <SafeAreaView 
      style={[
        styles.container,
        settings.isDarkMode && styles.containerDark
      ]} 
      edges={['top']}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={[styles.greeting, settings.isDarkMode && styles.greetingDark]}>
              {getGreeting()}
            </Text>
            <Text style={[styles.title, settings.isDarkMode && styles.titleDark]}>
              {books.length > 0 ? `${books.length} Books` : 'Library'}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.addButton, settings.isDarkMode && styles.addButtonDark]}
            onPress={handleUploadPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={settings.isDarkMode ? ['#1d4ed8', '#2563eb'] : ['#2563eb', '#1d4ed8']}
              style={styles.addButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {books.length > 0 ? (
        <BookShelf
          books={books}
          uploadingBooks={uploadingBooks}
          onBookPress={handleBookPress}
          onDeleteBook={handleDeleteBook}
          isDarkMode={settings.isDarkMode}
        />
      ) : (
        !isLoading && renderEmptyState()
      )}
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="large" 
            color={settings.isDarkMode ? '#60a5fa'  : '#2563eb'} 
          />
        </View>
      )}
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
  },
  greetingDark: {
    color: '#94a3b8',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: -0.3,
  },
  titleDark: {
    color: '#f8fafc',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  addButtonDark: {
    shadowColor: '#1d4ed8',
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
  },
  emptyGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIconDark: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyTitleDark: {
    color: '#f1f5f9',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptySubtitleDark: {
    color: '#94a3b8',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LibraryScreen;