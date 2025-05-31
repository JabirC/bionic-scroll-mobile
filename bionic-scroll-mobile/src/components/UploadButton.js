// src/components/UploadButton.js
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const UploadButton = ({ onPress, isDarkMode }) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isDarkMode && styles.buttonDark
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name="add"
        size={24}
        color={isDarkMode ? '#f3f4f6' : '#ffffff'}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDark: {
    backgroundColor: '#1e40af',
  },
});

export default UploadButton;