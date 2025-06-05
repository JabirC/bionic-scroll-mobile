// src/components/TextRenderer.js
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const TextRenderer = ({ section, settings, isDarkMode }) => {
  const fontSize = settings.fontSize || 22;
  const webViewRef = useRef(null);
  
  // Pre-render the WebView with opacity 0
  const [isReady, setIsReady] = React.useState(false);
  
  useEffect(() => {
    // Give a tiny delay to ensure smooth transitions
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body {
          font-family: '-apple-system', 'SF Pro Text', 'SF Pro Rounded', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif;
          font-size: ${fontSize}px;
          line-height: 1.6;
          margin: 0;
          padding: 8px;
          padding-bottom: 40px;
          background-color: ${isDarkMode ? '#1a1a1a' : '#ffffff'};
          color: ${isDarkMode ? '#f3f4f6' : '#1a1a1a'};
          overflow-x: hidden;
          min-height: 100vh;
          box-sizing: border-box;
          font-weight: 400;
          letter-spacing: 0.2px;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .content {
          max-width: 650px;
          width: 100%;
          margin: 0 auto;
          opacity: 1;
        }
        
        p {
          margin: 0 0 ${fontSize * 1.1}px 0;
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
        
        h1, h2, h3, h4, h5, h6 {
          font-weight: 600;
          color: ${isDarkMode ? '#ffffff' : '#000000'};
          margin: ${fontSize * 1.5}px 0 ${fontSize * 0.8}px 0;
          text-indent: 0;
        }
        
        h1 { font-size: ${fontSize * 1.8}px; }
        h2 { font-size: ${fontSize * 1.6}px; }
        h3 { font-size: ${fontSize * 1.4}px; }
        h4 { font-size: ${fontSize * 1.2}px; }
        h5, h6 { font-size: ${fontSize * 1.1}px; }
        
        b, strong {
          font-weight: ${isDarkMode ? '800' : '700'};
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
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={[
          styles.webview,
          isDarkMode && styles.webviewDark,
          { opacity: isReady ? 1 : 0 }
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
        renderToHardwareTextureAndroid={true}
        cacheEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        onLoadEnd={() => setIsReady(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webviewDark: {
    backgroundColor: 'transparent',
  },
});

export default TextRenderer;