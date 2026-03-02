
import SourceManager from '../../api/sourceManager';
import { DownloadManager } from '../../api/downloadManager';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, Image, StyleSheet, FlatList, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        console.warn("Errore calcolo immagine:", error);
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
    <View style={{ width, height }}>
      <Image
        source={{ uri: item.url, headers: item.headers }}
        style={{ width, height }}
        resizeMode="contain"
      />
    </View>
  );
});

export default function ReaderScreen() {
  const router = useRouter();
  const { mangaId, slug, chapterId, source, chapterList } = useLocalSearchParams<ReaderParams>();
  console.log(`caricando ${slug} ${chapterId} da ${source}`)
  
  const chaptersArray = chapterList ? chapterList.split(',') : [];
  const currentIndex = chaptersArray.indexOf(chapterId as string);
  const nextChapterId = currentIndex > 0 ? chaptersArray[currentIndex - 1] : null;
  const prevChapterId = currentIndex < chaptersArray.length - 1 ? chaptersArray[currentIndex + 1] : null;

  const [images, setImages] = useState<ReaderImage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasMarkedRead, setHasMarkedRead] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchImages = async () => {
      setLoading(true);
      if (!mangaId || !slug || !chapterId) {
        console.error("Parametri mancanti nel ReaderScreen");
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
          console.warn("Nessuna immagine trovata");
          if (isMounted) setLoading(false);
          return;
        }
        
        // const dataWithHeights = await calculateImageHeights(rawData);
        if (isMounted) {
          setImages(rawData);
          setLoading(false);
        }
      } catch (error) {
        console.error("Errore fetch reader:", error);
        setLoading(false);
      }
    }; fetchImages();

    return () => { isMounted = false; };
  }, [mangaId, slug, chapterId, source]);

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
      console.error("errore caricare progresso", error)
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
        <Text style={[styles.navButtonText, { fontWeight: 'bold' }]}>{"<-"}</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.navButton, !nextChapterId && styles.navButtonDisabled]}
        disabled={!nextChapterId}
        onPress={() => router.replace({
          pathname: "../readerScreen/readerScreen",
          params: { mangaId, slug, source, chapterId: nextChapterId, chapterList }
        })}
      >
        <Text style={[styles.navButtonText, { fontWeight: 'bold' }]}>{"->"}</Text>
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
        initialNumToRender={2}
        windowSize={5}
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
    justifyContent: 'space-between',
    padding: 15,
    paddingHorizontal: 50,
    paddingBottom: 60, // Spazio extra per i dispositivi senza tasto home (iPhone)
    backgroundColor: '#000'
  },
  navButton: {
    flex: 1,
    padding: 6,
    backgroundColor: '#232c55',
    borderRadius: 10,
    alignItems: 'center',
    alignContent: 'space-around',
    marginHorizontal: 25,
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