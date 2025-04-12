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
  table: 'table',
  tableCell: 'table-cell',
  tableCellHeader: 'table-header-cell',
  tableRow: 'table-row',
  tableCellResizer: 'table-cell-resizer',
  tableCellActionButton: 'table-cell-action-button',
  tableCellActionButtonContainer: 'table-cell-action-button-container',
  tableSelection: 'table-selection',
  tableResizeRuler: 'table-resize-ruler',
};
