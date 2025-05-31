// src/screens/UploadScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { StorageManager } from '../utils/storageManager';
import { SettingsManager } from '../utils/settingsManager';

const UploadScreen = ({ navigation }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const storageManager = new StorageManager();
  const settingsManager = new SettingsManager();

  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await settingsManager.getSettings();
    setIsDarkMode(settings.isDarkMode);
  };

  const handleDocumentPicker = async () => {
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
      // For demo purposes, we'll create sample text
      // In a real app, you'd need to implement PDF/EPUB text extraction
      const sampleText = await generateSampleText(file.name);
      
      const bookId = await storageManager.saveBook(
        file.uri,
        {
          name: file.name,
          size: file.size,
          type: file.mimeType,
          metadata: {
            uploadedAt: new Date().toISOString()
          }
        },
        sampleText
      );

      Alert.alert(
        'Success',
        'Book uploaded successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error processing file:', error);
      Alert.alert('Error', 'Failed to process the document');
    }
  };

  const generateSampleText = async (fileName) => {
    // This is a placeholder. In a real app, you'd implement actual PDF/EPUB parsing
    return `Sample text content for ${fileName}

This is a demonstration of the Read Faster mobile app. In a production version, this would contain the actual extracted text from your PDF or EPUB file.

The app supports:
- TikTok-style scrolling through sections
- Bionic reading mode for enhanced focus
- Dark and light themes
- Adjustable font sizes
- Reading progress tracking
- Persistent storage on your device

Each section is optimally sized to fit your screen and reading preferences. You can swipe up and down to navigate between sections, just like social media apps you're familiar with.

The bionic reading feature highlights the beginning of each word to help your brain process text more quickly. This can significantly improve reading speed and comprehension for many users.

Your reading progress is automatically saved, so you can pick up where you left off whenever you return to a book.

This sample demonstrates how the text would be broken into readable sections for optimal mobile reading experience.`;
  };

  return (
    <SafeAreaView 
      style={[
        styles.container,
        isDarkMode && styles.containerDark
      ]}
    >
      <StatusBar 
        style={isDarkMode ? 'light' : 'dark'}
      />

      <View style={styles.content}>
        <View style={styles.uploadArea}>
          <Ionicons 
            name="cloud-upload-outline" 
            size={64} 
            color={isDarkMode ? '#64748b' : '#9ca3af'} 
          />
          
          <Text style={[
            styles.title,
            isDarkMode && styles.titleDark
          ]}>
            Upload Document
          </Text>
          
          <Text style={[
            styles.subtitle,
            isDarkMode && styles.subtitleDark
          ]}>
            Select a PDF or EPUB file to add to your library
          </Text>

          <TouchableOpacity
            style={[
              styles.uploadButton,
              isUploading && styles.uploadButtonDisabled
            ]}
            onPress={handleDocumentPicker}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Ionicons name="folder-open-outline" size={24} color="#ffffff" />
            )}
            <Text style={styles.uploadButtonText}>
              {isUploading ? 'Processing...' : 'Select File'}
            </Text>
          </TouchableOpacity>

          <View style={styles.supportedFormats}>
            <Text style={[
              styles.formatsText,
              isDarkMode && styles.formatsTextDark
            ]}>
              Supported formats: PDF, EPUB
            </Text>
            <Text style={[
              styles.formatsText,
              isDarkMode && styles.formatsTextDark
            ]}>
              Max file size: 50MB
            </Text>
          </View>
        </View>
      </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  uploadArea: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  titleDark: {
    color: '#f3f4f6',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  subtitleDark: {
    color: '#94a3b8',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    minWidth: 200,
    justifyContent: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  supportedFormats: {
    alignItems: 'center',
  },
  formatsText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
  },
  formatsTextDark: {
    color: '#64748b',
  },
});

export default UploadScreen;