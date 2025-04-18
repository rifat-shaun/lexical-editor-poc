/* eslint-disable */
import { $isLinkNode } from '@lexical/link';
import { $isListNode, ListNode } from '@lexical/list';
import { $createHeadingNode, $isHeadingNode, HeadingTagType } from '@lexical/rich-text';
import {
  $getSelectionStyleValueForProperty,
  $isParentElementRTL,
  $patchStyleText,
  $setBlocksType,
} from '@lexical/selection';
import { $isTableNode, $isTableSelection } from '@lexical/table';
import { $findMatchingParent, $getNearestNodeOfType, mergeRegister } from '@lexical/utils';
import {
  ArrowDropDownRounded,
  ColorizeOutlined,
  ImageOutlined,
  InsertPageBreakOutlined,
  SearchOutlined,
  TitleRounded,
  UploadOutlined,
} from '@mui/icons-material';
import { Dropdown, Input, Modal, Typography } from 'antd';
import cn from 'classnames';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  LexicalCommand,
  LexicalEditor,
  REDO_COMMAND,
  RangeSelection,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  createCommand,
} from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';

import DropdownColorPicker from '../../ui/DropdownColorPicker';
import { INSERT_IMAGE_COMMAND, InsertImageDialog, InsertImagePayload } from '../ImagesPlugin';
import { INSERT_PAGE_BREAK } from '../PageBreakPlugin';
import { InserTableDialog } from '../TablePlugin';
import { BlockFormatItems, blockTypeToBlockName } from './BlockFormatItems';
import { FontDropDown } from './FontDropDown';
import FontSize from './FontSize';
import { getSelectedNode } from '../../utils';

type TToolbarPluginProps = {
  editor: LexicalEditor;
  activeEditor: LexicalEditor;
  setActiveEditor: (editor: LexicalEditor) => void;
};

const LowPriority = 1;
const SET_BACKGROUND_COLOR_COMMAND: LexicalCommand<string> = createCommand(
  'SET_BACKGROUND_COLOR_COMMAND',
);
const Divider = () => {
  return <div className='h-8 w-0.5 bg-gray-400' />;
};

const { Text } = Typography;

