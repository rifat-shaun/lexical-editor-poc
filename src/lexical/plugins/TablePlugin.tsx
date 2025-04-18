import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createTableNodeWithDimensions,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import { EditorThemeClasses, Klass, LexicalEditor, LexicalNode } from 'lexical';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import TableIcon from '@mui/icons-material/TableChart';
import React from 'react';

export type CellEditorConfig = Readonly<{
  namespace: string;
  nodes?: ReadonlyArray<Klass<LexicalNode>>;
  onError: (error: Error, editor: LexicalEditor) => void;
  readOnly?: boolean;
  theme?: EditorThemeClasses;
}>;

export type CellContextShape = {
  cellEditorConfig: null | CellEditorConfig;
  cellEditorPlugins: null | React.ReactNode | Array<React.ReactNode>;
  set: (
    cellEditorConfig: null | CellEditorConfig,
    cellEditorPlugins: null | React.ReactNode | Array<React.ReactNode>,
  ) => void;
};

export const CellContext = createContext<CellContextShape>({
  cellEditorConfig: null,
  cellEditorPlugins: null,
  set: () => {
    // Empty
  },
});

export function TableContext({ children }: { children: React.ReactNode }) {
  const [contextValue, setContextValue] = useState<{
    cellEditorConfig: null | CellEditorConfig;
    cellEditorPlugins: null | React.ReactNode | Array<React.ReactNode>;
  }>({
    cellEditorConfig: null,
    cellEditorPlugins: null,
  });
  return (
    <CellContext.Provider
      value={useMemo(
        () => ({
          cellEditorConfig: contextValue.cellEditorConfig,
          cellEditorPlugins: contextValue.cellEditorPlugins,
          set: (cellEditorConfig, cellEditorPlugins) => {
            setContextValue({ cellEditorConfig, cellEditorPlugins });
          },
        }),
        [contextValue.cellEditorConfig, contextValue.cellEditorPlugins],
      )}
    >
      {children}
    </CellContext.Provider>
  );
}

type TInserTableDialogProps = {
  activeEditor: LexicalEditor;
};

