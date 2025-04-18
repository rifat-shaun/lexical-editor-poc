import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { $setBlocksType } from '@lexical/selection';
import { $createParagraphNode, $getSelection, $isRangeSelection, LexicalEditor } from 'lexical';

export const blockTypeToBlockName = {
  bullet: 'Bulleted List',
  check: 'Check List',
  code: 'Code Block',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  number: 'Numbered List',
  paragraph: 'Normal',
  quote: 'Quote',
};

export function BlockFormatItems({
  editor,
  blockType,
  disabled = false,
}: {
  blockType: keyof typeof blockTypeToBlockName;
  editor: LexicalEditor;
  disabled?: boolean;
}) {
  function dropDownActiveClass(active: boolean) {
    if (active) {
      return 'active';
    } else {
      return '';
    }
  }

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  };

  const formatCheckList = () => {
    if (blockType !== 'check') {
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    } else {
      formatParagraph();
    }
  };

  const formatBulletList = () => {
    if (blockType !== 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      formatParagraph();
    }
  };

  const formatNumberedList = () => {
    if (blockType !== 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      formatParagraph();
    }
  };

  return (
    <div className='flex items-center gap-2'>
      <button
        onClick={formatCheckList}
        className={'toolbar-item spaced ' + dropDownActiveClass(blockType === 'check')}
        aria-label='Check List'
        disabled={disabled}
      >
        <i className='icon check-list format' />
      </button>
      <button
        onClick={formatBulletList}
        className={'toolbar-item spaced ' + dropDownActiveClass(blockType === 'bullet')}
        aria-label='Bullet List'
        disabled={disabled}
      >
        <i className='icon bullet-list format' />
      </button>
      <button
        onClick={formatNumberedList}
        className={'toolbar-item spaced ' + dropDownActiveClass(blockType === 'number')}
        aria-label='Numbered List'
        disabled={disabled}
      >
        <i className='icon numbered-list format' />
      </button>
    </div>
  );
}
