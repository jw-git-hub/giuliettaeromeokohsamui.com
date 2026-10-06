// Нижняя панель появляется, когда гость пролистал первый экран: кнопка Book Now ушла вверх за край.
// Пока до кнопки не дошли или она на экране, панель скрыта — первый экран остаётся чистым.
// У формы брони панель тоже прячется: на экране всегда ровно одно действие «забронировать».
// data-bar-hide="until-passed" — цель держит панель скрытой, пока её не прокрутили выше экрана (кнопка);
// data-bar-hide — пока видна любая её часть (форма выше экрана телефона).

const BAR_SELECTOR = '[data-bottom-bar]';
const HIDE_TARGET_SELECTOR = '[data-bar-hide]';
const HIDE_MODE_ATTRIBUTE = 'data-bar-hide';
const UNTIL_PASSED_MODE = 'until-passed';
const VISIBLE_ATTRIBUTE = 'data-visible';
const ENHANCED_ATTRIBUTE = 'data-enhanced';
// Область наблюдения продлена далеко вниз за экран: цель «в области», пока она на экране или ниже него,
// и выходит из неё, только уйдя вверх. Так прыжок по ссылке мимо цели не остаётся незамеченным.
const SCREEN_AND_BELOW = '0px 0px 100000px 0px';

function setBarVisible(bar: HTMLElement, isVisible: boolean): void {
  bar.toggleAttribute(VISIBLE_ATTRIBUTE, isVisible);
  bar.inert = !isVisible;
}

function hidesUntilPassed(target: Element): boolean {
  return target.getAttribute(HIDE_MODE_ATTRIBUTE) === UNTIL_PASSED_MODE;
}

function watchHideTargets(bar: HTMLElement): void {
  const targetsHoldingBar = new Set<Element>();
  const updateBar = (entries: IntersectionObserverEntry[]): void => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) targetsHoldingBar.add(entry.target);
      else targetsHoldingBar.delete(entry.target);
    });
    setBarVisible(bar, targetsHoldingBar.size === 0);
  };
  const onScreen = new IntersectionObserver(updateBar);
  const notYetPassed = new IntersectionObserver(updateBar, { rootMargin: SCREEN_AND_BELOW });
  document.querySelectorAll(HIDE_TARGET_SELECTOR).forEach((target) => {
    const observer = hidesUntilPassed(target) ? notYetPassed : onScreen;
    observer.observe(target);
  });
}

function initBottomBar(): void {
  const bar = document.querySelector<HTMLElement>(BAR_SELECTOR);
  if (!bar || !('IntersectionObserver' in window)) return;
  bar.setAttribute(ENHANCED_ATTRIBUTE, '');
  // Скрыта, пока наблюдатели не скажут иначе: на первом экране панель не мелькает.
  setBarVisible(bar, false);
  watchHideTargets(bar);
}

initBottomBar();
