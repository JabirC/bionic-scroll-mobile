// src/screens/LibraryScreen.js
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  const { settings } = useSettings();
  const backgroundColorAnim = useRef(new Animated.Value(0)).current;
  const storageManager = useRef(new StorageManager()).current;
  const pdfExtractor = useRef(new PDFExtractor()).current;
  const epubExtractor = useRef(new EPUBExtractor()).current;
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Force refresh when screen comes into focus
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
  }, [settings.isDarkMode, backgroundColorAnim]);

  const loadBooksAndCategories = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const [library, userCategories] = await Promise.all([
        storageManager.getLibrary(),
        storageManager.getCategories()
      ]);
      
      if (!isMountedRef.current) return;
      
      // Sort books by date
      const sortedBooks = library.sort((a, b) => 
        new Date(b.lastRead || b.dateAdded) - new Date(a.lastRead || a.dateAdded)
      );
      
      // Auto-delete empty categories (except Recent)
      const categoriesToDelete = [];
      const filteredCategories = userCategories.filter(category => {
        const hasBooks = library.some(book => book.categoryId === category.id);
        if (!hasBooks && category.name !== 'Recent') {
          categoriesToDelete.push(category.id);
          return false;
        }
        return true;
      });
      
      // Delete empty categories in background
      if (categoriesToDelete.length > 0) {
        Promise.all(categoriesToDelete.map(id => storageManager.deleteCategory(id)));
      }
      
      setBooks(sortedBooks);
      setCategories(filteredCategories);
      setHasInitiallyLoaded(true);
      
    } catch (error) {
      console.error('Error loading data:', error);
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to load library data');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [storageManager]);

  const handleBookPress = useCallback(async (book) => {
    if (uploadingBooks.has(book.id)) {
      return;
    }

    try {
      const bookData = await storageManager.getBookContent(book.id);
      
      if (book.isNewlyUploaded) {
        await storageManager.markBookAsOpened(book.id);
        // Update local state to remove the new indicator
        setBooks(prevBooks => 
          prevBooks.map(b => 
            b.id === book.id ? { ...b, isNewlyUploaded: false } : b
          )
        );
      }
      
      navigation.navigate('Reading', { 
        book, 
        bookData
      });
    } catch (error) {
      console.error('Error opening book:', error);
      Alert.alert('Error', 'Could not open book');
    }
  }, [navigation, storageManager, uploadingBooks]);

  const handleDeleteBook = useCallback(async (bookId) => {
    try {
      // Delete from storage first
      await storageManager.deleteBook(bookId);
      
      // Update local state
      setBooks(prev => prev.filter(book => book.id !== bookId));
      
      // Check if we need to remove empty categories
      const updatedBooks = books.filter(book => book.id !== bookId);
      const emptyCategories = categories.filter(category => 
        category.name !== 'Recent' && 
        !updatedBooks.some(book => book.categoryId === category.id)
      );
      
      if (emptyCategories.length > 0) {
        setCategories(prev => 
          prev.filter(cat => !emptyCategories.some(empty => empty.id === cat.id))
        );
      }
      
    } catch (error) {
      console.error('Error deleting book:', error);
      Alert.alert('Error', 'Could not remove book');
      // Force refresh to restore consistent state
      loadBooksAndCategories();
    }
  }, [books, categories, storageManager, loadBooksAndCategories]);

  const ensureRecentCategory = useCallback(async () => {
    try {
      // Check if Recent category exists
      let recentCategory = categories.find(cat => cat.name === 'Recent');
      
      if (!recentCategory) {
        const allCategories = await storageManager.getCategories();
        recentCategory = allCategories.find(cat => cat.name === 'Recent');
        
        if (!recentCategory) {
          recentCategory = await storageManager.createCategory('Recent');
          
          if (recentCategory && isMountedRef.current) {
            setCategories(prev => [...prev, recentCategory]);
          }
        }
      }
      
      return recentCategory;
    } catch (error) {
      console.error('Error ensuring Recent category:', error);
      return null;
    }
  }, [categories, storageManager]);

  const handleUploadPress = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/epub+zip'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const tempId = Date.now().toString();
        
        // Ensure Recent category exists before uploading
        const recentCategory = await ensureRecentCategory();
        const categoryId = recentCategory ? recentCategory.id : 'recent';
        
        const tempBook = {
          id: tempId,
          name: file.name,
          type: file.mimeType,
          isUploading: true,
          dateAdded: new Date().toISOString(),
          coverImage: null,
          readingPosition: { percentage: 0 },
          categoryId: categoryId
        };

        setBooks(prev => [tempBook, ...prev]);
        setUploadingBooks(prev => new Map(prev.set(tempId, 0)));

        // Process file on background thread
        setTimeout(() => processFile(file, tempId, categoryId), 100);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  }, [ensureRecentCategory]);

  const processFile = useCallback(async (file, tempId, categoryId) => {
    let progressInterval;
    
    try {
      progressInterval = setInterval(() => {
        if (!isMountedRef.current) {
          clearInterval(progressInterval);
          return;
        }
        
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

      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      if (!isMountedRef.current) return;
      
      setUploadingBooks(prev => {
        const newMap = new Map(prev);
        newMap.set(tempId, 100);
        return newMap;
      });

      const wordCount = extractionResult.text 
        ? extractionResult.text.split(/\s+/).length 
        : 0;
      
      const bookId = await storageManager.saveBook(
        file.uri,
        {
          name: file.name,
          size: file.size,
          type: file.mimeType,
          categoryId: categoryId,
          metadata: {
            uploadedAt: new Date().toISOString(),
            wordCount,
            extractionFailed: extractionResult.extractionFailed,
            originalFormat: extractionResult.originalFormat
          }
        },
        extractionResult
      );

      // Create book object for background processing
      const bookForProcessing = {
        id: bookId,
        name: file.name,
        type: file.mimeType,
      };

      // Start background pre-processing
      setTimeout(() => {
        require('../utils/bookProcessor').bookProcessor.preProcessBook(bookForProcessing, extractionResult);
      }, 500);

      if (!isMountedRef.current) return;

      // Update the UI after successful upload
      setTimeout(() => {
        if (!isMountedRef.current) return;
        
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
                categoryId: categoryId
              }
            : book
        ));
      }, 500);
      
    } catch (error) {
      console.error('Background processing error:', error);
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      if (!isMountedRef.current) return;
      
      setBooks(prev => prev.filter(book => book.id !== tempId));
      setUploadingBooks(prev => {
        const newMap = new Map(prev);
        newMap.delete(tempId);
        return newMap;
      });
      Alert.alert('Upload Failed', error.message || 'Failed to process the document');
    }
  }, [storageManager, pdfExtractor, epubExtractor]);
  
  const handleCreateCategory = useCallback(async (name) => {
    try {
      const newCategory = await storageManager.createCategory(name);
      
      if (!newCategory) {
        throw new Error('Failed to create category');
      }
      
      if (isMountedRef.current) {
        setCategories(prev => [...prev, newCategory]);
      }
      
      return newCategory;
      
    } catch (error) {
      console.error('Error creating category:', error);
      Alert.alert('Error', 'Failed to create collection');
      return null;
    }
  }, [storageManager]);

  const handleBookCategoryChange = useCallback(async (bookId, categoryId) => {
    try {
      // Optimistically update the UI
      const previousBooks = books;
      setBooks(prev => prev.map(book => 
        book.id === bookId 
          ? { ...book, categoryId: categoryId }
          : book
      ));
      
      const success = await storageManager.updateBookCategory(bookId, categoryId);
      
      if (success === false) {
        // Revert on failure
        setBooks(previousBooks);
        throw new Error('Failed to update book category');
      }
      
      // Check if we need to remove empty categories
      const emptyCategories = categories.filter(category => 
        category.name !== 'Recent' && 
        !books.some(book => 
          book.id !== bookId && book.categoryId === category.id
        )
      );
      
      if (emptyCategories.length > 0) {
        setCategories(prev => 
          prev.filter(cat => !emptyCategories.some(empty => empty.id === cat.id))
        );
      }
      
      return true;
      
    } catch (error) {
      console.error('Error moving book:', error);
      Alert.alert('Error', 'Failed to move book');
      return false;
    }
  }, [books, categories, storageManager]);

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Good Night';
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 22) return 'Good Evening';
    return 'Good Night';
  }, []);

  const organizedShelves = useMemo(() => {
    const shelves = [];
    
    // Recent books shelf
    const recentCategory = categories.find(cat => cat.name === 'Recent');
    const recentCategoryId = recentCategory ? recentCategory.id : 'recent';
    
    const recentBooks = books
      .filter(book => book.categoryId === recentCategoryId || book.categoryId === 'recent')
      .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    
    if (recentBooks.length > 0) {
      shelves.push({ 
        id: recentCategoryId,
        title: 'Recent', 
        books: recentBooks,
        isDefault: false
      });
    }

    // Other category shelves
    categories.forEach(category => {
      if (category.name === 'Recent') return;
      
      const categoryBooks = books
        .filter(book => book.categoryId === category.id)
        .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
      
      if (categoryBooks.length > 0) {
        shelves.push({
          id: category.id,
          title: category.name,
          books: categoryBooks,
          isDefault: false
        });
      }
    });

    return shelves;
  }, [books, categories]);

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
                Your Books
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

        <BookShelf
          shelves={organizedShelves}
          uploadingBooks={uploadingBooks}
          onBookPress={handleBookPress}
          onDeleteBook={handleDeleteBook}
          onCreateCategory={handleCreateCategory}
          onBookCategoryChange={handleBookCategoryChange}
          isDarkMode={settings.isDarkMode}
        />
        
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
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});

export default LibraryScreen;