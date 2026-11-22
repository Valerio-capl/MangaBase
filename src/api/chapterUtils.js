export const shouldShowChapterTitle = (titleOrChapter, maybeNumber) => {
  let title = titleOrChapter;
  let number = maybeNumber;

  if (typeof titleOrChapter === 'object' && titleOrChapter !== null) {
    title = titleOrChapter.title;
    number = titleOrChapter.number;
  }

  if (!title) return false;
  const lowerTitle = String(title).toLowerCase();
  const lowerNumber = String(number ?? '').toLowerCase();

  return (
    !lowerTitle.includes(`capitolo ${lowerNumber}`) &&
    !lowerTitle.includes(`chapter ${lowerNumber}`)
  );
};
