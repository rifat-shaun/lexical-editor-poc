import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isTableNode } from '@lexical/table';
import {
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
} from 'lexical';
import { useEffect } from 'react';

export function TableKeyboardPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        editor.getEditorState().read(() => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return;
          }

          const anchorNode = selection.anchor.getNode();
          const isAtStart = selection.anchor.offset === 0;
          const isAtEnd = selection.anchor.offset === anchorNode.getTextContentSize();

          if (!$isParagraphNode(anchorNode)) {
            return;
          }

          if (event.key === 'Backspace' && isAtStart) {
            const previousNode = anchorNode.getPreviousSibling();
            if (previousNode && $isTableNode(previousNode)) {
              event.preventDefault();
            }
          }

          if (event.key === 'Delete' && isAtEnd) {
            const nextNode = anchorNode.getNextSibling();
            if (nextNode && $isTableNode(nextNode)) {
              event.preventDefault();
            }
          }

          // Block deletion when next to tables
          const previousNode = anchorNode.getPreviousSibling();
          const nextNode = anchorNode.getNextSibling();

          if (
            (isAtStart && previousNode && $isTableNode(previousNode)) ||
            (isAtEnd && nextNode && $isTableNode(nextNode))
          ) {
            event.preventDefault();
          }
        });
      }
    };

    rootElement.addEventListener('keydown', handleKeyDown, true);

    return () => {
      rootElement.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      () => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }

        const anchorNode = selection.anchor.getNode();
        const isAtStart = selection.anchor.offset === 0;

        if (!isAtStart || !$isParagraphNode(anchorNode)) {
          return false;
        }

        const previousNode = anchorNode.getPreviousSibling();

        if (previousNode && $isTableNode(previousNode)) {
          return true;
        }

        const nextNode = anchorNode.getNextSibling();
        if (nextNode && $isTableNode(nextNode)) {
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_DELETE_COMMAND,
      () => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }

        const anchorNode = selection.anchor.getNode();
        const isAtEnd = selection.anchor.offset === anchorNode.getTextContentSize();

        if (!isAtEnd || !$isParagraphNode(anchorNode)) {
          return false;
        }

        const nextNode = anchorNode.getNextSibling();
        if (nextNode && $isTableNode(nextNode)) {
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor]);

  return null;
}
