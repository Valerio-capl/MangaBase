import SourceManager from '@/src/api/sourceManager';
import { ErrorInfo, getErrorMessage } from '@/src/errors/errorHelper';
import { useCallback, useEffect, useState } from 'react';
import { Chapter, MangaDetailsData } from './types';

export { Chapter, MangaDetailsData };

export function useMangaDetails(
  id?: string | string[],
  slug?: string | string[],
  source?: string | string[]
) {
  const [manga, setManga] = useState<MangaDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorInfo | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!id || !slug || !source) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await SourceManager.getMangaDetails(
        source.toString(),
        id.toString(),
        slug.toString()
      );
      setManga(data);
    } catch (err) {
      console.error("Details Error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, slug, source]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return { manga, loading, error, refetch: fetchDetails };
}
