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
  const [isUploading, setIsUploading] = useState(false);
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
      'Delete Book',
      'Are you sure you want to delete this book?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageManager.deleteBook(bookId);
              loadBooks();
            } catch (error) {
              Alert.alert('Error', 'Could not delete book');
            }
          },
        },
      ]
    );
  };

  const handleUploadPress = async () => {
    try {
      setIsUploading(true);

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
    } finally {
      setIsUploading(false);
    }
  };

  const processFile = async (file) => {
    try {
      let extractionResult;
      
      if (file.mimeType === 'application/pdf') {
        extractionResult = await pdfExtractor.extractText(file.uri);
      } else if (file.mimeType === 'application/epub+zip') {
        extractionResult = await epubExtractor.extractText(file.uri);
      } else {
        throw new Error('Unsupported file type');
      }

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

      if (extractionResult.extractionFailed) {
        Alert.alert(
          'Upload Complete',
          extractionResult.message || 'Book uploaded successfully! Text extraction had limitations, but the document is viewable.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Success', 'Book uploaded and processed successfully!');
      }
      
      loadBooks();
    } catch (error) {
      console.error('Error processing file:', error);
      Alert.alert('Error', error.message || 'Failed to process the document');
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={settings.isDarkMode ? ['#1e293b', '#0f172a'] : ['#f8fafc', '#e2e8f0']}
        style={styles.emptyGradient}
      >
        <View style={styles.emptyContent}>
          <Ionicons 
            name="library-outline" 
            size={80} 
            color={settings.isDarkMode ? '#475569' : '#94a3b8'} 
          />
          <Text style={[
            styles.emptyTitle, 
            settings.isDarkMode && styles.emptyTitleDark
          ]}>
            Your Library Awaits
          </Text>
          <Text style={[
            styles.emptySubtitle,
            settings.isDarkMode && styles.emptySubtitleDark
          ]}>
            Add your first book to start your reading journey
          </Text>
          
          <TouchableOpacity
            style={[styles.emptyAddButton, settings.isDarkMode && styles.emptyAddButtonDark]}
            onPress={handleUploadPress}
            disabled={isUploading}
            activeOpacity={0.8}
          >
            {isUploading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="add" size={24} color="#ffffff" />
                <Text style={styles.emptyAddButtonText}>Add Book</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

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
          <View>
            <Text style={[styles.greeting, settings.isDarkMode && styles.greetingDark]}>
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
            </Text>
            <Text style={[styles.title, settings.isDarkMode && styles.titleDark]}>
              Your Library
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.addButton, settings.isDarkMode && styles.addButtonDark]}
            onPress={handleUploadPress}
            disabled={isUploading}
            activeOpacity={0.8}
          >
            {isUploading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Ionicons name="add" size={24} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
        
        {books.length > 0 && (
          <Text style={[styles.bookCount, settings.isDarkMode && styles.bookCountDark]}>
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </Text>
        )}
      </View>

      {books.length > 0 ? (
        <BookShelf
          books={books}
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
            color={settings.isDarkMode ? '#60a5fa' : '#2563eb'} 
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
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
  },
  greetingDark: {
    color: '#94a3b8',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  titleDark: {
    color: '#f8fafc',
  },
  bookCount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  bookCountDark: {
    color: '#9ca3af',
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonDark: {
    backgroundColor: '#1d4ed8',
    shadowColor: '#1d4ed8',
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
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 24,
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
    marginBottom: 32,
  },
  emptySubtitleDark: {
    color: '#94a3b8',
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyAddButtonDark: {
    backgroundColor: '#1d4ed8',
  },
  emptyAddButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LibraryScreen;