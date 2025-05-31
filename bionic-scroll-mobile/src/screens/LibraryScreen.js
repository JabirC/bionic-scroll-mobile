// src/screens/LibraryScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { StorageManager } from '../utils/storageManager';
import { SettingsManager } from '../utils/settingsManager';
import { TextExtractor } from '../utils/textExtractor';
import BookCard from '../components/BookCard';

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
  const textExtractor = new TextExtractor();

  useFocusEffect(
    useCallback(() => {
      loadBooks();
      loadSettings();
    }, [])
  );

  const loadBooks = async () => {
    setIsLoading(true);
    try {
      const library = await storageManager.getLibrary();
      setBooks(library);
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    const userSettings = await settingsManager.getSettings();
    setSettings(userSettings);
    
    // Update navigation theme
    navigation.getParent()?.setOptions({
      tabBarStyle: {
        backgroundColor: userSettings.isDarkMode ? '#1e293b' : '#ffffff',
        borderTopColor: userSettings.isDarkMode ? '#334155' : '#e5e7eb',
        borderTopWidth: 1,
        height: 90,
        paddingBottom: 30,
        paddingTop: 10,
      }
    });
  };

  const handleBookPress = async (book) => {
    try {
      const text = await storageManager.getBookText(book.id);
      navigation.navigate('Reading', { 
        book, 
        text,
        settings 
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
      let extractedText;
      
      if (file.mimeType === 'application/pdf') {
        extractedText = await textExtractor.extractFromPDF(file.uri);
      } else if (file.mimeType === 'application/epub+zip') {
        extractedText = await textExtractor.extractFromEPUB(file.uri);
      } else {
        throw new Error('Unsupported file type');
      }

      if (!extractedText || extractedText.trim().length < 100) {
        throw new Error('No readable text found in the document');
      }
      
      const bookId = await storageManager.saveBook(
        file.uri,
        {
          name: file.name,
          size: file.size,
          type: file.mimeType,
          metadata: {
            uploadedAt: new Date().toISOString(),
            wordCount: extractedText.split(/\s+/).length
          }
        },
        extractedText
      );

      Alert.alert('Success', 'Book uploaded successfully!');
      loadBooks();
    } catch (error) {
      console.error('Error processing file:', error);
      Alert.alert('Error', error.message || 'Failed to process the document');
    }
  };

  const renderBook = ({ item }) => (
    <BookCard
      book={item}
      onPress={() => handleBookPress(item)}
      onDelete={() => handleDeleteBook(item.id)}
      isDarkMode={settings.isDarkMode}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name="book-outline" 
        size={80} 
        color={settings.isDarkMode ? '#475569' : '#9ca3af'} 
      />
      <Text style={[
        styles.emptyTitle, 
        settings.isDarkMode && styles.emptyTitleDark
      ]}>
        No books yet
      </Text>
      <Text style={[
        styles.emptySubtitle,
        settings.isDarkMode && styles.emptySubtitleDark
      ]}>
        Tap the + button to upload your first book
      </Text>
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
      {/* Header */}
      <View style={[styles.header, settings.isDarkMode && styles.headerDark]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, settings.isDarkMode && styles.titleDark]}>
            Library
          </Text>
          <Text style={[styles.subtitle, settings.isDarkMode && styles.subtitleDark]}>
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.addButton, settings.isDarkMode && styles.addButtonDark]}
          onPress={handleUploadPress}
          disabled={isUploading}
          activeOpacity={0.7}
        >
          {isUploading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Ionicons name="add" size={24} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {books.length > 0 ? (
        <FlatList
          data={books}
          renderItem={renderBook}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={loadBooks}
        />
      ) : (
        !isLoading && renderEmptyState()
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#fafafa',
  },
  headerDark: {
    backgroundColor: '#0f172a',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  titleDark: {
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  subtitleDark: {
    color: '#94a3b8',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  list: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 24,
    marginBottom: 8,
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
});

export default LibraryScreen;