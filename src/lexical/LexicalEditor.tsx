import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

import './css/index.css';
import { lexicalEditorNodes } from './nodes';
import { AutoFocusPlugin, HistoryPlugin, RichTextPlugin, ToolbarPlugin } from './plugins';

const theme = {
  text: {
    code: 'lexical-code-class',
    underline: 'lexical-underline-class',
    strikethrough: 'lexical-strikethrough-class',
    italic: 'lexical-italic-class',
    bold: 'lexical-bold-class',
  },
  // Theme styling goes here
  //...
};

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(_error: Error) {
  // eslint-disable-next-line no-console
  console.error(_error);
}

export const LexicalEditor = () => {
  const initialConfig = {
    namespace: 'LAX-EDITOR',
    theme,
    onError,
    nodes: lexicalEditorNodes,
  };

  return (
    <div className='w-full h-full p-4 bg-gray-400 editor-container'>
      <LexicalComposer initialConfig={initialConfig}>
        <div className='flex flex-col gap-2'>
          <ToolbarPlugin />
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
        </div>
      </LexicalComposer>
    </div>
  );
};
