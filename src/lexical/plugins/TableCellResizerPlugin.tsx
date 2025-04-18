import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import {
  $computeTableMapSkipCellCheck,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableRowIndexFromTableCellNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellNode,
  TableDOMCell,
  TableMapType,
  TableNode,
  getDOMCellFromTarget,
} from '@lexical/table';
import { calculateZoomLevel, mergeRegister } from '@lexical/utils';
import { $getNearestNodeFromDOMNode, LexicalEditor, NodeKey, isHTMLElement } from 'lexical';
import {
  CSSProperties,
  PointerEventHandler,
  ReactPortal,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import './../css/TableCellResizer.css';

type PointerPosition = {
  x: number;
  y: number;
};

type PointerDraggingDirection = 'right' | 'bottom' | 'left';

const MIN_ROW_HEIGHT = 30;
const DEFAULT_MIN_COLUMN_WIDTH = 30;
const DEFAULT_MAX_COLUMN_WIDTH = 120;
const SKIP_SCROLL_INTO_VIEW_TAG = 'skip-scroll-into-view';

const calculateInitialColumnWidth = (editor: LexicalEditor, tableNode: TableNode): number => {
  try {
    const rootElement = editor.getRootElement();
    if (!rootElement) return DEFAULT_MIN_COLUMN_WIDTH;

    const editorWidth = rootElement.clientWidth;
    const columnCount = tableNode.getColumnCount();
    if (!columnCount || columnCount <= 0) return DEFAULT_MIN_COLUMN_WIDTH;

    const calculatedWidth = Math.floor((editorWidth * 0.9) / columnCount);
    return Math.max(Math.min(calculatedWidth, DEFAULT_MAX_COLUMN_WIDTH), DEFAULT_MIN_COLUMN_WIDTH);
  } catch (_error) {
    return DEFAULT_MIN_COLUMN_WIDTH;
  }
};

const TableCellResizer = ({ editor }: { editor: LexicalEditor }) => {
  const targetRef = useRef<HTMLElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);
  const tableRectRef = useRef<DOMRect | null>(null);
  const editorRootRef = useRef<HTMLElement | null>(null);
  const pointerStartPosRef = useRef<PointerPosition | null>(null);

  const [hasTable, setHasTable] = useState(false);
  const [isMaxWidthReached, setIsMaxWidthReached] = useState(false);
  const [pointerCurrentPos, updatePointerCurrentPos] = useState<PointerPosition | null>(null);
  const [activeCell, updateActiveCell] = useState<TableDOMCell | null>(null);
  const [draggingDirection, updateDraggingDirection] = useState<PointerDraggingDirection | null>(
    null,
  );

  const resetState = useCallback(() => {
    updateActiveCell(null);
    targetRef.current = null;
    updateDraggingDirection(null);
    pointerStartPosRef.current = null;
    tableRectRef.current = null;
    setIsMaxWidthReached(false);
  }, []);

  // Set up resize observer to recalculate column widths when editor is resized
  useEffect(() => {
    editorRootRef.current = editor.getRootElement();
    if (!editorRootRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === editorRootRef.current) {
          editor.update(() => {
            editor.getEditorState().read(() => {
              const tableNodesMap = editor._nodes.get('table');
              if (tableNodesMap && typeof tableNodesMap === 'object') {
                // Handle the table nodes map safely
                if (tableNodesMap instanceof Map) {
                  // If it's a map, iterate over entries
                  tableNodesMap.forEach((_, nodeKey) => {
                    const tableNode = editor.getEditorState()._nodeMap.get(nodeKey);
                    if (tableNode && $isTableNode(tableNode)) {
                      const colWidths = tableNode.getColWidths();
                      if (colWidths) {
                        const newColWidths = colWidths.map((width) =>
                          Math.max(width, DEFAULT_MIN_COLUMN_WIDTH),
                        );
                        tableNode.setColWidths(newColWidths);
                      }
                    }
                  });
                } else if (Array.isArray(tableNodesMap)) {
                  // If it's an array, iterate directly
                  tableNodesMap.forEach((arrEntry) => {
                    if (Array.isArray(arrEntry) && arrEntry.length === 2) {
                      const [nodeKey] = arrEntry;
                      const tableNode = editor.getEditorState()._nodeMap.get(nodeKey);
                      if (tableNode && $isTableNode(tableNode)) {
                        const colWidths = tableNode.getColWidths();
                        if (colWidths) {
                          const newColWidths = colWidths.map((width) =>
                            Math.max(width, DEFAULT_MIN_COLUMN_WIDTH),
                          );
                          tableNode.setColWidths(newColWidths);
                        }
                      }
                    }
                  });
                } else {
                  // For other object types, try to get keys and iterate
                  Object.keys(tableNodesMap).forEach((nodeKey) => {
                    const tableNode = editor.getEditorState()._nodeMap.get(nodeKey);
                    if (tableNode && $isTableNode(tableNode)) {
                      const colWidths = tableNode.getColWidths();
                      if (colWidths) {
                        const newColWidths = colWidths.map((width) =>
                          Math.max(width, DEFAULT_MIN_COLUMN_WIDTH),
                        );
                        tableNode.setColWidths(newColWidths);
                      }
                    }
                  });
                }
              }
            });
          });
        }
      }
    });

    resizeObserver.observe(editorRootRef.current);

    return () => {
      if (editorRootRef.current) {
        resizeObserver.unobserve(editorRootRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [editor]);

  useEffect(() => {
    const tableKeys = new Set<NodeKey>();
    return mergeRegister(
      editor.registerMutationListener(TableNode, (nodeMutations) => {
        // Use entries() to properly iterate over Map values
        for (const [nodeKey, mutation] of Array.from(nodeMutations.entries())) {
          if (mutation === 'destroyed') {
            tableKeys.delete(nodeKey);
          } else {
            tableKeys.add(nodeKey);
          }
        }
        setHasTable(tableKeys.size > 0);
      }),
      editor.registerNodeTransform(TableNode, (tableNode) => {
        if (tableNode.getColWidths()) {
          return tableNode;
        }

        const numColumns = tableNode.getColumnCount();
        const columnWidth = calculateInitialColumnWidth(editor, tableNode); // Use the initial width function

        tableNode.setColWidths(Array(numColumns).fill(columnWidth));
        return tableNode;
      }),
    );
  }, [editor]);

  useEffect(() => {
    if (!hasTable) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      const target = event.target;
      if (!isHTMLElement(target)) {
        return;
      }

      if (draggingDirection) {
        event.preventDefault();
        event.stopPropagation();
        updatePointerCurrentPos({
          x: event.clientX,
          y: event.clientY,
        });
        return;
      }
      if (resizerRef.current && target && resizerRef.current.contains(target as Node)) {
        return;
      }

      if (targetRef.current !== target) {
        if (isHTMLElement(target)) {
          targetRef.current = target as HTMLElement;
          const cell = getDOMCellFromTarget(target);

          if (cell && activeCell !== cell) {
            editor.getEditorState().read(
              () => {
                const tableCellNode = $getNearestNodeFromDOMNode(cell.elem);
                if (!tableCellNode) {
                  throw new Error('TableCellResizer: Table cell node not found.');
                }

                const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
                const tableElement = getTableElement(
                  tableNode,
                  editor.getElementByKey(tableNode.getKey()),
                );

                if (!tableElement) {
                  throw new Error('TableCellResizer: Table element not found.');
                }

                targetRef.current = target as HTMLElement;
                tableRectRef.current = tableElement.getBoundingClientRect();
                updateActiveCell(cell);
              },
              { editor },
            );
          } else if (cell == null) {
            resetState();
          }
        }
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const isTouchEvent = event.pointerType === 'touch';
      if (isTouchEvent) {
        onPointerMove(event);
      }
    };

    const resizerContainer = resizerRef.current;
    resizerContainer?.addEventListener('pointermove', onPointerMove, {
      capture: true,
    });

    const removeRootListener = editor.registerRootListener((rootElement, prevRootElement) => {
      prevRootElement?.removeEventListener('pointermove', onPointerMove);
      prevRootElement?.removeEventListener('pointerdown', onPointerDown);
      rootElement?.addEventListener('pointermove', onPointerMove);
      rootElement?.addEventListener('pointerdown', onPointerDown);
    });

    return () => {
      removeRootListener();
      resizerContainer?.removeEventListener('pointermove', onPointerMove);
    };
  }, [activeCell, draggingDirection, editor, resetState, hasTable]);

  const isHeightChanging = (direction: PointerDraggingDirection) => {
    if (direction === 'bottom') {
      return true;
    }
    return false;
  };

  const updateRowHeight = useCallback(
    (heightChange: number) => {
      if (!activeCell) {
        throw new Error('TableCellResizer: Expected active cell.');
      }

      editor.update(
        () => {
          const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem);
          if (!$isTableCellNode(tableCellNode)) {
            throw new Error('TableCellResizer: Table cell node not found.');
          }

          const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
          const baseRowIndex = $getTableRowIndexFromTableCellNode(tableCellNode);
          const tableRows = tableNode.getChildren();

          // Determine if this is a full row merge by checking colspan
          const isFullRowMerge = tableCellNode.getColSpan() === tableNode.getColumnCount();

          // For full row merges, apply to first row. For partial merges, apply to last row
          const tableRowIndex = isFullRowMerge
            ? baseRowIndex
            : baseRowIndex + tableCellNode.getRowSpan() - 1;

          if (tableRowIndex >= tableRows.length || tableRowIndex < 0) {
            throw new Error('Expected table cell to be inside of table row.');
          }

          const tableRow = tableRows[tableRowIndex];

          if (!$isTableRowNode(tableRow)) {
            throw new Error('Expected table row');
          }

          let height = tableRow.getHeight();
          if (height === undefined) {
            const rowCells = tableRow.getChildren<TableCellNode>();
            height = Math.min(
              ...rowCells.map((cell) => getCellNodeHeight(cell, editor) ?? Infinity),
            );
          }

          const newHeight = Math.max(height + heightChange, MIN_ROW_HEIGHT);
          tableRow.setHeight(newHeight);
        },
        { tag: SKIP_SCROLL_INTO_VIEW_TAG },
      );
    },
    [activeCell, editor],
  );

  const getCellNodeHeight = (
    cell: TableCellNode,
    activeEditor: LexicalEditor,
  ): number | undefined => {
    const domCellNode = activeEditor.getElementByKey(cell.getKey());
    return domCellNode?.clientHeight;
  };

  const getCellColumnIndex = (tableCellNode: TableCellNode, tableMap: TableMapType) => {
    // Find the right column index accounting for merged cells
    for (let row = 0; row < tableMap.length; row++) {
      for (let column = 0; column < tableMap[row].length; column++) {
        const { cell, startColumn } = tableMap[row][column];
        // Found matching cell
        if (cell === tableCellNode) {
          // Return the startColumn which is the actual column index
          return startColumn;
        }
      }
    }

    // Fallback: search by cell key
    const cellKey = tableCellNode.getKey();
    for (let row = 0; row < tableMap.length; row++) {
      for (let column = 0; column < tableMap[row].length; column++) {
        if (tableMap[row][column].cell.getKey() === cellKey) {
          return column;
        }
      }
    }

    return undefined;
  };

  const updateColumnWidth = useCallback(
    (widthChange: number) => {
      if (!activeCell) {
        throw new Error('TableCellResizer: Expected active cell.');
      }

      // Set state outside the editor update to ensure it gets reflected
      let hasReachedMaxWidth = false;

      editor.update(
        () => {
          const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem);
          if (!$isTableCellNode(tableCellNode)) {
            throw new Error('TableCellResizer: Table cell node not found.');
          }

          const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
          const [tableMap] = $computeTableMapSkipCellCheck(tableNode, null, null);

          // Get current cell's position
          const columnIndex = getCellColumnIndex(tableCellNode, tableMap);
          if (columnIndex === undefined) {
            throw new Error('TableCellResizer: Table column not found.');
          }

          // Get editor width constraints
          const editorRoot = editor.getRootElement();
          const editorWidth = editorRoot ? editorRoot.clientWidth : Infinity;
          const maxTableWidth = editorWidth - 20;

          // Get all column widths
          const colWidths = tableNode.getColWidths();
          if (!colWidths) {
            return;
          }

          // Calculate the current total table width
          const currentTableWidth = colWidths.reduce((sum, width) => sum + width, 0);

          // For the right edge of the cell, we need to adjust the current cell's column
          // This is the column being actively resized
          const colSpan = tableCellNode.getColSpan();
          const targetColumnIndex =
            colSpan > 1
              ? columnIndex + colSpan - 1 // For merged cells, adjust the rightmost column
              : columnIndex; // For regular cells, adjust this column directly

          // Check if target column exists
          if (targetColumnIndex >= colWidths.length) {
            // eslint-disable-next-line no-console
            console.warn('TableCellResizer: Target column index out of bounds');
            return;
          }

          // Create a new widths array
          const newColWidths = [...colWidths];

          // Get the current column width and the one after it (if exists)
          const currentWidth = colWidths[targetColumnIndex];
          const nextColumnIndex = targetColumnIndex + 1;
          const hasNextColumn = nextColumnIndex < colWidths.length;

          // Check if we're resizing the rightmost column (table border)
          const isTableBorderResize = !hasNextColumn;

          if (isTableBorderResize) {
            // CASE 1: RESIZING TABLE BORDER (rightmost edge)
            // This changes the overall table width
            let newWidth = Math.max(currentWidth + widthChange, DEFAULT_MIN_COLUMN_WIDTH);

            // Check if the new total width would exceed the editor width
            const newTotalWidth = currentTableWidth - currentWidth + newWidth;

            if (newTotalWidth > maxTableWidth) {
              // If new width would exceed editor, limit it
              newWidth = currentWidth + (maxTableWidth - currentTableWidth);
              // Ensure we still meet minimum requirements
              newWidth = Math.max(newWidth, DEFAULT_MIN_COLUMN_WIDTH);
              hasReachedMaxWidth = true;
            } else {
              hasReachedMaxWidth = false;
            }

            newColWidths[targetColumnIndex] = newWidth;
          } else {
            // CASE 2: RESIZING INTERNAL COLUMN (between two columns)
            // Google Docs style: Redistribute space between adjacent columns
            // without changing the overall table width
            const nextColumnWidth = colWidths[nextColumnIndex];

            if (widthChange > 0) {
              // Trying to increase width - take space from next column
              // Calculate max we can take (respecting min width of next column)
              const maxBorrowable = Math.max(0, nextColumnWidth - DEFAULT_MIN_COLUMN_WIDTH);
              const effectiveChange = Math.min(widthChange, maxBorrowable);

              if (effectiveChange > 0) {
                // Increase current column width
                newColWidths[targetColumnIndex] = currentWidth + effectiveChange;
                // Decrease next column width by the same amount
                newColWidths[nextColumnIndex] = nextColumnWidth - effectiveChange;
                hasReachedMaxWidth = effectiveChange < widthChange;
              } else {
                // Can't borrow any more space
                hasReachedMaxWidth = true;
              }
            } else if (widthChange < 0) {
              // Shrinking current column - give space to next column
              // Ensure current column doesn't go below minimum
              const maxShrinkable = Math.max(0, currentWidth - DEFAULT_MIN_COLUMN_WIDTH);
              const effectiveShrink = Math.min(Math.abs(widthChange), maxShrinkable);

              if (effectiveShrink > 0) {
                // Decrease current column width
                newColWidths[targetColumnIndex] = currentWidth - effectiveShrink;
                // Increase next column width by the same amount
                newColWidths[nextColumnIndex] = nextColumnWidth + effectiveShrink;
              }

              hasReachedMaxWidth = false;
            }
          }

          // Apply the column widths
          tableNode.setColWidths(newColWidths);
        },
        { tag: SKIP_SCROLL_INTO_VIEW_TAG },
      );

      // Update the max width reached state after editor update
      setIsMaxWidthReached(hasReachedMaxWidth);
    },
    [activeCell, editor],
  );

  const getResizers = useCallback(() => {
    if (activeCell) {
      const { height, width, top, left } = activeCell.elem.getBoundingClientRect();
      const zoom = calculateZoomLevel(activeCell.elem);
      const zoneWidth = 16; // Pixel width of the zone where you can drag the edge
      const styles: Record<string, CSSProperties> = {
        bottom: {
          backgroundColor: 'none',
          cursor: 'row-resize',
          height: `${zoneWidth}px`,
          left: `${window.scrollX + left}px`,
          top: `${window.scrollY + top + height - zoneWidth / 2}px`,
          width: `${width}px`,
        },
        right: {
          backgroundColor: 'none',
          cursor: 'col-resize',
          height: `${height}px`,
          left: `${window.scrollX + left + width - zoneWidth / 2}px`,
          top: `${window.scrollY + top}px`,
          width: `${zoneWidth}px`,
        },
        left: {
          backgroundColor: 'none',
          cursor: 'col-resize',
          height: `${height}px`,
          left: `${window.scrollX + left - zoneWidth / 2}px`,
          top: `${window.scrollY + top}px`,
          width: `${zoneWidth}px`,
        },
      };

      const tableRect = tableRectRef.current;

      if (draggingDirection && pointerCurrentPos && tableRect) {
        if (isHeightChanging(draggingDirection)) {
          styles[draggingDirection].left = `${window.scrollX + tableRect.left}px`;
          styles[draggingDirection].top = `${window.scrollY + pointerCurrentPos.y / zoom}px`;
          styles[draggingDirection].height = '3px';
          styles[draggingDirection].width = `${tableRect.width}px`;
        } else {
          styles[draggingDirection].top = `${window.scrollY + tableRect.top}px`;
          styles[draggingDirection].left = `${window.scrollX + pointerCurrentPos.x / zoom}px`;
          styles[draggingDirection].width = '3px';
          styles[draggingDirection].height = `${tableRect.height}px`;
        }

        styles[draggingDirection].backgroundColor = '#adf';
        styles[draggingDirection].mixBlendMode = 'unset';
      }

      return styles;
    }

    return {
      bottom: null,
      left: null,
      right: null,
      top: null,
    };
  }, [activeCell, draggingDirection, pointerCurrentPos]);

  const resizerStyles = getResizers();

  // Add logic to handle left column resizing
  const updateColumnWidthFromLeft = useCallback(
    (widthChange: number) => {
      if (!activeCell) {
        throw new Error('TableCellResizer: Expected active cell.');
      }

      // Set state outside the editor update to ensure it gets reflected
      let hasReachedMaxWidth = false;

      editor.update(
        () => {
          const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem);
          if (!$isTableCellNode(tableCellNode)) {
            throw new Error('TableCellResizer: Table cell node not found.');
          }

          const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
          const [tableMap] = $computeTableMapSkipCellCheck(tableNode, null, null);

          // Get current cell's position
          const columnIndex = getCellColumnIndex(tableCellNode, tableMap);
          if (columnIndex === undefined) {
            throw new Error('TableCellResizer: Table column not found.');
          }

          // Get all column widths
          const colWidths = tableNode.getColWidths();
          if (!colWidths) {
            return;
          }

          // When dragging left edge, use a different approach for the leftmost column
          if (columnIndex === 0) {
            // CASE 1: RESIZING LEFTMOST TABLE BORDER
            // Google Docs approach: When resizing leftmost column,
            // adjust ALL other columns to keep the right side of the table fixed

            // Create a new widths array
            const newColWidths = [...colWidths];

            // Calculate new width respecting minimum
            const newWidth = Math.max(
              colWidths[columnIndex] + widthChange,
              DEFAULT_MIN_COLUMN_WIDTH,
            );
            const widthDelta = newWidth - colWidths[columnIndex];

            if (widthDelta !== 0) {
              // For Google Docs behavior, when the leftmost column grows,
              // we need to shrink all other columns proportionally to maintain
              // table right edge position

              // Calculate total width available for other columns
              const otherColumnsWidth = colWidths.reduce(
                (sum, width, idx) => (idx === columnIndex ? sum : sum + width),
                0,
              );

              // New total width if we just change the first column
              const newTotalWidth = newWidth + otherColumnsWidth;

              // Get editor width constraints in leftmost column resize
              const editorRoot = editor.getRootElement();
              const editorWidth = editorRoot ? editorRoot.clientWidth : Infinity;
              const maxTableWidth = editorWidth - 20;

              // Apply leftmost column change to the new array
              newColWidths[columnIndex] = newWidth;

              // Check if we'd exceed max width
              if (newTotalWidth > maxTableWidth) {
                // If exceeding max width, scale back the first column
                const excessWidth = newTotalWidth - maxTableWidth;
                newColWidths[columnIndex] = Math.max(
                  newWidth - excessWidth,
                  DEFAULT_MIN_COLUMN_WIDTH,
                );
                hasReachedMaxWidth = true;
              }
              // In Google Docs, the right side of the table stays fixed when
              // dragging the leftmost column. We don't need to adjust other columns
              // as the Lexical editor will maintain the table position.
            }

            // Apply the column widths using the new array
            tableNode.setColWidths(newColWidths);

            // Add position class for stability
            const tableElement = editor.getElementByKey(tableNode.getKey());
            if (tableElement && tableElement.parentElement) {
              tableElement.parentElement.classList.add('table-container');

              // Instead of inline styles which may conflict, use a data attribute
              // to signal our CSS to handle this table appropriately
              tableElement.setAttribute('data-leftmost-resized', 'true');
            }
          } else {
            // When dragging left edge, the width change is reversed (negative means expand)
            const adjustedWidthChange = -widthChange;

            // Create a new widths array
            const newColWidths = [...colWidths];

            // Get the current column width and the one before it (if exists)
            const currentWidth = colWidths[columnIndex];
            const prevColumnIndex = columnIndex - 1;
            const hasPrevColumn = prevColumnIndex >= 0;

            // Check if we're resizing the leftmost column
            const isTableLeftBorderResize = !hasPrevColumn;

            if (isTableLeftBorderResize) {
              // CASE 1: RESIZING LEFTMOST TABLE BORDER
              // For leftmost column, we need to keep table in place
              // by adjusting the table's parent container

              // Calculate new width respecting minimum
              const newWidth = Math.max(
                currentWidth + adjustedWidthChange,
                DEFAULT_MIN_COLUMN_WIDTH,
              );

              // Apply the new width
              newColWidths[columnIndex] = newWidth;

              // Get total table width
              const editorRoot = editor.getRootElement();
              const editorWidth = editorRoot ? editorRoot.clientWidth : Infinity;
              const maxTableWidth = editorWidth - 20;

              // Calculate new total width
              const newTotalWidth = colWidths.reduce(
                (sum, width, i) => sum + (i === columnIndex ? newWidth : width),
                0,
              );

              // Check if we're exceeding max width
              if (newTotalWidth > maxTableWidth) {
                // Scale back the change proportionally to fit
                hasReachedMaxWidth = true;
                const excessWidth = newTotalWidth - maxTableWidth;
                newColWidths[columnIndex] = newWidth - excessWidth;
              }

              // Apply the adjusted widths
              tableNode.setColWidths(newColWidths);

              // Find the table DOM element
              const tableElement = editor.getElementByKey(tableNode.getKey());

              // Add a CSS class to the table element's parent for positioning
              if (tableElement) {
                // Set attribute on the table itself
                tableElement.setAttribute('data-leftmost-resized', 'true');

                if (tableElement.parentElement) {
                  // Mark this table's parent for special handling
                  tableElement.parentElement.classList.add('table-container');
                }
              }
            } else {
              // CASE 2: RESIZING BETWEEN TWO COLUMNS FROM LEFT SIDE
              // Redistribute space between this column and the one to the left
              const prevColumnWidth = colWidths[prevColumnIndex];

              if (adjustedWidthChange > 0) {
                // Expanding current column - take space from previous column
                // Calculate max we can take (respecting min width of prev column)
                const maxBorrowable = Math.max(0, prevColumnWidth - DEFAULT_MIN_COLUMN_WIDTH);
                const effectiveChange = Math.min(adjustedWidthChange, maxBorrowable);

                if (effectiveChange > 0) {
                  // Increase current column width
                  newColWidths[columnIndex] = currentWidth + effectiveChange;
                  // Decrease previous column width by same amount
                  newColWidths[prevColumnIndex] = prevColumnWidth - effectiveChange;

                  hasReachedMaxWidth = effectiveChange < adjustedWidthChange;
                } else {
                  // Can't borrow any more space
                  hasReachedMaxWidth = true;
                }
              } else if (adjustedWidthChange < 0) {
                // Shrinking current column - give space to previous column
                // Ensure current column doesn't go below minimum
                const maxShrinkable = Math.max(0, currentWidth - DEFAULT_MIN_COLUMN_WIDTH);
                const effectiveShrink = Math.min(Math.abs(adjustedWidthChange), maxShrinkable);

                if (effectiveShrink > 0) {
                  // Decrease current column width
                  newColWidths[columnIndex] = currentWidth - effectiveShrink;
                  // Increase previous column width by same amount
                  newColWidths[prevColumnIndex] = prevColumnWidth + effectiveShrink;
                }

                hasReachedMaxWidth = false;
              }

              // Apply the column widths
              tableNode.setColWidths(newColWidths);
            }
          }
        },
        { tag: SKIP_SCROLL_INTO_VIEW_TAG },
      );

      // Update the max width reached state after editor update
      setIsMaxWidthReached(hasReachedMaxWidth);
    },
    [activeCell, editor],
  );

  const pointerUpHandler = useCallback(
    (direction: PointerDraggingDirection) => {
      const handler = (event: PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();

        if (!activeCell) {
          throw new Error('TableCellResizer: Expected active cell.');
        }

        if (pointerStartPosRef.current) {
          const { x, y } = pointerStartPosRef.current;

          if (activeCell === null) {
            return;
          }
          const zoom = calculateZoomLevel(event.target as Element);

          if (isHeightChanging(direction)) {
            const heightChange = (event.clientY - y) / zoom;
            updateRowHeight(heightChange);
          } else if (direction === 'left') {
            // Handle left edge resize
            const widthChange = (event.clientX - x) / zoom;
            updateColumnWidthFromLeft(widthChange);
          } else {
            // Handle right edge resize
            const widthChange = (event.clientX - x) / zoom;
            updateColumnWidth(widthChange);
          }

          resetState();
          document.removeEventListener('pointerup', handler);
        }
      };
      return handler;
    },
    [activeCell, resetState, updateColumnWidth, updateRowHeight, updateColumnWidthFromLeft],
  );

  const toggleResize = useCallback(
    (direction: PointerDraggingDirection): PointerEventHandler<HTMLDivElement> =>
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!activeCell) {
          throw new Error('TableCellResizer: Expected active cell.');
        }

        pointerStartPosRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
        updatePointerCurrentPos(pointerStartPosRef.current);
        updateDraggingDirection(direction);

        document.addEventListener('pointerup', pointerUpHandler(direction));
      },
    [activeCell, pointerUpHandler],
  );

  useEffect(() => {
    // When tables are created or edited, ensure they have the correct positioning behavior
    if (hasTable) {
      editor.update(() => {
        editor.getEditorState().read(() => {
          // Find all table nodes and add the positioning CSS
          const tableNodesMap = editor._nodes.get('table');
          if (tableNodesMap && typeof tableNodesMap === 'object') {
            // Handle the table nodes map safely
            if (tableNodesMap instanceof Map) {
              // If it's a map, iterate over entries
              tableNodesMap.forEach((_, nodeKey) => {
                const tableNode = editor.getEditorState()._nodeMap.get(nodeKey);
                if (tableNode && $isTableNode(tableNode)) {
                  // Get the DOM element for the table
                  const tableElement = editor.getElementByKey(tableNode.getKey());
                  if (tableElement) {
                    // Set the attribute that ensures Google Docs-like positioning
                    tableElement.setAttribute('data-leftmost-resized', 'true');

                    if (tableElement.parentElement) {
                      // Apply our table-container class to prepare for potential leftmost column resize
                      tableElement.parentElement.classList.add('table-container');
                    }
                  }
                }
              });
            } else if (Array.isArray(tableNodesMap)) {
              // If it's an array, iterate directly
              tableNodesMap.forEach((arrEntry) => {
                if (Array.isArray(arrEntry) && arrEntry.length === 2) {
                  const [nodeKey] = arrEntry;
                  const tableNode = editor.getEditorState()._nodeMap.get(nodeKey);
                  if (tableNode && $isTableNode(tableNode)) {
                    const tableElement = editor.getElementByKey(tableNode.getKey());
                    if (tableElement) {
                      tableElement.setAttribute('data-leftmost-resized', 'true');
                      if (tableElement.parentElement) {
                        tableElement.parentElement.classList.add('table-container');
                      }
                    }
                  }
                }
              });
            } else {
              // For other object types, try to get keys and iterate
              Object.keys(tableNodesMap).forEach((nodeKey) => {
                const tableNode = editor.getEditorState()._nodeMap.get(nodeKey);
                if (tableNode && $isTableNode(tableNode)) {
                  const tableElement = editor.getElementByKey(tableNode.getKey());
                  if (tableElement) {
                    tableElement.setAttribute('data-leftmost-resized', 'true');
                    if (tableElement.parentElement) {
                      tableElement.parentElement.classList.add('table-container');
                    }
                  }
                }
              });
            }
          }
        });
      });
    }
  }, [editor, hasTable]);

  return (
    <div ref={resizerRef}>
      {activeCell != null && (
        <>
          <div
            className={`TableCellResizer__resizer TableCellResizer__ui ${
              isMaxWidthReached && draggingDirection === 'right' ? 'max-width-reached' : ''
            }`}
            style={resizerStyles.right || undefined}
            onPointerDown={toggleResize('right')}
          />
          <div
            className={`TableCellResizer__resizer TableCellResizer__ui ${
              isMaxWidthReached && draggingDirection === 'left' ? 'max-width-reached' : ''
            }`}
            style={resizerStyles.left || undefined}
            onPointerDown={toggleResize('left')}
          />
          <div
            className='TableCellResizer__resizer TableCellResizer__ui'
            style={resizerStyles.bottom || undefined}
            onPointerDown={toggleResize('bottom')}
          />
        </>
      )}
    </div>
  );
};

// Local implementation of getTableElement
function getTableElement(
  tableNode: TableNode,
  tableElement: HTMLElement | null,
): HTMLElement | null {
  return tableElement;
}

export default function TableCellResizerPlugin(): null | ReactPortal {
  const [editor] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();

  return useMemo(
    () =>
      isEditable
        ? createPortal(
            <>
              <TableCellResizer editor={editor} />
            </>,
            document.body,
          )
        : null,
    [editor, isEditable],
  );
}
