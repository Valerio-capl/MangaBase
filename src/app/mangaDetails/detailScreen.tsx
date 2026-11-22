import { isMangaSaved, toggleSaveManga } from '@/src/api/libraryStorage';
import { getContinueTarget, getReadChapters } from '@/src/api/readingProgress';
import ChapterListHeader from '@/src/components/details/chapterListHeader';
import ChapterRow from '@/src/components/details/chapterRow';
import DetailHeader from '@/src/components/details/detailHeader';
import DownloadModal from '@/src/components/details/downloadModal';
import SelectionActionButton from '@/src/components/details/selectionActionButton';
import { Chapter } from '@/src/components/details/types';
import { useChapterDownloads } from '@/src/components/details/useChapterDownloads';
import { useChapterSelection } from '@/src/components/details/useChapterSelection';
import { useMangaDetails } from '@/src/components/details/useMangaDetails';
import ErrorView from '@/src/errors/ErrorView';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import styles from "./styleScreen";

export default function MangaDetails() {
  const router = useRouter();
  const { id, slug, source } = useLocalSearchParams();

  const { manga, loading, error, refetch: fetchDetails } = useMangaDetails(id, slug, source);
  const [limit, setLimit] = useState(10);
  const [isSaved, setIsSaved] = useState(false);
  const [readChapters, setReadChapters] = useState<string[]>([]);

  const {
    selectionMode,
    selectedChapters,
    actionType,
    toggleSelectionMode,
    activateDownloadMode,
    activateDeleteMode,
    toggleChapterSelection,
    resetSelection,
  } = useChapterSelection();

  const {
    downloadedChapters,
    isDownloading,
    downloadStatus,
    refreshDownloads,
    startDownload,
    handleDelete,
  } = useChapterDownloads();

  useEffect(() => {
    const checkStatus = async () => {
      if (!id) return;
      const saved = await isMangaSaved(id.toString(), source?.toString());
      setIsSaved(saved);
    };
    checkStatus();
  }, [id, source]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const mangaId = id.toString();
      refreshDownloads(mangaId, source?.toString());
      getReadChapters(mangaId).then(setReadChapters);
    }, [id, source, refreshDownloads])
  );

  const handleSavePress = async () => {
    if (!manga) return;
    try {
      const newSaved = await toggleSaveManga(manga, source?.toString());
      setIsSaved(newSaved);
    } catch (err) {
      console.error("Saving Error:", err);
    }
  };

  const handleChapterPress = (chapter: Chapter) => {
    if (!manga) return;

    if (selectionMode) {
      if (actionType === 'delete') {
        const isDownloaded = downloadedChapters.includes(chapter.id);
        if (!isDownloaded) {
          return;
        }
      }
      toggleChapterSelection(chapter.id);
    } else {
      const chapterListString = manga.chapters.map((c) => c.id).join(',');
      const isDownloaded = downloadedChapters.includes(chapter.id);
      router.push({
        pathname: "../readerScreen/readerScreen",
        params: {
          mangaId: id,
          slug: slug,
          chapterId: chapter.id,
          source: isDownloaded ? 'local' : source,
          originalSource: source,
          chapterList: chapterListString,
        },
      });
    }
  };

  const handleActionPress = () => {
    if (!manga) return;

    if (actionType === 'download') {
      startDownload(manga, selectedChapters, source, () => {
        resetSelection();
      });
    } else {
      const mangaId = Array.isArray(id) ? id[0] : id;
      if (mangaId) {
        handleDelete(mangaId.toString(), selectedChapters, source?.toString(), () => {
          resetSelection();
        });
      }
    }
  };

  const showAllChapters = () => {
    if (manga) {
      setLimit(manga.chapters.length);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#A8B5DB" />
        <Text style={{ color: '#A8B5DB', marginTop: 10 }}>Loading Details...</Text>
      </View>
    );
  }

  if (error) {
    return <ErrorView message={error.message} action={error.action} onRetry={fetchDetails} />;
  }

  if (!manga) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'white' }}>Data not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#A8B5DB' }}>go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayedChapters = (() => {
    if (selectionMode && actionType === 'delete') {
      return manga.chapters.filter((ch) => downloadedChapters.includes(ch.id));
    }
    if (selectionMode) {
      return manga.chapters;
    }
    return manga.chapters.slice(0, limit);
  })();

  const hasMoreChapters = limit < manga.chapters.length;
  const continueTarget = getContinueTarget(manga.chapters, readChapters);

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {!selectionMode ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>Go Back</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={toggleSelectionMode} style={styles.backButton}>
            <Text style={[styles.backText, { color: '#FF6B6B' }]}>Cancel</Text>
          </TouchableOpacity>
        )}

        {selectionMode && (
          <Text style={styles.selectionTitle} numberOfLines={1}>
            {manga.title}
          </Text>
        )}
      </View>

      <DownloadModal
        visible={isDownloading || downloadStatus !== ""}
        downloadStatus={downloadStatus}
      />

      <FlatList
        data={displayedChapters}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={() => (
          <View>
            {!selectionMode && (
              <DetailHeader
                manga={manga}
                isSaved={isSaved}
                onSavePress={handleSavePress}
                continueTarget={continueTarget}
                onContinuePress={handleChapterPress}
              />
            )}
            <ChapterListHeader
              selectionMode={selectionMode}
              totalChapters={manga.chapters.length}
              selectedCount={selectedChapters.length}
              onActivateDownload={activateDownloadMode}
              onActivateDelete={activateDeleteMode}
            />
          </View>
        )}
        ListEmptyComponent={() => (
          selectionMode && actionType === 'delete' ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#888', fontStyle: 'italic' }}>
                No chapters to delete.
              </Text>
            </View>
          ) : null
        )}
        renderItem={({ item }) => (
          <ChapterRow
            chapter={item}
            selectionMode={selectionMode}
            isSelected={selectedChapters.includes(item.id)}
            isRead={readChapters.includes(item.id)}
            onPress={handleChapterPress}
          />
        )}
        ListFooterComponent={() => (
          !selectionMode && hasMoreChapters ? (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.loadMoreButton} onPress={showAllChapters}>
                <Text style={styles.loadMoreText}>Show more...</Text>
              </TouchableOpacity>
            </View>
          ) : null
        )}
      />

      <SelectionActionButton
        selectionMode={selectionMode}
        selectedCount={selectedChapters.length}
        actionType={actionType}
        onPress={handleActionPress}
      />
    </View>
  );
}
