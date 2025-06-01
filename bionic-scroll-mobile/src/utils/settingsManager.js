// src/utils/settingsManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export class SettingsManager {
  constructor() {
    this.settingsKey = 'readFaster_settings';
    this.defaultSettings = {
      isDarkMode: false,
      fontSize: 22,
      bionicMode: false,
      useOriginalReader: false,
    };
  }

  async getSettings() {
    try {
      const settings = await AsyncStorage.getItem(this.settingsKey);
      if (settings) {
        return { ...this.defaultSettings, ...JSON.parse(settings) };
      }
      return this.defaultSettings;
    } catch (error) {
      console.error('Error getting settings:', error);
      return this.defaultSettings;
    }
  }

  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem(this.settingsKey, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  async saveSetting(key, value) {
    try {
      const currentSettings = await this.getSettings();
      const newSettings = { ...currentSettings, [key]: value };
      return await this.saveSettings(newSettings);
    } catch (error) {
      console.error('Error saving setting:', error);
      return false;
    }
  }

  async resetSettings() {
    try {
      await AsyncStorage.removeItem(this.settingsKey);
      return true;
    } catch (error) {
      console.error('Error resetting settings:', error);
      return false;
    }
  }
}