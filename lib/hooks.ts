import React from 'react';

const getCoordinate = (e: HTMLElement) => {
  const { scrollHeight, scrollTop, clientHeight } = e;

  return {
    scrollTop,
    scrollHeight,
    clientHeight,
  };
};

const divideToPercent = (amount: number, total: number) => (amount * 100) / total;

const isLowerOrEqual = (a: number, b: number) => a - b <= 0;

/**
 * Helper hook that helps automate the process of trigger action
 * when a DOM scrollable container reached the threshold
 * - `ref` will take advantage over `setRef`
 */
const useScroll = <T extends HTMLElement>(threshold = 90, callback: Function = () => {}) => {
  const ref = React.useRef<T | null>(null);
  const disabled = React.useRef(false);

  const [domNode, setDomNode] = React.useState<T | null>(null);

  /**
   * Disable calling the callback
   */
  const disable = React.useCallback(() => { disabled.current = true; }, []);

  /**
   * Enable calling the callback
   */
  const enable = React.useCallback(() => { disabled.current = false; }, []);

  const setRef: React.RefCallback<T> = React.useCallback((el: T) => {
    ref.current = el;
    setDomNode(el);
  }, []);

  React.useEffect(() => {
    let { current: container } = ref;

    container = container || domNode;

    if (!container) return undefined;

    const onScroll = () => {
      if (disabled.current) return;
      if (!container) return;

      const { scrollHeight, scrollTop, clientHeight } = getCoordinate(container);

      const shouldCallCb = isLowerOrEqual(
        threshold,
        divideToPercent(scrollTop + clientHeight, scrollHeight),
      );

      if (!shouldCallCb) return;

      callback();
    };

    container.addEventListener('scroll', onScroll);

    return () => {
      container?.removeEventListener('scroll', onScroll);
    };
  }, [threshold, callback, domNode]);

  return {
    ref,
    setRef,
    disable,
    enable,
    disabled,
  };
};

const applyStyle = (el: HTMLElement, style: Partial<HTMLElement['style']>) => {
  Object.assign(el.style, style);
};

const placeholderStyle = {
  position: 'absolute',
  top: '0',
  left: '0',
  width: '100%',
};

const itemStyle = {
  position: 'absolute',
  left: '0px',
};

type TUseVirtualConfig<T> = {
  itemHeight: number;
  items: T[];
  ref: React.RefObject<HTMLElement>;
  windowSize?: number;
  itemSelector?: string;
  placeholderSelector?: string;
};

/**
 * Very ligth script that helps improving better scrolling exprience on large list of data
 * @param {TUseVirtualConfig} config Option passed to this hook
 * - `config.itemHeight`: height of one item in pixel
 * - `config.items`: list of item's data
 * - `config.ref`: ref of the container (use `React.createRef<HTMLElement>`)
 * - `config.windowSize`: number of items to render in a window
 * - `config.itemSelector`: the item's CSS selector
 * - `config.placeholderSelector`: the placeholder CSS selector
 * @description Given a config, return a slice of data that
 * will be used for render
 * @author quoc187
 */
const useVirtual = <T>(config: TUseVirtualConfig<T>) => {
  const {
    ref, items, itemHeight, itemSelector = '.item', placeholderSelector = '.placeholder', windowSize = 7,
  } = config;

  const [finalItems, setFinalItems] = React.useState<T[]>(() => items.slice(0, windowSize));

  React.useEffect(() => {
    const { current: containerEl } = ref;

    const calculateThenApplyStyle = () => {
      if (!containerEl) return;
      /**
       * Make sure container has relative position
       */
      containerEl.style.position = 'relative';

      /**
       * Recalculate the total height in case items's length changed
       */
      const totalHeight = items.length * itemHeight;

      const { scrollTop } = getCoordinate(containerEl);

      const placeholderEl = containerEl.querySelector(placeholderSelector) as HTMLElement;

      if (!placeholderEl) return;

      /**
       * Index of the first item that have a piece of visible space
       */
      const firstIndex = Math.floor(scrollTop / itemHeight);
      // const firstIndexTop = scrollTop - firstIndex * itemHeight;

      setFinalItems(items.slice(firstIndex, firstIndex + windowSize));

      applyStyle(placeholderEl, {
        height: `${totalHeight}px`,
        ...placeholderStyle,
      });

      const itemEls = containerEl.querySelectorAll(itemSelector) as NodeListOf<HTMLElement>;

      /**
       * Item at index `i` of `items` will be `i * itemHeight`px far the top of the container
       */
      itemEls.forEach((item, index) => {
        applyStyle(item, {
          ...itemStyle,
          height: `${itemHeight}px`,
          top: `${(firstIndex + index) * itemHeight}px`,
        });
      });
    };

    calculateThenApplyStyle();

    containerEl?.addEventListener('scroll', calculateThenApplyStyle);

    return () => {
      containerEl?.removeEventListener('scroll', calculateThenApplyStyle);
    };
  }, [items, itemHeight, ref, placeholderSelector, itemSelector, windowSize]);

  return finalItems;
};

export { useScroll, useVirtual };
