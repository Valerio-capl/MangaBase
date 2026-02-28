
import SourceManager from '../../api/sourceManager';
import { DownloadManager } from '../../api/downloadManager';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, Image, StyleSheet, FlatList, ActivityIndicator, Dimensions } from 'react-native';
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
};

export default function ReaderScreen() {
  const router = useRouter();
  const { mangaId, slug, chapterId, source } = useLocalSearchParams<ReaderParams>();
  console.log(`caricando ${slug} ${chapterId} da ${source}`)

  const [images, setImages] = useState<ReaderImage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const calculateImageHeights = async (imagesData: ReaderImage[]): Promise<ReaderImage[]> => {
    const promises = imagesData.map(async (item) => {
      return new Promise<ReaderImage>((resolve) => {
        Image.getSize(
          item.url,
          (imgWidth, imgHeight) => {
            const calculatedHeight = width * (imgHeight / imgWidth);
            resolve({ ...item, height: calculatedHeight });
          },
          (error) => {
            console.warn("Errore dimensione immagine:", error);
            resolve({ ...item, height: width * 1.4 });
          }
        );
      });
    });

    return await Promise.all(promises);
  };

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
        
        const dataWithHeights = await calculateImageHeights(rawData);
        if (isMounted) {
          setImages(dataWithHeights);
          setLoading(false);
        }

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
          console.error("errore caricare progresso")
        }

      } catch (error) {
        console.error("Errore fetch reader:", error);
        setLoading(false);
      }
    }; fetchImages();

    return () => { isMounted = false; };
  }, [mangaId, slug, chapterId, source]);

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
          <View style={[styles.imageContainer, { height: item.height }]}> 
            <Image 
              source={{ uri: item.url, headers:item.headers }} 
              style={[styles.pageImage, { height: item.height }]}
              resizeMode="contain"
            />
          </View>
        )}
        initialNumToRender={2}
        windowSize={5}
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
});