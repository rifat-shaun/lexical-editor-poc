import { LexicalComposer } from '@lexical/react/LexicalComposer';

import { Editor } from './Editor';
import { theme } from './Theme';
import './css/index.css';
import { lexicalEditorNodes } from './nodes';
import { TableContext } from './plugins/TablePlugin';

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
        <TableContext>
          <Editor />
        </TableContext>
      </LexicalComposer>
    </div>
  );
};
