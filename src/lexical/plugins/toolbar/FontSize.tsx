import { $patchStyleText } from '@lexical/selection';
import { AddRounded, RemoveRounded } from '@mui/icons-material';
import { $getSelection, LexicalEditor } from 'lexical';
import * as React from 'react';

import '../../css/FontSize.css';
import { FontSizeDropdown } from '../../ui/FontSizeDropdown';

const MIN_ALLOWED_FONT_SIZE = 1;
const MAX_ALLOWED_FONT_SIZE = 500;
const DEFAULT_FONT_SIZE = 15;

// Font size options for dropdown
const FONT_SIZE_OPTIONS = [8, 10, 12, 14, 15, 16, 20, 24, 28, 36, 48, 72, 96];

// eslint-disable-next-line no-shadow
enum updateFontSizeType {
  increment = 1,
  decrement,
}

export default function FontSize({
  selectionFontSize,
  disabled,
  editor,
}: {
  selectionFontSize: string;
  disabled: boolean;
  editor: LexicalEditor;
}) {
  const [inputValue, setInputValue] = React.useState<string>(selectionFontSize);

  /**
   * Calculates the new font size based on the update type.
   * @param currentFontSize - The current font size
   * @param updateType - The type of change, either increment or decrement
   * @returns the next font size
   */
  const calculateNextFontSize = (
    currentFontSize: number,
    updateType: updateFontSizeType | null,
  ) => {
    if (!updateType) {
      return currentFontSize;
    }

    const updatedFontSize: number = currentFontSize;
    switch (updateType) {
      case updateFontSizeType.decrement:
        return Math.max(MIN_ALLOWED_FONT_SIZE, currentFontSize - 1);

      case updateFontSizeType.increment:
        return Math.min(MAX_ALLOWED_FONT_SIZE, currentFontSize + 1);

      default:
        break;
    }
    return updatedFontSize;
  };
  /**
   * Patches the selection with the updated font size.
   */

  const updateFontSizeInSelection = React.useCallback(
    (newFontSize: string | null, updateType: updateFontSizeType | null) => {
      const getNextFontSize = (prevFontSize: string | null): string => {
        if (!prevFontSize) {
          prevFontSize = `${DEFAULT_FONT_SIZE}px`;
        }
        prevFontSize = prevFontSize.slice(0, -2);
        const nextFontSize = calculateNextFontSize(Number(prevFontSize), updateType);
        return `${nextFontSize}px`;
      };

      editor.update(() => {
        if (editor.isEditable()) {
          const selection = $getSelection();
          if (selection !== null) {
            $patchStyleText(selection, {
              'font-size': newFontSize || getNextFontSize,
            });
          }
        }
      });
    },
    [editor],
  );

  const handleButtonClick = (updateType: updateFontSizeType) => {
    if (inputValue !== '') {
      const nextFontSize = calculateNextFontSize(Number(inputValue), updateType);
      setInputValue(String(nextFontSize));
      updateFontSizeInSelection(String(nextFontSize) + 'px', null);
    } else {
      updateFontSizeInSelection(null, updateType);
    }
  };

  const handleSelectChange = (newValue: string) => {
    setInputValue(newValue);
    if (newValue !== '') {
      updateFontSizeByInputValue(Number(newValue));
    }
  };

  const updateFontSizeByInputValue = (inputValueNumber: number) => {
    let updatedFontSize = inputValueNumber;
    if (inputValueNumber > MAX_ALLOWED_FONT_SIZE) {
      updatedFontSize = MAX_ALLOWED_FONT_SIZE;
    } else if (inputValueNumber < MIN_ALLOWED_FONT_SIZE) {
      updatedFontSize = MIN_ALLOWED_FONT_SIZE;
    }

    setInputValue(String(updatedFontSize));
    updateFontSizeInSelection(String(updatedFontSize) + 'px', null);
  };

  React.useEffect(() => {
    setInputValue(selectionFontSize);
  }, [selectionFontSize]);

  return (
    <div className='flex items-center gap-1'>
      <button
        type='button'
        disabled={
          disabled || (selectionFontSize !== '' && Number(inputValue) <= MIN_ALLOWED_FONT_SIZE)
        }
        onClick={() => handleButtonClick(updateFontSizeType.decrement)}
        className='format minus-icon toolbar-item spaced text-black-200 dark:text-black-300 disabled:text-black-500 disabled:dark:text-black-600'
      >
        <RemoveRounded sx={{ fontSize: '18px' }} />
      </button>

      <FontSizeDropdown
        options={FONT_SIZE_OPTIONS.map((size) => size.toString())}
        onChange={handleSelectChange}
        defaultValue={inputValue}
      />

      <button
        type='button'
        disabled={
          disabled || (selectionFontSize !== '' && Number(inputValue) >= MAX_ALLOWED_FONT_SIZE)
        }
        onClick={() => handleButtonClick(updateFontSizeType.increment)}
        className='format minus-icon toolbar-item spaced text-black-200 dark:text-black-300 disabled:text-black-500 disabled:dark:text-black-600'
      >
        <AddRounded sx={{ fontSize: '18px' }} />
      </button>
    </div>
  );
}
