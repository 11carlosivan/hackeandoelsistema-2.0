import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, Share } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { SponsoredPostItem } from '@/services/api';
import { ExternalLink, Heart, MessageCircle, Share2, Sparkles } from 'lucide-react-native';

interface Props {
  ad: SponsoredPostItem;
}

export const SponsoredPostCard: React.FC<Props> = ({ ad }) => {
  const { colors } = useTheme();

  const handlePressCta = async () => {
    if (ad.ctaUrl) {
      try {
        await Linking.openURL(ad.ctaUrl);
      } catch {}
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: ad.title,
        message: `${ad.title} - ${ad.content}\n${ad.ctaUrl}`,
      });
    } catch {}
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {/* Sponsor Header */}
      <View style={styles.headerRow}>
        <Image
          source={{ uri: ad.sponsorLogo || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=120&auto=format&fit=crop&q=80', cache: 'force-cache' }}
          style={styles.logo}
          fadeDuration={0}
        />
        <View style={styles.headerInfo}>
          <View style={styles.sponsorNameRow}>
            <Text style={[styles.sponsorName, { color: colors.text }]}>{ad.sponsorName}</Text>
            <View style={[styles.sponsoredBadge, { backgroundColor: colors.inputBackground }]}>
              <Sparkles size={10} color="#F59E0B" style={{ marginRight: 3 }} />
              <Text style={[styles.sponsoredBadgeText, { color: colors.textMuted }]}>Patrocinado</Text>
            </View>
          </View>
          {ad.sponsorHandle ? (
            <Text style={[styles.handleText, { color: colors.textMuted }]}>{ad.sponsorHandle}</Text>
          ) : null}
        </View>
      </View>

      {/* Title & Content */}
      <Text style={[styles.adTitle, { color: colors.text }]}>{ad.title}</Text>
      <Text style={[styles.adContent, { color: colors.textSecondary || colors.text }]}>{ad.content}</Text>

      {/* Media Image if available */}
      {ad.mediaUrl ? (
        <TouchableOpacity activeOpacity={0.9} onPress={handlePressCta} style={styles.imageWrapper}>
          <Image source={{ uri: ad.mediaUrl, cache: 'force-cache' }} style={styles.mediaImage} resizeMode="cover" fadeDuration={0} />
          <View style={styles.ctaOverlayButton}>
            <Text style={styles.ctaOverlayText}>{ad.ctaText || 'Conoce más'}</Text>
            <ExternalLink size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
          onPress={handlePressCta}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>{ad.ctaText || 'Conoce más'}</Text>
          <ExternalLink size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      )}

      {/* Engagement Row */}
      <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
        <View style={styles.actionItem}>
          <Heart size={16} color={colors.textMuted} />
          <Text style={[styles.actionCount, { color: colors.textMuted }]}>{ad.likesCount || 120}</Text>
        </View>
        <View style={styles.actionItem}>
          <MessageCircle size={16} color={colors.textMuted} />
          <Text style={[styles.actionCount, { color: colors.textMuted }]}>{ad.commentsCount || 18}</Text>
        </View>
        <TouchableOpacity style={styles.actionItem} onPress={handleShare} activeOpacity={0.7}>
          <Share2 size={16} color={colors.textMuted} />
          <Text style={[styles.actionCount, { color: colors.textMuted }]}>{ad.sharesCount || 35}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#374151',
  },
  headerInfo: {
    flex: 1,
  },
  sponsorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sponsorName: {
    fontSize: 15,
    fontWeight: '800',
  },
  sponsoredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sponsoredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  handleText: {
    fontSize: 12,
    marginTop: 1,
  },
  adTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 20,
  },
  adContent: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  imageWrapper: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  ctaOverlayButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  ctaOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
});
