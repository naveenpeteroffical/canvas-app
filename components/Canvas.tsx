"use client";

import React, { useRef, useEffect, useState } from 'react';

interface Shape {
    id: number;
    type: 'rectangle' | 'circle' | 'image' | 'text';
    x: number;
    y: number;
    width: number;
    height: number;
    outlineColor?: string;
    src?: string;
    text?: string;
    fontSize?: number;
    font?: string;
    fontStyle?: string;
    textDecoration?: string;
}

interface Table {
    id: number;
    x: number;
    y: number;
    rows: number;
    cols: number;
    cellWidth: number;
    cellHeight: number;
    data: string[][];  // 2D array to store cell data
}



const Canvas: React.FC = () => {
    const [tables, setTables] = useState<Table[]>([]);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [draggingShape, setDraggingShape] = useState<Shape | null>(null);
    const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
    const [resizingShape, setResizingShape] = useState<Shape | null>(null);
    const [resizeDirection, setResizeDirection] = useState<string | null>(null);
    const [cursor, setCursor] = useState<string>('default');
    const [newText, setNewText] = useState<string>('');
    const [fontOptions, setFontOptions] = useState({
        fontSize: 16,
        font: 'Arial',
        fontStyle: { bold: false, italic: false }, textDecoration: 'none',
    });

    const [numRows, setNumRows] = useState<number>(3); // Default to 3 rows
    const [numCols, setNumCols] = useState<number>(3);

    // Canvas zoom state and move mode
    const [zoom, setZoom] = useState(1); // Zoom level
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 }); // Canvas offset for move mode
    const [isMoveMode, setIsMoveMode] = useState(false); // Flag to switch between draw and move mode

    // Stack for Undo and Redo
    const [undoStack, setUndoStack] = useState<Shape[][]>([]);
    const [redoStack, setRedoStack] = useState<Shape[][]>([]);

    const [editingTableCell, setEditingTableCell] = useState<any | null>(null);  // Track the table cell being edited
    const [resizingTable, setResizingTable] = useState<Table | null>(null);
    const [editingText, setEditingText] = useState<any | null>(null);
    const [canvasBackgroundColor, setCanvasBackgroundColor] = useState<string>('#ffffff'); // Default white background color

    const [draggingTable, setDraggingTable] = useState<Table | null>(null);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

    // Handle color selection
    const handleBackgroundColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const color = event.target.value;
        setCanvasBackgroundColor(color);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                context.clearRect(0, 0, canvas.width, canvas.height);  // Clear canvas
                context.fillStyle = canvasBackgroundColor;
                context.fillRect(0, 0, canvas.width, canvas.height);  // Fill canvas background

                // Draw all shapes
                shapes.forEach(shape => drawShape(context, shape));

                // Draw all tables
                drawTable(canvas);
            }
        }
    }, [shapes, zoom, canvasOffset, canvasBackgroundColor, tables]);


    const drawShape = (context: any, shape: Shape) => {
        context.strokeStyle = shape.outlineColor || 'black';
        context.lineWidth = 2;

        if (shape.type === 'rectangle') {
            context.strokeRect(shape.x, shape.y, shape.width, shape.height);
        } else if (shape.type === 'circle') {
            context.beginPath();
            context.arc(shape.x + shape.width / 2, shape.y + shape.height / 2, shape.width / 2, 0, Math.PI * 2);
            context.stroke();
        } else if (shape.type === 'image' && shape.src) {
            const img = new Image();
            img.src = shape.src;

            img.onload = () => {
                const zoomedWidth = shape.width * zoom;  // Apply zoom to width
                const zoomedHeight = shape.height * zoom; // Apply zoom to height
                context.drawImage(img, shape.x, shape.y, zoomedWidth, zoomedHeight);
                context.strokeRect(shape.x, shape.y, zoomedWidth, zoomedHeight);  // Draw the bounding box with zoom applied
            };
        } else if (shape.type === 'text' && shape.text) {
            const fontSize = shape.fontSize || 22;

            // Combine styles for bold and italic based on the boolean flags
            let fontStyle = '';
            if (fontOptions.fontStyle.bold) fontStyle += 'bold ';
            if (fontOptions.fontStyle.italic) fontStyle += 'italic ';

            console.log("fontOptions", fontOptions);


            // Set the font with the desired font family and size
            context.font = `${fontStyle.trim()} ${fontSize}px ${shape.font || 'Arial'}`;
            context.fillStyle = 'black'; // Text color (can be customized)

            // Draw the text
            context.fillText(shape.text, shape.x, shape.y + fontSize);

            // Draw underline if required
            if (shape.textDecoration === 'underline') {
                const textWidth = context.measureText(shape.text).width;
                const underlineY = shape.y + fontSize + 2; // Position of the underline
                context.beginPath();
                context.moveTo(shape.x, underlineY);
                context.lineTo(shape.x + textWidth, underlineY);
                context.strokeStyle = 'black';  // Underline color (can be changed)
                context.lineWidth = 1;
                context.stroke();
            }
        }
    };


    const saveTableCellChanges = () => {
        if (editingTableCell && editingTableCell.tableId !== undefined) {
            const updatedTables = tables.map(table => {
                if (table.id === editingTableCell.tableId) {
                    const updatedData = [...table.data];
                    updatedData[editingTableCell.row][editingTableCell.col] = newText;  // Update cell with new text

                    // Calculate new height based on text for the specific cell
                    const canvas = canvasRef.current;
                    if (canvas) {
                        const context: any = canvas.getContext('2d');
                        context.font = '16px Arial'; // Set the font to match the table
                        const words = newText.split(' ');
                        let line = '';
                        const lineHeight = 20; // Base line height
                        const extraPadding = 10; // Extra padding to add after the last line
                        let textHeight = 0; // Track total height of text in this cell

                        // Measure each line of text to determine the height
                        for (let n = 0; n < words.length; n++) {
                            const testLine = line + words[n] + ' ';
                            const metrics = context.measureText(testLine);
                            const testWidth = metrics.width;

                            if (testWidth > (table.cellWidth - 10) && n > 0) {
                                // If the line exceeds the cell width, reset for the next line
                                textHeight += lineHeight; // Increase height for the current line
                                line = words[n] + ' '; // Start a new line
                            } else {
                                line = testLine; // Keep adding to the current line
                            }
                        }

                        // Add the height of the last line
                        textHeight += lineHeight; // Update text height for the last line
                        textHeight += extraPadding; // Add extra padding for the last line

                        // Update the cell height for the entire row
                        const updatedCellHeight = Math.max(textHeight, table.cellHeight);
                        table.cellHeight = updatedCellHeight; // Adjust the cell height for the entire row
                    }

                    return { ...table, data: updatedData };
                }
                return table;
            });

            setTables(updatedTables);
            setEditingTableCell(null);
            setNewText(''); // Clear the text input
            saveState();
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - canvasOffset.x) / zoom; // Adjust for zoom
            const y = (e.clientY - rect.top - canvasOffset.y) / zoom; // Adjust for zoom

            // Check if the mouse is near the edges of any table for resizing
            const tableUnderMouse = tables.find(table => {
                return (
                    x >= table.x &&
                    x <= table.x + table.cols * table.cellWidth &&
                    y >= table.y &&
                    y <= table.y + table.rows * table.cellHeight
                );
            });

            const table: any = tables.find(t => {
                return x >= t.x && x <= t.x + t.cols * t.cellWidth && y >= t.y && y <= t.y + t.rows * t.cellHeight;
            });

            if (tableUnderMouse) {
                const isNearLeft = x >= tableUnderMouse.x - 10 && x <= tableUnderMouse.x + 10;
                const isNearRight = x >= tableUnderMouse.x + tableUnderMouse.cols * table.cellWidth - 10 && x <= tableUnderMouse.x + tableUnderMouse.cols * table.cellWidth + 10;
                const isNearTop = y >= tableUnderMouse.y - 10 && y <= tableUnderMouse.y + 10;
                const isNearBottom = y >= tableUnderMouse.y + tableUnderMouse.rows * table.cellHeight - 10 && y <= tableUnderMouse.y + tableUnderMouse.rows * table.cellHeight + 10;

                if (isNearLeft || isNearRight || isNearTop || isNearBottom) {
                    setResizingTable(tableUnderMouse); // Start resizing the table
                    return; // Exit early since we're resizing
                } else {
                    setDraggingTable(tableUnderMouse); // Start dragging the table
                    setDragOffset({ x: x - tableUnderMouse.x, y: y - tableUnderMouse.y }); // Store the offset where the mouse clicked
                }
            }

            // Check if the mouse is over any table
            const isOverTable = tables.some(table => {
                return (
                    x >= table.x &&
                    x <= table.x + table.cols * table.cellWidth &&
                    y >= table.y &&
                    y <= table.y + table.rows * table.cellHeight
                );
            });

            // Set cursor to 'move' if over a table, otherwise set it to 'default'
            setCursor(isOverTable ? 'move' : 'default');

            // Check if the click is inside a table's cell
            let clickedTable: any | null = null;
            let clickedCell: any = null;

            tables.forEach(table => {
                for (let row = 0; row < table.rows; row++) {
                    for (let col = 0; col < table.cols; col++) {
                        const cellX = table.x + col * table.cellWidth;
                        const cellY = table.y + row * table.cellHeight;
                        if (x >= cellX && x <= cellX + table.cellWidth && y >= cellY && y <= cellY + table.cellHeight) {
                            clickedTable = table;
                            clickedCell = { row, col };

                        }
                    }
                }
            });

            // if (clickedTable && clickedCell) {
            //     // Set the cell to be edited (text editing mode)
            //     const cellText = clickedTable.data[clickedCell.row][clickedCell.col];
            //     setNewText(cellText);  // Pre-fill with existing text

            //     setEditingTableCell({ tableId: clickedTable.id, row: clickedCell.row, col: clickedCell.col });
            //     return;
            // }

            if (clickedTable && clickedCell) {
                // Set the cell to be edited (text editing mode)
                const cellText = clickedTable.data[clickedCell.row][clickedCell.col];
                setNewText(cellText);  // Pre-fill with existing text

                setEditingTableCell({ tableId: clickedTable.id, row: clickedCell.row, col: clickedCell.col });
                setEditingText({
                    text: cellText,
                    fontSize: fontOptions.fontSize,
                    font: fontOptions.font,
                    fontStyle: fontOptions.fontStyle,
                    textDecoration: fontOptions.textDecoration,
                });
                return;
            }


            if (table) {
                setDraggingTable(table); // Start dragging the table
                setDragOffset({ x: x - table.x, y: y - table.y }); // Store the offset where the mouse clicked
            }

            // Find if the clicked area intersects with any shape
            const shape = shapes.find(s => {
                return (
                    x >= s.x &&
                    x <= s.x + s.width &&
                    y >= s.y &&
                    y <= s.y + s.height
                );
            });

            // Check if clicked shape is a text shape
            const shapeText = shapes.find(s => s.type === 'text' &&
                x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height);

            if (shapeText) {
                setResizingShape(shapeText);
                setEditingText(shapeText); // Set the selected text shape for editing
            } else {
                setEditingText(null); // Deselect text shape
            }

            if (isMoveMode) {
                setOffset({ x, y });
            } else if (shape) {
                // Check if clicked near edges for resizing
                const isNearLeft = x >= shape.x - 10 && x <= shape.x + 10;
                const isNearRight = x >= shape.x + shape.width - 10 && x <= shape.x + shape.width + 10;
                const isNearTop = y >= shape.y - 10 && y <= shape.y + 10;
                const isNearBottom = y >= shape.y + shape.height - 10 && y <= shape.y + shape.height + 10;

                if (isNearLeft || isNearRight || isNearTop || isNearBottom) {
                    setResizingShape(shape);

                    // Set resize direction based on which edge is clicked
                    if (isNearLeft && isNearTop) setResizeDirection('top-left');
                    else if (isNearLeft && isNearBottom) setResizeDirection('bottom-left');
                    else if (isNearRight && isNearTop) setResizeDirection('top-right');
                    else if (isNearRight && isNearBottom) setResizeDirection('bottom-right');
                    else if (isNearLeft) setResizeDirection('left');
                    else if (isNearRight) setResizeDirection('right');
                    else if (isNearTop) setResizeDirection('top');
                    else if (isNearBottom) setResizeDirection('bottom');

                    setOffset({
                        x: x - shape.x,
                        y: y - shape.y,
                    });
                } else {
                    setDraggingShape(shape); // Start dragging shape
                    setOffset({ x: x - shape.x, y: y - shape.y });
                }
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - canvasOffset.x) / zoom; // Adjust for zoom
        const y = (e.clientY - rect.top - canvasOffset.y) / zoom; // Adjust for zoom

        // Handle cursor and hover effects

        let newCursor = 'default';
        let isHovering = false;
        const shape = findShapeUnderCursor(x, y);
        if (draggingTable) newCursor = 'move';
        if (shape) {
            isHovering = true;
            newCursor = getResizeCursor(x, y, shape);
            setCursor(newCursor);
        }

        setCursor(newCursor);

        const table: any = tables.find(t => {
            return x >= t.x && x <= t.x + t.cols * t.cellWidth && y >= t.y && y <= t.y + t.rows * t.cellHeight;
        });

        // Check if the mouse is over any table
        const tableUnderMouse = tables.find(table => {
            return (
                x >= table.x &&
                x <= table.x + table.cols * table.cellWidth &&
                y >= table.y &&
                y <= table.y + table.rows * table.cellHeight
            );
        });

        // Check if mouse is near the edges for resizing
        if (tableUnderMouse) {
            const isNearLeft = x >= tableUnderMouse.x - 10 && x <= tableUnderMouse.x + 10;
            const isNearRight = x >= tableUnderMouse.x + tableUnderMouse.cols * table.cellWidth - 10 && x <= tableUnderMouse.x + tableUnderMouse.cols * table.cellWidth + 10;
            const isNearTop = y >= tableUnderMouse.y - 10 && y <= tableUnderMouse.y + 10;
            const isNearBottom = y >= tableUnderMouse.y + tableUnderMouse.rows * table.cellHeight - 10 && y <= tableUnderMouse.y + tableUnderMouse.rows * table.cellHeight + 10;

            if (isNearLeft || isNearRight || isNearTop || isNearBottom) {
                setCursor('ew-resize'); // Change cursor to indicate resizing
                if (isNearLeft && isNearTop) setResizeDirection('top-left');
                else if (isNearLeft && isNearBottom) setResizeDirection('bottom-left');
                else if (isNearRight && isNearTop) setResizeDirection('top-right');
                else if (isNearRight && isNearBottom) setResizeDirection('bottom-right');
                else if (isNearLeft) setResizeDirection('left');
                else if (isNearRight) setResizeDirection('right');
                else if (isNearTop) setResizeDirection('top');
                else if (isNearBottom) setResizeDirection('bottom');
            }
        }

        // Handle table dragging
        // if (draggingTable && dragOffset) {
        //     handleTableDragging(x, y);
        // }

        // Handle resizing if a table is being resized
        if (resizingTable) {
            handleTableResizing(x, y);
        }

        // Handle move mode (panning the canvas)
        console.log("offset out",offset);
        if (isMoveMode && offset) {
            console.log("offset",offset);
            
            setCanvasOffset({
                x: x - offset.x,
                y: y - offset.y,
            });
        }

        // Handle shape dragging
        if (draggingShape && offset) {
            handleShapeDragging(x, y);
        }

        // Handle shape resizing
        if (resizingShape && resizeDirection && offset) {
            handleShapeResizing(x, y);
        }
    };

    const handleTableResizing = (x: number, y: number) => {
        if (resizingTable && resizeDirection) {
            const newTable = { ...resizingTable };

            // Calculate the change in size
            const dx = x - (newTable.x + newTable.cols * newTable.cellWidth);
            const dy = y - (newTable.y + newTable.rows * newTable.cellHeight);

            if (resizeDirection.includes('right')) {
                newTable.cellWidth = Math.max(50, newTable.cellWidth + dx); // Minimum width
            }
            if (resizeDirection.includes('left')) {
                newTable.cellWidth = Math.max(50, newTable.cellWidth - dx); // Minimum width
                newTable.x = x; // Adjust position
            }
            if (resizeDirection.includes('bottom')) {
                newTable.cellHeight = Math.max(20, newTable.cellHeight + dy); // Minimum height
            }
            if (resizeDirection.includes('top')) {
                newTable.cellHeight = Math.max(20, newTable.cellHeight - dy); // Minimum height
                newTable.y = y; // Adjust position
            }

            // Update the state with the new table dimensions
            setTables(tables.map(t => (t.id === newTable.id ? newTable : t)));
        }
    };

    // 1. Handle Table Dragging
    const handleTableDragging = (x: number, y: number) => {
        if (dragOffset && draggingTable) {
            const newX = x - dragOffset.x;
            const newY = y - dragOffset.y;
            setTables(tables.map(table =>
                table.id === draggingTable.id ? { ...table, x: newX, y: newY } : table
            ));
        }
    };

    // 2. Find Shape Under Cursor
    const findShapeUnderCursor = (x: number, y: number) => {
        return shapes.find(s =>
            x >= s.x && x <= s.x + s.width &&
            y >= s.y && y <= s.y + s.height
        );
    };

    // 3. Get Resize Cursor
    const getResizeCursor = (x: number, y: number, shape: Shape) => {
        const proximityThreshold = 15;

        const isNearLeft = x >= shape.x - proximityThreshold && x <= shape.x + proximityThreshold;
        const isNearRight = x >= shape.x + shape.width - proximityThreshold && x <= shape.x + shape.width + proximityThreshold;
        const isNearTop = y >= shape.y - proximityThreshold && y <= shape.y + proximityThreshold;
        const isNearBottom = y >= shape.y + shape.height - proximityThreshold && y <= shape.y + shape.height + proximityThreshold;

        if (isNearLeft || isNearRight || isNearTop || isNearBottom) {
            if (isNearLeft && isNearTop) return 'nwse-resize';
            if (isNearLeft && isNearBottom) return 'nesw-resize';
            if (isNearRight && isNearTop) return 'nesw-resize';
            if (isNearRight && isNearBottom) return 'nwse-resize';
            if (isNearLeft) return 'ew-resize';
            if (isNearRight) return 'ew-resize';
            if (isNearTop) return 'ns-resize';
            if (isNearBottom) return 'ns-resize';
        }

        return 'default';
    };

    // 4. Handle Shape Dragging
    const handleShapeDragging = (x: number, y: number) => {
        saveState();
        setShapes(shapes.map(shape => {
            if (draggingShape && offset && shape.id === draggingShape.id) {
                return { ...shape, x: (x - offset.x) * zoom, y: (y - offset.y) * zoom };
            }
            return shape;
        }));
    };

    // 5. Handle Shape Resizing
    const handleShapeResizing = (x: number, y: number) => {
        if (resizingShape && resizeDirection) {
            const newShape = { ...resizingShape };
            const dx = x - resizingShape.x;
            const dy = y - resizingShape.y;

            if (resizeDirection.includes('right')) {
                newShape.width = Math.max(10, dx * zoom);
            }
            if (resizeDirection.includes('left')) {
                newShape.width = Math.max(10, resizingShape.width - dx * zoom);
                newShape.x = x * zoom;
            }
            if (resizeDirection.includes('bottom')) {
                newShape.height = Math.max(10, dy * zoom);
            }
            if (resizeDirection.includes('top')) {
                newShape.height = Math.max(10, resizingShape.height - dy * zoom);
                newShape.y = y * zoom;
            }

            saveState();
            setShapes(shapes.map(shape => shape.id === resizingShape.id ? newShape : shape));
        }
    };


    const saveTextChanges = () => {
        if (editingText) {
            const updatedText = {
                ...editingText,
                fontStyle: {
                    bold: editingText.fontStyle.bold,
                    italic: editingText.fontStyle.italic,
                },
                text: editingText.text,
                fontSize: editingText.fontSize,
                font: editingText.font,
                textDecoration: editingText.textDecoration,
            };

            setShapes(shapes.map(shape =>
                shape.id === editingText.id ? updatedText : shape
            ));

            // Update fontOptions to reflect the changes made in editingText
            setFontOptions({
                fontSize: editingText.fontSize,
                font: editingText.font,
                fontStyle: editingText.fontStyle,
                textDecoration: editingText.textDecoration,
            });

            saveState();
            setEditingText(null);
        }
    };



    const handleMouseUp = () => {
        setDraggingShape(null);
        setOffset(null);
        setResizingShape(null);
        setResizeDirection(null);
        setDraggingTable(null); // Stop dragging the table
        setResizingTable(null);

        setDragOffset(null);
        setCursor('default');
    };


    const addShape = (type: 'rectangle' | 'circle') => {
        saveState(); // Save state before adding new shape
        const newShape: Shape = {
            id: Date.now(),
            type,
            x: 50,
            y: 50,
            width: 100,
            height: 100,
            outlineColor: 'black',
        };
        setShapes([...shapes, newShape]);
    };

    const addText = () => {
        if (!newText) return;

        saveState(); // Save state before adding new text
        const newTextShape: any = {
            id: Date.now(),
            type: 'text',
            x: 50,
            y: 50,
            width: 200,
            height: 50,
            text: newText,
            fontSize: fontOptions.fontSize,
            font: fontOptions.font,
            fontStyle: fontOptions.fontStyle,
            textDecoration: fontOptions.textDecoration,
        };
        console.log("newTextShape", newTextShape);

        setShapes([...shapes, newTextShape]);
        setNewText(''); // Clear the text input after adding
    };


    const addSampleImage = (src: string) => {
        saveState(); // Save state before adding image
        const newImageShape: Shape = {
            id: Date.now(),
            type: 'image',
            x: 50,
            y: 50,
            width: 150,
            height: 150,
            src,
        };
        setShapes([...shapes, newImageShape]);
    };

    const saveState = () => {
        // Before making changes, save the current state of shapes to the undo stack
        setUndoStack([...undoStack, shapes.map(shape => ({ ...shape }))]);  // Store a deep copy of shapes
        setRedoStack([]);  // Clear redo stack after new change
    };

    const undo = () => {
        if (undoStack.length === 0) return;
        const lastState = undoStack.pop();
        if (lastState) {
            setRedoStack([shapes, ...redoStack]);
            setShapes(lastState);  // Revert to the previous state
        }
    };

    const redo = () => {
        if (redoStack.length === 0) return;
        const lastState = redoStack.pop();
        if (lastState) {
            setUndoStack([shapes, ...undoStack]);
            setShapes(lastState);  // Reapply the redo state
        }
    };


    const zoomIn = () => {
        setZoom(prevZoom => Math.min(prevZoom + 0.1, 3));  // Max zoom level of 3x
    };

    const zoomOut = () => {
        setZoom(prevZoom => Math.max(prevZoom - 0.1, 0.5));  // Min zoom level of 0.5x
    };


    const toggleMoveMode = () => {
        setIsMoveMode(!isMoveMode);
    };

    const handleResetCanvas = () => {
        // Reset the shapes array to an empty array
        setShapes([]);

        // Optionally, reset zoom and canvas offset to initial values
        setZoom(1);  // Reset zoom to 1 (default state)
        setCanvasOffset({ x: 0, y: 0 });  // Reset canvas offset (if applicable)

        // Clear the canvas directly to ensure nothing is drawn
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                context.clearRect(0, 0, canvas.width, canvas.height);  // Clear the canvas
            }
        }
    };
    const drawTable = (canvas: any) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = 'black';

        // Draw all the tables
        tables.forEach(table => {
            table.data.forEach((row, rowIndex) => {
                let maxRowHeight = 0; // Track the maximum height of the row

                row.forEach((cell, colIndex) => {
                    const x = table.x + colIndex * table.cellWidth;
                    const y = table.y + rowIndex * table.cellHeight;

                    // Draw cell border
                    ctx.strokeRect(x, y, table.cellWidth, table.cellHeight);

                    // Measure text to determine height
                    const words = cell.split(' ');
                    let line = '';
                    const lineHeight = 20; // Adjust line height as needed
                    let textHeight = 0; // Track total height of text in this cell

                    for (let n = 0; n < words.length; n++) {
                        const testLine = line + words[n] + ' ';
                        const metrics = ctx.measureText(testLine);
                        const testWidth = metrics.width;

                        if (testWidth > (table.cellWidth - 10) && n > 0) {
                            // Draw the line and reset for the next line
                            ctx.fillText(line, x + 5, y + (textHeight + lineHeight)); // Center vertically
                            textHeight += lineHeight; // Increase height for the next line
                            line = words[n] + ' '; // Start a new line
                        } else {
                            line = testLine; // Keep adding to the current line
                        }
                    }

                    // Draw the last line
                    ctx.fillText(line, x + 5, y + (textHeight + lineHeight)); // Center vertically
                    textHeight += lineHeight; // Update text height for the last line

                    // Update maxRowHeight based on the drawn text
                    maxRowHeight = Math.max(maxRowHeight, textHeight);
                });

                // Update the cell height for the entire row if necessary
                if (maxRowHeight > table.cellHeight) {
                    table.cellHeight = maxRowHeight; // Adjust the row height based on content
                }
            });
        });
    };


    const addTable = (rows: number, cols: number) => {
        const newTable: Table = {
            id: Date.now(),
            x: 100,
            y: 100,
            rows,
            cols,
            cellWidth: 100,
            cellHeight: 40,
            data: Array(rows).fill(null).map(() => Array(cols).fill('')), // Empty cells
        };
        setTables([...tables, newTable]);
    };


    return (
        <div className="flex justify-center p-8 bg-gray-50 min-h-screen">
            <div className="flex flex-row-reverse w-full gap-10">
                <div className='w-full flex flex-col gap-4 mt-4'>
                    <div className="flex gap-4 items-center">
                        <div className='flex flex-col items-center'>
                            <label htmlFor="background-color" className="block text-sm">Background Color</label>
                        </div>
                        <input
                            type="color"
                            id="background-color"
                            value={canvasBackgroundColor}
                            onChange={handleBackgroundColorChange}
                            className="border rounded-md p-2"
                        />
                        <button className="btn btn-primary bg-red-400 text-black rounded px-4 py-2" onClick={handleResetCanvas}>Reset Canvas</button>
                    </div>
                    <div className="flex gap-4 justify-between">
                        <div>
                            <div className="space-y-6">
                                <h3 className="text-2xl font-semibold text-gray-700">Shapes and Images</h3>
                                <button onClick={() => addShape('rectangle')} className="btn btn-primary bg-gray-200 text-black rounded px-4 py-2 mt-4 mr-2">Add Rectangle</button>
                                <button onClick={() => addShape('circle')} className="btn btn-primary bg-gray-200 text-black rounded px-4 py-2 mt-4 mr-2">Add Circle</button>
                                <button onClick={() => addSampleImage('https://via.placeholder.com/100/ff0000')} className="btn btn-primary bg-gray-200 text-black rounded px-4 py-2 mt-4 mr-2">Add Sample Image</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-2xl font-semibold text-gray-700 mt-4">Text Options</h3>
                        <input
                            type="text"
                            value={newText}
                            onChange={(e) => setNewText(e.target.value)}
                            placeholder="Enter text here"
                            className="p-3 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <div className="flex space-x-4">
                            <button
                                onClick={() => setFontOptions({ ...fontOptions, fontStyle: { ...fontOptions.fontStyle, bold: !fontOptions.fontStyle.bold } })}
                                className={`p-2 rounded btn btn-secondary ${fontOptions.fontStyle.bold ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
                            >
                                Bold
                            </button>

                            <button
                                onClick={() => setFontOptions({ ...fontOptions, fontStyle: { ...fontOptions.fontStyle, italic: !fontOptions.fontStyle.italic } })}
                                className={`p-2 rounded btn btn-secondary ${fontOptions.fontStyle.italic ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
                            >
                                Italic
                            </button>

                            <button
                                onClick={() => setFontOptions({ ...fontOptions, textDecoration: 'underline' })}
                                className={`p-2 rounded btn btn-secondary ${fontOptions.textDecoration === 'underline' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
                            >
                                Underline
                            </button>
                        </div>


                        <div className="flex space-x-4">
                            <label className="block w-1/3">
                                Font Size:
                                <input
                                    type="number"
                                    value={fontOptions.fontSize}
                                    onChange={(e) => setFontOptions({ ...fontOptions, fontSize: +e.target.value })}
                                    className="p-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </label>

                            <label className="block w-2/3">
                                Font Family:
                                <select
                                    value={fontOptions.font}
                                    onChange={(e) => setFontOptions({ ...fontOptions, font: e.target.value })}
                                    className="p-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="Arial">Arial</option>
                                    <option value="Courier New">Courier New</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                </select>
                            </label>
                        </div>
                        <button onClick={addText} className="btn btn-primary bg-blue-200 text-black rounded px-4 py-2 mt-4">Add Text</button>
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-700 text-md">Table</h3>
                    <div className="flex space-x-4">

                        <input
                            type="number"
                            value={numRows}
                            onChange={(e) => setNumRows(Math.max(1, +e.target.value))} // Ensure at least 1 row
                            placeholder="Rows"
                            className="p-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="number"
                            value={numCols}
                            onChange={(e) => setNumCols(Math.max(1, +e.target.value))} // Ensure at least 1 column
                            placeholder="Columns"
                            className="p-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={() => addTable(numRows, numCols)} className="btn btn-primary bg-gray-200 text-black rounded px-4 py-2 mr-2 text-nowrap">
                            Add Table
                        </button>
                    </div>

                </div>

                <div className="relative">
                    <div className='flex justify-between mb-2'>
                        <div>
                            <button onClick={undo} className="btn btn-primary bg-gray-200 text-black rounded px-4 py-2 mt-4 mr-2">Undo</button>
                            <button onClick={redo} className="btn btn-primary bg-gray-200 text-black rounded px-4 py-2 mt-4">Redo</button>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={toggleMoveMode} className="btn btn-primary bg-gray-200 text-black rounded px-4 py-2 mt-4 mr-2">{!isMoveMode ? 'Move mode' : 'Draw Mode'}</button>
                            <button onClick={zoomIn} className="btn btn-primary bg-gray-200 text-black rounded px-4 py-2 mt-4">Zoom In</button>
                            <button onClick={zoomOut} className="btn btn-primary bg-gray-200 text-black rounded px-4 py-2 mt-4">Zoom Out</button>
                        </div>
                    </div>
                    {editingText && (
                        <div className="absolute top-3 right-3 space-y-6 w-60 p-6 shadow">
                            <h3 className="text-2xl font-semibold text-gray-700 text-md">Text Options</h3>

                            {/* Text content input */}
                            <input
                                type="text"
                                value={editingText?.text || ''}
                                onChange={(e) => {
                                    setEditingText({
                                        ...editingText,
                                        text: e.target.value
                                    });
                                }}
                                className="p-3 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mt-0"
                                placeholder="Enter text here"
                            />

                            {/* Text style buttons */}
                            <div className="flex space-x-4">
                                <button
                                    onClick={() => setEditingText({
                                        ...editingText,
                                        fontStyle: {
                                            ...editingText.fontStyle,
                                            bold: !editingText.fontStyle?.bold
                                        }
                                    })}
                                    className={`p-1 rounded btn btn-secondary ${editingText?.fontStyle?.bold ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
                                >
                                    Bold
                                </button>

                                <button
                                    onClick={() => setEditingText({
                                        ...editingText,
                                        fontStyle: {
                                            ...editingText.fontStyle,
                                            italic: !editingText.fontStyle?.italic
                                        }
                                    })}
                                    className={`p-1 rounded btn btn-secondary ${editingText?.fontStyle?.italic ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
                                >
                                    Italic
                                </button>

                                <button
                                    onClick={() => setEditingText({
                                        ...editingText,
                                        textDecoration: editingText?.textDecoration === 'underline' ? '' : 'underline'
                                    })}
                                    className={`p-1 rounded btn btn-secondary ${editingText?.textDecoration === 'underline' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
                                >
                                    Underline
                                </button>
                            </div>

                            {/* Font size and font family inputs */}
                            <div className="flex space-x-4">
                                <label className="block w-1/3 text-sm">
                                    Size:
                                    <input
                                        type="number"
                                        value={editingText?.fontSize || 16}
                                        onChange={(e) => setEditingText({
                                            ...editingText,
                                            fontSize: +e.target.value // Ensure we are updating with a number
                                        })}
                                        className="p-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </label>

                                <label className="block w-2/3 text-sm">
                                    Font Family:
                                    <select
                                        value={editingText?.font || 'Arial'}
                                        onChange={(e) => setEditingText({
                                            ...editingText,
                                            font: e.target.value
                                        })}
                                        className="p-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Arial">Arial</option>
                                        <option value="Courier New">Courier New</option>
                                        <option value="Times New Roman">Times New Roman</option>
                                    </select>
                                </label>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={saveTextChanges}
                                className="mt-2 p-2 bg-blue-500 text-white rounded"
                            >
                                Save Changes
                            </button>
                        </div>
                    )}

                    {editingTableCell && (
                        <div
                            style={{
                                position: 'absolute',
                                left: editingTableCell.col * tables[0].cellWidth + tables[0].x, // Calculate x position based on column index and table x offset
                                top: editingTableCell.row * tables[0].cellHeight + tables[0].y, // Calculate y position based on row index and table y offset
                                zIndex: 10, // Ensure input appears above the canvas
                                width: tables[0].cellWidth, // Set the input width to match the cell width
                                height: tables[0].cellHeight, // Set the input height to match the cell height
                            }}
                        >
                            <input
                                type="text"
                                value={newText}

                                onChange={(e) => setNewText(e.target.value)}
                                onBlur={saveTableCellChanges} // Save changes when focus is lost
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveTableCellChanges();  // Save on Enter key
                                }}
                                style={{
                                    position: 'absolute',
                                    zIndex: 10,
                                    border: '1px solid black',
                                    padding: '5px',
                                    width: '100%', // Make input take full width of the cell
                                    height: '100%', // Make input take full height of the cell
                                    boxSizing: 'border-box', // To include padding and border in the element's width and height
                                }}
                            />
                        </div>
                    )}


                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={600}
                        className="border bg-white rounded-md shadow-lg"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        style={{ cursor }}
                    />
                </div>

            </div>
        </div>
    );
};

export default Canvas;
