import { updateLastRead } from '@/src/api/libraryStorage';
import { saveChapterRead } from '@/src/api/readingProgress';
import ReaderFooter from '@/src/components/reader/readerFooter';
import SelfSizingImage from '@/src/components/reader/selfSizingImage';
import { useChapterImages } from '@/src/components/reader/useChapterImages';
import ErrorView from '@/src/errors/ErrorView';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

type ReaderParams = {
  mangaId: string;
  slug: string;
  chapterId: string;
  source: string;
  originalSource?: string;
  chapterList?: string;
};

export default function ReaderScreen() {
  const router = useRouter();
  const { mangaId, slug, chapterId, source, originalSource, chapterList } = useLocalSearchParams<ReaderParams>();

  const chaptersArray = chapterList ? chapterList.split(',') : [];
  const currentIndex = chaptersArray.indexOf(chapterId as string);
  const nextChapterId = currentIndex > 0 ? chaptersArray[currentIndex - 1] : null;
  const prevChapterId = currentIndex < chaptersArray.length - 1 ? chaptersArray[currentIndex + 1] : null;

  const [hasMarkedRead, setHasMarkedRead] = useState(false);

  const { images, loading, error, retry } = useChapterImages({
    mangaId,
    slug,
    chapterId,
    source,
    originalSource,
  });

  const markAsRead = async () => {
    if (hasMarkedRead) return;
    setHasMarkedRead(true);

    try {
      await saveChapterRead(mangaId, chapterId);
      await updateLastRead(mangaId, source, originalSource);
    } catch (error) {
      console.error("error loading progress", error);
    }
  };

  const navigateToChapter = useCallback((targetChapterId: string) => {
    router.replace({
      pathname: "../readerScreen/readerScreen",
      params: { mangaId, slug, source, originalSource, chapterId: targetChapterId, chapterList }
    });
  }, [router, mangaId, slug, source, originalSource, chapterList]);

  const handlePrev = useCallback(() => {
    if (prevChapterId) navigateToChapter(prevChapterId);
  }, [prevChapterId, navigateToChapter]);

  const handleNext = useCallback(() => {
    if (nextChapterId) navigateToChapter(nextChapterId);
  }, [nextChapterId, navigateToChapter]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10, color: 'white' }}>{source === 'local' ? 'Opening File...' : 'Loading pages...'}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <ErrorView
        message={error.message}
        action={error.action}
        onRetry={retry}
      />
    );
  }

  if (!images || images.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'white' }}>No images found.</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <FlatList
        data={images}
        keyExtractor={(item) => item.page.toString()}
        renderItem={({ item }) => (
          <SelfSizingImage item={item} width={width} />
        )}
        initialNumToRender={5}
        maxToRenderPerBatch={11}
        windowSize={9}
        ListFooterComponent={
          <ReaderFooter
            onPrev={handlePrev}
            onNext={handleNext}
            hasPrev={Boolean(prevChapterId)}
            hasNext={Boolean(nextChapterId)}
          />
        }
        onEndReached={markAsRead}
        onEndReachedThreshold={0.5}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
