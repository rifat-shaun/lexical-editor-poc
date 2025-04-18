import { $patchStyleText } from '@lexical/selection';
import { $getSelection, LexicalEditor } from 'lexical';
import { useCallback, useState } from 'react';

import DropDown, { DropDownItem } from '../../ui/DropDown';

const FONT_FAMILY_OPTIONS: [string, string][] = [
  ['Arial', 'Arial'],
  ['Courier New', 'Courier New'],
  ['Georgia', 'Georgia'],
  ['Times New Roman', 'Times New Roman'],
  ['Trebuchet MS', 'Trebuchet MS'],
  ['Verdana', 'Verdana'],
];

export function FontDropDown({
  editor,
  value,
  style,
  disabled = false,
}: {
  editor: LexicalEditor;
  value: string;
  style: string;
  disabled?: boolean;
}) {
  const [activeFont, setActiveFont] = useState(value);
  const handleClick = useCallback(
    (option: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if (selection !== null) {
          setActiveFont(option);
          $patchStyleText(selection, {
            [style]: option,
          });
        }
      });
    },
    [editor, style],
  );

  function dropDownActiveClass(active: boolean) {
    if (active) {
      return 'active dropdown-item-active';
    } else {
      return '';
    }
  }

  const handleMouseEnter = useCallback(
    (option: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if (selection !== null) {
          $patchStyleText(selection, {
            [style]: option,
          });
        }
      });
    },
    [editor, style],
  );

  const handleMouseLeave = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (selection !== null) {
        // Reset the style to the current value
        $patchStyleText(selection, {
          [style]: activeFont,
        });
      }
    });
  }, [editor, style, value]);

  const buttonAriaLabel =
    style === 'font-family'
      ? 'Formatting options for font family'
      : 'Formatting options for font size';

  return (
    <DropDown
      disabled={disabled}
      buttonClassName={'toolbar-item py-1 px-2 w-[120px] ' + style}
      buttonLabel={value}
      buttonAriaLabel={buttonAriaLabel}
    >
      {FONT_FAMILY_OPTIONS?.map(([option, text]) => (
        <DropDownItem
          className={`item w-[200px] ${dropDownActiveClass(value === option)} ${
            style === 'font-size' ? 'fontsize-item' : ''
          }`}
          onClick={() => handleClick(option)}
          onMouseEnter={() => handleMouseEnter(option)}
          onMouseLeave={handleMouseLeave}
          key={option}
        >
          <span
            className='text'
            style={{ fontFamily: style === 'font-family' ? option : undefined }}
          >
            {text}
          </span>
        </DropDownItem>
      ))}
    </DropDown>
  );
}
