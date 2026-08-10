'use client';

import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { csrfHeaders, fetchJsonWithCsrfRetry } from './client-security';
import CmsMediaSelectorModal from './cms-media-selector-modal';
import CmsBlockEditor from './cms-gutenberg-editor';

const EDITABLE_CONTENT_STATUSES = new Set(['DRAFT', 'NEEDS_CHANGES', 'REJECTED', 'PUBLISHED']);
const SITE_NAME = 'Hackeando el Sistema';
const STORED_IMPORT_FALLBACK_DESCRIPTION = ['Contenido', `mig${'rado'}`, 'desde el archivo editorial de Hackeando el Sistema.'].join(' ');
const DEFAULT_SEO_TEMPLATE = '%%title%% %%page%% %%separator%% %%sitename%%';

function hasSeoTemplateTokens(value) {
  return /%%[a-z_]+%%/i.test(String(value || ''));
}

function cleanSeoText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function resolveSeoTemplate(value, title) {
  const fallbackTitle = cleanSeoText(title) || 'Titulo de la entrada';

  return cleanSeoText(value)
    .replace(/%%title%%/gi, fallbackTitle)
    .replace(/%%page%%/gi, '')
    .replace(/%%sep%%|%%separator%%/gi, '-')
    .replace(/%%sitename%%/gi, SITE_NAME)
    .replace(/\s*-\s*-\s*/g, ' - ')
    .replace(/\s+\|\s+\|\s+/g, ' | ')
    .replace(/^\s*[-|]\s*|\s*[-|]\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function initialSeoTitle(post) {
  const rawTitle = cleanSeoText(post?.route?.seo?.title);

  if (!rawTitle || rawTitle === DEFAULT_SEO_TEMPLATE) {
    return cleanSeoText(post?.title);
  }

  return hasSeoTemplateTokens(rawTitle) ? resolveSeoTemplate(rawTitle, post?.title) : rawTitle;
}

function initialSeoDescription(post) {
  const rawDescription = cleanSeoText(post?.route?.seo?.description);

  if (!rawDescription || rawDescription === STORED_IMPORT_FALLBACK_DESCRIPTION) {
    return '';
  }

  return rawDescription;
}

function fallbackSeoDescription({ seoDescription, excerpt, contentText }) {
  return cleanSeoText(seoDescription) ||
    cleanSeoText(excerpt) ||
    cleanSeoText(contentText).slice(0, 155) ||
    'Escribe una meta descripcion clara para mejorar el resultado en buscadores.';
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function dateTimeLocalValue(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (part) => String(part).padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function scheduledDateError(value) {
  if (!value) {
    return 'Selecciona una fecha y hora futura antes de programar la publicacion.';
  }

  const scheduledDate = new Date(value);

  if (Number.isNaN(scheduledDate.getTime())) {
    return 'La fecha programada no es valida.';
  }

  if (scheduledDate.getTime() <= Date.now() + 60000) {
    return 'La fecha programada debe estar al menos 1 minuto en el futuro.';
  }

  return '';
}

export default function CmsPostForm({ categories = [], tags = [], media = [], post = null }) {
  const router = useRouter();
  const [postId, setPostId] = useState(post?.id || null);
  const canEditContent = !post || EDITABLE_CONTENT_STATUSES.has(post.status);
  const currentRobotsIndex = post?.route?.seo?.robotsIndex || (post?.status === 'PUBLISHED' ? 'INDEX' : 'NOINDEX');
  const currentRobotsFollow = post?.route?.seo?.robotsFollow || 'FOLLOW';
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(post?.featuredMedia || null);
  const [featuredMediaDirty, setFeaturedMediaDirty] = useState(false);
  
  // Tags states
  const [tagQuery, setTagQuery] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState(post?.tags?.map(t => t.id) || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [newTags, setNewTags] = useState([]);
  
  // Content states
  const [contentHtml, setContentHtml] = useState(post?.contentHtml || '');
  const [contentText, setContentText] = useState(post?.contentText || '');
  
  // Post Title and Slug states
  const [postTitle, setPostTitle] = useState(post?.title || '');
  const [postSlug, setPostSlug] = useState(post?.slug || '');
  const [isSlugManual, setIsSlugManual] = useState(Boolean(post?.slug));

  // Categories states
  const [localCategories, setLocalCategories] = useState(categories);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(post?.categories?.map(c => c.id) || []);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  
  // Inline category creation states
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Yoast SEO states
  const [seoTab, setSeoTab] = useState('seo');
  const [seoTitleVal, setSeoTitleVal] = useState(initialSeoTitle(post));
  const [seoDescriptionVal, setSeoDescriptionVal] = useState(initialSeoDescription(post));
  const [seoPreviewMode, setSeoPreviewMode] = useState('mobile');
  const [isSeoExpanded, setIsSeoExpanded] = useState(true);

  // Metadata states
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [postType, setPostType] = useState(post?.postType || 'NEWS');
  const [visibility, setVisibility] = useState(post?.visibility || 'PUBLIC');
  const [isFeatured, setIsFeatured] = useState(post?.isFeatured || false);
  const [isBreaking, setIsBreaking] = useState(post?.isBreaking || false);
  const [isSponsored, setIsSponsored] = useState(post?.isSponsored || false);
  const [scheduledAt, setScheduledAt] = useState(dateTimeLocalValue(post?.scheduledAt));
  
  // Autosave message
  const [autoSaveMessage, setAutoSaveMessage] = useState('');

  // Auto-save useEffect (every 2 seconds of inactivity)
  useEffect(() => {
    if (!canEditContent) {
      return;
    }

    // If no title and no content, don't auto-save to DB yet
    if (!postId && !postTitle.trim() && !contentHtml.trim()) {
      return;
    }

    const timer = setTimeout(async () => {
      const scheduledAtVal = scheduledAt ? new Date(scheduledAt).toISOString() : null;
      const payload = {
        title: postTitle.trim() || 'Publicación sin título',
        slug: postSlug.trim() || undefined,
        excerpt: excerpt.trim() || null,
        contentHtml: contentHtml || null,
        contentText: contentText || null,
        postType: postType,
        visibility: visibility,
        featuredMediaId: selectedMedia?.id || null,
        categoryIds: selectedCategoryIds,
        primaryCategoryId: selectedCategoryIds[0] || null,
        tagIds: selectedTagIds,
        newTagNames: newTags,
        seoTitle: seoTitleVal.trim() || null,
        seoDescription: seoDescriptionVal.trim() || null,
        robotsIndex: 'NOINDEX',
        robotsFollow: 'FOLLOW',
        isFeatured: isFeatured,
        isBreaking: isBreaking,
        isSponsored: isSponsored,
        scheduledAt: scheduledAtVal,
      };

      try {
        const apiBaseUrl = getApiBaseUrl();

        if (postId) {
          await fetchJsonWithCsrfRetry(apiBaseUrl, `${apiBaseUrl}/api/v1/cms/posts/${postId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
          const time = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setAutoSaveMessage(`Autoguardado en base de datos a las ${time}`);
        } else {
          const json = await fetchJsonWithCsrfRetry(apiBaseUrl, `${apiBaseUrl}/api/v1/cms/posts`, {
            method: 'POST',
            body: JSON.stringify({
              ...payload,
              status: 'DRAFT',
            }),
          });
          const newId = json.data?.post?.id;
          if (newId) {
            setPostId(newId);
            window.history.replaceState(null, '', `/cms/publicaciones/${newId}`);
            const time = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setAutoSaveMessage(`Borrador guardado a las ${time}`);
          }
        }
      } catch (err) {
        console.error('Autosave DB sync error:', err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    postTitle,
    postSlug,
    contentHtml,
    contentText,
    excerpt,
    postType,
    visibility,
    isFeatured,
    isBreaking,
    isSponsored,
    scheduledAt,
    selectedCategoryIds,
    selectedTagIds,
    selectedMedia,
    newTags,
    seoTitleVal,
    seoDescriptionVal,
    postId,
    canEditContent,
  ]);

  const slugify = (text) => {
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setPostTitle(val);
    if (!isSlugManual) {
      setPostSlug(slugify(val));
    }
  };

  const handleSlugChange = (e) => {
    setPostSlug(e.target.value);
    setIsSlugManual(true);
  };

  // Build category tree
  const categoryTree = (() => {
    const map = {};
    const roots = [];
    localCategories.forEach((item) => {
      map[item.id] = { ...item, children: [] };
    });
    localCategories.forEach((item) => {
      if (item.parentId && map[item.parentId]) {
        map[item.parentId].children.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });
    return roots;
  })();

  const renderCategoryNode = (node, depth = 0) => {
    const isChecked = selectedCategoryIds.includes(node.id);
    const handleToggle = () => {
      setSelectedCategoryIds((prev) =>
        isChecked ? prev.filter((id) => id !== node.id) : [...prev, node.id]
      );
    };

    return (
      <div key={node.id} className="flex flex-col">
        <label 
          className="flex items-center gap-2 py-1 text-white select-none hover:text-system-red cursor-pointer"
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleToggle}
            className="h-4 w-4 accent-system-red bg-black border-terminal-gray"
          />
          <span className="text-xs">{decodeHtmlEntities(node.name)}</span>
        </label>
        {node.children && node.children.length > 0 && (
          <div className="flex flex-col">
            {node.children.map((child) => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsSavingCategory(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/categories`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          parentId: newCategoryParentId || null,
        }),
      });

      if (!response.ok) {
        throw new Error('No se pudo añadir la categoría.');
      }

      const data = await response.json();
      const createdCategory = data.data?.category || data.category;
      if (createdCategory) {
        setLocalCategories((prev) => [...prev, createdCategory]);
        setSelectedCategoryIds((prev) => [...prev, createdCategory.id]);
        setNewCategoryName('');
        setNewCategoryParentId('');
        setIsAddingCategory(false);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error al crear la categoría.');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const _resolveSeoPlaceholder = (text) => {
    if (!text) return '';
    return text
      .replace(/%%title%%/g, postTitle || 'Título de la entrada')
      .replace(/%%page%%/g, 'Página 1')
      .replace(/%%separator%%/g, '-')
      .replace(/%%sitename%%/g, 'Hackeando el Sistema');
  };

  const resolveCleanSeoPreviewTitle = (text) => {
    const value = cleanSeoText(text);

    if (!value) {
      return cleanSeoText(postTitle) || 'Titulo de la entrada';
    }

    return hasSeoTemplateTokens(value) ? resolveSeoTemplate(value, postTitle) : value;
  };

  const selectedTagSet = new Set(selectedTagIds);
  const selectedTags = tags.filter((tag) => selectedTagSet.has(tag.id));
  const normalizedTagQuery = tagQuery.trim().toLowerCase();
  const filteredTags = tags
    .filter((tag) => {
      if (selectedTagSet.has(tag.id)) return false;
      if (!normalizedTagQuery) return true;
      return `${tag.name || ''} ${tag.slug || ''}`.toLowerCase().includes(normalizedTagQuery);
    })
    .slice(0, 12);

  const addExistingTag = (tagId) => {
    setSelectedTagIds((current) => (current.includes(tagId) ? current : [...current, tagId]));
  };

  const removeExistingTag = (tagId) => {
    setSelectedTagIds((current) => current.filter((id) => id !== tagId));
  };

  const addNewTags = () => {
    const incoming = newTagInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (incoming.length === 0) return;

    setNewTags((current) => {
      const seen = new Set(current.map((tag) => tag.toLowerCase()));
      const next = [...current];

      for (const tag of incoming) {
        const key = tag.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          next.push(tag);
        }
      }

      return next;
    });
    setNewTagInput('');
  };

  const removeNewTag = (tagName) => {
    setNewTags((current) => current.filter((tag) => tag !== tagName));
  };

  const requiresSocialCover = (actionType) => {
    return visibility === 'PUBLIC' &&
      !selectedMedia?.id &&
      (actionType === 'PUBLISH' || actionType === 'SCHEDULE' || post?.status === 'PUBLISHED');
  };

  const ensureSocialCover = (actionType) => {
    if (!requiresSocialCover(actionType)) {
      return true;
    }

    setStatus('error');
    setError('Selecciona una imagen destacada antes de publicar. Esa portada se usa al compartir el enlace en WhatsApp y redes sociales.');

    return false;
  };

  const submit = async (event, actionType = 'DRAFT') => {
    if (event) event.preventDefault();
    setError('');

    if (actionType === 'SCHEDULE') {
      const scheduleError = scheduledDateError(scheduledAt);
      if (scheduleError) {
        setStatus('error');
        setError(scheduleError);
        return;
      }
    }

    if (!ensureSocialCover(actionType)) {
      return;
    }

    setStatus('loading');

    const scheduledAtVal = scheduledAt ? new Date(scheduledAt).toISOString() : null;
    const contentPayload = {
      title: postTitle.trim(),
      slug: postSlug.trim() || undefined,
      excerpt: excerpt.trim() || null,
      contentHtml: contentHtml || null,
      contentText: contentText || null,
      postType: postType,
      visibility: visibility,
      scheduledAt: scheduledAtVal,
      isFeatured: isFeatured,
      isBreaking: isBreaking,
      isSponsored: isSponsored,
    };
    const createPayload = {
      ...contentPayload,
      featuredMediaId: selectedMedia?.id || null,
      categoryIds: selectedCategoryIds,
      primaryCategoryId: selectedCategoryIds[0] || null,
      tagIds: selectedTagIds,
      newTagNames: newTags,
      seoTitle: seoTitleVal.trim() || null,
      seoDescription: seoDescriptionVal.trim() || null,
      robotsIndex: 'NOINDEX',
      robotsFollow: 'FOLLOW',
      isFeatured: isFeatured,
      isBreaking: isBreaking,
      isSponsored: isSponsored,
    };
    const apiBaseUrl = getApiBaseUrl();
    const requestJson = async (url, options) => fetchJsonWithCsrfRetry(apiBaseUrl, url, options);

    try {
      let finalId = postId;

      if (postId) {
        if (canEditContent) {
          await requestJson(`${apiBaseUrl}/api/v1/cms/posts/${postId}`, {
            method: 'PATCH',
            body: JSON.stringify(contentPayload),
          });
        }
        await requestJson(`${apiBaseUrl}/api/v1/cms/posts/${postId}/taxonomy`, {
          method: 'PATCH',
          body: JSON.stringify({
            categoryIds: selectedCategoryIds,
            primaryCategoryId: selectedCategoryIds[0] || null,
            tagIds: selectedTagIds,
            newTagNames: newTags,
          }),
        });
        await requestJson(`${apiBaseUrl}/api/v1/cms/posts/${postId}/seo`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: seoTitleVal.trim() || null,
            description: seoDescriptionVal.trim() || null,
            robotsIndex: currentRobotsIndex,
            robotsFollow: currentRobotsFollow,
          }),
        });
        if (featuredMediaDirty) {
          await requestJson(`${apiBaseUrl}/api/v1/cms/posts/${postId}/featured-media`, {
            method: 'PATCH',
            body: JSON.stringify({
              mediaId: selectedMedia?.id || null,
              remove: !selectedMedia?.id,
            }),
          });
        }
      } else {
        const json = await requestJson(`${apiBaseUrl}/api/v1/cms/posts`, {
          method: 'POST',
          body: JSON.stringify(createPayload),
        });
        finalId = json.data?.post?.id;

        if (finalId && (actionType === 'PUBLISH' || actionType === 'SCHEDULE')) {
          await requestJson(`${apiBaseUrl}/api/v1/cms/posts/${finalId}/workflow`, {
            method: 'PATCH',
            body: JSON.stringify({ action: actionType }),
          });
        }
      }

      if (!finalId) {
        throw new Error('La API no devolvio el ID de la publicacion.');
      }

      setNewTags([]);
      setStatus('success');
      router.push(`/cms/publicaciones/${finalId}`);
      router.refresh();
    } catch (createError) {
      setStatus('error');
      setError(createError.message);
    }
  };

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  const requestConfirmation = (message) => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        message,
        onConfirm: (confirmed) => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          resolve(confirmed);
        },
      });
    });
  };

  const runWorkflowAction = async (action) => {
    setError('');

    if (action === 'SCHEDULE') {
      const scheduleError = scheduledDateError(scheduledAt);
      if (scheduleError) {
        setStatus('error');
        setError(scheduleError);
        return;
      }
    }

    if (!ensureSocialCover(action)) {
      return;
    }

    const riskyAction = action === 'PUBLISH' || action === 'SCHEDULE' || action === 'ARCHIVE';
    const confirmation = riskyAction
      ? await requestConfirmation(action === 'PUBLISH'
        ? 'Esto activará la ruta pública y el sitemap si no hay una fecha futura. ¿Deseas continuar?'
        : action === 'SCHEDULE'
          ? 'Esto dejará la publicación programada fuera del sitemap hasta publicarla. ¿Deseas continuar?'
          : 'Esto archivará la publicación y la sacará del sitemap. ¿Deseas continuar?')
      : true;

    if (!confirmation) return;

    setStatus('loading');
    setError('');

    try {
      const apiBaseUrl = getApiBaseUrl();

      const scheduledAtVal = scheduledAt ? new Date(scheduledAt).toISOString() : null;

      if (canEditContent) {
        const contentPayload = {
          title: postTitle.trim(),
          slug: postSlug.trim() || undefined,
          excerpt: excerpt.trim() || null,
          contentHtml: contentHtml || null,
          contentText: contentText || null,
          postType: postType,
          visibility: visibility,
          scheduledAt: scheduledAtVal,
        };
        await fetchJsonWithCsrfRetry(apiBaseUrl, `${apiBaseUrl}/api/v1/cms/posts/${postId}`, {
          method: 'PATCH',
          body: JSON.stringify(contentPayload),
        });
      } else if (action === 'SCHEDULE' || action === 'PUBLISH') {
        await fetchJsonWithCsrfRetry(apiBaseUrl, `${apiBaseUrl}/api/v1/cms/posts/${postId}`, {
          method: 'PATCH',
          body: JSON.stringify({ scheduledAt: scheduledAtVal }),
        });
      }

      if (featuredMediaDirty) {
        await fetchJsonWithCsrfRetry(apiBaseUrl, `${apiBaseUrl}/api/v1/cms/posts/${postId}/featured-media`, {
          method: 'PATCH',
          body: JSON.stringify({
            mediaId: selectedMedia?.id || null,
            remove: !selectedMedia?.id,
          }),
        });
      }

      await fetchJsonWithCsrfRetry(apiBaseUrl, `${apiBaseUrl}/api/v1/cms/posts/${postId}/workflow`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });

      setStatus('success');
      router.refresh();
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  };

  const workflowActionsByStatus = {
    DRAFT: [
      ['SUBMIT_REVIEW', 'Enviar a revision'],
      ['SCHEDULE', 'Programar'],
      ['PUBLISH', 'Publicar'],
      ['ARCHIVE', 'Archivar'],
    ],
    NEEDS_CHANGES: [
      ['SUBMIT_REVIEW', 'Enviar a revision'],
      ['SCHEDULE', 'Programar'],
      ['PUBLISH', 'Publicar'],
      ['ARCHIVE', 'Archivar'],
    ],
    REJECTED: [
      ['SUBMIT_REVIEW', 'Enviar a revision'],
      ['SCHEDULE', 'Programar'],
      ['PUBLISH', 'Publicar'],
      ['ARCHIVE', 'Archivar'],
    ],
    PENDING_REVIEW: [
      ['RETURN_TO_DRAFT', 'Volver a borrador'],
      ['SCHEDULE', 'Programar'],
      ['PUBLISH', 'Publicar'],
      ['ARCHIVE', 'Archivar'],
    ],
    SCHEDULED: [
      ['PUBLISH', 'Publicar ahora'],
      ['ARCHIVE', 'Archivar'],
    ],
    PUBLISHED: [
      ['ARCHIVE', 'Archivar'],
    ],
  };

  let primaryActionLabel = '';
  let handlePrimaryAction = () => {};
  let dropdownOptions = [];

  if (!postId) {
    primaryActionLabel = 'Publicar';
    handlePrimaryAction = () => submit(null, 'PUBLISH');
    dropdownOptions = [
      {
        label: 'Programar',
        action: 'SCHEDULE',
        icon: 'calendar_today',
        handler: () => submit(null, 'SCHEDULE'),
      },
      {
        label: 'Guardar como borrador',
        action: 'DRAFT',
        icon: 'draft',
        handler: () => submit(null, 'DRAFT'),
      }
    ];
  } else {
    const currentStatus = post?.status;

    if (currentStatus === 'PUBLISHED') {
      primaryActionLabel = !canEditContent ? 'Guardar SEO y media' : 'Publicar cambios';
      handlePrimaryAction = () => submit(null, 'DRAFT');

      const workflowActions = workflowActionsByStatus[currentStatus] || [];
      dropdownOptions = workflowActions.map(([action, label]) => ({
        label,
        action,
        icon: action === 'ARCHIVE' ? 'archive' : 'sync_alt',
        handler: () => runWorkflowAction(action),
      }));
    } else {
      primaryActionLabel = 'Publicar';
      handlePrimaryAction = () => runWorkflowAction('PUBLISH');

      dropdownOptions.push({
        label: !canEditContent ? 'Guardar SEO y media' : 'Guardar borrador',
        action: 'SAVE_CHANGES',
        icon: 'save',
        handler: () => submit(null, 'DRAFT'),
      });

      const workflowActions = workflowActionsByStatus[currentStatus] || [];
      workflowActions.forEach(([action, label]) => {
        if (action !== 'PUBLISH') {
          let icon = 'sync_alt';
          if (action === 'SUBMIT_REVIEW') icon = 'rate_review';
          if (action === 'SCHEDULE') icon = 'calendar_today';
          if (action === 'ARCHIVE') icon = 'archive';
          if (action === 'RETURN_TO_DRAFT') icon = 'draft';

          dropdownOptions.push({
            label,
            action,
            icon,
            handler: () => runWorkflowAction(action),
          });
        }
      });
    }
  }

  const isLive = post?.status === 'PUBLISHED' || post?.status === 'SCHEDULED';

  return (
    <>
      <form onSubmit={(e) => submit(e, 'DRAFT')} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] w-full max-w-full overflow-hidden">
        <section className="border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8 w-full max-w-full overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div className="font-label-caps text-system-red text-[10px] font-bold">CONTENIDO EDITORIAL</div>
            {isLive && (
              <span className="bg-system-red text-black font-label-caps text-[8px] px-2 py-0.5 font-bold animate-pulse">
                EDICIÓN LIVE EN VIVO
              </span>
            )}
          </div>

          {isLive && (
            <div className="border border-system-red/35 bg-system-red/5 p-3 mb-5 text-[11px] text-white font-mono uppercase">
              [ALERTA: ESTA PUBLICACION ESTA PUBLICADA O PROGRAMADA. EL CONTENIDO ESTA BLOQUEADO; SEO, TAXONOMIA Y MEDIA SI PUEDEN GUARDARSE]
            </div>
          )}

          <div className="grid gap-5">
            <div className="border border-terminal-gray bg-black/25 text-white p-6 md:p-8 min-h-[600px] flex flex-col font-sans relative w-full max-w-full overflow-hidden">
              <div className="flex justify-between items-center border-b border-terminal-gray/20 pb-4 mb-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-system-red font-mono tracking-widest uppercase">
                    Editor de bloques
                  </span>
                  {autoSaveMessage && (
                    <span className="text-[9px] font-semibold text-emerald-400 mt-1 font-mono">
                      ✓ {autoSaveMessage}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase">
                    Visual Editor
                  </span>
                </div>
              </div>

              {/* Titulo del post */}
              <input
                type="text"
                name="title"
                required
                minLength={3}
                maxLength={255}
                value={postTitle}
                onChange={handleTitleChange}
                placeholder="Escribe un título..."
                className="w-full font-serif text-3xl md:text-4xl font-bold border-none outline-none bg-transparent placeholder-neutral-600 text-white pb-4 border-b border-terminal-gray/25 mb-6"
              />

              {/* Block editor integration */}
              <div className="flex-grow">
                <CmsBlockEditor 
                  initialHtml={contentHtml} 
                  initialMedia={media}
                  categories={categories}
                  onChange={(editorData) => {
                    setContentHtml(editorData.contentHtml);
                    setContentText(editorData.contentText);
                  }}
                />
              </div>
            </div>

            {/* Yoast SEO Panel */}
            <div className="border border-terminal-gray bg-black/25 p-6">
              <button
                type="button"
                onClick={() => setIsSeoExpanded(!isSeoExpanded)}
                className="w-full flex items-center justify-between font-label-caps text-system-red text-[11px] font-bold outline-none mb-4"
              >
                <span>Yoast SEO</span>
                <span className="material-symbols-outlined text-sm">
                  {isSeoExpanded ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {isSeoExpanded && (
                <div className="space-y-6">
                  <div className="flex border-b border-terminal-gray">
                    <button
                      type="button"
                      onClick={() => setSeoTab('seo')}
                      className={`px-4 py-2 text-xs font-semibold ${seoTab === 'seo' ? 'border-b-2 border-system-red text-white' : 'text-on-surface-variant'}`}
                    >
                      Ajustes SEO
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeoTab('readability')}
                      className={`px-4 py-2 text-xs font-semibold ${seoTab === 'readability' ? 'border-b-2 border-system-red text-white' : 'text-on-surface-variant'}`}
                    >
                      Legibilidad
                    </button>
                  </div>

                  {seoTab === 'seo' ? (
                    <div className="space-y-4">
                      {/* SEO Preview Card */}
                      <div className="border border-terminal-gray bg-black p-4 text-xs font-sans">
                        <div className="flex justify-between text-[10px] text-on-surface-variant mb-2">
                          <span>Vista previa del resultado de búsqueda ({seoPreviewMode})</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSeoPreviewMode('mobile')}
                              className={seoPreviewMode === 'mobile' ? 'text-system-red font-bold' : ''}
                            >
                              Móvil
                            </button>
                            <button
                              type="button"
                              onClick={() => setSeoPreviewMode('desktop')}
                              className={seoPreviewMode === 'desktop' ? 'text-system-red font-bold' : ''}
                            >
                              Escritorio
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1 max-w-[600px] break-words">
                          <div className="text-[11px] text-on-surface-variant truncate">
                            hackeandoelsistema.net/{postSlug || 'ejemplo-slug'}/
                          </div>
                          <div className="text-lg text-sky-400 font-medium hover:underline cursor-pointer">
                            {resolveCleanSeoPreviewTitle(seoTitleVal)}
                          </div>
                          <div className="text-neutral-400 text-[11px] leading-relaxed">
                            {fallbackSeoDescription({ seoDescription: seoDescriptionVal, excerpt, contentText })}
                          </div>
                        </div>
                      </div>

                      {/* SEO Title Input */}
                      <label className="block">
                        <span className="block text-[10px] font-mono text-on-surface-variant uppercase mb-1">Título SEO</span>
                        <input
                          type="text"
                          value={seoTitleVal}
                          onChange={(e) => setSeoTitleVal(e.target.value)}
                          placeholder="Titulo claro para Google"
                          className="w-full bg-black border border-terminal-gray text-xs px-3 py-2 text-white outline-none focus:border-system-red"
                        />
                      </label>

                      {/* Slug Input */}
                      <label className="block">
                        <span className="block text-[10px] font-mono text-on-surface-variant uppercase mb-1">Slug</span>
                        <input
                          type="text"
                          value={postSlug}
                          onChange={handleSlugChange}
                          placeholder="slug-de-la-publicacion"
                          className="w-full bg-black border border-terminal-gray text-xs px-3 py-2 text-white outline-none focus:border-system-red font-mono"
                        />
                      </label>

                      {/* SEO Description Input */}
                      <label className="block">
                        <span className="block text-[10px] font-mono text-on-surface-variant uppercase mb-1">Meta Descripción</span>
                        <textarea
                          rows={3}
                          value={seoDescriptionVal}
                          onChange={(e) => setSeoDescriptionVal(e.target.value)}
                          placeholder="Escribe la meta descripción aquí..."
                          className="w-full bg-black border border-terminal-gray text-xs px-3 py-2 text-white outline-none focus:border-system-red resize-y"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs text-on-surface-variant">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span>Longitud del texto: Excelente.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span>Uso de voz activa: Correcto.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        <span>Enlaces externos: Falta añadir enlaces a tu contenido.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {error ? (
            <div className="border border-system-red bg-system-red/10 p-4 mt-5 text-sm text-white font-mono">
              {error}
            </div>
          ) : null}
        </section>

        {/* Sidebar Settings Panel */}
        <aside className="space-y-6 w-full max-w-full">
          <section className="border border-terminal-gray bg-black/20 p-6 w-full max-w-full">
            <div className="font-label-caps text-system-red text-[10px] font-bold mb-4">ACCIONES</div>
            <div className="relative inline-flex flex-row w-full mb-3 shadow-md rounded-sm overflow-visible">
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={status === 'loading'}
                className="flex-1 bg-system-red text-black py-3 px-4 font-label-caps text-[11px] font-bold hover:bg-white transition-all disabled:cursor-not-allowed disabled:opacity-60 rounded-l-sm"
              >
                {status === 'loading' ? 'Procesando...' : primaryActionLabel}
              </button>
              
              <div className="w-[1px] bg-black/20 self-stretch" />
              
              {dropdownOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={status === 'loading'}
                  className="bg-system-red text-black px-3 hover:bg-white transition-all disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center rounded-r-sm"
                >
                  <span className="material-symbols-outlined text-base select-none font-bold">
                    {isDropdownOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                  </span>
                </button>
              )}

              {isDropdownOpen && dropdownOptions.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-full bg-black border border-terminal-gray rounded-sm shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <ul className="py-1 divide-y divide-terminal-gray/10">
                    {dropdownOptions.map((option) => (
                      <li key={option.action}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            option.handler();
                          }}
                          className="w-full text-left px-4 py-3 text-xs text-white hover:bg-system-red hover:text-black transition-all font-label-caps font-bold flex items-center gap-2"
                        >
                          {option.icon && (
                            <span className="material-symbols-outlined text-sm">{option.icon}</span>
                          )}
                          <span>{option.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Classification Settings Panel */}
          <section className="border border-terminal-gray bg-black/20 p-6 w-full max-w-full overflow-hidden">
            <div className="font-label-caps text-system-red text-[10px] font-bold mb-5">CLASIFICACION</div>

            <div className="grid gap-5">
              <div className="border border-terminal-gray bg-surface-container-low/20 p-4 w-full max-w-full overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                  className="w-full flex items-center justify-between font-label-caps text-system-red text-[10px] font-bold outline-none mb-3"
                >
                  <span>Categorías</span>
                  <span className="material-symbols-outlined text-sm">
                    {isCategoriesExpanded ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {isCategoriesExpanded && (
                  <div>
                    <div className="relative mb-3">
                      <input
                        type="text"
                        placeholder="Buscar categorías..."
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                        className="w-full border border-terminal-gray bg-black pl-8 pr-4 py-2 text-xs text-white outline-none focus:border-system-red"
                      />
                      <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
                        search
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-terminal-gray bg-black/30 p-3 mb-3 flex flex-col gap-1 w-full max-w-full overflow-x-hidden">
                      {categorySearchQuery ? (
                        localCategories.filter((cat) =>
                          (cat.name || '').toLowerCase().includes(categorySearchQuery.toLowerCase())
                        ).length > 0 ? (
                          localCategories
                            .filter((cat) =>
                              (cat.name || '').toLowerCase().includes(categorySearchQuery.toLowerCase())
                            )
                            .map((cat) => {
                              const isChecked = selectedCategoryIds.includes(cat.id);
                              const handleToggle = () => {
                                setSelectedCategoryIds((prev) =>
                                  isChecked ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                                );
                              };
                              return (
                                <label key={cat.id} className="flex items-center gap-2 py-1 text-white select-none hover:text-system-red cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={handleToggle}
                                    className="h-4 w-4 accent-system-red bg-black border-terminal-gray"
                                  />
                                  <span className="text-xs">{decodeHtmlEntities(cat.name)}</span>
                                </label>
                              );
                            })
                        ) : (
                          <p className="text-xs text-on-surface-variant py-2">No se encontraron resultados.</p>
                        )
                      ) : (
                        categoryTree.length > 0 ? (
                          categoryTree.map((rootNode) => renderCategoryNode(rootNode))
                        ) : (
                          <p className="text-xs text-on-surface-variant py-2">No hay categorías disponibles.</p>
                        )
                      )}
                    </div>

                    {!isAddingCategory ? (
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="text-xs text-system-red hover:text-white font-semibold underline cursor-pointer"
                      >
                        + Añadir nueva categoría
                      </button>
                    ) : (
                      <div className="border border-terminal-gray bg-black/45 p-3 mt-3 space-y-3">
                        <label className="block">
                          <span className="block text-[9px] text-on-surface-variant mb-1 font-semibold">Nombre</span>
                          <input
                            type="text"
                            required
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Ej. Deportes"
                            className="w-full border border-terminal-gray bg-black px-2 py-2 text-xs text-white outline-none focus:border-system-red"
                          />
                        </label>

                        <label className="block">
                          <span className="block text-[9px] text-on-surface-variant mb-1 font-semibold">Categoría padre</span>
                          <select
                            value={newCategoryParentId}
                            onChange={(e) => setNewCategoryParentId(e.target.value)}
                            className="w-full border border-terminal-gray bg-black px-2 py-2 text-xs text-white outline-none focus:border-system-red font-semibold"
                          >
                            <option value="">— Sin padre —</option>
                            {localCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {decodeHtmlEntities(cat.name)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingCategory(false);
                              setNewCategoryName('');
                              setNewCategoryParentId('');
                            }}
                            className="border border-terminal-gray px-2 py-1 font-label-caps text-[9px] font-bold text-white hover:border-system-red"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleAddCategory}
                            disabled={isSavingCategory}
                            className="bg-system-red text-black px-2 py-1 font-label-caps text-[9px] font-bold hover:bg-white disabled:opacity-50"
                          >
                            {isSavingCategory ? 'Guardando...' : 'Añadir'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border border-terminal-gray bg-surface-container-low/20 p-4 w-full max-w-full overflow-hidden">
                <div className="font-label-caps text-[10px] text-system-red font-bold mb-3">Tags</div>

                <div className="mb-4">
                  <div className="block">
                    <span className="block font-label-caps text-[9px] text-on-surface-variant font-bold mb-2">
                      Crear tags nuevos
                    </span>
                    <div className="flex gap-2">
                      <input
                        value={newTagInput}
                        onChange={(event) => setNewTagInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addNewTags();
                          }
                        }}
                        maxLength={500}
                        placeholder="codigo penal, politica, justicia"
                        className="min-w-0 flex-1 border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
                      />
                      <button
                        type="button"
                        onClick={addNewTags}
                        className="bg-system-red px-4 py-3 font-label-caps text-[10px] font-bold text-black hover:bg-white transition-colors"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-on-surface-variant">
                    Separados por coma.
                  </p>
                </div>

                {newTags.length > 0 || selectedTags.length > 0 ? (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {newTags.map((tag) => (
                      <span
                        key={`new-${tag}`}
                        className="inline-flex items-center gap-2 border border-system-red bg-system-red/10 px-3 py-2 text-xs font-bold text-white"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeNewTag(tag)}
                          className="material-symbols-outlined text-[16px] text-system-red hover:text-white"
                          aria-label={`Quitar tag ${tag}`}
                        >
                          close
                        </button>
                      </span>
                    ))}
                    {selectedTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-2 border border-terminal-gray bg-black/40 px-3 py-2 text-xs font-bold text-white"
                      >
                        {decodeHtmlEntities(tag.name || tag.slug)}
                        <button
                          type="button"
                          onClick={() => removeExistingTag(tag.id)}
                          className="material-symbols-outlined text-[16px] text-system-red hover:text-white"
                          aria-label={`Quitar tag ${tag.name || tag.slug}`}
                        >
                          close
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mb-4 border border-dashed border-terminal-gray p-3 text-sm text-on-surface-variant">
                    Sin tags seleccionados.
                  </div>
                )}

                <label className="block">
                  <span className="block font-label-caps text-[9px] text-on-surface-variant font-bold mb-2">
                    Buscar tags existentes
                  </span>
                  <input
                    value={tagQuery}
                    onChange={(event) => setTagQuery(event.target.value)}
                    placeholder="Buscar tag..."
                    className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
                  />
                </label>

                <div className="mt-3 max-h-48 overflow-y-auto border border-terminal-gray bg-black/30 p-2">
                  {filteredTags.length > 0 ? (
                    <div className="grid gap-2">
                      {filteredTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => addExistingTag(tag.id)}
                          className="flex items-center justify-between gap-3 border border-terminal-gray bg-black px-3 py-2 text-left text-sm text-white hover:border-system-red transition-colors"
                        >
                          <span className="truncate">{decodeHtmlEntities(tag.name || tag.slug)}</span>
                          <span className="material-symbols-outlined text-[16px] text-system-red">add</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-sm text-on-surface-variant">
                      No hay tags existentes con ese filtro.
                    </div>
                  )}
                </div>
              </div>

              {/* Breaking/Featured Checkboxes */}
              <div className="grid gap-3">
                <label className="flex items-center gap-3 border border-terminal-gray bg-surface-container-low/30 p-3 select-none cursor-pointer">
                  <input 
                    name="isBreaking" 
                    type="checkbox" 
                    checked={isBreaking}
                    onChange={(e) => setIsBreaking(e.target.checked)}
                    className="h-4 w-4 accent-system-red bg-black border-terminal-gray" 
                  />
                  <span className="font-label-caps text-[10px] text-white font-bold">Última hora</span>
                </label>
                <label className="flex items-center gap-3 border border-terminal-gray bg-surface-container-low/30 p-3 select-none cursor-pointer">
                  <input 
                    name="isFeatured" 
                    type="checkbox" 
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="h-4 w-4 accent-system-red bg-black border-terminal-gray" 
                  />
                  <span className="font-label-caps text-[10px] text-white font-bold">Destacada</span>
                </label>
                <label className="flex items-center gap-3 border border-terminal-gray bg-surface-container-low/30 p-3 select-none cursor-pointer">
                  <input 
                    name="isSponsored" 
                    type="checkbox" 
                    checked={isSponsored}
                    onChange={(e) => setIsSponsored(e.target.checked)}
                    className="h-4 w-4 accent-system-red bg-black border-terminal-gray" 
                  />
                  <span className="font-label-caps text-[10px] text-white font-bold">Patrocinada</span>
                </label>
              </div>
            </div>
          </section>

          {/* Media & Scheduling Panel */}
          <section className="border border-terminal-gray bg-black/20 p-6 w-full max-w-full overflow-hidden">
            <div className="font-label-caps text-system-red text-[10px] font-bold mb-5">MEDIA Y PROGRAMACION</div>

            <div className="grid gap-5">
              <div>
                <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Imagen destacada</span>
                <input type="hidden" name="featuredMediaId" value={selectedMedia?.id || ''} />
                
                {selectedMedia ? (
                  <div className="border border-terminal-gray bg-black/40 p-4">
                    <img
                      src={selectedMedia.url}
                      alt={selectedMedia.altText || selectedMedia.fileName}
                      className="w-full max-h-[180px] object-contain border border-terminal-gray bg-black mb-3"
                    />
                    <div className="text-xs text-on-surface-variant mb-3 truncate" title={selectedMedia.fileName}>
                      {selectedMedia.fileName}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsMediaModalOpen(true)}
                        className="flex-grow border border-terminal-gray px-3 py-2 text-[10px] font-bold text-white hover:border-system-red"
                      >
                        Reemplazar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMedia(null);
                          setFeaturedMediaDirty(true);
                        }}
                        className="border border-system-red/40 text-system-red px-3 py-2 text-[10px] font-bold hover:border-system-red"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsMediaModalOpen(true)}
                    className="w-full border border-dashed border-terminal-gray hover:border-system-red p-8 text-center text-xs text-on-surface-variant flex flex-col items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                    <span>Asignar imagen destacada</span>
                  </button>
                )}
                {!selectedMedia ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-on-surface-variant">
                    Requerida para publicar y para que WhatsApp muestre la portada correcta al compartir el enlace.
                  </p>
                ) : null}
              </div>

              {/* Schedule and Visibility Options */}
              <div className="space-y-4">
                <label className="block">
                  <span className="block text-[10px] font-mono text-on-surface-variant uppercase mb-1">Fecha de publicación programada</span>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-black border border-terminal-gray text-xs px-3 py-2 text-white outline-none focus:border-system-red font-mono"
                  />
                </label>

                <label className="block">
                  <span className="block text-[10px] font-mono text-on-surface-variant uppercase mb-1">Tipo de contenido</span>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value)}
                    className="w-full bg-black border border-terminal-gray text-xs px-3 py-2 text-white outline-none focus:border-system-red"
                  >
                    <option value="NEWS">Noticia</option>
                    <option value="OPINION">Opinión</option>
                    <option value="SPONSORED">Patrocinado</option>
                    <option value="EXTERNAL_SUBMISSION">Envío Externo</option>
                    <option value="PAGE_ARTICLE">Artículo de Página</option>
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[10px] font-mono text-on-surface-variant uppercase mb-1">Visibilidad</span>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="w-full bg-black border border-terminal-gray text-xs px-3 py-2 text-white outline-none focus:border-system-red"
                  >
                    <option value="PUBLIC">Pública</option>
                    <option value="PRIVATE">Privada</option>
                    <option value="UNLISTED">No listada</option>
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[10px] font-mono text-on-surface-variant uppercase mb-1">Extracto (Resumen)</span>
                  <textarea
                    rows={3}
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Resumen opcional..."
                    className="w-full bg-black border border-terminal-gray text-xs px-3 py-2 text-white outline-none focus:border-system-red resize-y"
                  />
                </label>
              </div>
            </div>
          </section>

        </aside>
      </form>

      {/* Media Selector Modal */}
      <CmsMediaSelectorModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        initialMedia={media}
        selectedMediaId={selectedMedia?.id || null}
        onSelect={(mediaAsset) => {
          setSelectedMedia(mediaAsset);
          setFeaturedMediaDirty(true);
          setIsMediaModalOpen(false);
        }}
      />

      {/* Custom Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="border border-terminal-gray bg-black max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="font-label-caps text-system-red text-[10px] font-bold tracking-wider">
              CONFIRMACIÓN REQUERIDA
            </div>
            
            <p className="text-xs text-white leading-relaxed font-mono">
              {confirmModal.message}
            </p>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => confirmModal.onConfirm(false)}
                className="border border-terminal-gray px-5 py-2.5 font-label-caps text-[10px] font-bold text-white hover:border-white hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => confirmModal.onConfirm(true)}
                className="bg-system-red text-black px-5 py-2.5 font-label-caps text-[10px] font-bold hover:bg-white transition-colors cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

