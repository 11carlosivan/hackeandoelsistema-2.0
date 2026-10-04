import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface GutenbergRendererProps {
  content: string;
}

export const GutenbergRenderer: React.FC<GutenbergRendererProps> = ({ content }) => {
  const { colors } = useTheme();

  // Clean HTML tags for native React Native display
  const paragraphs = content
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
    .split(/<\/p>|<br\s*\/?>/)
    .map((p) => p.replace(/<[^>]+>/g, '').trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    return (
      <Text style={[styles.paragraph, { color: colors.text }]}>
        {content.replace(/<[^>]+>/g, '')}
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {paragraphs.map((text, idx) => (
        <Text key={idx} style={[styles.paragraph, { color: colors.text }]}>
          {text}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
});
