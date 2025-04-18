/* eslint-disable */
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import {
  $getTableCellNodeFromLexicalNode,
  $getTableColumnIndexFromTableCellNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableRowIndexFromTableCellNode,
  $isTableCellNode,
  $isTableNode,
  $isTableSelection,
  TableCellNode,
  TableNode,
  TableRowNode,
  getTableElement,
} from '@lexical/table';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import {
  $createRangeSelection,
  $createTextNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  ElementFormatType,
  TextNode,
} from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Add CSS for swap highlighting with Google Docs style
const swapHighlightStyle = document.createElement('style');
swapHighlightStyle.textContent = `
  .swap-highlight {
    background-color: #e6f2ff !important;
    transition: background-color 0.3s ease;
  }
  
  .table-column-swapping {
    cursor: grabbing !important;
  }
  
  .column-drag-active {
    background-color: rgba(66, 133, 244, 0.2) !important;
    position: relative;
  }
  
  .column-drag-indicator {
    cursor: grab;
  }
  
  .column-drag-indicator:hover {
    background-color: #4285f4;
  }
  
  .column-drop-indicator {
    position: absolute;
    width: 3px;
    background-color: #4285f4;
    z-index: 90;
    pointer-events: none;
  }
  
  .column-drag-ghost {
    background-color: #4285f4;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    position: absolute;
    z-index: 1000;
    pointer-events: none;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    font-weight: 500;
  }
`;
document.head.appendChild(swapHighlightStyle);

type TColumnDragIndicatorProps = {
  tableElem: HTMLElement;
  columnIndex: number;
};

type TRowDragIndicatorProps = {
  tableElem: HTMLElement;
  rowIndex: number;
};

const ColumnDragIndicator = ({ tableElem, columnIndex }: TColumnDragIndicatorProps) => {
  // Get the column's position based on the first cell in that column
  const rows = tableElem.querySelectorAll('tr');
  if (rows.length === 0) return null;

  const firstRow = rows[0];
  const cells = firstRow.querySelectorAll('th, td');
  if (columnIndex >= cells.length) return null;

  const cell = cells[columnIndex];
  const cellRect = cell.getBoundingClientRect();
  const tableRect = tableElem.getBoundingClientRect();

  // Position the indicator directly over the column's top border
  const left = cellRect.left - tableRect.left + cellRect.width / 2;

  // Handle mouse events directly on the indicator
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    console.log('React dragStart fired');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnIndex.toString());

    // Create a custom ghost image that looks like Google Docs
    const ghost = document.createElement('div');
    ghost.textContent = `Column ${columnIndex + 1}`;
    ghost.className = 'column-drag-ghost';
    document.body.appendChild(ghost);

    e.dataTransfer.setDragImage(ghost, 0, 0);

    // We'll remove this ghost after drag ends
    setTimeout(() => {
      document.body.removeChild(ghost);
    }, 0);

    // Highlight the entire column being dragged
    // rows.forEach((row) => {
    //   const cells = row.querySelectorAll('th, td');
    //   if (columnIndex < cells.length) {
    //     cells[columnIndex].classList.add('column-drag-active');
    //   }
    // });
  };

  return (
    <div
      className='column-drag-indicator'
      data-column-index={columnIndex}
      style={{
        position: 'absolute',
        top: -10, // Position directly on top border
        left: `${left}px`,
        transform: 'translateX(-50%)', // Center the indicator on the column
        cursor: 'grab',
        zIndex: 100,
        backgroundColor: '#2563eb',
        borderRadius: '4px',
        padding: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        width: '28px',
        height: '20px',
      }}
      draggable={true}
      onDragStart={handleDragStart}
    >
      <DragIndicatorRoundedIcon
        sx={{
          fontSize: '20px',
          color: 'white',
          transform: 'rotate(90deg)',
        }}
      />
    </div>
  );
};

