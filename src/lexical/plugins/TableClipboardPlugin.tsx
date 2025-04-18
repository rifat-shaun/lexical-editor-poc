import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isTableNode } from '@lexical/table';
import { $createParagraphNode, $getRoot, COMMAND_PRIORITY_CRITICAL, PASTE_COMMAND } from 'lexical';
import { useEffect } from 'react';

export function TableClipboardPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    let lastTableNodeCount = 0;

    return editor.registerCommand(
      PASTE_COMMAND,
      () => {
        editor.getEditorState().read(() => {
          const rootNode = $getRoot();
          lastTableNodeCount = rootNode.getChildren().filter($isTableNode).length;
        });

        setTimeout(() => {
          editor.update(() => {
            const rootNode = $getRoot();
            const children = rootNode.getChildren();
            const currentTableNodes = children.filter($isTableNode);
            const hasNewTables = currentTableNodes.length > lastTableNodeCount;

            if (hasNewTables) {
              const newTables = currentTableNodes.slice(lastTableNodeCount);

              for (const tableNode of newTables) {
                const nodeIndex = children.indexOf(tableNode);
                if (nodeIndex === -1) continue;

                const prevSibling = nodeIndex > 0 ? children[nodeIndex - 1] : null;
                if (!prevSibling || $isTableNode(prevSibling)) {
                  const paragraphBefore = $createParagraphNode();
                  tableNode.insertBefore(paragraphBefore);
                }

                const nextSibling = tableNode.getNextSibling();
                if (!nextSibling || $isTableNode(nextSibling)) {
                  const paragraphAfter = $createParagraphNode();
                  tableNode.insertAfter(paragraphAfter);
                }
              }
            }
          });
        }, 0);

        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor]);

  return null;
}
