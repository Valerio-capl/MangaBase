export interface Chapter {
  id: string;
  number: string;
  title: string;
  url: string;
  date?: string;
}

export interface MangaDetailsData {
  id: string;
  slug: string;
  title: string;
  author: string;
  year: string;
  status: string;
  coverUrl: string;
  description: string;
  chapters: Chapter[];
}
