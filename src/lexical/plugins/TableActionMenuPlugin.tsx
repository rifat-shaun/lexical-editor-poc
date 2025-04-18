import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import {
  $computeTableMapSkipCellCheck,
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getNodeTriplet,
  $getTableCellNodeFromLexicalNode,
  $getTableColumnIndexFromTableCellNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableRowIndexFromTableCellNode,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableSelection,
  $mergeCells,
  $unmergeCell,
  TableCellHeaderStates,
  TableCellNode,
  TableSelection,
  getTableElement,
  getTableObserverFromTableElement,
} from '@lexical/table';
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  ElementNode,
  LexicalEditor,
  isDOMNode,
} from 'lexical';
import { ReactPortal, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// import useModal from '../../hooks/useModal';
// import ColorPicker from '../../ui/ColorPicker';
// import DropDown, {DropDownItem} from '../../ui/DropDown';

function computeSelectionCount(selection: TableSelection): {
  columns: number;
  rows: number;
} {
  const selectionShape = selection.getShape();
  return {
    columns: selectionShape.toX - selectionShape.fromX + 1,
    rows: selectionShape.toY - selectionShape.fromY + 1,
  };
}

function $canUnmerge(): boolean {
  const selection = $getSelection();
  if (
    ($isRangeSelection(selection) && !selection.isCollapsed()) ||
    ($isTableSelection(selection) && !selection.anchor.is(selection.focus)) ||
    (!$isRangeSelection(selection) && !$isTableSelection(selection))
  ) {
    return false;
  }
  const [cell] = $getNodeTriplet(selection.anchor);
  return cell.__colSpan > 1 || cell.__rowSpan > 1;
}

function $selectLastDescendant(node: ElementNode): void {
  const lastDescendant = node.getLastDescendant();
  if ($isTextNode(lastDescendant)) {
    lastDescendant.select();
  } else if ($isElementNode(lastDescendant)) {
    lastDescendant.selectEnd();
  } else if (lastDescendant !== null) {
    lastDescendant.selectNext();
  }
}

function currentCellBackgroundColor(editor: LexicalEditor): null | string {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      const [cell] = $getNodeTriplet(selection.anchor);
      if ($isTableCellNode(cell)) {
        return cell.getBackgroundColor();
      }
    }
    return null;
  });
}

type TableCellActionMenuProps = Readonly<{
  contextRef: { current: null | HTMLElement };
  onClose: () => void;
  setIsMenuOpen: (isOpen: boolean) => void;
  // showColorPickerModal: (
  //   title: string,
  //   showModal: (onClose: () => void) => JSX.Element,
  // ) => void;
  tableCellNode: TableCellNode;
  cellMerge: boolean;
  position: { x: number; y: number } | null;
}>;

