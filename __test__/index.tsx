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

let index = 8;

const defaultState = getNumList(8).map((v) => v.toString());

const Test = () => {
  const [state, setState] = React.useState<string[]>(defaultState);

  const fetchMore = React.useMemo(
    () => createAsyncThrottle(
      () => new Promise((res) => {
        window.setTimeout(() => {
          console.log('fetchMore');
          setState((old) => [...old, `${index++}`]);
          res(undefined);
        }, 300);
      }),
    ),
    [],
  );

  const { ref, disable } = useScroll<HTMLDivElement>(90, fetchMore);

  const finalItems = useVirtual({
    itemHeight: 33,
    items: state,
    ref,
    windowSize: 10,
  });

  React.useEffect(() => {
    if (state.length < Number.MAX_SAFE_INTEGER) return;

    disable();
  }, [state, disable]);

  return (
    <div style={{ height: '206px', overflowY: 'scroll' }} ref={ref}>
      <div className="placeholder" />
      {finalItems.map((v) => (
        <div key={v} style={{ height: '33px' }} className="item">
          {v}
        </div>
      ))}
    </div>
  );
};

export default Test;