const RowDragIndicator = ({ tableElem, rowIndex }: TRowDragIndicatorProps) => {
  // Get the row's position
  const rows = tableElem.querySelectorAll('tr');
  if (rowIndex >= rows.length) return null;

  const row = rows[rowIndex];
  const rowRect = row.getBoundingClientRect();
  const tableRect = tableElem.getBoundingClientRect();

  // Position the indicator directly over the row's left border
  const top = rowRect.top - tableRect.top + rowRect.height / 2;

  // Handle mouse events directly on the indicator
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    console.log('Row drag started');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('row-index', rowIndex.toString());

    // Create a custom ghost image
    const ghost = document.createElement('div');
    ghost.textContent = `Row ${rowIndex + 1}`;
    ghost.className = 'column-drag-ghost';
    document.body.appendChild(ghost);

    e.dataTransfer.setDragImage(ghost, 0, 0);

    // We'll remove this ghost after drag ends
    setTimeout(() => {
      document.body.removeChild(ghost);
    }, 0);

    // Highlight the entire row being dragged
    const cells = row.querySelectorAll('th, td');
    cells.forEach((cell) => {
      cell.classList.add('column-drag-active');
    });
  };

  return (
    <div
      className='row-drag-indicator'
      data-row-index={rowIndex}
      style={{
        position: 'absolute',
        left: -10, // Position directly on left border
        top: `${top}px`,
        transform: 'translateY(-50%)', // Center the indicator on the row
        cursor: 'grab',
        zIndex: 100,
        backgroundColor: '#2563eb',
        borderRadius: '4px',
        padding: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        width: '20px',
        height: '28px',
      }}
      draggable={true}
      onDragStart={handleDragStart}
    >
      <DragIndicatorRoundedIcon
        sx={{
          fontSize: '20px',
          color: 'white',
        }}
      />
    </div>
  );
};

