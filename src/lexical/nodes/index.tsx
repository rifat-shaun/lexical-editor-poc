import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { ListItemNode, ListNode } from '@lexical/list';
import { HeadingNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';

import { ImageNode } from './ImageNode/ImageNode';
import { PageBreakNode } from './PageBreakNode';

export const lexicalEditorNodes = [
  HeadingNode,
  CodeHighlightNode,
  CodeNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  ListItemNode,
  ListNode,
  ImageNode,
  PageBreakNode,
];
