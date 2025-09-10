export function getBreakpoints(width: number) {
  return {
    isPhoneSmall: width < 360,
    isPhone: width < 768,
    isTablet: width >= 768 && width < 1024,
    isLarge: width >= 1024,
  };
}

export function posterSizeForWidth(width: number) {
  const { isPhone, isTablet, isLarge } = getBreakpoints(width);
  const cardsPerRow = isLarge ? 6 : isTablet ? 5 : isPhone ? 3 : 4;
  const gutter = 16;
  const totalGutter = gutter * (cardsPerRow + 1);
  const cardWidth = Math.floor((width - totalGutter) / cardsPerRow);
  const cardHeight = Math.round(cardWidth * 1.5);
  return { cardWidth, cardHeight, gutter };
}


