// Нижняя панель видна, пока на экране нет ни кнопки Book Now первого экрана, ни формы брони:
// так на экране всегда ровно одно действие «забронировать», и панель не закрывает форму.
// data-bar-hide="full" — цель считается видимой, только когда видна целиком (кнопка);
// data-bar-hide — когда видна любая её часть (форма выше экрана телефона).

const BAR_SELECTOR = '[data-bottom-bar]';
const HIDE_TARGET_SELECTOR = '[data-bar-hide]';
const HIDE_MODE_ATTRIBUTE = 'data-bar-hide';
const FULL_MODE = 'full';
const VISIBLE_ATTRIBUTE = 'data-visible';
const ENHANCED_ATTRIBUTE = 'data-enhanced';
const PARTLY_VISIBLE = 0;
const FULLY_VISIBLE = 1;
const ROUNDING_TOLERANCE = 0.01;

function setBarVisible(bar: HTMLElement, isVisible: boolean): void {
  bar.toggleAttribute(VISIBLE_ATTRIBUTE, isVisible);
  bar.inert = !isVisible;
}

function isOnScreen(entry: IntersectionObserverEntry): boolean {
  const needsFullView = entry.target.getAttribute(HIDE_MODE_ATTRIBUTE) === FULL_MODE;
  if (!needsFullView) return entry.isIntersecting;
  return entry.intersectionRatio >= FULLY_VISIBLE - ROUNDING_TOLERANCE;
}

function watchHideTargets(bar: HTMLElement): void {
  const targetsOnScreen = new Set<Element>();
  const updateBar = (entries: IntersectionObserverEntry[]): void => {
    entries.forEach((entry) => {
      if (isOnScreen(entry)) targetsOnScreen.add(entry.target);
      else targetsOnScreen.delete(entry.target);
    });
    setBarVisible(bar, targetsOnScreen.size === 0);
  };
  const observer = new IntersectionObserver(updateBar, { threshold: [PARTLY_VISIBLE, FULLY_VISIBLE] });
  document.querySelectorAll(HIDE_TARGET_SELECTOR).forEach((target) => observer.observe(target));
}

function initBottomBar(): void {
  const bar = document.querySelector<HTMLElement>(BAR_SELECTOR);
  if (!bar || !('IntersectionObserver' in window)) return;
  bar.setAttribute(ENHANCED_ATTRIBUTE, '');
  setBarVisible(bar, true);
  watchHideTargets(bar);
}

initBottomBar();
