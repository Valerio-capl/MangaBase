import { useEffect, useState } from 'react';
import { DownloadManager } from '@/src/api/downloadManager';
import SourceManager from '@/src/api/sourceManager';
import { ErrorInfo, getErrorMessage } from '@/src/errors/errorHelper';
import { ReaderImage } from './selfSizingImage';

interface UseChapterImagesParams {
  mangaId?: string;
  slug?: string;
  chapterId?: string;
  source?: string;
  originalSource?: string;
}

export function useChapterImages({
  mangaId,
  slug,
  chapterId,
  source,
  originalSource,
}: UseChapterImagesParams) {
  const [images, setImages] = useState<ReaderImage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
          rawData = await DownloadManager.getLocalChapterImages(mangaId, chapterId, originalSource);
        } else {
          rawData = await SourceManager.getChapterImages(source, mangaId, slug, chapterId);
        }

        if (!rawData || rawData.length === 0) {
          console.warn("No images found");
          if (isMounted) {
            setError({ message: "No images found. The chapter may be empty or unsupported.", action: 'home' });
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setImages(rawData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Errore fetch reader:", err);
        if (isMounted) {
          setError(getErrorMessage(err));
          setLoading(false);
        }
      }
    };

    fetchImages();

    return () => {
      isMounted = false;
    };
  }, [mangaId, slug, chapterId, source, originalSource, retryTrigger]);

  const retry = () => setRetryTrigger((prev) => prev + 1);

  return { images, loading, error, retry };
}
