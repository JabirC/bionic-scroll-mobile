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
      return;
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
      let extractionResult;
      
      if (file.mimeType === 'application/pdf') {
        extractionResult = await pdfExtractor.extractText(file.uri);
      } else if (file.mimeType === 'application/epub+zip') {
        extractionResult = await epubExtractor.extractText(file.uri);
      } else {
        throw new Error('Unsupported file type');
      }

      const tempBook = {
        id: tempId,
        name: file.name,
        type: file.mimeType,
        isUploading: true,
        dateAdded: new Date().toISOString(),
        coverImage: extractionResult.coverImage,
        readingPosition: { percentage: 0 }
      };

      setBooks(prev => [tempBook, ...prev]);
      setUploadingBooks(prev => new Map(prev.set(tempId, 0)));

      const progressInterval = setInterval(() => {
        setUploadingBooks(prev => {
          const current = prev.get(tempId) || 0;
          const next = Math.min(current + Math.random() * 15 + 5, 95);
          const newMap = new Map(prev);
          newMap.set(tempId, next);
          return newMap;
        });
      }, 200);

      setTimeout(() => {
        clearInterval(progressInterval);
        updateUploadProgress(tempId, 100);
      }, 2000);

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

      setTimeout(() => {
        setBooks(prev => prev.filter(book => book.id !== tempId));
        loadBooks();
      }, 500);
      
    } catch (error) {
      console.error('Error processing file:', error);
      
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
      <Text style={[
        styles.emptyMessage, 
        settings.isDarkMode && styles.emptyMessageDark
      ]}>
        Upload your first book to begin
      </Text>
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
              {books.length > 0 ? `${books.length} ${books.length === 1 ? 'Book' : 'Books'}` : 'Your Books'}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleUploadPress}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="add" 
              size={24} 
              color={settings.isDarkMode ? '#ffffff' : '#000000'} 
            />
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
            color={settings.isDarkMode ? '#ffffff' : '#000000'} 
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
    backgroundColor: '#000000',
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
    fontWeight: '400',
    color: '#6b7280',
    marginBottom: 4,
    fontFamily: 'System',
  },
  greetingDark: {
    color: '#9ca3af',
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#000000',
    letterSpacing: -0.5,
    fontFamily: 'System',
  },
  titleDark: {
    color: '#ffffff',
  },
  addButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyMessage: {
    fontSize: 18,
    fontWeight: '300',
    color: '#6b7280',
    textAlign: 'center',
    fontFamily: 'System',
  },
  emptyMessageDark: {
    color: '#9ca3af',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LibraryScreen;