// src/components/TextRenderer.js
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const TextRenderer = ({ section, settings, isDarkMode }) => {
  const fontSize = settings.fontSize || 22;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: ${fontSize}px;
          line-height: 1.9;
          margin: 0;
          padding: 0;
          background-color: ${isDarkMode ? '#0f172a' : '#ffffff'};
          color: ${isDarkMode ? '#f3f4f6' : '#111827'};
          overflow-x: hidden;
        }
        
        p {
          margin: 0 0 ${fontSize * 1.2}px 0;
          text-align: left;
        }
        
        p:last-child {
          margin-bottom: 0;
        }
        
        /* Bionic text styling */
        b {
          font-weight: 700;
          color: ${isDarkMode ? '#ffffff' : '#000000'};
        }
        
        /* Prevent text selection and zoom */
        * {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        html {
          -webkit-text-size-adjust: none;
          -ms-text-size-adjust: none;
          text-size-adjust: none;
        }
      </style>
    </head>
    <body>
      ${section.processed}
    </body>
    </html>
  `;

  return (
    <WebView
      source={{ html: htmlContent }}
      style={[
        styles.webview,
        isDarkMode && styles.webviewDark
      ]}
      scrollEnabled={false}
      bounces={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      scalesPageToFit={false}
      javaScriptEnabled={false}
      domStorageEnabled={false}
      startInLoadingState={false}
      mixedContentMode="compatibility"
      androidLayerType="hardware"
    />
  );
};

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webviewDark: {
    backgroundColor: 'transparent',
  },
});

export default TextRenderer;