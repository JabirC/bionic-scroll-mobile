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
      
      // Sort books by last read or date added
      const sortedBooks = library.sort((a, b) => 
        new Date(b.lastRead || b.dateAdded) - new Date(a.lastRead || a.dateAdded)
      );
      
      setBooks(sortedBooks);
      
      // Don't auto-delete empty categories - keep all user-created categories
      // Only filter out categories that don't exist anymore
      const validCategories = userCategories.filter(category => 
        category && category.id && category.name
      );
      
      console.log('Setting categories:', validCategories);
      setCategories(validCategories);
    } catch (error) {
      console.error('Error loading data:', error);
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
      Alert.alert('Error', 'Could not open book');
    }
  };

  const handleDeleteBook = async (bookId) => {
    try {
      console.log('Deleting book:', bookId);
      await storageManager.deleteBook(bookId);
      
      // Reload to ensure consistency
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
          categoryId: 'all'
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
      
      const bookId = await storageManager.saveBook(
        file.uri,
        {
          name: file.name,
          size: file.size,
          type: file.mimeType,
          categoryId: 'all',
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
                isNewlyUploaded: true 
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

  const handleCreateCategory = async (name) => {
    try {
      console.log('Creating category:', name);
      
      // Create the category and get the full category object
      const newCategory = await storageManager.createCategory(name);
      
      console.log('Category created:', newCategory);
      
      if (!newCategory || !newCategory.id) {
        throw new Error('Failed to create category - invalid response');
      }
      
      // Immediately add the new category to our local state
      setCategories(prev => [...prev, newCategory]);
      
      // Also reload to ensure consistency
      setTimeout(() => {
        loadBooksAndCategories();
      }, 100);
      
      return newCategory;
    } catch (error) {
      console.error('Error creating category:', error);
      Alert.alert('Error', 'Failed to create collection');
      return null;
    }
  };

  const handleBookCategoryChange = async (bookId, categoryId) => {
    try {
      console.log('Moving book:', bookId, 'to category:', categoryId);
      
      // Update the book's category in storage
      const success = await storageManager.updateBookCategory(bookId, categoryId);
      
      if (success === false) {
        throw new Error('Storage update failed');
      }
      
      console.log('Book category updated in storage');
      
      // Immediately update the local book state
      setBooks(prevBooks => 
        prevBooks.map(book => 
          book.id === bookId 
            ? { ...book, categoryId: categoryId }
            : book
        )
      );
      
      console.log('Local book state updated');
      
      // Reload to ensure consistency
      setTimeout(() => {
        loadBooksAndCategories();
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Error updating book category:', error);
      Alert.alert('Error', 'Failed to move book to collection');
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
    console.log('Organizing shelves with', books.length, 'books and', categories.length, 'categories');
    
    const shelves = [];
    
    // Create "All" shelf with books that have no category or categoryId === 'all'
    const allBooks = books
      .filter(book => !book.categoryId || book.categoryId === 'all')
      .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    
    shelves.push({ 
      id: 'all',
      title: 'All', 
      books: allBooks,
      isDefault: true
    });

    // Create shelves for each category
    categories.forEach(category => {
      console.log('Processing category:', category.name, 'with ID:', category.id);
      
      const categoryBooks = books
        .filter(book => book.categoryId === category.id)
        .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
      
      console.log('Category', category.name, 'has', categoryBooks.length, 'books');
      
      shelves.push({
        id: category.id,
        title: category.name,
        books: categoryBooks,
        isDefault: false
      });
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