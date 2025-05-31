// src/utils/storageManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export class StorageManager {
  constructor() {
    this.libraryKey = 'readFaster_library';
    this.booksDirectory = FileSystem.documentDirectory + 'books/';
  }

  async initializeStorage() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.booksDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.booksDirectory, { intermediates: true });
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  async saveBook(fileUri, fileInfo, extractedText) {
    try {
      await this.initializeStorage();
      
      const bookId = this.generateBookId();
      const fileName = `${bookId}.txt`;
      const filePath = this.booksDirectory + fileName;
      
      // Save extracted text to file
      await FileSystem.writeAsStringAsync(filePath, extractedText, {
        encoding: FileSystem.EncodingType.UTF8
      });
      
      // Save book metadata
      const bookData = {
        id: bookId,
        name: fileInfo.name,
        size: fileInfo.size,
        type: fileInfo.type,
        dateAdded: new Date().toISOString(),
        lastRead: null,
        filePath,
        readingPosition: {
          sectionIndex: 0,
          percentage: 0,
          lastRead: null,
        },
        metadata: fileInfo.metadata || {}
      };
      
      const library = await this.getLibrary();
      library.push(bookData);
      await AsyncStorage.setItem(this.libraryKey, JSON.stringify(library));
      
      return bookId;
    } catch (error) {
      console.error('Error saving book:', error);
      throw new Error('Failed to save book');
    }
  }

  async getLibrary() {
    try {
      const libraryData = await AsyncStorage.getItem(this.libraryKey);
      return libraryData ? JSON.parse(libraryData) : [];
    } catch (error) {
      console.error('Error getting library:', error);
      return [];
    }
  }

  async getBook(bookId) {
    try {
      const library = await this.getLibrary();
      return library.find(book => book.id === bookId);
    } catch (error) {
      console.error('Error getting book:', error);
      return null;
    }
  }

  async getBookText(bookId) {
    try {
      const book = await this.getBook(bookId);
      if (!book || !book.filePath) {
        throw new Error('Book not found');
      }
      
      const text = await FileSystem.readAsStringAsync(book.filePath, {
        encoding: FileSystem.EncodingType.UTF8
      });
      return text;
    } catch (error) {
      console.error('Error reading book text:', error);
      throw new Error('Failed to read book');
    }
  }

  async updateReadingProgress(bookId, progressData) {
    try {
      const library = await this.getLibrary();
      const bookIndex = library.findIndex(book => book.id === bookId);
      
      if (bookIndex !== -1) {
        library[bookIndex].readingPosition = {
          ...library[bookIndex].readingPosition,
          ...progressData
        };
        library[bookIndex].lastRead = new Date().toISOString();
        
        await AsyncStorage.setItem(this.libraryKey, JSON.stringify(library));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating reading progress:', error);
      return false;
    }
  }

  async deleteBook(bookId) {
    try {
      const book = await this.getBook(bookId);
      if (book && book.filePath) {
        // Delete the text file
        const fileInfo = await FileSystem.getInfoAsync(book.filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(book.filePath);
        }
      }
      
      // Remove from library
      const library = await this.getLibrary();
      const filteredLibrary = library.filter(book => book.id !== bookId);
      await AsyncStorage.setItem(this.libraryKey, JSON.stringify(filteredLibrary));
      
      return true;
    } catch (error) {
      console.error('Error deleting book:', error);
      throw new Error('Failed to delete book');
    }
  }

  async clearLibrary() {
    try {
      const library = await this.getLibrary();
      
      // Delete all text files
      for (const book of library) {
        if (book.filePath) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(book.filePath);
            if (fileInfo.exists) {
              await FileSystem.deleteAsync(book.filePath);
            }
          } catch (error) {
            console.warn('Failed to delete file:', book.filePath);
          }
        }
      }
      
      // Clear library data
      await AsyncStorage.removeItem(this.libraryKey);
      
      // Remove books directory and recreate it
      try {
        await FileSystem.deleteAsync(this.booksDirectory, { idempotent: true });
        await FileSystem.makeDirectoryAsync(this.booksDirectory, { intermediates: true });
      } catch (error) {
        console.warn('Error cleaning directory:', error);
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing library:', error);
      throw new Error('Failed to clear library');
    }
  }

  generateBookId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async getStorageUsage() {
    try {
      const library = await this.getLibrary();
      let totalSize = 0;
      
      for (const book of library) {
        if (book.filePath) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(book.filePath);
            if (fileInfo.exists && fileInfo.size) {
              totalSize += fileInfo.size;
            }
          } catch (error) {
            // Continue calculation even if one file fails
          }
        }
      }
      
      return {
        books: library.length,
        sizeBytes: totalSize,
        sizeMB: (totalSize / (1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return { books: 0, sizeBytes: 0, sizeMB: '0.00' };
    }
  }
}