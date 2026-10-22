import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { API_BASE_URL, resolveImageUrl } from '@/services/api';
import { Play, ExternalLink, CheckCircle, AlertCircle, Quote } from 'lucide-react-native';

let WebViewComponent: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  WebViewComponent = require('react-native-webview').WebView;
} catch {}

interface GutenbergRendererProps {
  content: string;
  postId?: string;
}

type ParsedBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; html: string }
  | { type: 'image'; src: string; caption?: string }
  | { type: 'youtube'; videoId: string }
  | { type: 'quote'; text: string; author?: string }
  | { type: 'list'; items: string[]; ordered: boolean }
  | { type: 'form'; config: any }
  | { type: 'divider' };

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractYouTubeId(urlOrIframe: string): string | null {
  const match = urlOrIframe.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  return match ? match[1] : null;
}

function parseInlineSpans(html: string) {
  const tokens: Array<{ text: string; url?: string; bold?: boolean; italic?: boolean }> = [];
  const regex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>|<strong>([\s\S]*?)<\/strong>|<b>([\s\S]*?)<\/b>|<em>([\s\S]*?)<\/em>|<i>([\s\S]*?)<\/i>/gi;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      const plain = html.substring(lastIndex, match.index).replace(/<[^>]+>/g, '');
      if (plain) tokens.push({ text: decodeHtmlEntities(plain) });
    }
    if (match[1] !== undefined) {
      const linkText = match[2].replace(/<[^>]+>/g, '');
      tokens.push({
        text: decodeHtmlEntities(linkText || match[1]),
        url: match[1],
      });
    } else if (match[3] !== undefined || match[4] !== undefined) {
      const boldText = (match[3] ?? match[4]).replace(/<[^>]+>/g, '');
      tokens.push({ text: decodeHtmlEntities(boldText), bold: true });
    } else if (match[5] !== undefined || match[6] !== undefined) {
      const italicText = (match[5] ?? match[6]).replace(/<[^>]+>/g, '');
      tokens.push({ text: decodeHtmlEntities(italicText), italic: true });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < html.length) {
    const plain = html.substring(lastIndex).replace(/<[^>]+>/g, '');
    if (plain) tokens.push({ text: decodeHtmlEntities(plain) });
  }

  return tokens;
}

