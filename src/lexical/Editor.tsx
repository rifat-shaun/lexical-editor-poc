import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { SelectionAlwaysOnDisplay } from '@lexical/react/LexicalSelectionAlwaysOnDisplay';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import type { LexicalEditor } from 'lexical';
import { useState } from 'react';

import { useSettings } from './context/SettingsContext';
import {
  AutoFocusPlugin,
  CheckListPlugin,
  HistoryPlugin,
  ListPlugin,
  RichTextPlugin,
  TableActionMenuPlugin,
  TableClipboardPlugin,
  TableDragDropPlugin,
  ToolbarPlugin,
} from './plugins';
import ImagesPlugin from './plugins/ImagesPlugin';
import PageBreakPlugin from './plugins/PageBreakPlugin';
import TableCellResizerPlugin from './plugins/TableCellResizerPlugin';
import { TableKeyboardPlugin } from './plugins/TableKeyboardPlugin';

export const Editor = () => {
  const [editor] = useLexicalComposerContext();
  const { settings } = useSettings();
  const { tableCellMerge, tableCellBackgroundColor, tableHorizontalScroll } = settings;
  const [activeEditor, setActiveEditor] = useState<LexicalEditor>(editor);

  return (
    <div className='flex flex-col gap-2'>
      <ToolbarPlugin
        editor={editor}
        activeEditor={activeEditor}
        setActiveEditor={setActiveEditor}
      />
      <div className='relative bg-white'>
        <RichTextPlugin
          contentEditable={
            <ContentEditable className='w-full h-[calc(100vh-100px)] border border-gray-300 rounded-md p-2 overflow-auto outline-none' />
          }
          placeholder={
            <span className='absolute top-2.5 left-2.5 text-gray-500 text-[15px] overflow-hidden whitespace-nowrap pointer-events-none select-none inline-block'>
              Start writing or type / to browse options
            </span>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <HistoryPlugin />
      <AutoFocusPlugin />
      <SelectionAlwaysOnDisplay />
      <CheckListPlugin />
      <ListPlugin />
      <ImagesPlugin />
      <TablePlugin
        hasCellMerge={tableCellMerge}
        hasCellBackgroundColor={tableCellBackgroundColor}
        hasHorizontalScroll={tableHorizontalScroll}
      />
      <TableCellResizerPlugin />
      <PageBreakPlugin />
      <TableActionMenuPlugin cellMerge={tableCellMerge} />
      <TableDragDropPlugin />
      <TableKeyboardPlugin />
      <TableClipboardPlugin />
    </div>
  );
};
