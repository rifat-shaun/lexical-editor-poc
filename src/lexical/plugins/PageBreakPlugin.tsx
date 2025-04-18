/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isTableNode } from '@lexical/table';
import { $findMatchingParent, $insertNodeToNearestRoot, mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  LexicalCommand,
  createCommand,
} from 'lexical';
import type { JSX } from 'react';
// eslint-disable-next-line no-duplicate-imports
import { useEffect } from 'react';

import { $createPageBreakNode, PageBreakNode } from './../nodes/PageBreakNode';

export const INSERT_PAGE_BREAK: LexicalCommand<undefined> = createCommand();

export default function PageBreakPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([PageBreakNode])) {
      throw new Error('PageBreakPlugin: PageBreakNode is not registered on editor');
    }

    return mergeRegister(
      editor.registerCommand(
        INSERT_PAGE_BREAK,
        () => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return false;
          }
          const focusNode = selection.focus.getNode();
          if (focusNode !== null) {
            // Check if we're inside a table node
            const isInsideTable = $findMatchingParent(focusNode, $isTableNode);
            if (isInsideTable) {
              // Don't allow page breaks inside tables
              return false;
            }

            const pgBreak = $createPageBreakNode();
            $insertNodeToNearestRoot(pgBreak);
          }

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [editor]);

  return null;
}