export const TableDragDropPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();

  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [tableElem, setTableElem] = useState<HTMLElement | null>(null);
  const [tableNodeKey, setTableNodeKey] = useState<string | null>(null);
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
  const [dropTargetColumnIndex, setDropTargetColumnIndex] = useState<number | null>(null);
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [dropTargetRowIndex, setDropTargetRowIndex] = useState<number | null>(null);

  // New state to track hover highlight during drag
  const [hoverColumnIndex, setHoverColumnIndex] = useState<number | null>(null);
  const [hoverRowIndex, setHoverRowIndex] = useState<number | null>(null);

  // Function to swap rows in the table
  const shiftTableRows = useCallback(
    (sourceRowIndex: number, targetRowIndex: number) => {
      if (sourceRowIndex === targetRowIndex || !tableElem || !tableNodeKey) {
        return;
      }

      // Add a class to the whole table during swap to prevent user interaction
      if (tableElem) {
        tableElem.classList.add('table-column-swapping');
      }

      // First, highlight rows to provide visual feedback
      const rows = tableElem.querySelectorAll('tr');
      if (sourceRowIndex < rows.length && targetRowIndex < rows.length) {
        rows[sourceRowIndex].classList.add('swap-highlight');
        rows[targetRowIndex].classList.add('swap-highlight');
      }

      if (!tableNodeKey) {
        return;
      }

      // Force Lexical to update by checking for mutations
      editor.update(() => {
        const tableNode = $getNodeByKey(tableNodeKey) as TableNode;
        if (!tableNode) return;

        const rows = tableNode.getChildren() as TableRowNode[];
        if (
          sourceRowIndex < 0 ||
          sourceRowIndex >= rows.length ||
          targetRowIndex < 0 ||
          targetRowIndex >= rows.length
        ) {
          return;
        }

        const sourceRowNode = rows[sourceRowIndex];
        const newRows = [...rows];

        newRows.splice(sourceRowIndex, 1);
        newRows.splice(targetRowIndex, 0, sourceRowNode);

        for (const row of rows) {
          row.remove();
        }

        newRows.forEach((row) => {
          tableNode.append(row);
        });

        $setSelection(null);
      });

      // Do another update with a delay to ensure it takes
      setTimeout(() => {
        editor.update(() => {
          console.log('Delayed update for row swap');
        });

        // Clean up visual indicators
        if (tableElem) {
          tableElem.classList.remove('table-column-swapping');
          const highlights = tableElem.querySelectorAll('.swap-highlight');
          highlights.forEach((el) => el.classList.remove('swap-highlight'));
        }
      }, 100);

      // Position cursor at the end of first cell content in the target row
      setTimeout(() => {
        if (tableElem) {
          const updatedRows = tableElem.querySelectorAll('tr');
          if (targetRowIndex < updatedRows.length) {
            const firstCell = updatedRows[targetRowIndex].querySelector('td, th') as HTMLElement;

            if (firstCell) {
              editor.update(() => {
                const tableCellNode = $getNearestNodeFromDOMNode(firstCell);
                if (tableCellNode) {
                  // Get the first text node inside the cell
                  const textNodes: TextNode[] = [];
                  if ($isElementNode(tableCellNode)) {
                    tableCellNode.getChildren().forEach((child) => {
                      if ($isElementNode(child)) {
                        child.getChildren().forEach((grandChild) => {
                          if ($isTextNode(grandChild)) {
                            textNodes.push(grandChild);
                          }
                        });
                      }
                    });
                  }

                  // Position cursor at the end of the first text node
                  if (textNodes.length > 0) {
                    const textNode = textNodes[0];
                    const textLength = textNode.getTextContent().length;

                    // Create selection at the end of text
                    const selection = $createRangeSelection();
                    selection.anchor.set(textNode.getKey(), textLength, 'text');
                    selection.focus.set(textNode.getKey(), textLength, 'text');
                    $setSelection(selection);
                  } else {
                    // If no text nodes, position at beginning of cell
                    const selection = $createRangeSelection();
                    selection.anchor.set(tableCellNode.getKey(), 0, 'element');
                    selection.focus.set(tableCellNode.getKey(), 0, 'element');
                    $setSelection(selection);
                  }
                }
              });
            }
          }
        }
      }, 0);
    },
    [editor, tableElem, tableNodeKey],
  );

  // Function to swap columns in the table
  const shiftTableColumns = useCallback(
    (sourceColumnIndex: number, targetColumnIndex: number) => {
      if (sourceColumnIndex === targetColumnIndex || !tableElem || !tableNodeKey) return;

      tableElem.classList.add('table-column-swapping');

      const domRows = tableElem.querySelectorAll('tr');
      domRows.forEach((row) => {
        const cells = row.querySelectorAll('th, td');
        if (
          Math.min(sourceColumnIndex, targetColumnIndex) < cells.length &&
          Math.max(sourceColumnIndex, targetColumnIndex) < cells.length
        ) {
          cells[sourceColumnIndex].classList.add('swap-highlight');
          cells[targetColumnIndex].classList.add('swap-highlight');
        }
      });

      editor.update(() => {
        const tableNode = $getNodeByKey(tableNodeKey) as TableNode;
        const rows = tableNode.getChildren() as TableRowNode[];

        rows.forEach((rowNode: TableRowNode) => {
          const cells = rowNode.getChildren() as TableCellNode[];

          if (sourceColumnIndex >= cells.length || targetColumnIndex >= cells.length) {
            return;
          }

          const direction = sourceColumnIndex < targetColumnIndex ? 'right' : 'left';
          const newCells = [...cells];

          if (direction === 'right') {
            // Shift all cells from source to target left
            const [movedCell] = newCells.splice(sourceColumnIndex, 1);
            newCells.splice(targetColumnIndex, 0, movedCell);
          } else {
            // Shift all cells from source to target right
            const [movedCell] = newCells.splice(sourceColumnIndex, 1);
            newCells.splice(targetColumnIndex, 0, movedCell);
          }

          // Clear all and re-append in new order
          rowNode.clear();
          newCells.forEach((cell) => {
            rowNode.append(cell);
          });

          $setSelection(null);
        });

        // Handle colWidths
        const colWidths = tableNode.getColWidths();
        if (
          colWidths &&
          sourceColumnIndex < colWidths.length &&
          targetColumnIndex < colWidths.length
        ) {
          const newColWidths = [...colWidths];
          const [movedWidth] = newColWidths.splice(sourceColumnIndex, 1);
          newColWidths.splice(targetColumnIndex, 0, movedWidth);
          tableNode.setColWidths(newColWidths);
        }
      });

      setTimeout(() => {
        editor.update(() => {
          console.log('Delayed update for column shift');
        });

        tableElem.classList.remove('table-column-swapping');
        const highlights = tableElem.querySelectorAll('.swap-highlight');
        highlights.forEach((el) => el.classList.remove('swap-highlight'));
      }, 100);

      setTimeout(() => {
        if (tableElem) {
          const updatedRows = tableElem.querySelectorAll('tr');

          if (updatedRows.length > 0) {
            const firstRow = updatedRows[0];
            const targetCell = firstRow.querySelectorAll('td, th')[
              targetColumnIndex
            ] as HTMLElement;

            if (targetCell) {
              editor.update(() => {
                const tableCellNode = $getNearestNodeFromDOMNode(targetCell);
                if (tableCellNode) {
                  // Get the first text node inside the cell
                  const textNodes: TextNode[] = [];

                  if ($isElementNode(tableCellNode)) {
                    tableCellNode.getChildren().forEach((child) => {
                      if ($isElementNode(child)) {
                        child.getChildren().forEach((grandChild) => {
                          if ($isTextNode(grandChild)) {
                            textNodes.push(grandChild);
                          }
                        });
                      }
                    });
                  }

                  if (textNodes.length > 0) {
                    const textNode = textNodes[0];
                    const textLength = textNode.getTextContent().length;

                    const selection = $createRangeSelection();
                    selection.anchor.set(textNode.getKey(), textLength, 'text');
                    selection.focus.set(textNode.getKey(), textLength, 'text');
                    $setSelection(selection);
                  } else {
                    const selection = $createRangeSelection();
                    selection.anchor.set(tableCellNode.getKey(), 0, 'element');
                    selection.focus.set(tableCellNode.getKey(), 0, 'element');
                    $setSelection(selection);
                  }
                }
              });
            }
          }
        }
      }, 100);
    },
    [editor, tableElem, tableNodeKey],
  );

  // Set up drag and drop event handlers
  useEffect(() => {
    if (!tableElem) return;

    // These handlers are for column operations
    const handleColumnDragOver = (e: DragEvent) => {
      // Only process column drag events
      if (!e.dataTransfer?.types.includes('text/plain')) return;

      e.preventDefault();

      // Set the cursor style
      document.body.style.cursor = 'grabbing';

      // Find the column being dragged over
      const rect = tableElem.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

      const rows = tableElem.querySelectorAll('tr');
      if (rows.length === 0) return;

      const firstRow = rows[0];
      const cells = firstRow.querySelectorAll('th, td');

      let targetIndex: number | null = null;
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const cellRect = cell.getBoundingClientRect();
        const cellLeft = cellRect.left - rect.left;
        const cellRight = cellLeft + cellRect.width;

        if (mouseX >= cellLeft && mouseX <= cellRight) {
          targetIndex = i;
          break;
        }
      }

      setDropTargetColumnIndex(targetIndex);

      // Add hover highlight to the current column
      if (targetIndex !== null && targetIndex !== hoverColumnIndex) {
        // Remove previous highlight
        if (hoverColumnIndex !== null) {
          rows.forEach((row) => {
            const cells = row.querySelectorAll('th, td');
            if (hoverColumnIndex < cells.length) {
              cells[hoverColumnIndex].classList.remove('swap-highlight');
            }
          });
        }

        // Add new highlight
        rows.forEach((row) => {
          const cells = row.querySelectorAll('th, td');
          if (targetIndex !== null && targetIndex < cells.length) {
            cells[targetIndex].classList.add('swap-highlight');
          }
        });

        setHoverColumnIndex(targetIndex);
      }
    };

    // These handlers are for row operations
    const handleRowDragOver = (e: DragEvent) => {
      // Only process row drag events
      if (!e.dataTransfer?.types.includes('row-index')) return;

      e.preventDefault();

      // Set the cursor style
      document.body.style.cursor = 'grabbing';

      // Find the row being dragged over
      const rect = tableElem.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;

      const rows = tableElem.querySelectorAll('tr');

      let targetIndex = null;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowRect = row.getBoundingClientRect();
        const rowTop = rowRect.top - rect.top;
        const rowBottom = rowTop + rowRect.height;

        if (mouseY >= rowTop && mouseY <= rowBottom) {
          targetIndex = i;
          break;
        }
      }

      setDropTargetRowIndex(targetIndex);

      // Add hover highlight to the current row
      if (targetIndex !== null && targetIndex !== hoverRowIndex) {
        // Remove previous highlight
        if (hoverRowIndex !== null && hoverRowIndex < rows.length) {
          const cells = rows[hoverRowIndex].querySelectorAll('th, td');
          cells.forEach((cell) => {
            cell.classList.remove('swap-highlight');
          });
        }

        // Add new highlight
        if (targetIndex < rows.length) {
          const cells = rows[targetIndex].querySelectorAll('th, td');
          cells.forEach((cell) => {
            cell.classList.add('swap-highlight');
          });
        }

        setHoverRowIndex(targetIndex);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();

      // Reset cursor
      document.body.style.cursor = '';

      // Handle column drop
      if (e.dataTransfer?.types.includes('text/plain')) {
        const sourceColumnIndexStr = e.dataTransfer?.getData('text/plain');

        // Remove all column-drag-active classes
        tableElem.querySelectorAll('.column-drag-active').forEach((elem) => {
          elem.classList.remove('column-drag-active');
        });

        // Remove hover highlights
        tableElem.querySelectorAll('.swap-highlight').forEach((elem) => {
          elem.classList.remove('swap-highlight');
        });

        setHoverColumnIndex(null);

        if (sourceColumnIndexStr && dropTargetColumnIndex !== null) {
          const sourceColumnIndex = parseInt(sourceColumnIndexStr, 10);
          if (!isNaN(sourceColumnIndex) && sourceColumnIndex !== dropTargetColumnIndex) {
            shiftTableColumns(sourceColumnIndex, dropTargetColumnIndex);
          }
        }

        // Clean up column drag state
        setDraggedColumnIndex(null);
        setDropTargetColumnIndex(null);
      }

      // Handle row drop
      if (e.dataTransfer?.types.includes('row-index')) {
        const sourceRowIndexStr = e.dataTransfer?.getData('row-index');

        // Remove all column-drag-active classes (used for row highlighting too)
        tableElem.querySelectorAll('.column-drag-active').forEach((elem) => {
          elem.classList.remove('column-drag-active');
        });

        // Remove hover highlights
        tableElem.querySelectorAll('.swap-highlight').forEach((elem) => {
          elem.classList.remove('swap-highlight');
        });

        setHoverRowIndex(null);

        if (sourceRowIndexStr && dropTargetRowIndex !== null) {
          const sourceRowIndex = parseInt(sourceRowIndexStr, 10);
          if (!isNaN(sourceRowIndex) && sourceRowIndex !== dropTargetRowIndex) {
            shiftTableRows(sourceRowIndex, dropTargetRowIndex);
          }
        }

        // Clean up row drag state
        setDraggedRowIndex(null);
        setDropTargetRowIndex(null);
      }
    };

    const handleDragEnd = (e: DragEvent) => {
      console.log('handleDragEnd');

      // Reset cursor
      document.body.style.cursor = '';

      // Remove all drag-active classes
      tableElem.querySelectorAll('.column-drag-active').forEach((elem) => {
        elem.classList.remove('column-drag-active');
      });

      // Remove hover highlights
      tableElem.querySelectorAll('.swap-highlight').forEach((elem) => {
        elem.classList.remove('swap-highlight');
      });

      setHoverColumnIndex(null);
      setHoverRowIndex(null);

      // Clean up all drag states
      setDraggedColumnIndex(null);
      setDropTargetColumnIndex(null);
      setDraggedRowIndex(null);
      setDropTargetRowIndex(null);
    };

    // Global dragenter to capture the indices if not already set
    const handleDragEnter = (e: DragEvent) => {
      // Handle column dragenter
      if (draggedColumnIndex === null && e.dataTransfer?.types.includes('text/plain')) {
        try {
          const sourceColumnIndex = parseInt(e.dataTransfer?.getData('text/plain'), 10);
          if (!isNaN(sourceColumnIndex)) {
            setDraggedColumnIndex(sourceColumnIndex);
          }
        } catch (err) {
          // In some browsers getData may throw during dragenter
        }
      }

      // Handle row dragenter
      if (draggedRowIndex === null && e.dataTransfer?.types.includes('row-index')) {
        try {
          const sourceRowIndex = parseInt(e.dataTransfer?.getData('row-index'), 10);
          if (!isNaN(sourceRowIndex)) {
            setDraggedRowIndex(sourceRowIndex);
          }
        } catch (err) {
          // In some browsers getData may throw during dragenter
        }
      }
    };

    // Combined handler for both column and row drag operations
    const handleCombinedDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('text/plain')) {
        handleColumnDragOver(e);
      } else if (e.dataTransfer?.types.includes('row-index')) {
        handleRowDragOver(e);
      }
    };

    // Add event listeners
    tableElem.addEventListener('dragover', handleCombinedDragOver as EventListener);
    tableElem.addEventListener('drop', handleDrop as EventListener);
    tableElem.addEventListener('dragend', handleDragEnd as EventListener);
    tableElem.addEventListener('dragenter', handleDragEnter as EventListener);

    return () => {
      tableElem.removeEventListener('dragover', handleCombinedDragOver as EventListener);
      tableElem.removeEventListener('drop', handleDrop as EventListener);
      tableElem.removeEventListener('dragend', handleDragEnd as EventListener);
      tableElem.removeEventListener('dragenter', handleDragEnter as EventListener);
    };
  }, [
    tableElem,
    draggedColumnIndex,
    dropTargetColumnIndex,
    draggedRowIndex,
    dropTargetRowIndex,
    shiftTableColumns,
    shiftTableRows,
  ]);

  const updateSelections = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();

      // Reset selections when there's no selection
      if (!selection) {
        setSelectedColumnIndex(null);
        setSelectedRowIndex(null);
        setTableElem(null);
        setTableNodeKey(null);
        return;
      }

      // Handle range and table selections
      if ($isRangeSelection(selection) || $isTableSelection(selection)) {
        const tableCellNode = $getTableCellNodeFromLexicalNode(
          $isRangeSelection(selection) ? selection.anchor.getNode() : selection.getNodes()[0],
        );

        if (!$isTableCellNode(tableCellNode)) {
          setSelectedColumnIndex(null);
          setSelectedRowIndex(null);
          setTableElem(null);
          setTableNodeKey(null);
          return;
        }

        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        const tableElement = getTableElement(tableNode, editor.getElementByKey(tableNode.getKey()));

        if (!tableElement) {
          setSelectedColumnIndex(null);
          setSelectedRowIndex(null);
          setTableElem(null);
          setTableNodeKey(null);
          return;
        }

        const columnIndex = $getTableColumnIndexFromTableCellNode(tableCellNode);
        const rowIndex = $getTableRowIndexFromTableCellNode(tableCellNode);

        // Show all column indicators when clicking on any cell in the first row
        if (rowIndex === 0) {
          setSelectedColumnIndex(columnIndex);
        } else {
          setSelectedColumnIndex(null);
        }

        // Show all row indicators when clicking on any cell in the first column
        if (columnIndex === 0) {
          setSelectedRowIndex(rowIndex);
        } else {
          setSelectedRowIndex(null);
        }

        setTableElem(tableElement);
        setTableNodeKey(tableNode.getKey());
      }
    });
  }, [editor]);

  useEffect(() => {
    // Update indicators when selection changes
    const removeUpdateListener = editor.registerUpdateListener(() => {
      updateSelections();
    });

    // Listen for clicks on table cells
    const rootElement = editor.getRootElement();

    if (rootElement) {
      const handleClick = () => {
        updateSelections();
      };

      rootElement.addEventListener('click', handleClick);

      return () => {
        removeUpdateListener();
        rootElement.removeEventListener('click', handleClick);
      };
    }

    return removeUpdateListener;
  }, [editor, updateSelections]);

  if (!isEditable || !tableElem) {
    return null;
  }

  // Calculate position in viewport
  const tableRect = tableElem.getBoundingClientRect();

  // Render drop indicators for columns and rows
  const renderDropIndicators = () => {
    return (
      <>
        {renderColumnDropIndicator()}
        {renderRowDropIndicator()}
      </>
    );
  };

  const renderColumnDropIndicator = () => {
    if (
      draggedColumnIndex === null ||
      dropTargetColumnIndex === null ||
      draggedColumnIndex === dropTargetColumnIndex
    ) {
      return null;
    }

    const rows = tableElem.querySelectorAll('tr');
    if (rows.length === 0) return null;

    const firstRow = rows[0];
    const cells = firstRow.querySelectorAll('th, td');
    if (dropTargetColumnIndex >= cells.length) return null;

    const cell = cells[dropTargetColumnIndex];
    const cellRect = cell.getBoundingClientRect();
    const relativeLeft = cellRect.left - tableRect.left;

    const isMovingRight = draggedColumnIndex < dropTargetColumnIndex;
    const position = isMovingRight ? relativeLeft + cellRect.width : relativeLeft;

    return (
      <div
        className='column-drop-indicator'
        style={{
          top: 0,
          left: `${position}px`,
          height: `${tableRect.height}px`,
        }}
      />
    );
  };

  const renderRowDropIndicator = () => {
    if (
      draggedRowIndex === null ||
      dropTargetRowIndex === null ||
      draggedRowIndex === dropTargetRowIndex
    ) {
      return null;
    }

    const rows = tableElem.querySelectorAll('tr');
    if (dropTargetRowIndex >= rows.length) return null;

    const row = rows[dropTargetRowIndex];
    const rowRect = row.getBoundingClientRect();
    const relativeTop = rowRect.top - tableRect.top;

    const isMovingDown = draggedRowIndex < dropTargetRowIndex;
    const position = isMovingDown ? relativeTop + rowRect.height : relativeTop;

    return (
      <div
        className='row-drop-indicator'
        style={{
          left: 0,
          top: `${position}px`,
          width: `${tableRect.width}px`,
          height: '3px',
          position: 'absolute',
          backgroundColor: '#4285f4',
          zIndex: 90,
          pointerEvents: 'none',
        }}
      />
    );
  };

  return createPortal(
    <div
      className='table-drag-indicators'
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        pointerEvents: 'none', // Allow clicks to pass through to table
      }}
    >
      {selectedColumnIndex !== null && (
        <div
          style={{
            position: 'absolute',
            top: tableRect.top,
            left: tableRect.left,
            pointerEvents: 'auto',
          }}
        >
          <ColumnDragIndicator tableElem={tableElem} columnIndex={selectedColumnIndex} />
        </div>
      )}

      {selectedRowIndex !== null && (
        <div
          style={{
            position: 'absolute',
            top: tableRect.top,
            left: tableRect.left,
            pointerEvents: 'auto',
          }}
        >
          <RowDragIndicator tableElem={tableElem} rowIndex={selectedRowIndex} />
        </div>
      )}

      {renderDropIndicators()}
    </div>,
    document.body,
  );
};
