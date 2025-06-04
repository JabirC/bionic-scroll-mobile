// src/contexts/SettingsContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { SettingsManager } from '../utils/settingsManager';

const SettingsContext = createContext({});

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
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
    const userSettings = await settingsManager.getSettings();
    setSettings(userSettings);
  };

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await settingsManager.saveSetting(key, value);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, loadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};