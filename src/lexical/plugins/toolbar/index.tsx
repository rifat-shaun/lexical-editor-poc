import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createHeadingNode, HeadingTagType } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import { ArrowDropDownRounded } from '@mui/icons-material';
import { Dropdown } from 'antd';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';


const LowPriority = 1;

const Divider = () => {
  return <div className='h-8 w-0.5 bg-gray-400' />;
};

export const ToolbarPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('normal');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const updateHeading = (headingTag: HeadingTagType | 'normal') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (headingTag === 'normal') {
          $setBlocksType(selection, () => $createParagraphNode());
          setSelectedFormat(headingTag);
        } else {
          $setBlocksType(selection, () => $createHeadingNode(headingTag));
          setSelectedFormat(headingTag);
        }
      }
    });
  };

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsSuperscript(selection.hasFormat('superscript'));
      setIsSubscript(selection.hasFormat('subscript'));
      setIsCode(selection.hasFormat('code'));
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, _newEditor) => {
          $updateToolbar();
          return false;
        },
        LowPriority,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        LowPriority,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        LowPriority,
      ),
    );
  }, [editor, $updateToolbar]);

  // Create a style tag for editor format icons
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      i.format.bold { 
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" fill="currentColor"/></svg>');
      }
      i.format.italic { 
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4h-8z" fill="currentColor"/></svg>');
      }
      i.format.underline { 
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z" fill="currentColor"/></svg>');
      }
      button.toolbar-item.active i.format {
        opacity: 1;
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const dropdownItems = [
    {
      label: 'Normal Text',
      key: 'normal',
    },
    {
      label: 'Heading 1',
      key: 'h1',
    },
    {
      label: 'Heading 2',
      key: 'h2',
    },
    {
      label: 'Heading 3',
      key: 'h3',
    },
    {
      label: 'Heading 4',
      key: 'h4',
    },
  ];

  return (
    <div
      className='flex items-start gap-2 px-2 py-4 h-13 border-b border-gray-300 bg-white sticky top-0 z-10'
      ref={toolbarRef}
    >
      <button
        disabled={!canUndo}
        onClick={() => {
          editor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
        className='toolbar-item spaced'
        aria-label='Undo'
      >
        <i className='format undo' />
      </button>
      <button
        disabled={!canRedo}
        onClick={() => {
          editor.dispatchCommand(REDO_COMMAND, undefined);
        }}
        className='toolbar-item'
        aria-label='Redo'
      >
        <i className='format redo' />
      </button>
      <Divider />
      <Dropdown
        menu={{
          items: dropdownItems.map((item) => ({
            ...item,
            label: (
              <div className='flex items-start gap-2 p-2'>
                <i className='format bold' />
               {item.label}
              </div>
            ),
            onClick: () => {
              updateHeading(item.key as HeadingTagType | 'normal');
            },
          })),
        }}
        trigger={['click']}
        overlayClassName='row-option-cell'
        placement='bottomRight'
        getPopupContainer={(trigger: HTMLElement) => trigger.parentElement!}
        onOpenChange={setIsDropdownOpen}
      >
        <div className='w-[130px] pl-2 h-8 flex items-center justify-between rounded-md cursor-pointer'>
            {dropdownItems.find((item) => item.key === selectedFormat)?.label}
          {isDropdownOpen ? (
            <ArrowDropDownRounded sx={{ fontSize: '32px' }} className='text-gray-500 rotate-180' />
          ) : (
            <ArrowDropDownRounded sx={{ fontSize: '32px' }} className='text-gray-500' />
          )}
        </div>
      </Dropdown>
      <Divider />
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        className={'toolbar-item spaced ' + (isBold ? 'active' : '')}
        aria-label='Format Bold'
      >
        <i className='format bold' />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        className={'toolbar-item spaced ' + (isItalic ? 'active' : '')}
        aria-label='Format Italics'
      >
        <i className='format italic' />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        className={'toolbar-item spaced ' + (isUnderline ? 'active' : '')}
        aria-label='Format Underline'
      >
        <i className='format underline' />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
        }}
        className={'toolbar-item spaced ' + (isStrikethrough ? 'active' : '')}
        aria-label='Format Strikethrough'
      >
        <i className='format strikethrough' />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript');
        }}
        className={'toolbar-item spaced ' + (isSuperscript ? 'active' : '')}
        aria-label='Format Superscript'
      >
        <i className='format superscript' />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript');
        }}
        className={'toolbar-item spaced ' + (isSubscript ? 'active' : '')}
        aria-label='Format Subscript'
      >
        <i className='format subscript' />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
        }}
        className={'toolbar-item spaced ' + (isCode ? 'active' : '')}
        aria-label='Format Code'
      >
        <i className='format code' />
      </button>
      <Divider />
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
        }}
        className='toolbar-item spaced'
        aria-label='Left Align'
      >
        <i className='format left-align' />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
        }}
        className='toolbar-item spaced'
        aria-label='Center Align'
      >
        <i className='format center-align' />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
        }}
        className='toolbar-item spaced'
        aria-label='Right Align'
      >
        <i className='format right-align' />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
        }}
        className='toolbar-item'
        aria-label='Justify Align'
      >
        <i className='format justify-align' />
      </button>{' '}
    </div>
  );
};
