import ErrorView from '@/src/errors/ErrorView';
import { ErrorInfo, getErrorMessage } from '@/src/errors/errorHelper';
import AntDesign from '@expo/vector-icons/AntDesign';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DownloadManager } from '../../api/downloadManager';
import SourceManager from '../../api/sourceManager';

const { width } = Dimensions.get('window');
interface ReaderImage {
  page: number;
  url: string;
  height?: number; 
  headers?: Record<string, string>;
}
type ReaderParams = {
  mangaId: string;
  slug: string;
  chapterId: string;
  source: string;
  chapterList?: string
};

const SelfSizingImage = React.memo(({ item, width }: { item: ReaderImage, width: number }) => {
  const [height, setHeight] = useState<number>(0);
  const [isCalculated, setIsCalculated] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    Image.getSize(
      item.url,
      (w, h) => {
        if (isMounted) {
          setHeight(width * (h / w));
          setIsCalculated(true);
        }
      },
      (error) => {
        console.warn("Image calculation error:", error);
        if (isMounted) {
          setHeight(width * 1.4);
          setIsCalculated(true);
        }
      }
    );

    return () => { isMounted = false; };
  }, [item.url, width]);

  if (!isCalculated) {
    return (
      <View style={{ width: width, height: width * 1.4, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
         <ActivityIndicator color="#A8B5DB" />
      </View>
    );
  }
  return (
    <View style={{ width, height, alignItems: 'center' }}>
      <ReactNativeZoomableView
        maxZoom={3}
        minZoom={1}
        zoomStep={0.5}
        initialZoom={1}
        bindToBorders={true}
        movementSensibility={1.5}
        disablePanOnInitialZoom={true}
      >
        <Image
          source={{ uri: item.url, headers: item.headers }}
          style={{ width, height }}
          resizeMode="contain"
        />
      </ReactNativeZoomableView>
    </View>
  );
});

export default function ReaderScreen() {
  const router = useRouter();
  const { mangaId, slug, chapterId, source, chapterList } = useLocalSearchParams<ReaderParams>();
  console.log(`loading ${slug} ${chapterId} from ${source}`)
  
  const chaptersArray = chapterList ? chapterList.split(',') : [];
  const currentIndex = chaptersArray.indexOf(chapterId as string);
  const nextChapterId = currentIndex > 0 ? chaptersArray[currentIndex - 1] : null;
  const prevChapterId = currentIndex < chaptersArray.length - 1 ? chaptersArray[currentIndex + 1] : null;

  const [images, setImages] = useState<ReaderImage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasMarkedRead, setHasMarkedRead] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchImages = async () => {
      setError(null);
      setLoading(true);
      if (!mangaId || !slug || !chapterId) {
        console.error("Missing parameters in ReaderScreen");
        setLoading(false);
        return;
      }

      try {
        let rawData: ReaderImage[] = [];
        if (source === 'local') {
          rawData = await DownloadManager.getLocalChapterImages(mangaId, chapterId);
        } else {
          rawData = await SourceManager.getChapterImages(source, mangaId, slug, chapterId);
        }
        if (!rawData || rawData.length === 0) {
          console.warn("No images found");
          if (isMounted) {
            setError({ message: "No images found. The chapter may be empty or unsupported.", action: 'home' });
            setLoading(false)};
          return;
        }
        
        if (isMounted) {
          setImages(rawData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Errore fetch reader:", err);
        setError(getErrorMessage(err));
        setLoading(false);
      }
    }; fetchImages();

    return () => { isMounted = false; };
  }, [mangaId, slug, chapterId, source, retryTrigger]);

  const markAsRead = async () => {
    if (hasMarkedRead) return;
    setHasMarkedRead(true);

    try {
      const progressStr = await AsyncStorage.getItem('read_chapters');
      const progress = progressStr ? JSON.parse(progressStr) : {};         
      if (!progress[mangaId]) progress[mangaId] = [];
      if (!progress[mangaId].includes(chapterId)) {
        progress[mangaId].push(chapterId);
        await AsyncStorage.setItem('read_chapters', JSON.stringify(progress));
      }
      const libraryStr = await AsyncStorage.getItem('myLibrary');
      if (libraryStr) {
        const library = JSON.parse(libraryStr);
        const mangaIndex = library.findIndex((m: any) => m.id === mangaId);
        if (mangaIndex !== -1) { //-1 se non è salvato
          library[mangaIndex].lastRead = Date.now(); 
          await AsyncStorage.setItem('myLibrary', JSON.stringify(library));
         }
      }
    }catch (error){
      console.error("error loading progress", error)
    }
  }


  const Footer = () => (
    <View style={styles.footerContainer}>
      <TouchableOpacity
        style={[styles.navButton, !prevChapterId && styles.navButtonDisabled]}
        disabled={!prevChapterId}
        onPress={() => router.replace({
          pathname: "../readerScreen/readerScreen",
          params: { mangaId, slug, source, chapterId: prevChapterId, chapterList }
        })}
      >
        <AntDesign name="arrow-left" size={22} color="white" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.navButton, !nextChapterId && styles.navButtonDisabled]}
        disabled={!nextChapterId}
        onPress={() => router.replace({
          pathname: "../readerScreen/readerScreen",
          params: { mangaId, slug, source, chapterId: nextChapterId, chapterList }
        })}
      >
        <AntDesign name="arrow-right" size={22} color="white" />
      </TouchableOpacity>
    </View>
  );

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
        onRetry={() => setRetryTrigger(prev => prev + 1)} 
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
    <View style={styles.container}>
      <FlatList
        data={images}
        keyExtractor={(item) => item.page.toString()}
        renderItem={({ item }) => (
          <SelfSizingImage item={item} width={width} />
        )}
        initialNumToRender={5}
        maxToRenderPerBatch={12}
        windowSize={9}
        // removeClippedSubviews={true}
        ListFooterComponent={Footer}
        onEndReached={markAsRead}
        onEndReachedThreshold={0.5}
      />
    </View>
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
  imageContainer: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  pageImage: {
    width: width,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 15,
    paddingHorizontal: 70,
    paddingBottom: 60, // Spazio extra per i dispositivi senza tasto home (iPhone)
    backgroundColor: '#000'
  },
  navButton: {
    flex: 1,
    padding: 6,
    backgroundColor: '#232c55',
    borderRadius: 12,
    alignItems: 'center',
    alignContent: 'space-around',
    marginHorizontal: 10,
  },
  nextButton: {
    backgroundColor: '#232c55', // Colore primario per risaltare
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
  },
});