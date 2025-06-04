// src/screens/LibraryScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { StorageManager } from '../utils/storageManager';
import { PDFExtractor } from '../utils/pdfExtractor';
import { EPUBExtractor } from '../utils/epubExtractor';
import { useSettings } from '../contexts/SettingsContext';
import BookShelf from '../components/BookShelf';

const LibraryScreen = ({ navigation }) => {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingBooks, setUploadingBooks] = useState(new Map());
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { settings } = useSettings();
  const backgroundColorAnim = useRef(new Animated.Value(0)).current;
  const storageManager = new StorageManager();
  const pdfExtractor = new PDFExtractor();
  const epubExtractor = new EPUBExtractor();

  useFocusEffect(
    useCallback(() => {
      loadBooksAndCategories();
    }, [])
  );

  useEffect(() => {
    Animated.timing(backgroundColorAnim, {
      toValue: settings.isDarkMode ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [settings.isDarkMode]);

  const loadBooksAndCategories = async () => {
    if (isInitialLoad) {
      setIsLoading(true);
    }
    
    try {
      console.log('Loading books and categories...');
      
      const [library, userCategories] = await Promise.all([
        storageManager.getLibrary(),
        storageManager.getCategories()
      ]);
      
      console.log('Loaded library:', library.length, 'books');
      console.log('Loaded categories:', userCategories.length, 'categories');
      
      // Sort books by date
      const sortedBooks = library.sort((a, b) => 
        new Date(b.lastRead || b.dateAdded) - new Date(a.lastRead || a.dateAdded)
      );
      
      // Only auto-delete empty categories if we're not in initial load
      let filteredCategories = userCategories;
      if (!isInitialLoad) {
        filteredCategories = userCategories.filter(category => {
          const hasBooks = library.some(book => book.categoryId === category.id);
          if (!hasBooks) {
            console.log('Auto-deleting empty category:', category.name);
            storageManager.deleteCategory(category.id);
            return false;
          }
          return true;
        });
      }
      
      setBooks(sortedBooks);
      setCategories(filteredCategories);
      
      console.log('State updated - Books:', sortedBooks.length, 'Categories:', filteredCategories.length);
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load library data');
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  };

  const handleBookPress = async (book) => {
    if (uploadingBooks.has(book.id)) {
      return;
    }

    try {
      const bookData = await storageManager.getBookContent(book.id);
      
      if (book.isNewlyUploaded) {
        await storageManager.markBookAsOpened(book.id);
      }
      
      navigation.navigate('Reading', { 
        book, 
        bookData
      });
    } catch (error) {
      console.error('Error opening book:', error);
      Alert.alert('Error', 'Could not open book');
    }
  };

  const handleDeleteBook = async (bookId) => {
    try {
      console.log('Deleting book:', bookId);
      await storageManager.deleteBook(bookId);
      
      // Update local state immediately for better UX
      setBooks(prev => prev.filter(book => book.id !== bookId));
      
      // Then reload everything to ensure consistency
      await loadBooksAndCategories();
      
    } catch (error) {
      console.error('Error deleting book:', error);
      Alert.alert('Error', 'Could not remove book');
    }
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
        const tempId = Date.now().toString();
        
        const tempBook = {
          id: tempId,
          name: file.name,
          type: file.mimeType,
          isUploading: true,
          dateAdded: new Date().toISOString(),
          coverImage: null,
          readingPosition: { percentage: 0 },
          categoryId: 'recent' // Changed from 'all' to 'recent'
        };

        setBooks(prev => [tempBook, ...prev]);
        setUploadingBooks(prev => new Map(prev.set(tempId, 0)));

        // Process file on background thread
        setTimeout(() => processFile(file, tempId), 100);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const processFile = async (file, tempId) => {
    try {
      const progressInterval = setInterval(() => {
        setUploadingBooks(prev => {
          const current = prev.get(tempId) || 0;
          if (current >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          const next = Math.min(current + Math.random() * 20 + 10, 95);
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
      setUploadingBooks(prev => {
        const newMap = new Map(prev);
        newMap.set(tempId, 100);
        return newMap;
      });

      const wordCount = extractionResult.text 
        ? extractionResult.text.split(/\s+/).length 
        : 0;

      // Ensure Recent collection exists before saving book
      await ensureRecentCollectionExists();
      
      const bookId = await storageManager.saveBook(
        file.uri,
        {
          name: file.name,
          size: file.size,
          type: file.mimeType,
          categoryId: 'recent', // Changed from 'all' to 'recent'
          metadata: {
            uploadedAt: new Date().toISOString(),
            wordCount,
            extractionFailed: extractionResult.extractionFailed,
            originalFormat: extractionResult.originalFormat
          }
        },
        extractionResult
      );

      // Update the UI after successful upload
      setTimeout(() => {
        setUploadingBooks(prev => {
          const newMap = new Map(prev);
          newMap.delete(tempId);
          return newMap;
        });

        setBooks(prev => prev.map(book => 
          book.id === tempId 
            ? { 
                ...book, 
                id: bookId, 
                isUploading: false, 
                coverImage: extractionResult.coverImage,
                isNewlyUploaded: true,
                categoryId: 'recent'
              }
            : book
        ));
      }, 500);
      
    } catch (error) {
      console.error('Background processing error:', error);
      setBooks(prev => prev.filter(book => book.id !== tempId));
      setUploadingBooks(prev => {
        const newMap = new Map(prev);
        newMap.delete(tempId);
        return newMap;
      });
      Alert.alert('Upload Failed', error.message || 'Failed to process the document');
    }
  };

  const ensureRecentCollectionExists = async () => {
    try {
      // Check if Recent collection exists
      const categories = await storageManager.getCategories();
      const recentExists = categories.some(cat => cat.id === 'recent');
      
      if (!recentExists) {
        console.log('Creating Recent collection...');
        await storageManager.createRecentCategory();
      }
    } catch (error) {
      console.error('Error ensuring Recent collection:', error);
    }
  };

  const handleCreateCategory = async (name) => {
    try {
      console.log('LibraryScreen: Creating category:', name);
      
      const newCategory = await storageManager.createCategory(name);
      
      if (!newCategory) {
        throw new Error('Failed to create category - no response from storage manager');
      }
      
      console.log('LibraryScreen: Created category:', newCategory);
      
      // Update categories state immediately
      setCategories(prev => [...prev, newCategory]);
      
      // Reload data to ensure consistency
      setTimeout(() => {
        loadBooksAndCategories();
      }, 100);
      
      return newCategory;
      
    } catch (error) {
      console.error('LibraryScreen: Error creating category:', error);
      Alert.alert('Error', 'Failed to create collection');
      return null;
    }
  };

  const handleBookCategoryChange = async (bookId, categoryId) => {
    try {
      console.log('LibraryScreen: Moving book', bookId, 'to category', categoryId);
      
      const success = await storageManager.updateBookCategory(bookId, categoryId);
      
      if (success === false) {
        throw new Error('Storage manager returned false');
      }
      
      console.log('LibraryScreen: Successfully moved book');
      
      // Update books state immediately
      setBooks(prev => prev.map(book => 
        book.id === bookId 
          ? { ...book, categoryId: categoryId }
          : book
      ));
      
      // Reload data to ensure consistency
      setTimeout(() => {
        loadBooksAndCategories();
      }, 100);
      
      return true;
      
    } catch (error) {
      console.error('LibraryScreen: Error moving book:', error);
      Alert.alert('Error', 'Failed to move book');
      return false;
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

  const organizeBooksShelves = () => {
    const shelves = [];
    
    console.log('Organizing shelves with', books.length, 'books and', categories.length, 'categories');
    
    // Recent books shelf (books with categoryId === 'recent')
    const recentBooks = books
      .filter(book => book.categoryId === 'recent')
      .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    
    // Only add Recent shelf if it has books
    if (recentBooks.length > 0) {
      shelves.push({ 
        id: 'recent',
        title: 'Recent', 
        books: recentBooks,
        isDefault: true
      });
    }

    // Category shelves
    categories.forEach(category => {
      // Skip the 'recent' category as we handle it separately
      if (category.id === 'recent') return;
      
      const categoryBooks = books
        .filter(book => book.categoryId === category.id)
        .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
      
      console.log('Category', category.name, 'has', categoryBooks.length, 'books');
      
      // Only add shelf if it has books
      if (categoryBooks.length > 0) {
        shelves.push({
          id: category.id,
          title: category.name,
          books: categoryBooks,
          isDefault: false
        });
      }
    });

    console.log('Created', shelves.length, 'shelves');
    return shelves;
  };

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
                size={40} 
                color={settings.isDarkMode ? '#ffffff' : '#000000'} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {books.length > 0 || categories.length > 0 ? (
          <BookShelf
            shelves={organizeBooksShelves()}
            uploadingBooks={uploadingBooks}
            onBookPress={handleBookPress}
            onDeleteBook={handleDeleteBook}
            onCreateCategory={handleCreateCategory}
            onBookCategoryChange={handleBookCategoryChange}
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
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 40,
    paddingTop: 120,
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