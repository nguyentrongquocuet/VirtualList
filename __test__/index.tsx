import { useScroll, useVirtual } from '@/hooks';
import React from 'react';

function getNumList(last: number): number[];
function getNumList(first: number, last: number): number[];
function getNumList(...args: number[]): number[] {
  if (args.length === 1) return getNumList(0, args[0]);

  let [first, last] = args;

  const out: number[] = [];

  while (first < last) {
    out.push(first);
    first += 1;
  }

  return out;
}

const createAsyncThrottle = <F extends () => Promise<any>>(f: F): F => {
  let paused = false;

  const ofn = () => {
    if (paused) return Promise.resolve(undefined);
    paused = true;
    f().then(() => {
      paused = false;
    });
    return Promise.resolve(undefined);
  };

  return ofn as F;
};

const MAX_RANGE = 10;

let index = MAX_RANGE;

const defaultState = getNumList(MAX_RANGE).map((v) => v.toString());

const weirdHeight = [
  {
    index: 2,
    height: 1000,
  },
  {
    index: 10,
    height: 30,
  },
];

const Test = () => {
  const [state, setState] = React.useState<string[]>(defaultState);

  const fetchMore = React.useMemo(
    () => createAsyncThrottle(
      () => new Promise((res) => {
        window.setTimeout(() => {
          console.log('fetchMore');
          index += 1;
          setState((old) => [...old, `${index}`]);
          res(undefined);
        }, 300);
      }),
    ),
    [],
  );

  const { ref } = useScroll<HTMLDivElement>(90, fetchMore);

  const { finalItems, wrapperStyle } = useVirtual({
    itemHeight: 200,
    items: state,
    ref,
    windowSize: 10,
    weirdHeight,
  });

  return (
    <div style={{ height: '100vh', overflowY: 'scroll' }} ref={ref}>
      <div className="placeholder" style={wrapperStyle} />
      {finalItems.map((v) => (
        <div key={v.data} className="item" data-index={v.index} style={v.style}>
          {v.data}
        </div>
      ))}
    </div>
  );
};

export default Test;