function TableActionMenu({
  onClose,
  tableCellNode: _tableCellNode,
  setIsMenuOpen,
  contextRef,
  cellMerge,
  position,
}: // showColorPickerModal,
TableCellActionMenuProps) {
  const _contextRef = contextRef || { current: null };
  const [editor] = useLexicalComposerContext();
  const dropDownRef = useRef<HTMLDivElement | null>(null);
  const [tableCellNode, updateTableCellNode] = useState(_tableCellNode);
  const [selectionCounts, updateSelectionCounts] = useState({
    columns: 1,
    rows: 1,
  });
  const [canMergeCells, setCanMergeCells] = useState(false);
  const [canUnmergeCell, setCanUnmergeCell] = useState(false);
  const [_backgroundColor, setBackgroundColor] = useState(
    () => currentCellBackgroundColor(editor) || '',
  );

  useEffect(() => {
    return editor.registerMutationListener(
      TableCellNode,
      (nodeMutations) => {
        const nodeUpdated = nodeMutations.get(tableCellNode.getKey()) === 'updated';

        if (nodeUpdated) {
          editor.getEditorState().read(() => {
            updateTableCellNode(tableCellNode.getLatest());
          });
          setBackgroundColor(currentCellBackgroundColor(editor) || '');
        }
      },
      { skipInitialization: true },
    );
  }, [editor, tableCellNode]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      // Merge cells
      if ($isTableSelection(selection)) {
        const currentSelectionCounts = computeSelectionCount(selection);
        updateSelectionCounts(computeSelectionCount(selection));
        setCanMergeCells(currentSelectionCounts.columns > 1 || currentSelectionCounts.rows > 1);
      }
      // Unmerge cell
      setCanUnmergeCell($canUnmerge());
    });
  }, [editor]);

  useEffect(() => {
    const dropDownElement = dropDownRef.current;

    if (dropDownElement != null && position != null) {
      dropDownElement.style.opacity = '1';

      // Position the menu 5px to the right of the clicked position
      dropDownElement.style.left = `${position.x + 5}px`;
      dropDownElement.style.top = `${position.y}px`;

      // Ensure menu doesn't go outside viewport
      const rect = dropDownElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        dropDownElement.style.left = `${position.x - rect.width - 5}px`;
      }

      if (rect.bottom > viewportHeight) {
        dropDownElement.style.top = `${position.y - rect.height}px`;
      }
    }
  }, [position]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropDownRef.current != null &&
        isDOMNode(event.target) &&
        !dropDownRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener('click', handleClickOutside);

    return () => window.removeEventListener('click', handleClickOutside);
  }, [setIsMenuOpen]);

  const clearTableSelection = useCallback(() => {
    editor.update(() => {
      if (tableCellNode.isAttached()) {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        const tableElement = getTableElement(tableNode, editor.getElementByKey(tableNode.getKey()));

        if (tableElement === null) {
          throw new Error('TableActionMenu: Expected to find tableElement in DOM');
        }

        const tableObserver = getTableObserverFromTableElement(tableElement);
        if (tableObserver !== null) {
          tableObserver.$clearHighlight();
        }

        tableNode.markDirty();
        updateTableCellNode(tableCellNode.getLatest());
      }
      $setSelection(null);
    });
  }, [editor, tableCellNode]);

  const mergeTableCellsAtSelection = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isTableSelection(selection)) {
        return;
      }

      const nodes = selection.getNodes();
      const tableCells = nodes.filter($isTableCellNode);
      const targetCell = $mergeCells(tableCells);

      if (targetCell) {
        $selectLastDescendant(targetCell);
        onClose();
      }
    });
  };

  const unmergeTableCellsAtSelection = () => {
    editor.update(() => {
      $unmergeCell();
    });
  };

  const insertTableRowAtSelection = useCallback(
    (shouldInsertAfter: boolean) => {
      editor.update(() => {
        for (let i = 0; i < selectionCounts.rows; i++) {
          $insertTableRowAtSelection(shouldInsertAfter);
        }
        onClose();
      });
    },
    [editor, onClose, selectionCounts.rows],
  );

  const insertTableColumnAtSelection = useCallback(
    (shouldInsertAfter: boolean) => {
      editor.update(() => {
        for (let i = 0; i < selectionCounts.columns; i++) {
          $insertTableColumnAtSelection(shouldInsertAfter);
        }
        onClose();
      });
    },
    [editor, onClose, selectionCounts.columns],
  );

  const deleteTableRowAtSelection = useCallback(() => {
    editor.update(() => {
      $deleteTableRowAtSelection();
      onClose();
    });
  }, [editor, onClose]);

  const deleteTableAtSelection = useCallback(() => {
    editor.update(() => {
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
      tableNode.remove();

      clearTableSelection();
      onClose();
    });
  }, [editor, tableCellNode, clearTableSelection, onClose]);

  const deleteTableColumnAtSelection = useCallback(() => {
    editor.update(() => {
      $deleteTableColumnAtSelection();
      onClose();
    });
  }, [editor, onClose]);

  const toggleTableRowIsHeader = useCallback(() => {
    editor.update(() => {
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

      const tableRowIndex = $getTableRowIndexFromTableCellNode(tableCellNode);

      const [gridMap] = $computeTableMapSkipCellCheck(tableNode, null, null);

      const rowCells = new Set<TableCellNode>();

      const newStyle = tableCellNode.getHeaderStyles() ^ TableCellHeaderStates.ROW;

      for (let col = 0; col < gridMap[tableRowIndex].length; col++) {
        const mapCell = gridMap[tableRowIndex][col];

        if (!mapCell?.cell) {
          continue;
        }

        if (!rowCells.has(mapCell.cell)) {
          rowCells.add(mapCell.cell);
          mapCell.cell.setHeaderStyles(newStyle, TableCellHeaderStates.ROW);
        }
      }
      clearTableSelection();
      onClose();
    });
  }, [editor, tableCellNode, clearTableSelection, onClose]);

  const toggleTableColumnIsHeader = useCallback(() => {
    editor.update(() => {
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);

      const tableColumnIndex = $getTableColumnIndexFromTableCellNode(tableCellNode);

      const [gridMap] = $computeTableMapSkipCellCheck(tableNode, null, null);

      const columnCells = new Set<TableCellNode>();
      const newStyle = tableCellNode.getHeaderStyles() ^ TableCellHeaderStates.COLUMN;

      for (let row = 0; row < gridMap.length; row++) {
        const mapCell = gridMap[row][tableColumnIndex];

        if (!mapCell?.cell) {
          continue;
        }

        if (!columnCells.has(mapCell.cell)) {
          columnCells.add(mapCell.cell);
          mapCell.cell.setHeaderStyles(newStyle, TableCellHeaderStates.COLUMN);
        }
      }
      clearTableSelection();
      onClose();
    });
  }, [editor, tableCellNode, clearTableSelection, onClose]);

  const toggleRowStriping = useCallback(() => {
    editor.update(() => {
      if (tableCellNode.isAttached()) {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        if (tableNode) {
          tableNode.setRowStriping(!tableNode.getRowStriping());
        }
      }
      clearTableSelection();
      onClose();
    });
  }, [editor, tableCellNode, clearTableSelection, onClose]);

  const toggleFirstRowFreeze = useCallback(() => {
    editor.update(() => {
      if (tableCellNode.isAttached()) {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        if (tableNode) {
          tableNode.setFrozenRows(tableNode.getFrozenRows() === 0 ? 1 : 0);
        }
      }
      clearTableSelection();
      onClose();
    });
  }, [editor, tableCellNode, clearTableSelection, onClose]);

  const toggleFirstColumnFreeze = useCallback(() => {
    editor.update(() => {
      if (tableCellNode.isAttached()) {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        if (tableNode) {
          tableNode.setFrozenColumns(tableNode.getFrozenColumns() === 0 ? 1 : 0);
        }
      }
      clearTableSelection();
      onClose();
    });
  }, [editor, tableCellNode, clearTableSelection, onClose]);

  // const handleCellBackgroundColor = useCallback(
  //   (value: string) => {
  //     editor.update(() => {
  //       const selection = $getSelection();
  //       if ($isRangeSelection(selection) || $isTableSelection(selection)) {
  //         const [cell] = $getNodeTriplet(selection.anchor);
  //         if ($isTableCellNode(cell)) {
  //           cell.setBackgroundColor(value);
  //         }

  //         if ($isTableSelection(selection)) {
  //           const nodes = selection.getNodes();

  //           for (let i = 0; i < nodes.length; i++) {
  //             const node = nodes[i];
  //             if ($isTableCellNode(node)) {
  //               node.setBackgroundColor(value);
  //             }
  //           }
  //         }
  //       }
  //     });
  //   },
  //   [editor],
  // );

  // const formatVerticalAlign = (value: string) => {
  //   editor.update(() => {
  //     const selection = $getSelection();
  //     if ($isRangeSelection(selection) || $isTableSelection(selection)) {
  //       const [cell] = $getNodeTriplet(selection.anchor);
  //       if ($isTableCellNode(cell)) {
  //         cell.setVerticalAlign(value);
  //       }

  //       if ($isTableSelection(selection)) {
  //         const nodes = selection.getNodes();

  //         for (let i = 0; i < nodes.length; i++) {
  //           const node = nodes[i];
  //           if ($isTableCellNode(node)) {
  //             node.setVerticalAlign(value);
  //           }
  //         }
  //       }
  //     }
  //   });
  // };

  let mergeCellButton = null;
  if (cellMerge) {
    if (canMergeCells) {
      mergeCellButton = (
        <button
          type='button'
          className='item'
          onClick={() => mergeTableCellsAtSelection()}
          data-test-id='table-merge-cells'
        >
          <span className='text'>Merge cells</span>
        </button>
      );
    } else if (canUnmergeCell) {
      mergeCellButton = (
        <button
          type='button'
          className='item'
          onClick={() => unmergeTableCellsAtSelection()}
          data-test-id='table-unmerge-cells'
        >
          <span className='text'>Unmerge cells</span>
        </button>
      );
    }
  }

  return createPortal(
    <div
      className='dropdown'
      ref={dropDownRef}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {mergeCellButton}
      {/* <button
        type="button"
        className="item"
        onClick={() =>
          showColorPickerModal('Cell background color', () => (
            <ColorPicker
              color={backgroundColor}
              onChange={handleCellBackgroundColor}
            />
          ))
        }
        data-test-id="table-background-color">
        <span className="text">Background color</span>
      </button> */}
      <button
        type='button'
        className='item'
        onClick={() => toggleRowStriping()}
        data-test-id='table-row-striping'
      >
        <span className='text'>Toggle Row Striping</span>
      </button>
      {/* <DropDown
        buttonLabel="Vertical Align"
        buttonClassName="item"
        buttonAriaLabel="Formatting options for vertical alignment">
        <DropDownItem
          onClick={() => {
            formatVerticalAlign('top');
          }}
          className="item wide">
          <div className="icon-text-container">
            <i className="icon vertical-top" />
            <span className="text">Top Align</span>
          </div>
        </DropDownItem>
        <DropDownItem
          onClick={() => {
            formatVerticalAlign('middle');
          }}
          className="item wide">
          <div className="icon-text-container">
            <i className="icon vertical-middle" />
            <span className="text">Middle Align</span>
          </div>
        </DropDownItem>
        <DropDownItem
          onClick={() => {
            formatVerticalAlign('bottom');
          }}
          className="item wide">
          <div className="icon-text-container">
            <i className="icon vertical-bottom" />
            <span className="text">Bottom Align</span>
          </div>
        </DropDownItem>
      </DropDown> */}
      <button
        type='button'
        className='item'
        onClick={() => toggleFirstRowFreeze()}
        data-test-id='table-freeze-first-row'
      >
        <span className='text'>Toggle First Row Freeze</span>
      </button>
      <button
        type='button'
        className='item'
        onClick={() => toggleFirstColumnFreeze()}
        data-test-id='table-freeze-first-column'
      >
        <span className='text'>Toggle First Column Freeze</span>
      </button>
      <hr />
      <button
        type='button'
        className='item'
        onClick={() => insertTableRowAtSelection(false)}
        data-test-id='table-insert-row-above'
      >
        <span className='text'>
          Insert {selectionCounts.rows === 1 ? 'row' : `${selectionCounts.rows} rows`} above
        </span>
      </button>
      <button
        type='button'
        className='item'
        onClick={() => insertTableRowAtSelection(true)}
        data-test-id='table-insert-row-below'
      >
        <span className='text'>
          Insert {selectionCounts.rows === 1 ? 'row' : `${selectionCounts.rows} rows`} below
        </span>
      </button>
      <hr />
      <button
        type='button'
        className='item'
        onClick={() => insertTableColumnAtSelection(false)}
        data-test-id='table-insert-column-before'
      >
        <span className='text'>
          Insert {selectionCounts.columns === 1 ? 'column' : `${selectionCounts.columns} columns`}{' '}
          left
        </span>
      </button>
      <button
        type='button'
        className='item'
        onClick={() => insertTableColumnAtSelection(true)}
        data-test-id='table-insert-column-after'
      >
        <span className='text'>
          Insert {selectionCounts.columns === 1 ? 'column' : `${selectionCounts.columns} columns`}{' '}
          right
        </span>
      </button>
      <hr />
      <button
        type='button'
        className='item'
        onClick={() => deleteTableColumnAtSelection()}
        data-test-id='table-delete-columns'
      >
        <span className='text'>Delete column</span>
      </button>
      <button
        type='button'
        className='item'
        onClick={() => deleteTableRowAtSelection()}
        data-test-id='table-delete-rows'
      >
        <span className='text'>Delete row</span>
      </button>
      <button
        type='button'
        className='item'
        onClick={() => deleteTableAtSelection()}
        data-test-id='table-delete'
      >
        <span className='text'>Delete table</span>
      </button>
      <hr />
      <button
        type='button'
        className='item'
        onClick={() => toggleTableRowIsHeader()}
        data-test-id='table-row-header'
      >
        <span className='text'>
          {(tableCellNode.__headerState & TableCellHeaderStates.ROW) === TableCellHeaderStates.ROW
            ? 'Remove'
            : 'Add'}{' '}
          row header
        </span>
      </button>
      <button
        type='button'
        className='item'
        onClick={() => toggleTableColumnIsHeader()}
        data-test-id='table-column-header'
      >
        <span className='text'>
          {(tableCellNode.__headerState & TableCellHeaderStates.COLUMN) ===
          TableCellHeaderStates.COLUMN
            ? 'Remove'
            : 'Add'}{' '}
          column header
        </span>
      </button>
    </div>,
    document.body,
  );
}

