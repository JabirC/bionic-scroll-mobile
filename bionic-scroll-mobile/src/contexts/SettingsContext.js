// src/contexts/SettingsContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { SettingsManager } from '../utils/settingsManager';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    isDarkMode: false,
    fontSize: 22,
    bionicMode: false,
  });

  const settingsManager = new SettingsManager();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userSettings = await settingsManager.getSettings();
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      const newSettings = { ...settings, [key]: value };
      await settingsManager.saveSetting(key, value);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await settingsManager.saveSettings(updatedSettings);
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const resetSettings = async () => {
    try {
      await settingsManager.resetSettings();
      const defaultSettings = {
        isDarkMode: false,
        fontSize: 22,
        bionicMode: false,
      };
      setSettings(defaultSettings);
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  };

  return (
    <SettingsContext.Provider 
      value={{
        settings,
        updateSetting,
        updateSettings,
        resetSettings,
        loadSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};