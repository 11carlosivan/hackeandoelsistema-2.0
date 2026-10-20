import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { submitPostComment, fetchPostComments, PostComment } from '@/services/api';
import { useRouter } from 'expo-router';
import { MessageSquare, Send, UserCheck, Lock, CornerDownRight, X } from 'lucide-react-native';

interface CommentSectionProps {
  postId: string;
  initialComments?: PostComment[];
  onCommentAdded?: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  initialComments = [],
  onCommentAdded,
}) => {
  const { colors } = useTheme();
  const { user, token, refreshAccessToken } = useAuth();
  const { toast, showModal } = useNotification();
  const router = useRouter();

  const [comments, setComments] = useState<PostComment[]>(initialComments);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; user: string } | null>(null);

  useEffect(() => {
    if (!postId) return;
    fetchPostComments(postId).then((fresh) => {
      if (fresh && fresh.length > 0) {
        setComments(fresh);
      }
    });
  }, [postId]);

  const handleStartReply = (item: PostComment) => {
    if (!user || !token) {
      showModal({
        icon: 'question',
        title: 'Iniciar Sesión',
        message: 'Debes iniciar sesión con tu cuenta para responder a este comentario.',
        buttons: [
          { text: 'Entrar', style: 'primary', onPress: () => router.push('/login') },
          { text: 'Cancelar', style: 'cancel' },
        ],
      });
      return;
    }

    setReplyingTo({ id: item.id, user: item.user });
  };

  const handleSubmit = async () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;

    if (!user || !token) {
      showModal({
        icon: 'question',
        title: 'Iniciar Sesión',
        message: 'Debes iniciar sesión con tu cuenta para participar en los comentarios.',
        buttons: [
          { text: 'Entrar', style: 'primary', onPress: () => router.push('/login') },
          { text: 'Cancelar', style: 'cancel' },
        ],
      });
      return;
    }

    if (trimmed.length < 3) {
      toast.warning('Comentario muy corto', 'Por favor escribe al menos 3 caracteres.');
      return;
    }

    setSubmitting(true);
    let activeToken = token;
    let result = await submitPostComment(postId, trimmed, activeToken, replyingTo?.id);

    if (!result.success && result.error?.toLowerCase().includes('token') && refreshAccessToken) {
      const freshToken = await refreshAccessToken();
      if (freshToken) {
        activeToken = freshToken;
        result = await submitPostComment(postId, trimmed, activeToken, replyingTo?.id);
      }
    }
    setSubmitting(false);

    if (result.success) {
      const newComment: PostComment = result.comment || {
        id: String(Date.now()),
        parentId: replyingTo?.id || null,
        user: user.displayName || user.email,
        text: trimmed,
        date: 'Reciente',
      };

      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      setReplyingTo(null);
      toast.success(
        replyingTo ? 'Respuesta Enviada' : 'Comentario Enviado',
        replyingTo ? 'Tu respuesta ha sido publicada.' : 'Tu comentario ha sido publicado en la red.'
      );
      if (onCommentAdded) onCommentAdded();
    } else {
      toast.error('Error al comentar', result.error || 'No se pudo publicar el comentario.');
    }
  };

  const topLevelComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <MessageSquare size={18} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          COMENTARIOS DE LA RED ({comments.length})
        </Text>
      </View>

      {/* Input de Comentario o Aviso de Login */}
      {user ? (
        <View style={[styles.inputBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {replyingTo ? (
            <View style={[styles.replyingBar, { backgroundColor: colors.background, borderColor: colors.primary }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <CornerDownRight size={14} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.replyingText, { color: colors.text }]} numberOfLines={1}>
                  Respondiendo a <Text style={{ color: colors.primary, fontWeight: '700' }}>@{replyingTo.user}</Text>
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.userBadge}>
              <UserCheck size={14} color={colors.primary} style={{ marginRight: 5 }} />
              <Text style={[styles.userName, { color: colors.text }]}>
                {user.displayName || user.email}
              </Text>
            </View>
          )}

          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={replyingTo ? `Escribe tu respuesta a @${replyingTo.user}...` : "Escribe tu opinión sobre esta noticia..."}
            placeholderTextColor={colors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            numberOfLines={3}
          />

          <View style={styles.submitRow}>
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting || !commentText.trim()}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.sendBtnText}>{replyingTo ? 'Responder' : 'Comentar'}</Text>
                  <Send size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.loginPrompt, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => router.push('/login')}
          activeOpacity={0.8}
        >
          <Lock size={16} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.loginPromptText, { color: colors.text }]}>
            Inicia sesión para participar en los comentarios. <Text style={{ color: colors.primary, fontWeight: '800' }}>Entrar</Text>
          </Text>
        </TouchableOpacity>
      )}

      {/* Lista de Comentarios Públicos */}
      <View style={styles.commentsList}>
        {topLevelComments.length > 0 ? (
          topLevelComments.map((item) => {
            const replies = getReplies(item.id);

            return (
              <View
                key={item.id}
                style={[styles.commentCard, { backgroundColor: colors.cardBackground, borderColor: colors.border, borderLeftColor: colors.primary }]}
              >
                <View style={styles.commentHeader}>
                  <TouchableOpacity
                    style={styles.authorRow}
                    onPress={() => {
                      if (item.userId) {
                        router.push(`/user/${encodeURIComponent(item.userId)}` as any);
                      }
                    }}
                    disabled={!item.userId}
                    activeOpacity={0.7}
                  >
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.commentAvatar} />
                    ) : (
                      <View style={[styles.commentAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                        <Text style={styles.commentAvatarInitials}>
                          {(item.user || 'U').slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.commentAuthor, { color: colors.primary }]}>{item.user}</Text>
                  </TouchableOpacity>
                  {item.date ? (
                    <Text style={[styles.commentDate, { color: colors.textMuted }]}>{item.date}</Text>
                  ) : null}
                </View>
                <Text style={[styles.commentBody, { color: colors.text }]}>{item.text}</Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.replyButton}
                    onPress={() => handleStartReply(item)}
                    activeOpacity={0.7}
                  >
                    <CornerDownRight size={13} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.replyButtonText, { color: colors.primary }]}>Responder</Text>
                  </TouchableOpacity>
                </View>

                {/* Respuestas Anidadas */}
                {replies.length > 0 && (
                  <View style={[styles.repliesContainer, { borderLeftColor: colors.primary }]}>
                    {replies.map((reply) => (
                      <View
                        key={reply.id}
                        style={[styles.replyCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                      >
                        <View style={styles.commentHeader}>
                          <TouchableOpacity
                            style={styles.authorRow}
                            onPress={() => {
                              if (reply.userId) {
                                router.push(`/user/${encodeURIComponent(reply.userId)}` as any);
                              }
                            }}
                            disabled={!reply.userId}
                            activeOpacity={0.7}
                          >
                            {reply.avatarUrl ? (
                              <Image source={{ uri: reply.avatarUrl }} style={styles.commentAvatarSmall} />
                            ) : (
                              <View style={[styles.commentAvatarPlaceholderSmall, { backgroundColor: colors.primary }]}>
                                <Text style={styles.commentAvatarInitialsSmall}>
                                  {(reply.user || 'U').slice(0, 1).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <Text style={[styles.commentAuthor, { color: colors.text }]}>{reply.user}</Text>
                            <Text style={[styles.replyTag, { color: colors.primary, backgroundColor: `${colors.primary}15` }]}>
                              @{item.user}
                            </Text>
                          </TouchableOpacity>
                          {reply.date ? (
                            <Text style={[styles.commentDate, { color: colors.textMuted }]}>{reply.date}</Text>
                          ) : null}
                        </View>
                        <Text style={[styles.commentBody, { color: colors.text }]}>{reply.text}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={[styles.emptyBox, { borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Aún no hay comentarios en este artículo. ¡Sé el primero en opinar!
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  inputBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  replyingText: {
    fontSize: 12,
  },
  input: {
    fontSize: 14,
    minHeight: 65,
    textAlignVertical: 'top',
  },
  submitRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  loginPromptText: {
    fontSize: 13,
    flex: 1,
  },
  commentsList: {
    gap: 12,
  },
  commentCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  commentAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarInitials: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  commentAvatarSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  commentAvatarPlaceholderSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarInitialsSmall: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '800',
  },
  commentDate: {
    fontSize: 11,
  },
  commentBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  replyButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  repliesContainer: {
    marginTop: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    gap: 8,
  },
  replyCard: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  replyTag: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  emptyBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