export const ToolbarPlugin = ({ editor, activeEditor, setActiveEditor }: TToolbarPluginProps) => {
  const toolbarRef = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [blockType, setBlockType] = useState<keyof typeof blockTypeToBlockName>('paragraph');

  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isImage, setIsImage] = useState(false);
  const [isEditable, setIsEditable] = useState(() => editor.isEditable());
  const [selectedFormat, setSelectedFormat] = useState('normal');
  const [fontColor, setFontColor] = useState<string>('#000');
  const [fontFamily, setFontFamily] = useState<string>('Arial');
  const [fontSize, setFontSize] = useState<string>('15px');
  const [textBackgroundColor, setTextBackgroundColor] = useState<string>('#fff');
  const [isRTL, setIsRTL] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [rootType, setRootType] = useState<'root' | 'table'>('root');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const applyStyleText = useCallback(
    (styles: Record<string, string>, skipHistoryStack?: boolean) => {
      editor.update(
        () => {
          const selection = $getSelection();
          if (selection !== null) {
            $patchStyleText(selection, styles);
          }
        },
        skipHistoryStack ? { tag: 'historic' } : {},
      );
    },
    [editor],
  );

  const onFontColorSelect = useCallback(
    (value: string, skipHistoryStack: boolean) => {
      setFontColor(value);
      applyStyleText({ color: value }, skipHistoryStack);
    },
    [applyStyleText],
  );

  const onBackgroundColorSelect = useCallback(
    (value: string, skipHistoryStack: boolean) => {
      setTextBackgroundColor(value);
      applyStyleText(
        {
          backgroundColor: value,
          'background-color': value,
        },
        skipHistoryStack,
      );

      // editor.dispatchCommand(SET_BACKGROUND_COLOR_COMMAND, value);
    },
    [applyStyleText, editor],
  );

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

  const getCurrentSelectionBackground = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      return $getSelectionStyleValueForProperty(selection, 'background-color', '#fff');
    }
    return '#fff';
  }, []);

  const checkIsLink = useCallback((selection: RangeSelection) => {
    const node = getSelectedNode(selection);
    const parent = node.getParent();
    return $isLinkNode(parent) || $isLinkNode(node);
  }, []);

  const getRootType = useCallback((selection: RangeSelection) => {
    const node = getSelectedNode(selection);
    const tableNode = $findMatchingParent(node, $isTableNode);
    if ($isTableNode(tableNode)) {
      return 'table';
    }
    return 'root';
  }, []);

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsRTL($isParentElementRTL(selection));
      setIsLink(checkIsLink(selection));
      setRootType(getRootType(selection));
      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });
      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
          const type = parentList ? parentList.getListType() : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element) ? element.getTag() : element.getType();
          if (type in blockTypeToBlockName) {
            setBlockType(type as keyof typeof blockTypeToBlockName);
          }
        }
      }
    }
    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsSuperscript(selection.hasFormat('superscript'));
      setIsSubscript(selection.hasFormat('subscript'));
      setIsCode(selection.hasFormat('code'));
      setFontColor($getSelectionStyleValueForProperty(selection, 'color', '#000'));
      setFontFamily($getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'));
      setFontSize($getSelectionStyleValueForProperty(selection, 'font-size', '15px'));
      setTextBackgroundColor(getCurrentSelectionBackground());
    }
  }, [editor, activeEditor]);

  useEffect(() => {
    return mergeRegister(
      activeEditor.registerEditableListener((editable) => {
        setIsEditable(editable);
      }),
      activeEditor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
      activeEditor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, _newEditor) => {
          $updateToolbar();
          return false;
        },
        LowPriority,
      ),
      activeEditor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        LowPriority,
      ),
      activeEditor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        LowPriority,
      ),
    );
  }, [editor, activeEditor, $updateToolbar]);

  useEffect(() => {
    return activeEditor.registerCommand(
      SET_BACKGROUND_COLOR_COMMAND,
      (color: string) => {
        activeEditor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.getNodes().forEach((node) => {
              if ($isTextNode(node)) {
                node.setStyle(`background-color: ${color}`);
              }
            });
          }
        });
        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor, activeEditor]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor);
        $updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor, $updateToolbar, setActiveEditor]);

  useEffect(() => {
    activeEditor.getEditorState().read(() => {
      $updateToolbar();
    });
  }, [activeEditor, $updateToolbar]);

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
      className='sticky top-0 z-10 flex items-start gap-2 px-2 py-4 bg-white border-b border-gray-300 h-13'
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
      <InserTableDialog activeEditor={activeEditor} />
      <Dropdown
        menu={{
          items: [
            {
              key: 'insert-image',
              label: (
                <div className='flex items-center gap-2 p-2'>
                  <UploadOutlined sx={{ fontSize: '18px' }} />
                  <span>Upload Image</span>
                </div>
              ),
              onClick: () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const url = reader.result as string;
                      const editorElement = editor.getRootElement();
                      // Calculate max width without padding
                      const computedStyle = editorElement
                        ? window.getComputedStyle(editorElement)
                        : null;
                      const paddingLeft = computedStyle
                        ? parseInt(computedStyle.paddingLeft, 10)
                        : 0;
                      const paddingRight = computedStyle
                        ? parseInt(computedStyle.paddingRight, 10)
                        : 0;
                      const maxWidth = editorElement
                        ? editorElement.clientWidth - paddingLeft - paddingRight
                        : 500;

                      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                        src: url,
                        altText: file.name,
                        maxWidth: maxWidth,
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              },
            },
            {
              key: 'insert-url',
              label: (
                <div className='flex items-center gap-2 p-2'>
                  <SearchOutlined sx={{ fontSize: '18px' }} />
                  <span>Insert URL</span>
                </div>
              ),
              onClick: () => {
                const modal = Modal.confirm({
                  title: 'Insert Image URL',
                  icon: null,
                  content: (
                    <div className='flex flex-col gap-3 mt-3'>
                      <Input placeholder='Paste URL of image' id='image-url-input' />
                      <Text disabled>
                        Only select images that you have confirmed that you have the license to use.
                      </Text>
                    </div>
                  ),
                  onOk: () => {
                    const imageUrl = (
                      document.getElementById('image-url-input') as HTMLInputElement
                    )?.value;
                    if (imageUrl) {
                      // Get the editor's container element to determine max width
                      const editorElement = editor.getRootElement();
                      const computedStyle = editorElement
                        ? window.getComputedStyle(editorElement)
                        : null;
                      const paddingLeft = computedStyle
                        ? parseInt(computedStyle.paddingLeft, 10)
                        : 0;
                      const paddingRight = computedStyle
                        ? parseInt(computedStyle.paddingRight, 10)
                        : 0;
                      const maxWidth = editorElement
                        ? editorElement.clientWidth - paddingLeft - paddingRight
                        : 500;

                      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                        src: imageUrl,
                        altText: '',
                        maxWidth: maxWidth,
                      });
                    }
                  },
                  okText: 'Insert',
                  cancelText: 'Cancel',
                });
              },
            },
          ],
        }}
        trigger={['click']}
        overlayClassName='image-dropdown'
        placement='bottomRight'
        getPopupContainer={(trigger: HTMLElement) => trigger.parentElement!}
        open={isImage}
        onOpenChange={setIsImage}
      >
        <button
          onClick={() => {
            setIsImage(!isImage);
          }}
          className={'toolbar-item spaced ' + (isImage ? 'active' : '')}
          aria-label='Format Image'
        >
          <ImageOutlined
            sx={{
              fontSize: '20px',
              color: isEditable ? '#667085' : '#e9e9e9',
            }}
          />
        </button>
      </Dropdown>
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
        <div className='w-[136px] pl-2 h-8 flex items-center justify-between rounded-md cursor-pointer'>
          {dropdownItems.find((item) => item.key === selectedFormat)?.label}
          {isDropdownOpen ? (
            <ArrowDropDownRounded sx={{ fontSize: '32px' }} className='text-gray-500 rotate-180' />
          ) : (
            <ArrowDropDownRounded sx={{ fontSize: '32px' }} className='text-gray-500' />
          )}
        </div>
      </Dropdown>
      <Divider />
      <FontDropDown
        disabled={!isEditable}
        style={'font-family'}
        value={fontFamily}
        editor={editor}
      />
      <Divider />
      <FontSize selectionFontSize={fontSize.slice(0, -2)} editor={editor} disabled={!isEditable} />
      <Divider />
      <button
        onClick={() => {
          editor.dispatchCommand(INSERT_PAGE_BREAK, undefined);
        }}
        className={'toolbar-item spaced '}
        aria-label='Insert Page Break'
      >
        <InsertPageBreakOutlined
          sx={{
            fontSize: '20px',
            color: true ? '#667085' : '#e9e9e9', //TODO: replace with is editable
          }}
        />
      </button>
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
        <i className='italic format' />
      </button>
      <button
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        className={'toolbar-item spaced ' + (isUnderline ? 'active' : '')}
        aria-label='Format Underline'
      >
        <i className='underline format' />
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
      <DropdownColorPicker
        disabled={false} //TODO: replace with is editable
        buttonClassName={cn(
          'rounded-lg',
          true //TODO: replace with is editable
            ? 'hover:bg-gray-200 dark:hover:bg-gray-700'
            : 'cursor-not-allowed text-gray-300 dark:text-gray-600',
        )}
        buttonAriaLabel='Formatting text color'
        icon={
          <div className='flex flex-col p-1'>
            <TitleRounded
              sx={{
                fontSize: '20px',
                color: true ? '#667085' : '#e9e9e9', //TODO: replace with is editable
              }}
            />
            <div
              className={`h-1 w-full`}
              style={{ backgroundColor: true ? fontColor : '#e9e9e9' }} //TODO: replace with is editable
            ></div>
          </div>
        }
        color={fontColor}
        onChange={onFontColorSelect}
        title='text color'
      />
      <DropdownColorPicker //TODO: replace with is editable
        disabled={false}
        buttonClassName={cn(
          'rounded-lg',
          true //TODO: replace with is editable
            ? 'hover:bg-gray-200 dark:hover:bg-gray-700'
            : 'cursor-not-allowed text-gray-300 dark:text-gray-600',
        )}
        buttonAriaLabel='Formatting background color'
        icon={
          <div className='flex flex-col p-1'>
            <ColorizeOutlined
              sx={{
                fontSize: '20px',
                color: true ? '#667085' : '#e9e9e9', //TODO: replace with is editable
              }}
            />
            <div
              className={`h-1 w-full`}
              style={{ backgroundColor: true ? textBackgroundColor : '#fff' }} //TODO: replace with is editable
            ></div>
          </div>
        }
        color={textBackgroundColor}
        onChange={onBackgroundColorSelect}
        title='background color'
      />
      <Divider />
      <BlockFormatItems editor={editor} blockType={blockType} disabled={!isEditable} />
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
