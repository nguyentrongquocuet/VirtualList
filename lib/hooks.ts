import React from 'react';

const getCoordinate = (e: HTMLElement) => {
  const { scrollHeight, scrollTop, clientHeight } = e;

  return {
    scrollTop,
    scrollHeight,
    clientHeight,
  };
};

const sum = (nums: number[]) => nums.reduce((s, n) => s + n, 0);

const divideToPercent = (amount: number, total: number) => (amount * 100) / total;

const isLowerOrEqual = (a: number, b: number) => a - b <= 0;

/**
 * Helper hook that helps automate the process of trigger action
 * when a DOM scrollable container reached the threshold
 * - `ref` will take advantage over `setRef`
 */
const useScroll = <T extends HTMLElement>(
  threshold = 90,
  callback: Function = () => {},
) => {
  const ref = React.useRef<T | null>(null);
  const disabled = React.useRef(false);

  const [domNode, setDomNode] = React.useState<T | null>(null);

  /**
   * Disable calling the callback
   */
  const disable = React.useCallback(() => {
    disabled.current = true;
  }, []);

  /**
   * Enable calling the callback
   */
  const enable = React.useCallback(() => {
    disabled.current = false;
  }, []);

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

type TWeirdHeight = {
  index: number;
  height: number;
};
type TWeirdVal = {
  val: number;
  index: number;
};

type TSumAtIndex = {
  index: number;
  sum: number;
};

type TUseVirtualConfig<T> = {
  itemHeight: number;
  items: T[];
  ref: React.RefObject<HTMLElement>;
  windowSize?: number;
  itemSelector?: string;
  placeholderSelector?: string;
  weirdHeight?: TWeirdHeight[];
};

/**
 * Calculate sum of numbers from index 0 to the weird-position(including itself)
 * - weird-position: the position that have different val
 */
const sumAtWeirdValsWithCache = (
  commonVal: number,
  weirdVals: TWeirdVal[] = [],
): TSumAtIndex[] => {
  let prev: TSumAtIndex | null = null;

  return weirdVals.map(({ index, val }) => {
    if (!prev) {
      const sum = index * commonVal + val;
      prev = { sum, index };
      return { ...prev };
    }

    const sum = prev.sum + (index - prev.index - 1) * commonVal + val;

    prev = { sum, index };

    return {
      sum,
      index,
    };
  });
};

const findIndex = (
  amount: number,
  commonVal: number,
  weirdVals: TWeirdVal[] = [],
) => {
  const sumAtWeirdVals = sumAtWeirdValsWithCache(commonVal, weirdVals);

  const closestWeirdSumIndex = sumAtWeirdVals.findIndex(
    (item) => item.sum > amount,
  );

  if (closestWeirdSumIndex >= 0) {
    const closestLower = sumAtWeirdVals[closestWeirdSumIndex - 1];
    if (!closestLower) {
      return Math.ceil(amount / commonVal);
    }

    console.log(closestLower, amount);
    return Math.ceil(
      (amount - closestLower.sum) / commonVal + closestLower.index,
    );
  }

  return Math.ceil(amount / commonVal);
};

// eslint-disable-next-line max-len
const getTotalAmount = (
  size: number,
  commonAmount: number,
  weirdAmounts: number[] = [],
) => (size - weirdAmounts.length) * commonAmount + sum(weirdAmounts);

const getIndex = (
  amount: number,
  commonAmount: number,
  weirdAmounts: TWeirdHeight[],
) => {
  if (!weirdAmounts.length) {
    return Math.floor(amount / commonAmount);
  }

  const firstIndex = findIndex(
    amount,
    commonAmount,
    weirdAmounts.map((v) => ({ val: v.height, index: v.index })),
  );

  console.log({ firstIndex });

  return firstIndex === 0 ? 0 : firstIndex - 1;
};

const getTotalAmountUpToIndex = (index: number, commonVal: number, sumAtWeirdVals: TSumAtIndex[]) => {
  const closestGreaterIndex = sumAtWeirdVals.findIndex(({ sum }) => sum > index);
  if (closestGreaterIndex >= 0) {
    const closestLower = sumAtWeirdVals[closestGreaterIndex - 1];

    if (!closestLower) {
      return commonVal * index;
    }

    return closestLower.sum + (index - closestLower.index) * commonVal;
  }

  return commonVal * index;
};

type TCSS = Partial<CSSStyleDeclaration> & any;

type TWrapper<T> = {
  data: T;
  index: number;
  style: TCSS;
};

/**
 * Very light script that helps improving better scrolling exprience on large list of data
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
    ref,
    items,
    itemHeight,
    itemSelector = '.item',
    placeholderSelector = '.placeholder',
    windowSize = 7,
    weirdHeight,
  } = config;

  const [finalItems, setFinalItems] = React.useState<TWrapper<T>[]>(
    () => items.slice(0, windowSize).map(
      (v, i) => ({ data: v, index: i, style: {} }),
    ),
  );

  const [wrapperStyle, setWrapperStyle] = React.useState<TCSS>(placeholderStyle);

  React.useEffect(() => {
    const { current: containerEl } = ref;

    const wh = weirdHeight || [];

    const getFromWh = (index: number, wH: TWeirdHeight[]) => wH.find(
      (item) => item.index === index,
    );

    const calculateThenApplyStyle = () => {
      if (!containerEl) return;
      /**
       * Make sure container has relative position
       */
      containerEl.style.position = 'relative';

      /**
       * Recalculate the total height in case items's length changed
       */

      const totalHeight = getTotalAmount(
        items.length,
        itemHeight,
        wh.map((w) => w.height),
      );

      console.log(totalHeight);

      const { scrollTop } = getCoordinate(containerEl);

      const placeholderEl = containerEl.querySelector(
        placeholderSelector,
      ) as HTMLElement;

      if (!placeholderEl) return;

      /**
       * Index of the first item that have a piece of visible space
       */
      const firstIndex = getIndex(scrollTop, itemHeight, wh);

      setWrapperStyle({
        height: `${totalHeight}px`,
        ...placeholderStyle,
      });

      const sm = sumAtWeirdValsWithCache(itemHeight, wh.map(
        (v) => ({ index: v.index, val: v.height }),
      ));

      let nextTop = getTotalAmountUpToIndex(firstIndex, itemHeight, sm);

      const mapItem = (item: T, index: number): TWrapper<T> => {
        const realIndex = index + firstIndex;
        const height = getFromWh(realIndex, wh)?.height || itemHeight;
        const top = nextTop;
        nextTop = top + height;

        return {
          index: realIndex,
          data: item,
          style: {
            ...itemStyle,
            height: `${height}px`,
            top: `${top}px`,
          },
        };
      };

      setFinalItems(
        items.slice(firstIndex, firstIndex + windowSize).map(mapItem),
      );
    };

    calculateThenApplyStyle();

    containerEl?.addEventListener('scroll', calculateThenApplyStyle);

    return () => {
      containerEl?.removeEventListener('scroll', calculateThenApplyStyle);
    };
  }, [
    items,
    itemHeight,
    ref,
    placeholderSelector,
    itemSelector,
    windowSize,
    weirdHeight,
  ]);

  return {
    finalItems,
    wrapperStyle,
  };
};

export { useScroll, useVirtual };
