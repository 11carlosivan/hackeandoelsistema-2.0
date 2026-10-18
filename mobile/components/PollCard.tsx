import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { PollItem, submitPollVote } from '@/services/api';
import { BarChart2, CheckCircle2, MessageSquare, Clock } from 'lucide-react-native';

interface Props {
  poll: PollItem;
  onVoted?: (updatedPoll: PollItem) => void;
}

export const PollCard: React.FC<Props> = ({ poll, onVoted }) => {
  const { colors } = useTheme();
  const [currentPoll, setCurrentPoll] = useState<PollItem>(poll);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);

  const total = currentPoll.totalVotes || 0;

  const handleVote = async () => {
    if (!selectedOptionId || hasVoted || voting) return;
    setVoting(true);
    const res = await submitPollVote(currentPoll.id, selectedOptionId);
    setVoting(false);
    if (res.success && res.poll) {
      setCurrentPoll(res.poll);
      setHasVoted(true);
      if (onVoted) onVoted(res.poll);
    } else {
      // Local optimistic increment
      const updatedOptions = currentPoll.options.map((opt) => {
        if (opt.id === selectedOptionId) {
          const newVotes = opt.votesCount + 1;
          return { ...opt, votesCount: newVotes };
        }
        return opt;
      });
      const newTotal = total + 1;
      const calculated = {
        ...currentPoll,
        totalVotes: newTotal,
        options: updatedOptions.map((opt) => ({
          ...opt,
          percentage: Math.round((opt.votesCount / newTotal) * 100),
        })),
      };
      setCurrentPoll(calculated);
      setHasVoted(true);
      if (onVoted) onVoted(calculated);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.badgeRow}>
        <View style={[styles.pollBadge, { backgroundColor: colors.inputBackground }]}>
          <BarChart2 size={12} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.pollBadgeText, { color: colors.primary }]}>ENCUESTA PARTICIPATIVA</Text>
        </View>
        <View style={styles.timerRow}>
          <Clock size={11} color={colors.textMuted} style={{ marginRight: 3 }} />
          <Text style={[styles.timerText, { color: colors.textMuted }]}>
            {currentPoll.daysRemaining || 'Activa'}
          </Text>
        </View>
      </View>

      {/* Question */}
      <Text style={[styles.question, { color: colors.text }]}>{currentPoll.question}</Text>

      {/* Options List */}
      <View style={styles.optionsContainer}>
        {currentPoll.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const pct = option.percentage || 0;

          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionRow,
                { backgroundColor: colors.inputBackground, borderColor: isSelected ? colors.primary : colors.border },
              ]}
              onPress={() => {
                if (!hasVoted) setSelectedOptionId(option.id);
              }}
              activeOpacity={hasVoted ? 1 : 0.8}
            >
              {/* Progress Bar (Visible after voting) */}
              {hasVoted && (
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${pct}%`,
                      backgroundColor: isSelected ? 'rgba(220, 38, 38, 0.25)' : 'rgba(107, 114, 128, 0.15)',
                    },
                  ]}
                />
              )}

              <View style={styles.optionContent}>
                <View style={styles.leftCol}>
                  {!hasVoted && (
                    <View
                      style={[
                        styles.radioCircle,
                        { borderColor: isSelected ? colors.primary : colors.border },
                      ]}
                    >
                      {isSelected && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
                    </View>
                  )}
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.text, fontWeight: isSelected ? '700' : '500' },
                    ]}
                  >
                    {option.text}
                  </Text>
                </View>

                {hasVoted && (
                  <Text style={[styles.pctText, { color: isSelected ? colors.primary : colors.text }]}>
                    {pct}%
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer Info & Vote Button */}
      <View style={styles.footerRow}>
        <Text style={[styles.statsText, { color: colors.textMuted }]}>
          {total.toLocaleString()} votos &bull; 2 días restantes
        </Text>

        {!hasVoted && (
          <TouchableOpacity
            style={[
              styles.voteBtn,
              { backgroundColor: selectedOptionId ? colors.primary : colors.inputBackground },
            ]}
            onPress={handleVote}
            disabled={!selectedOptionId || voting}
            activeOpacity={0.8}
          >
            {voting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.voteBtnText,
                  { color: selectedOptionId ? '#FFFFFF' : colors.textMuted },
                ]}
              >
                Votar
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pollBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pollBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  question: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 14,
  },
  optionsContainer: {
    gap: 8,
    marginBottom: 14,
  },
  optionRow: {
    borderRadius: 10,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 46,
    justifyContent: 'center',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 1,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: {
    fontSize: 14,
    flex: 1,
  },
  pctText: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  voteBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  voteBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
