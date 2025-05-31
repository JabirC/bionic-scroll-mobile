// src/screens/LibraryScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { StorageManager } from '../utils/storageManager';
import { SettingsManager } from '../utils/settingsManager';
import BookCard from '../components/BookCard';
import UploadButton from '../components/UploadButton';

const LibraryScreen = ({ navigation }) => {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    isDarkMode: false,
    fontSize: 22,
    bionicMode: false,
  });

  const storageManager = new StorageManager();
  const settingsManager = new SettingsManager();

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

  const handleUploadPress = () => {
    navigation.navigate('Upload');
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
        size={64} 
        color={settings.isDarkMode ? '#64748b' : '#9ca3af'} 
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
        Upload your first PDF or EPUB to get started
      </Text>
    </View>
  );

  const containerStyle = [
    styles.container,
    settings.isDarkMode && styles.containerDark
  ];

  return (
    <SafeAreaView style={containerStyle} edges={['top']}>
      <StatusBar 
        style={settings.isDarkMode ? 'light' : 'dark'}
        backgroundColor={settings.isDarkMode ? '#0f172a' : '#ffffff'}
      />
      
      {/* Header */}
      <View style={[styles.header, settings.isDarkMode && styles.headerDark]}>
        <View>
          <Text style={[styles.title, settings.isDarkMode && styles.titleDark]}>
            Library
          </Text>
          <Text style={[styles.subtitle, settings.isDarkMode && styles.subtitleDark]}>
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </Text>
        </View>
        <UploadButton onPress={handleUploadPress} isDarkMode={settings.isDarkMode} />
      </View>

      {/* Book List */}
      {books.length > 0 ? (
        <FlatList
          data={books}
          renderItem={renderBook}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={loadBooks}
              colors={['#2563eb']}
              tintColor={settings.isDarkMode ? '#60a5fa' : '#2563eb'}
            />
          }
          showsVerticalScrollIndicator={false}
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
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  titleDark: {
    color: '#f3f4f6',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  subtitleDark: {
    color: '#94a3b8',
  },
  list: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyTitleDark: {
    color: '#f3f4f6',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptySubtitleDark: {
    color: '#94a3b8',
  },
});

export default LibraryScreen;