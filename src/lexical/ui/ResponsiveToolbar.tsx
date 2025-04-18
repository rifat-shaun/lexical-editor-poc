import useResizeObserver from '@react-hook/resize-observer';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export interface OverflowButtonProps {
  children: React.ReactNode;
  overflowingIndices: number[];
}

export type OverflowButton = React.FC<OverflowButtonProps>;

export interface ResponsiveToolbarProps {
  children: React.ReactNode;
  overflowButton: OverflowButton;
  overflowButtonProps?: {};
  activeIndex?: number;
}

function Divider() {
  return (
    <div className='!min-w-[2px] !w-[2px] !max-w-[2px] h-[28px] bg-neutral-300 dark:bg-black-400 mr-2' />
  );
}

export const ResponsiveToolbar: React.FC<ResponsiveToolbarProps> = ({
  children,
  overflowButton: OverflowButtonComponent,
  overflowButtonProps = {},
  activeIndex: newActiveIndex = null,
}) => {
  const [forceRecalculateCounter, setForceRecalculateCounter] = useState<number>(0);

  const forceRecalculateAmountShownChildren = () => {
    setForceRecalculateCounter((oldForceRecalculateCounter) => oldForceRecalculateCounter + 1);
  };

  const virtualOverflowButtonRef = useRef<HTMLDivElement>(null);
  const virtualContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const virtualChildRefs = useRef<React.RefObject<HTMLDivElement | null>[]>([]);

  const [previousActiveIndex, setPreviousActiveIndex] = useState<number | null>(null);
  const [currentActiveIndex, setCurrentActiveIndex] = useState<number | null>(newActiveIndex);

  const amountChildren = React.Children.count(children);

  const [amountShownChildren, setAmountShownChildren] = useState<number>(amountChildren);

  const childIndices: number[] = useMemo(
    () => React.Children.toArray(children).map((child, index) => index),
    [children],
  );

  const sortedChildIndices = useMemo(
    () =>
      [...childIndices].sort((a, b) => {
        if (a === currentActiveIndex) return -1;
        if (b === currentActiveIndex) return 1;
        if (a === previousActiveIndex) return -1;
        if (b === previousActiveIndex) return 1;

        return 0;
      }),
    [childIndices, currentActiveIndex, previousActiveIndex],
  );

  const shownChildIndices = useMemo(() => {
    return sortedChildIndices.slice(0, amountShownChildren).sort();
  }, [amountShownChildren, sortedChildIndices]);

  const overflowingChildIndices = useMemo(() => {
    return sortedChildIndices.slice(amountShownChildren).sort();
  }, [amountShownChildren, sortedChildIndices]);

  const recalculateAmountShownChildren = useCallback(() => {
    const virtualOverflowButtonWidth =
      virtualOverflowButtonRef.current?.getBoundingClientRect().width;
    const virtualContainerWidth = virtualContainerRef.current?.getBoundingClientRect().width;
    const containerWidth = containerRef.current?.getBoundingClientRect().width;

    if (
      undefined === virtualOverflowButtonWidth ||
      undefined === containerWidth ||
      undefined === virtualContainerWidth
    ) {
      return;
    }

    if (containerWidth >= virtualContainerWidth) {
      setAmountShownChildren(amountChildren);

      return;
    }

    let currentAmountShownChildren = 0;
    let currentShownChildrenCombinedWidth = virtualOverflowButtonWidth;

    const sortedChildRefs = [...virtualChildRefs.current].sort();
    sortedChildRefs.forEach((ref) => {
      const currentChildRef = ref.current;

      if (!currentChildRef) {
        return;
      }

      currentShownChildrenCombinedWidth += currentChildRef.getBoundingClientRect().width;

      if (currentShownChildrenCombinedWidth <= containerWidth) {
        currentAmountShownChildren++;
      }
    });

    if (currentAmountShownChildren < amountShownChildren) {
      setPreviousActiveIndex(null);
    }

    setAmountShownChildren(currentAmountShownChildren);
  }, [amountChildren, amountShownChildren]);

  useEffect(() => {
    if (newActiveIndex === currentActiveIndex) {
      return;
    }

    if (null === newActiveIndex || shownChildIndices.includes(newActiveIndex)) {
      if (currentActiveIndex !== null && currentActiveIndex + 1 > amountShownChildren) {
        setPreviousActiveIndex(currentActiveIndex);
      }
    } else {
      setPreviousActiveIndex(null);
    }

    setCurrentActiveIndex(newActiveIndex);

    forceRecalculateAmountShownChildren();
  }, [
    newActiveIndex,
    currentActiveIndex,
    previousActiveIndex,
    amountShownChildren,
    shownChildIndices,
  ]);

  useEffect(() => {
    if (null === previousActiveIndex) {
      return;
    }

    if (previousActiveIndex < amountShownChildren) {
      setPreviousActiveIndex(null);
    }
  }, [previousActiveIndex, amountShownChildren, amountChildren]);

  useLayoutEffect(() => {
    if (forceRecalculateCounter < 0) {
      // Will never happen, but otherwise `forceRecalculateCounter` isn't being used and
      // therefore shouldn't be added as hook dependency
      return;
    }

    recalculateAmountShownChildren();
  }, [forceRecalculateCounter, recalculateAmountShownChildren]);

  useResizeObserver(virtualContainerRef, () => {
    forceRecalculateAmountShownChildren();
  });

  useResizeObserver(containerRef, () => {
    forceRecalculateAmountShownChildren();
  });

  const virtualChildren = useMemo(() => {
    const result: Record<number, React.ReactNode> = {};

    React.Children.forEach(children, (child, index) => {
      const sortedIndex = sortedChildIndices.indexOf(index);
      result[sortedIndex] = child;
    });

    return Object.values(result)
      .sort()
      .map((child, index) => {
        if (undefined === virtualChildRefs.current[index]) {
          virtualChildRefs.current[index] = React.createRef<HTMLDivElement>();
        }

        return (
          <div
            className='flex items-center flex-none gap-2'
            key={index}
            ref={virtualChildRefs.current[index]}
          >
            {child}
            <Divider />
          </div>
        );
      });
  }, [sortedChildIndices, children]);

  const shownChildren = useMemo(() => {
    return React.Children.toArray(children)
      .filter((child, index) => {
        return shownChildIndices.includes(index);
      })
      .map((child, index) => (
        <div className='flex items-center flex-none gap-2' key={index}>
          {child}
          <Divider />
        </div>
      ));
  }, [shownChildIndices, children]);

  const overflowingChildren = useMemo(() => {
    return React.Children.toArray(children).filter((child, index) => {
      return !shownChildIndices.includes(index);
    });
  }, [shownChildIndices, children]);

  const showOverflowButton = amountChildren > amountShownChildren;

  return (
    <div className='h-full overflow-x-hidden'>
      <div
        className='fixed invisible w-max min-w-max max-w-max'
        aria-hidden={true}
        ref={virtualOverflowButtonRef}
      >
        <OverflowButtonComponent {...overflowButtonProps} overflowingIndices={[]} children={[]} />
      </div>

      <div
        className='absolute flex invisible h-fit w-max min-w-max max-w-max'
        aria-hidden={true}
        ref={virtualContainerRef}
      >
        {virtualChildren.map((child, index) => (
          <div className='flex-none' key={index} ref={virtualChildRefs.current[index]}>
            {child}
          </div>
        ))}
      </div>

      <div className='flex items-center w-full h-full max-w-full min-w-full' ref={containerRef}>
        {shownChildren.map((child, index) => (
          <div className='flex-none' key={index}>
            {child}
          </div>
        ))}

        <div
          className={`flex-none ${showOverflowButton ? 'block' : 'hidden'}`}
          aria-hidden={!showOverflowButton}
          role={showOverflowButton ? 'navigation' : 'none'}
        >
          <OverflowButtonComponent
            {...overflowButtonProps}
            overflowingIndices={overflowingChildIndices}
          >
            {overflowingChildren}
          </OverflowButtonComponent>
        </div>
      </div>
    </div>
  );
};
