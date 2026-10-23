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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { API_BASE_URL, resolveImageUrl } from '@/services/api';
import { Play, ExternalLink, CheckCircle, AlertCircle, Quote, ArrowRight } from 'lucide-react-native';

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
  | { type: 'videoEmbed'; src: string }
  | { type: 'quote'; text: string; author?: string }
  | { type: 'list'; items: string[]; ordered: boolean }
  | { type: 'related'; title: string; href: string; image?: string; category?: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'form'; config: any }
  | { type: 'divider' };

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

function extractYouTubeId(urlOrIframe: string): string | null {
  if (!urlOrIframe) return null;
  const match = urlOrIframe.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  return match ? match[1] : null;
}

function parseInlineSpans(html: string) {
  const tokens: Array<{ text: string; url?: string; bold?: boolean; italic?: boolean; underline?: boolean }> = [];
  const regex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>|<strong>([\s\S]*?)<\/strong>|<b>([\s\S]*?)<\/b>|<em>([\s\S]*?)<\/em>|<i>([\s\S]*?)<\/i>|<u>([\s\S]*?)<\/u>|<mark>([\s\S]*?)<\/mark>/gi;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      const plain = html.substring(lastIndex, match.index).replace(/<[^>]+>/g, '');
      if (plain) tokens.push({ text: decodeHtmlEntities(plain) });
    }
    if (match[1] !== undefined) {
      const innerHtml = match[2];
      const isBold = /<strong>|<b>/i.test(innerHtml);
      const isItalic = /<em>|<i>/i.test(innerHtml);
      const linkText = innerHtml.replace(/<[^>]+>/g, '');
      tokens.push({
        text: decodeHtmlEntities(linkText || match[1]),
        url: match[1],
        bold: isBold,
        italic: isItalic,
      });
    } else if (match[3] !== undefined || match[4] !== undefined) {
      const boldText = (match[3] ?? match[4]).replace(/<[^>]+>/g, '');
      tokens.push({ text: decodeHtmlEntities(boldText), bold: true });
    } else if (match[5] !== undefined || match[6] !== undefined) {
      const italicText = (match[5] ?? match[6]).replace(/<[^>]+>/g, '');
      tokens.push({ text: decodeHtmlEntities(italicText), italic: true });
    } else if (match[7] !== undefined) {
      const uText = match[7].replace(/<[^>]+>/g, '');
      tokens.push({ text: decodeHtmlEntities(uText), underline: true });
    } else if (match[8] !== undefined) {
      const markText = match[8].replace(/<[^>]+>/g, '');
      tokens.push({ text: decodeHtmlEntities(markText), bold: true });
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
    /(<div\s+class=["'][^"']*wp-block-hes-form[^"']*["'][^>]*data-form-config=["']([^"']+)["'][^>]*>[\s\S]*?<\/div>)|(<div\s+class=["'][^"']*wp-block-hes-related[^"']*["'][^>]*>([\s\S]*?)<\/div>)|(<figure[^>]*>([\s\S]*?)<\/figure>)|(<div\s+class=["'][^"']*(?:wp-block-embed|embed)[^"']*["'][^>]*>([\s\S]*?)<\/div>)|(<iframe[^>]*src=["']([^"']+)["'][^>]*>[\s\S]*?<\/iframe>)|(<video[^>]*src=["']([^"']+)["'][^>]*>[\s\S]*?<\/video>)|(<img[^>]*src=["']([^"']+)["'][^>]*\/?>)|(<h([1-6])[^>]*>([\s\S]*?)<\/h\12>)|(<blockquote[^>]*>([\s\S]*?)<\/blockquote>)|(<(ul|ol)[^>]*>([\s\S]*?)<\/\16>)|(<table[^>]*>([\s\S]*?)<\/table>)|(<hr[^>]*\/?>)|(<p[^>]*>([\s\S]*?)<\/p>)/gi;

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
      } catch {}
    } else if (match[3] !== undefined) {
      // 2. In-article Related Post Box
      const relHtml = match[4];
      const imgMatch = relHtml.match(/<img[^>]*src=["']([^"']+)["']/i);
      const catMatch = relHtml.match(/<span\s+class=["'][^"']*related-category[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
      const aMatch = relHtml.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (aMatch) {
        blocks.push({
          type: 'related',
          title: decodeHtmlEntities(aMatch[2].replace(/<[^>]+>/g, '').trim()),
          href: aMatch[1],
          image: imgMatch ? imgMatch[1] : undefined,
          category: catMatch ? decodeHtmlEntities(catMatch[1].replace(/<[^>]+>/g, '').trim()) : undefined,
        });
      }
    } else if (match[5] !== undefined) {
      // 3. figure (can contain image or video embed)
      const figHtml = match[6];
      const iframeMatch = figHtml.match(/<iframe[^>]*src=["']([^"']+)["']/i);
      if (iframeMatch) {
        const videoId = extractYouTubeId(iframeMatch[1]);
        if (videoId) {
          blocks.push({ type: 'youtube', videoId });
        } else {
          blocks.push({ type: 'videoEmbed', src: iframeMatch[1] });
        }
      } else {
        const srcMatch = figHtml.match(/<img[^>]*src=["']([^"']+)["']/i);
        const capMatch = figHtml.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
        if (srcMatch) {
          blocks.push({
            type: 'image',
            src: srcMatch[1],
            caption: capMatch ? decodeHtmlEntities(capMatch[1].replace(/<[^>]+>/g, '').trim()) : undefined,
          });
        }
      }
    } else if (match[7] !== undefined) {
      // 4. wp-block-embed div
      const embedInner = match[8];
      const iframeMatch = embedInner.match(/<iframe[^>]*src=["']([^"']+)["']/i);
      if (iframeMatch) {
        const videoId = extractYouTubeId(iframeMatch[1]);
        if (videoId) {
          blocks.push({ type: 'youtube', videoId });
        } else {
          blocks.push({ type: 'videoEmbed', src: iframeMatch[1] });
        }
      } else {
        const ytId = extractYouTubeId(embedInner);
        if (ytId) {
          blocks.push({ type: 'youtube', videoId: ytId });
        }
      }
    } else if (match[9] !== undefined) {
      // 5. standalone iframe
      const src = match[10];
      const videoId = extractYouTubeId(src);
      if (videoId) {
        blocks.push({ type: 'youtube', videoId });
      } else {
        blocks.push({ type: 'videoEmbed', src });
      }
    } else if (match[11] !== undefined) {
      // 6. video tag
      blocks.push({ type: 'videoEmbed', src: match[11] });
    } else if (match[12] !== undefined) {
      // 7. standalone img
      blocks.push({ type: 'image', src: match[13] });
    } else if (match[14] !== undefined) {
      // 8. Headings h1 - h6
      const level = parseInt(match[15], 10) || 2;
      const text = decodeHtmlEntities(match[16].replace(/<[^>]+>/g, '').trim());
      if (text) {
        blocks.push({ type: 'heading', level, text });
      }
    } else if (match[17] !== undefined) {
      // 9. Blockquote
      const quoteHtml = match[18];
      const citeMatch = quoteHtml.match(/<cite[^>]*>([\s\S]*?)<\/cite>/i);
      const text = decodeHtmlEntities(quoteHtml.replace(/<cite[^>]*>[\s\S]*?<\/cite>/gi, '').replace(/<[^>]+>/g, '').trim());
      const author = citeMatch ? decodeHtmlEntities(citeMatch[1].replace(/<[^>]+>/g, '').trim()) : undefined;
      if (text) {
        blocks.push({ type: 'quote', text, author });
      }
    } else if (match[19] !== undefined) {
      // 10. Lists
      const isOrdered = match[20].toLowerCase() === 'ol';
      const listContent = match[21];
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
    } else if (match[22] !== undefined) {
      // 11. Tables
      const tableHtml = match[23];
      const headers: string[] = [];
      const rows: string[][] = [];
      const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
      let thMatch;
      while ((thMatch = thRegex.exec(tableHtml)) !== null) {
        headers.push(decodeHtmlEntities(thMatch[1].replace(/<[^>]+>/g, '').trim()));
      }
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch;
      while ((trMatch = trRegex.exec(tableHtml)) !== null) {
        const rowContent = trMatch[1];
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const rowCells: string[] = [];
        let tdMatch;
        while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
          rowCells.push(decodeHtmlEntities(tdMatch[1].replace(/<[^>]+>/g, '').trim()));
        }
        if (rowCells.length > 0) {
          rows.push(rowCells);
        }
      }
      if (headers.length > 0 || rows.length > 0) {
        blocks.push({ type: 'table', headers, rows });
      }
    } else if (match[24] !== undefined) {
      // 12. Divider
      blocks.push({ type: 'divider' });
    } else if (match[25] !== undefined) {
      // 13. Paragraph
      const rawP = match[26];
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
      <View
        style={[
          styles.formContainer,
          { backgroundColor: colors.inputBackground, borderColor: colors.primary },
        ]}
      >
        <CheckCircle size={32} color={colors.primary} style={{ alignSelf: 'center', marginBottom: 8 }} />
        <Text style={[styles.formSuccessText, { color: colors.text }]}>{statusMessage}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.formContainer,
        { backgroundColor: colors.inputBackground, borderColor: colors.border },
      ]}
    >
      <View style={styles.formHeader}>
        <Text style={[styles.formTitle, { color: colors.text }]}>{title}</Text>
        {description ? (
          <Text style={[styles.formDescription, { color: colors.textMuted }]}>{description}</Text>
        ) : null}
      </View>

      <View style={styles.formFieldsBox}>
        {fields.map((f: any) => (
          <View key={f.id} style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {f.label} {f.required ? <Text style={{ color: colors.primary }}>*</Text> : null}
            </Text>
            {f.type === 'textarea' ? (
              <TextInput
                style={[
                  styles.fieldInput,
                  styles.fieldInputTextarea,
                  {
                    color: colors.text,
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
                placeholder={f.placeholder || ''}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={formData[f.id] || ''}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, [f.id]: text }))}
              />
            ) : (
              <TextInput
                style={[
                  styles.fieldInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
                placeholder={f.placeholder || ''}
                placeholderTextColor={colors.textMuted}
                keyboardType={f.type === 'email' ? 'email-address' : f.type === 'tel' ? 'phone-pad' : 'default'}
                value={formData[f.id] || ''}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, [f.id]: text }))}
              />
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.formSubmitBtn, { backgroundColor: colors.primary }]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
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
        <Text style={[styles.videoFallbackTitle, { color: colors.text }]}>Reproducir Video en YouTube</Text>
        <Text style={[styles.videoFallbackSub, { color: colors.textMuted }]} numberOfLines={1}>{youtubeUrl}</Text>
      </View>
      <ExternalLink size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

const GeneralVideoEmbedBlock: React.FC<{ src: string }> = ({ src }) => {
  const { colors } = useTheme();
  const embedHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; }
          .wrapper { position: relative; width: 100%; height: 100%; }
          iframe, video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <iframe 
            src="${src}" 
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
      onPress={() => Linking.openURL(src)}
      activeOpacity={0.8}
    >
      <View style={[styles.playIconCircle, { backgroundColor: colors.primary }]}>
        <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.videoFallbackTitle, { color: colors.text }]}>Reproducir Video</Text>
        <Text style={[styles.videoFallbackSub, { color: colors.textMuted }]} numberOfLines={1}>{src}</Text>
      </View>
      <ExternalLink size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