export const InserTableDialog = ({ activeEditor }: TInserTableDialogProps) => {
  const initialRows = 5;
  const initialCols = 10;
  const maxRows = 20;
  const maxCols = 20;

  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);
  const [hoveredRows, setHoveredRows] = useState(1);
  const [hoveredCols, setHoveredCols] = useState(1);
  const [visibleRows, setVisibleRows] = useState(5);
  const [visibleCols, setVisibleCols] = useState(6);
  const [inputRows, setInputRows] = useState('1');
  const [inputCols, setInputCols] = useState('1');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const resetTableState = () => {
    setHoveredRows(1);
    setHoveredCols(1);
    setInputRows('1');
    setInputCols('1');
    setIsTableDropdownOpen(false);
  };

  const handleTableSelection = () => {
    setIsTableDropdownOpen(false);
    setVisibleRows(initialRows);
    setVisibleCols(initialCols);
  };

  const handleCellHover = (row: number, col: number) => {
    setHoveredRows(row);
    setHoveredCols(col);

    if (row >= visibleRows - 1 && visibleRows < maxRows) {
      setVisibleRows(Math.min(visibleRows + 2, maxRows));
    } else if (row < visibleRows - 2 && visibleRows > initialRows) {
      setVisibleRows(Math.max(row + 2, initialRows));
    }

    if (col >= visibleCols - 1 && visibleCols < maxCols) {
      setVisibleCols(Math.min(visibleCols + 2, maxCols));
    } else if (col < visibleCols - 2 && visibleCols > initialCols) {
      setVisibleCols(Math.max(col + 2, initialCols));
    }
  };

  const handleInputChange = (type: 'rows' | 'cols', value: string) => {
    const numValue = parseInt(value) || 1;
    const limitedValue = Math.min(Math.max(numValue, 1), maxRows);

    if (type === 'rows') {
      setInputRows(value);
      setHoveredRows(limitedValue);
      // Ensure the grid shows enough rows to display the selection
      if (limitedValue >= visibleRows - 1) {
        setVisibleRows(Math.min(limitedValue + 2, maxRows));
      } else if (limitedValue < visibleRows - 2) {
        // Shrink grid when input value is smaller
        setVisibleRows(Math.max(limitedValue + 2, initialRows));
      }
    } else {
      setInputCols(value);
      setHoveredCols(limitedValue);
      // Ensure the grid shows enough columns to display the selection
      if (limitedValue >= visibleCols - 1) {
        setVisibleCols(Math.min(limitedValue + 2, maxCols));
      } else if (limitedValue < visibleCols - 2) {
        // Shrink grid when input value is smaller
        setVisibleCols(Math.max(limitedValue + 2, initialCols));
      }
    }
  };

  const handleInsertTable = (rowsToInsert: number, colsToInsert: number) => {
    if (!activeEditor || rowsToInsert < 1 || colsToInsert < 1) return;

    activeEditor.update(() => {
      const tableNode = $createTableNodeWithDimensions(rowsToInsert, colsToInsert, {
        rows: true,
        columns: false,
      });
      $insertNodeToNearestRoot(tableNode);
    });

    resetTableState();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTableDropdownOpen(false);
        setVisibleRows(initialRows);
        setVisibleCols(initialCols);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update input fields when hovering over cells
  useEffect(() => {
    setInputRows(hoveredRows.toString());
    setInputCols(hoveredCols.toString());
  }, [hoveredRows, hoveredCols]);

  return (
    <div className='relative' ref={dropdownRef}>
      <button
        onClick={() => {
          setIsTableDropdownOpen(!isTableDropdownOpen);
          if (!isTableDropdownOpen) {
            setVisibleRows(initialRows);
            setVisibleCols(initialCols);
            setHoveredRows(1);
            setHoveredCols(1);
            setInputRows('1');
            setInputCols('1');
          }
        }}
        className='toolbar-item spaced'
        aria-label='Insert Table'
      >
        <TableIcon />
      </button>

      {isTableDropdownOpen && (
        <div
          className='absolute top-full left-0 mt-1 bg-white shadow-lg rounded-md p-3 z-10 border border-gray-200'
          style={{
            minWidth: `${Math.max(120, visibleCols * 20 + 20)}px`,
          }}
        >
          <div className='mb-1 pb-1 border-b border-gray-200'>
            <div className='text-sm font-medium text-gray-600 mb-2'>Custom size</div>
            <div className='flex items-center gap-2 mb-2'>
              <input
                type='number'
                min='1'
                max='20'
                value={inputRows}
                onChange={(e) => handleInputChange('rows', e.target.value)}
                onBlur={(e) => handleInputChange('rows', e.target.value)}
                className='w-10 px-2 py-px border border-gray-300 rounded text-sm'
                placeholder='Rows'
              />
              <span className='text-gray-500'>×</span>
              <input
                type='number'
                min='1'
                max='20'
                value={inputCols}
                onChange={(e) => handleInputChange('cols', e.target.value)}
                onBlur={(e) => handleInputChange('cols', e.target.value)}
                className='w-10 px-2 py-px border border-gray-300 rounded text-sm'
                placeholder='Cols'
              />
              <button
                onClick={() => {
                  const rows = Math.min(Math.max(parseInt(inputRows) || 1, 1), maxRows);
                  const cols = Math.min(Math.max(parseInt(inputCols) || 1, 1), maxCols);
                  handleTableSelection();
                  handleInsertTable(rows, cols);
                }}
                className='ml-2 px-1 py-0.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600'
              >
                Insert
              </button>
            </div>
          </div>

          <div className='text-sm font-medium text-gray-600 mt-2 mb-2'>Visual Selection</div>
          <div
            className='grid gap-1 mb-2'
            style={{
              gridTemplateColumns: `repeat(${visibleCols}, 16px)`,
              width: `${visibleCols * 17}px`,
            }}
          >
            {Array.from({ length: visibleRows * visibleCols }).map((_, index) => {
              const row = Math.floor(index / visibleCols) + 1;
              const col = (index % visibleCols) + 1;

              return (
                <div
                  key={index}
                  className={`w-4 h-4 border ${
                    row <= hoveredRows && col <= hoveredCols
                      ? 'bg-blue-100 border-blue-200'
                      : 'bg-gray-100 border-gray-300'
                  }`}
                  onMouseEnter={() => handleCellHover(row, col)}
                  onClick={() => {
                    handleTableSelection();
                    handleInsertTable(row, col);
                  }}
                />
              );
            })}
          </div>

          <div className='text-xs text-gray-500 text-center'>
            {hoveredRows} × {hoveredCols} table
          </div>
        </div>
      )}
    </div>
  );
};

export const TablePlugin = ({
  cellEditorConfig,
  children,
}: {
  cellEditorConfig: CellEditorConfig;
  children: React.ReactNode | Array<React.ReactNode>;
}): React.ReactNode | null => {
  const [editor] = useLexicalComposerContext();
  const cellContext = useContext(CellContext);
  useEffect(() => {
    if (!editor.hasNodes([TableNode, TableRowNode, TableCellNode])) {
      throw new Error(
        'TablePlugin: TableNode, TableRowNode, or TableCellNode is not registered on editor',
      );
    }
  }, [editor]);
  useEffect(() => {
    cellContext.set(cellEditorConfig, children);
  }, [cellContext, cellEditorConfig, children]);
  return null;
};