function parseGutenbergBlocks(content: string): ParsedBlock[] {
  if (!content) return [];

  const clean = content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const blockRegex =
    /(<div\s+class=["'][^"']*wp-block-hes-form[^"']*["'][^>]*data-form-config=["']([^"']+)["'][^>]*>[\s\S]*?<\/div>)|(<iframe[^>]*src=["']([^"']+)["'][^>]*>[\s\S]*?<\/iframe>)|(<figure[^>]*>[\s\S]*?<\/figure>)|(<img[^>]*src=["']([^"']+)["'][^>]*\/?>)|(<h([1-6])[^>]*>([\s\S]*?)<\/h\8>)|(<blockquote[^>]*>([\s\S]*?)<\/blockquote>)|(<(ul|ol)[^>]*>([\s\S]*?)<\/\12>)|(<hr[^>]*\/?>)|(<p[^>]*>([\s\S]*?)<\/p>)/gi;

  const blocks: ParsedBlock[] = [];
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(clean)) !== null) {
    // Plain text chunk before block
    if (match.index > lastIndex) {
      const interstitial = clean.substring(lastIndex, match.index).trim();
      if (interstitial) {
        const textOnly = decodeHtmlEntities(interstitial.replace(/<[^>]+>/g, '')).trim();
        if (textOnly) {
          blocks.push({ type: 'paragraph', html: interstitial });
        }
      }
    }

    if (match[1] !== undefined) {
      // 1. Form Block
      try {
        const config = JSON.parse(decodeURIComponent(match[2]));
        blocks.push({ type: 'form', config });
      } catch {
        // Fallback
      }
    } else if (match[3] !== undefined) {
      // 2. iframe / YouTube
      const src = match[4];
      const videoId = extractYouTubeId(src);
      if (videoId) {
        blocks.push({ type: 'youtube', videoId });
      }
    } else if (match[5] !== undefined) {
      // 3. figure
      const figHtml = match[5];
      const srcMatch = figHtml.match(/<img[^>]*src=["']([^"']+)["']/i);
      const capMatch = figHtml.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
      if (srcMatch) {
        blocks.push({
          type: 'image',
          src: srcMatch[1],
          caption: capMatch ? decodeHtmlEntities(capMatch[1].replace(/<[^>]+>/g, '').trim()) : undefined,
        });
      }
    } else if (match[6] !== undefined) {
      // 4. standalone img
      blocks.push({ type: 'image', src: match[7] });
    } else if (match[8] !== undefined) {
      // 5. Headings h1 - h6
      const level = parseInt(match[9], 10) || 2;
      const text = decodeHtmlEntities(match[10].replace(/<[^>]+>/g, '').trim());
      if (text) {
        blocks.push({ type: 'heading', level, text });
      }
    } else if (match[11] !== undefined) {
      // 6. Blockquote
      const quoteHtml = match[12];
      const citeMatch = quoteHtml.match(/<cite[^>]*>([\s\S]*?)<\/cite>/i);
      const text = decodeHtmlEntities(quoteHtml.replace(/<cite[^>]*>[\s\S]*?<\/cite>/gi, '').replace(/<[^>]+>/g, '').trim());
      const author = citeMatch ? decodeHtmlEntities(citeMatch[1].replace(/<[^>]+>/g, '').trim()) : undefined;
      if (text) {
        blocks.push({ type: 'quote', text, author });
      }
    } else if (match[13] !== undefined) {
      // 7. Lists
      const isOrdered = match[14].toLowerCase() === 'ol';
      const listContent = match[15];
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      const items: string[] = [];
      let liMatch;
      while ((liMatch = liRegex.exec(listContent)) !== null) {
        const itemText = decodeHtmlEntities(liMatch[1].replace(/<[^>]+>/g, '').trim());
        if (itemText) items.push(itemText);
      }
      if (items.length > 0) {
        blocks.push({ type: 'list', items, ordered: isOrdered });
      }
    } else if (match[16] !== undefined) {
      // 8. Divider
      blocks.push({ type: 'divider' });
    } else if (match[17] !== undefined) {
      // 9. Paragraph
      const rawP = match[18];
      const ytId = extractYouTubeId(rawP);
      if (ytId && rawP.length < 150) {
        blocks.push({ type: 'youtube', videoId: ytId });
      } else {
        const textOnly = decodeHtmlEntities(rawP.replace(/<[^>]+>/g, '')).trim();
        if (textOnly) {
          blocks.push({ type: 'paragraph', html: rawP });
        }
      }
    }

    lastIndex = blockRegex.lastIndex;
  }

  // Trailing text
  if (lastIndex < clean.length) {
    const trailing = clean.substring(lastIndex).trim();
    if (trailing) {
      const textOnly = decodeHtmlEntities(trailing.replace(/<[^>]+>/g, '')).trim();
      if (textOnly) {
        blocks.push({ type: 'paragraph', html: trailing });
      }
    }
  }

  return blocks;
}