const InArticleRelatedCard: React.FC<{
  title: string;
  href: string;
  image?: string;
  category?: string;
}> = ({ title, href, image, category }) => {
  const { colors } = useTheme();
  const router = useRouter();
  const resolvedImg = image ? resolveImageUrl(image) : null;
  const extractSlug = (url: string) => {
    if (!url) return '';
    try {
      const cleanUrl = url.trim().replace(/^https?:\/\/[^/]+/i, '');
      const pathParts = cleanUrl.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '').split('/');
      return pathParts.pop() || '';
    } catch {
      return '';
    }
  };

  const targetSlug = extractSlug(href);

  return (
    <TouchableOpacity
      style={[
        styles.inArticleRelatedCard,
        { backgroundColor: colors.cardBackground, borderColor: colors.border },
      ]}
      onPress={() => {
        if (targetSlug) {
          router.push(`/article/${encodeURIComponent(targetSlug)}` as any);
        } else if (href) {
          Linking.openURL(href);
        }
      }}
      activeOpacity={0.85}
    >
      {resolvedImg ? (
        <Image source={{ uri: resolvedImg }} style={styles.inArticleRelatedImage} resizeMode="cover" />
      ) : null}
      <View style={styles.inArticleRelatedBody}>
        {category ? (
          <Text style={[styles.inArticleRelatedCategory, { color: colors.primary }]}>
            {category.toUpperCase()}
          </Text>
        ) : null}
        <Text style={[styles.inArticleRelatedTitle, { color: colors.text }]} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.inArticleRelatedFooter}>
          <Text style={[styles.inArticleRelatedAction, { color: colors.primary }]}>Leer artículo</Text>
          <ArrowRight size={13} color={colors.primary} style={{ marginLeft: 4 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const TableBlock: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
      <View style={[styles.tableContainer, { borderColor: colors.border }]}>
        {headers.length > 0 && (
          <View style={[styles.tableHeaderRow, { backgroundColor: colors.inputBackground }]}>
            {headers.map((h, i) => (
              <View key={`th-${i}`} style={styles.tableCell}>
                <Text style={[styles.tableHeaderText, { color: colors.text }]}>{h}</Text>
              </View>
            ))}
          </View>
        )}
        {rows.map((row, rIdx) => (
          <View
            key={`tr-${rIdx}`}
            style={[
              styles.tableRow,
              { borderTopColor: colors.border },
              rIdx % 2 === 1 ? { backgroundColor: colors.inputBackground } : null,
            ]}
          >
            {row.map((cell, cIdx) => (
              <View key={`td-${cIdx}`} style={styles.tableCell}>
                <Text style={[styles.tableCellText, { color: colors.textSecondary }]}>{cell}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export const GutenbergRenderer: React.FC<GutenbergRendererProps> = ({ content, postId }) => {
  const { colors } = useTheme();
  const router = useRouter();

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
            const isH1 = block.level === 1;
            const isH2 = block.level === 2;
            const isH3 = block.level === 3;

            return (
              <View key={`heading-${idx}`} style={styles.headingWrapper}>
                {isH2 ? (
                  <View style={styles.subheadingRow}>
                    <View style={[styles.headingPill, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.h2, { color: colors.text }]}>{block.text}</Text>
                  </View>
                ) : isH3 ? (
                  <View style={styles.subheadingRow}>
                    <View style={[styles.h3Dot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.h3, { color: colors.text }]}>{block.text}</Text>
                  </View>
                ) : isH1 ? (
                  <Text style={[styles.h1, { color: colors.text }]}>{block.text}</Text>
                ) : (
                  <Text style={[styles.h4, { color: colors.text }]}>{block.text}</Text>
                )}
              </View>
            );
          }

          case 'paragraph': {
            const spans = parseInlineSpans(block.html);
            return (
              <Text key={`p-${idx}`} style={[styles.paragraph, { color: colors.text }]}>
                {spans.map((span, sIdx) => {
                  if (span.url) {
                    const handleLinkPress = () => {
                      const url = span.url!;
                      if (url.includes('hackeandoelsistema.net') || url.startsWith('/')) {
                        const cleanPath = url.replace(/^https?:\/\/[^/]+/i, '').split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '');
                        const parts = cleanPath.split('/');
                        const possibleSlug = parts.pop() || '';
                        if (possibleSlug && !['categoria', 'category', 'contacto-seguro', 'planes', 'radio'].includes(possibleSlug)) {
                          router.push(`/article/${encodeURIComponent(possibleSlug)}` as any);
                          return;
                        }
                      }
                      Linking.openURL(url).catch(() => {});
                    };

                    return (
                      <Text
                        key={`span-${sIdx}`}
                        style={[
                          styles.link,
                          { color: colors.primary },
                          span.bold ? styles.bold : null,
                          span.italic ? styles.italic : null,
                        ]}
                        onPress={handleLinkPress}
                      >
                        {span.text}
                      </Text>
                    );
                  }
                  return (
                    <Text
                      key={`span-${sIdx}`}
                      style={[
                        span.bold ? [styles.bold, { color: colors.text }] : null,
                        span.italic ? styles.italic : null,
                        span.underline ? styles.underline : null,
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

          case 'videoEmbed': {
            return <GeneralVideoEmbedBlock key={`vid-${idx}`} src={block.src} />;
          }

          case 'related': {
            return (
              <InArticleRelatedCard
                key={`rel-${idx}`}
                title={block.title}
                href={block.href}
                image={block.image}
                category={block.category}
              />
            );
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

          case 'table': {
            return <TableBlock key={`table-${idx}`} headers={block.headers} rows={block.rows} />;
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
  headingWrapper: {
    marginTop: 22,
    marginBottom: 10,
  },
  subheadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  headingPill: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginTop: 3,
  },
  h3Dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  h1: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h2: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  h3: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 25,
  },
  h4: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 27,
    marginBottom: 16,
    letterSpacing: 0.15,
  },
  bold: {
    fontWeight: '800',
  },
  italic: {
    fontStyle: 'italic',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
  imageBlock: {
    marginVertical: 14,
  },
  contentImage: {
    width: '100%',
    height: 230,
    borderRadius: 12,
  },
  imageCaption: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
  },
  videoContainer: {
    width: '100%',
    height: 225,
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
  inArticleRelatedCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 10,
    gap: 12,
    alignItems: 'center',
    marginVertical: 14,
  },
  inArticleRelatedImage: {
    width: 80,
    height: 65,
    borderRadius: 8,
  },
  inArticleRelatedBody: {
    flex: 1,
  },
  inArticleRelatedCategory: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  inArticleRelatedTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 4,
  },
  inArticleRelatedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inArticleRelatedAction: {
    fontSize: 11,
    fontWeight: '700',
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
    lineHeight: 23,
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
    lineHeight: 23,
  },
  tableScroll: {
    marginVertical: 14,
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  tableCell: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 110,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '800',
  },
  tableCellText: {
    fontSize: 13,
    lineHeight: 18,
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