function TableCellActionMenuContainer({
  anchorElem,
  cellMerge,
}: {
  anchorElem: HTMLElement;
  cellMerge: boolean;
}) {
  const _anchorElem = anchorElem || document.body;
  const [editor] = useLexicalComposerContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tableCellNode, setTableMenuCellNode] = useState<TableCellNode | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRootRef = useRef<HTMLButtonElement | null>(null);

  // Track right-click events on table cells
  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      // Prevent default browser context menu
      event.preventDefault();

      // Find if we clicked on a table cell
      editor.getEditorState().read(() => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection) && !$isTableSelection(selection)) {
          setIsMenuOpen(false);
          return;
        }

        // Try to get the table cell node
        let tableCellNodeFromEvent = null;

        if ($isRangeSelection(selection)) {
          tableCellNodeFromEvent = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
        } else if ($isTableSelection(selection)) {
          tableCellNodeFromEvent = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
        }

        if (tableCellNodeFromEvent) {
          setTableMenuCellNode(tableCellNodeFromEvent);
          // Save the exact mouse position for menu placement
          setMenuPosition({ x: event.clientX, y: event.clientY });
          setIsMenuOpen(true);
        } else {
          setIsMenuOpen(false);
        }
      });
    };

    // Add context menu event listener to editor root
    const rootElement = editor.getRootElement();
    if (rootElement) {
      rootElement.addEventListener('contextmenu', onContextMenu);
    }

    return () => {
      if (rootElement) {
        rootElement.removeEventListener('contextmenu', onContextMenu);
      }
    };
  }, [editor]);

  const prevTableCellDOM = useRef(tableCellNode);

  useEffect(() => {
    if (prevTableCellDOM.current !== tableCellNode) {
      setIsMenuOpen(false);
    }

    prevTableCellDOM.current = tableCellNode;
  }, [prevTableCellDOM, tableCellNode]);

  return (
    <>
      {tableCellNode != null && isMenuOpen && (
        <TableActionMenu
          contextRef={menuRootRef}
          setIsMenuOpen={setIsMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          tableCellNode={tableCellNode}
          cellMerge={cellMerge}
          position={menuPosition}
        />
      )}
    </>
  );
}

export default function TableActionMenuPlugin({
  anchorElem = document.body,
  cellMerge = false,
}: {
  anchorElem?: HTMLElement;
  cellMerge?: boolean;
}): null | ReactPortal {
  const isEditable = useLexicalEditable();
  return createPortal(
    isEditable ? (
      <TableCellActionMenuContainer anchorElem={anchorElem} cellMerge={cellMerge} />
    ) : null,
    anchorElem,
  );
}
