// src/components/TextRenderer.js
import React from 'react';
import { StyleSheet } from 'react-native';
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
          font-family: 'Times New Roman', 'Minion Pro', 'PT Serif', 'Georgia', serif;
          font-size: ${fontSize}px;
          line-height: 1.8;
          margin: 0;
          padding: 20px;
          padding-bottom: 40px;
          background-color: ${isDarkMode ? '#000000' : '#ffffff'};
          color: ${isDarkMode ? '#f3f4f6' : '#1a1a1a'};
          overflow-x: hidden;
          min-height: 100vh;
          box-sizing: border-box;
          font-weight: 400;
          letter-spacing: 0.3px;
        }
        
        .content {
          max-width: 600px;
          width: 100%;
          margin: 0 auto;
        }
        
        p {
          margin: 0 0 ${fontSize * 1.2}px 0;
          text-align: left;
          font-weight: 400;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
          text-indent: ${fontSize * 1.2}px;
        }
        
        p:first-child {
          text-indent: 0;
        }
        
        p:last-child {
          margin-bottom: 0;
        }
        
        b {
          font-weight: 700;
          color: ${isDarkMode ? '#ffffff' : '#000000'};
        }
        
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
      <div class="content">
        ${section.processed}
      </div>
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