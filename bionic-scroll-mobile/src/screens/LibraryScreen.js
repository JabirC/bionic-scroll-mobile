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
  const [selectedBook, setSelectedBook] = useState(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

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
      const [library, userCategories] = await Promise.all([
        storageManager.getLibrary(),
        storageManager.getCategories()
      ]);
      
      setBooks(library.sort((a, b) => new Date(b.lastRead || b.dateAdded) - new Date(a.lastRead || a.dateAdded)));
      setCategories(userCategories);
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

    setSelectedBook(null);

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
              setSelectedBook(null);
              loadBooksAndCategories();
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
        setTimeout(() => {
          setUploadingBooks(current => {
            const updatedMap = new Map(current);
            updatedMap.delete(tempId);
            return updatedMap;
          });
        }, 300);
      } else {
        newMap.set(tempId, progress);
      }
      return newMap;
    });
  };

  const handleAddModeToggle = () => {
    setIsAddMode(!isAddMode);
    setSelectedCategory(null);
  };

  const handleAddBookToCategory = async (categoryId) => {
    setSelectedCategory(categoryId);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/epub+zip'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        processFileInBackground(file, categoryId);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const processFileInBackground = async (file, categoryId = 'all') => {
    const tempId = Date.now().toString();
    
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

    setBooks(prev => {
      const newBooks = [tempBook, ...prev];
      return newBooks;
    });
    
    setUploadingBooks(prev => new Map(prev.set(tempId, 0)));

    setTimeout(async () => {
      try {
        await processFile(file, tempId, categoryId);
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
    }, 100);
  };

  const processFile = async (file, tempId, categoryId) => {
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

      setBooks(prev => {
        const newBooks = prev.map(book => 
          book.id === tempId 
            ? { 
                ...book, 
                id: bookId, 
                isUploading: false, 
                coverImage: extractionResult.coverImage,
                isNewlyUploaded: true 
              }
            : book
        );
        return newBooks;
      });
      
    } catch (error) {
      throw error;
    }
  };

  const handleCreateCategory = async (name) => {
    try {
      await storageManager.createCategory(name);
      loadBooksAndCategories();
    } catch (error) {
      Alert.alert('Error', 'Failed to create category');
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
    
    const allBooks = books
      .filter(book => !book.categoryId || book.categoryId === 'all')
      .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    
    if (allBooks.length > 0 || isAddMode) {
      shelves.push({ 
        id: 'all',
        title: 'All', 
        books: allBooks,
        isDefault: true
      });
    }

    categories.forEach(category => {
      const categoryBooks = books
        .filter(book => book.categoryId === category.id)
        .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
      
      if (categoryBooks.length > 0 || isAddMode) {
        shelves.push({
          id: category.id,
          title: category.name,
          books: categoryBooks,
          isDefault: false
        });
      }
    });

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
              style={[
                styles.addButton,
                isAddMode && styles.addButtonActive
              ]}
              onPress={handleAddModeToggle}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isAddMode ? "close" : "add"} 
                size={40} 
                color={settings.isDarkMode ? '#ffffff' : '#000000'} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {books.length > 0 || categories.length > 0 || isAddMode ? (
          <BookShelf
            shelves={organizeBooksShelves()}
            uploadingBooks={uploadingBooks}
            onBookPress={handleBookPress}
            onDeleteBook={handleDeleteBook}
            onCreateCategory={handleCreateCategory}
            onAddBookToCategory={handleAddBookToCategory}
            isDarkMode={settings.isDarkMode}
            selectedBook={selectedBook}
            onBookLongPress={setSelectedBook}
            isAddMode={isAddMode}
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
  addButtonActive: {
    transform: [{ rotate: '45deg' }],
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