const InteractiveFormBlock: React.FC<{ config: any; postId?: string }> = ({ config, postId }) => {
  const { colors } = useTheme();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const title = config.title || 'Formulario de Convocatoria';
  const description = config.description || '';
  const fields = (config.fields || []).filter((f: any) => f.enabled !== false);
  const submitButtonText = config.submitButtonText || 'Enviar Postulación';

  const handleSubmit = async () => {
    for (const f of fields) {
      if (f.required && !formData[f.id]?.trim()) {
        Alert.alert('Campo requerido', `Por favor completa el campo: ${f.label}`);
        return;
      }
    }

    setSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/public/forms/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: config.formId || 'default-form',
          postId: postId || null,
          formTitle: title,
          formDescription: description,
          data: formData,
          renderedAt: Date.now(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        setSubmitted(true);
        setStatusMessage(config.successMessage || '¡Tu postulación ha sido enviada con éxito!');
      } else {
        Alert.alert('Error', json?.message || 'Error al enviar el formulario');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.formContainer, { backgroundColor: colors.cardBackground, borderColor: '#10B981' }]}>
        <CheckCircle size={32} color="#10B981" style={{ alignSelf: 'center', marginBottom: 8 }} />
        <Text style={[styles.formSuccessText, { color: colors.text }]}>{statusMessage}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.formContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.formHeader}>
        <Text style={[styles.formTitle, { color: colors.text }]}>{title}</Text>
        {description ? <Text style={[styles.formDescription, { color: colors.textMuted }]}>{description}</Text> : null}
      </View>

      <View style={styles.formFieldsBox}>
        {fields.map((f: any) => (
          <View key={f.id} style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {f.label} {f.required ? <Text style={{ color: colors.primary }}>*</Text> : null}
            </Text>
            <TextInput
              style={[
                styles.fieldInput,
                f.type === 'textarea' ? styles.fieldInputTextarea : null,
                { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border },
              ]}
              placeholder={f.placeholder || f.label}
              placeholderTextColor={colors.textMuted}
              value={formData[f.id] || ''}
              onChangeText={(val) => setFormData((prev) => ({ ...prev, [f.id]: val }))}
              multiline={f.type === 'textarea'}
              numberOfLines={f.type === 'textarea' ? 4 : 1}
              keyboardType={f.type === 'email' ? 'email-address' : f.type === 'phone' ? 'phone-pad' : 'default'}
              editable={!submitting}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.formSubmitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.formSubmitBtnText}>{submitButtonText}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const YouTubeBlock: React.FC<{ videoId: string }> = ({ videoId }) => {
  const { colors } = useTheme();
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; }
          .wrapper { position: relative; width: 100%; height: 100%; }
          iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <iframe 
            src="https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&modestbranding=1&rel=0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen>
          </iframe>
        </div>
      </body>
    </html>
  `;

  if (WebViewComponent) {
    return (
      <View style={[styles.videoContainer, { borderColor: colors.border }]}>
        <WebViewComponent
          source={{ html: embedHtml, baseUrl: 'https://hackeandoelsistema.net' }}
          style={styles.videoWebView}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
        />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.videoFallbackCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => Linking.openURL(youtubeUrl)}
      activeOpacity={0.8}
    >
      <View style={[styles.playIconCircle, { backgroundColor: colors.primary }]}>
        <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.videoFallbackTitle, { color: colors.text }]}>Ver Video en YouTube</Text>
        <Text style={[styles.videoFallbackSub, { color: colors.textMuted }]}>{youtubeUrl}</Text>
      </View>
      <ExternalLink size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

export const GutenbergRenderer: React.FC<GutenbergRendererProps> = ({ content, postId }) => {
  const { colors } = useTheme();

  const blocks = React.useMemo(() => parseGutenbergBlocks(content), [content]);

  if (blocks.length === 0) {
    return (
      <Text style={[styles.paragraph, { color: colors.text }]}>
        {decodeHtmlEntities(content.replace(/<[^>]+>/g, '').trim())}
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            const headingStyle =
              block.level === 1
                ? styles.h1
                : block.level === 2
                ? styles.h2
                : block.level === 3
                ? styles.h3
                : styles.h4;
            return (
              <Text key={`heading-${idx}`} style={[headingStyle, { color: colors.text }]}>
                {block.text}
              </Text>
            );
          }

          case 'paragraph': {
            const spans = parseInlineSpans(block.html);
            return (
              <Text key={`p-${idx}`} style={[styles.paragraph, { color: colors.text }]}>
                {spans.map((span, sIdx) => {
                  if (span.url) {
                    return (
                      <Text
                        key={`span-${sIdx}`}
                        style={[styles.link, { color: colors.primary }]}
                        onPress={() => Linking.openURL(span.url!)}
                      >
                        {span.text}
                      </Text>
                    );
                  }
                  return (
                    <Text
                      key={`span-${sIdx}`}
                      style={[
                        span.bold ? styles.bold : null,
                        span.italic ? styles.italic : null,
                      ]}
                    >
                      {span.text}
                    </Text>
                  );
                })}
              </Text>
            );
          }

          case 'image': {
            const resolved = resolveImageUrl(block.src) || block.src;
            return (
              <View key={`img-${idx}`} style={styles.imageBlock}>
                <Image source={{ uri: resolved }} style={styles.contentImage} resizeMode="cover" />
                {block.caption ? (
                  <Text style={[styles.imageCaption, { color: colors.textMuted }]}>{block.caption}</Text>
                ) : null}
              </View>
            );
          }

          case 'youtube': {
            return <YouTubeBlock key={`yt-${idx}`} videoId={block.videoId} />;
          }

          case 'quote': {
            return (
              <View
                key={`quote-${idx}`}
                style={[
                  styles.quoteBox,
                  { backgroundColor: colors.inputBackground, borderLeftColor: colors.primary },
                ]}
              >
                <Quote size={18} color={colors.primary} style={{ marginBottom: 6 }} />
                <Text style={[styles.quoteText, { color: colors.text }]}>"{block.text}"</Text>
                {block.author ? (
                  <Text style={[styles.quoteAuthor, { color: colors.primary }]}>— {block.author}</Text>
                ) : null}
              </View>
            );
          }

          case 'list': {
            return (
              <View key={`list-${idx}`} style={styles.listBox}>
                {block.items.map((item, lIdx) => (
                  <View key={`li-${lIdx}`} style={styles.listItemRow}>
                    <Text style={[styles.bullet, { color: colors.primary }]}>
                      {block.ordered ? `${lIdx + 1}.` : '•'}
                    </Text>
                    <Text style={[styles.listItemText, { color: colors.text }]}>{item}</Text>
                  </View>
                ))}
              </View>
            );
          }

          case 'form': {
            return <InteractiveFormBlock key={`form-${idx}`} config={block.config} postId={postId} />;
          }

          case 'divider': {
            return <View key={`hr-${idx}`} style={[styles.divider, { backgroundColor: colors.border }]} />;
          }

          default:
            return null;
        }
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  h1: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
    marginTop: 22,
    marginBottom: 12,
  },
  h2: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    marginTop: 18,
    marginBottom: 10,
  },
  h3: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
    marginTop: 16,
    marginBottom: 8,
  },
  h4: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  bold: {
    fontWeight: '800',
  },
  italic: {
    fontStyle: 'italic',
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  imageBlock: {
    marginVertical: 14,
  },
  contentImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  imageCaption: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
  },
  videoContainer: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginVertical: 16,
    backgroundColor: '#000000',
  },
  videoWebView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoFallbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 14,
    gap: 12,
  },
  playIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoFallbackTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  videoFallbackSub: {
    fontSize: 12,
    marginTop: 2,
  },
  quoteBox: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 14,
    marginVertical: 14,
  },
  quoteText: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  quoteAuthor: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'right',
  },
  listBox: {
    marginVertical: 10,
    paddingLeft: 4,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    fontWeight: '800',
    marginRight: 8,
    lineHeight: 22,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    marginVertical: 18,
  },
  formContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginVertical: 18,
  },
  formHeader: {
    marginBottom: 14,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  formDescription: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  formFieldsBox: {
    gap: 12,
    marginBottom: 16,
  },
  fieldRow: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  fieldInputTextarea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formSubmitBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  formSuccessText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
});
