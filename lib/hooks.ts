import React from 'react';

const getCoordinate = (e: HTMLElement) => {
  const { scrollHeight, scrollTop, clientHeight } = e;

  return {
    scrollTop,
    scrollHeight,
    clientHeight,
  };
};

const scrollPercent = (amount: number, total: number) => (amount * 100) / total;

const isReachedThreshold = (threadHold: number, percent: number) => threadHold - percent <= 0;

const useScroll = <T extends HTMLElement>(callback: Function = () => {}) => {
  const ref = React.useRef<T | null>(null);
  const disabled = React.useRef(false);

  const disable = React.useMemo(() => () => { disabled.current = true; }, []);
  const enable = React.useMemo(() => () => { disabled.current = false; }, []);

  React.useEffect(() => {
    const { current } = ref;
    if (!current) return undefined;

    const onScroll = () => {
      if (!current) return;

      const { scrollHeight, scrollTop, clientHeight } = getCoordinate(current);

      const shouldCallCb = isReachedThreshold(
        90,
        scrollPercent(scrollTop + clientHeight, scrollHeight),
      );

      if (!shouldCallCb) return;
      if (disabled.current) return;

      callback();
    };

    current.addEventListener('scroll', onScroll);

    return () => {
      if (!current) return;

      current.removeEventListener('scroll', onScroll);
    };
  }, [callback]);

  return {
    ref,
    disable,
    enable,
    disabled,
  };
};

type TUseVirtualConfig<T> = {
  itemHeight: number;
  items: T[];
  ref: React.RefObject<HTMLElement>;
  windowSize?: number;
  itemSelector?: string;
  placeholderSelector?: string;
};

const useVirtual = <T>(config: TUseVirtualConfig<T>) => {
  const {
    ref, items, itemHeight, itemSelector = '.item', placeholderSelector = '.placeholder', windowSize = 7,
  } = config;

  const [finalItems, setFinalItems] = React.useState<T[]>(() => items.slice(0, windowSize));

  React.useEffect(() => {
    const { current: containerEl } = ref;

    const onScroll = () => {
      if (!containerEl) return;
      containerEl.style.position = 'relative';
      const totalHeight = items.length * itemHeight;

      const { scrollTop } = getCoordinate(containerEl);

      const placeholderEl = containerEl.querySelector(placeholderSelector) as HTMLElement;
      if (!placeholderEl) return;

      const firstIndex = Math.floor(scrollTop / itemHeight);
      const firstIndexTop = scrollTop - firstIndex * itemHeight;

      console.log({ scrollTop, firstIndexTop, items });

      setFinalItems(items.slice(firstIndex, firstIndex + windowSize));

      Object.assign(placeholderEl.style, {
        height: `${totalHeight}px`,
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
      });

      const itemEls = containerEl.querySelectorAll(itemSelector) as NodeListOf<HTMLElement>;

      itemEls.forEach((item, index) => {
        Object.assign(item.style, {
          position: 'absolute',
          height: `${itemHeight}px`,
          left: 0,
          top: `${scrollTop - firstIndexTop + index * itemHeight}px`,
        });
      });
    };

    onScroll();

    containerEl?.addEventListener('scroll', onScroll);

    return () => {
      containerEl?.removeEventListener('scroll', onScroll);
    };
  }, [items, itemHeight, ref, placeholderSelector, itemSelector, windowSize]);

  return finalItems;
};

export { useScroll, useVirtual };
