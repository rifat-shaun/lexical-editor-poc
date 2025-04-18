import { EditorThemeClasses } from 'lexical';

import './css/Theme.css';

export const theme: EditorThemeClasses = {
  text: {
    code: 'lexical-code-class',
    underline: 'lexical-underline-class',
    strikethrough: 'lexical-strikethrough-class',
    italic: 'lexical-italic-class',
    bold: 'lexical-bold-class',
  },
  image: 'editor-image',
  list: {
    checklist: 'lexical-checklist',
    listitem: 'lexical-listItem',
    listitemChecked: 'lexical-listItemChecked',
    listitemUnchecked: 'lexical-listItemUnchecked',
    nested: {
      listitem: 'lexical-nestedListItem',
    },
    olDepth: ['lexical-ol1', 'lexical-ol2', 'lexical-ol3', 'lexical-ol4', 'lexical-ol5'],
    ul: 'lexical-ul',
  },
  table: 'lexical-table',
  tableCell: 'lexical-table-cell',
  tableCellHeader: 'lexical-table-header-cell',
  tableCellSelected: 'lexical-table-cell-selected',
  tableRow: 'lexical-table-row',
  tableCellResizer: 'lexical-table-cell-resizer',
  tableCellActionButton: 'lexical-table-cell-action-button',
  tableCellActionButtonContainer: 'lexical-table-cell-action-button-container',
  tableResizeRuler: 'lexical-table-resize-ruler',
  tableRowStriping: 'lexical-table-row-striping',
  tableSelection: 'lexical-table-selection',
  tableSelected: 'lexical-table-selected',
};
