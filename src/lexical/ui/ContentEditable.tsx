import { ContentEditable } from '@lexical/react/LexicalContentEditable';
// @ts-ignore
import length from 'length.js';
import { useEffect, useState } from 'react';

import './ContentEditable.css';

type Props = {
  className?: string;
  placeholder: string;
  pageSetting?: any;
};

export default function LexicalContentEditable({
  className,
  placeholder,
  pageSetting,
}: Props): React.ReactNode {
  const [pageStyle, setPageStyle] = useState<object>();
  const [phPosition, setPhPosition] = useState<object>();

  useEffect(() => {
    let computedStyle = {
      paddingTop: pageSetting.margins.top,
      paddingRight: pageSetting.margins.right,
      paddingBottom: pageSetting.margins.bottom,
      paddingLeft: pageSetting.margins.left,
    };
    if (pageSetting.unit !== 'px') {
      computedStyle = {
        paddingTop: length(pageSetting.margins.top, pageSetting.unit)
          .toPrecision(2)
          .to('mm')
          .toString(),
        paddingRight: length(pageSetting.margins.right, pageSetting.unit)
          .toPrecision(2)
          .to('mm')
          .toString(),
        paddingBottom: length(pageSetting.margins.bottom, pageSetting.unit)
          .toPrecision(2)
          .to('mm')
          .toString(),
        paddingLeft: length(pageSetting.margins.left, pageSetting.unit)
          .toPrecision(2)
          .to('mm')
          .toString(),
      };
    }
    setPageStyle(computedStyle);
    let position = {
      top: pageSetting.margins.top,
      left: pageSetting.margins.left,
    };
    if (pageSetting.unit !== 'px') {
      position = {
        top: length(pageSetting.margins.top, pageSetting.unit).toPrecision(2).to('mm').toString(),
        left: length(pageSetting.margins.left, pageSetting.unit).toPrecision(2).to('mm').toString(),
      };
    }
    setPhPosition(position);
  }, [pageSetting]);
  return (
    <ContentEditable
      id='contenteditable'
      className={className || 'ContentEditable__root'}
      style={pageStyle}
      aria-placeholder={placeholder}
      placeholder={
        <div
          // className={placeholderClassName || 'ContentEditable__placeholder'}
          className={`absolute text-gray-500 text-[15px] overflow-hidden whitespace-nowrap pointer-events-none select-none inline-block`}
          style={phPosition}
        >
          {placeholder}
        </div>
      }
    />
  );
}
