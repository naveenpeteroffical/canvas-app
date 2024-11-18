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

const Canvas: React.FC = () => {
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

    // Canvas zoom state and move mode
    const [zoom, setZoom] = useState(1); // Zoom level
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 }); // Canvas offset for move mode
    const [isMoveMode, setIsMoveMode] = useState(false); // Flag to switch between draw and move mode

    // Stack for Undo and Redo
    const [undoStack, setUndoStack] = useState<Shape[][]>([]);
    const [redoStack, setRedoStack] = useState<Shape[][]>([]);

    const [editingText, setEditingText] = useState<any | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                context.clearRect(0, 0, canvas.width, canvas.height);

                context.save();
                context.translate(canvasOffset.x, canvasOffset.y); // Apply canvas translation for move mode
                context.scale(zoom, zoom); // Apply zoom level

                shapes.forEach(shape => {
                    drawShape(context, shape);
                });

                context.restore();
            }
        }
    }, [shapes, zoom, canvasOffset]);

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
            const fontSize = shape.fontSize || 16;

            // Combine styles for bold and italic based on the boolean flags
            let fontStyle = '';
            if (fontOptions.fontStyle.bold) fontStyle += 'bold ';
            if (fontOptions.fontStyle.italic) fontStyle += 'italic ';

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


    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - canvasOffset.x) / zoom; // Adjust for zoom
            const y = (e.clientY - rect.top - canvasOffset.y) / zoom; // Adjust for zoom

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
                setOffset({ x, y }); // Remember where the mouse is for move mode
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
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - canvasOffset.x) / zoom; // Adjust for zoom
            const y = (e.clientY - rect.top - canvasOffset.y) / zoom; // Adjust for zoom

            let newCursor = 'default';
            let isHovering = false;

            const shape = shapes.find(s => {
                return (
                    x >= s.x &&
                    x <= s.x + s.width &&
                    y >= s.y &&
                    y <= s.y + s.height
                );
            });

            if (shape) {
                isHovering = true;

                // Determine resize cursor based on position
                const isNearLeft = x >= shape.x - 10 && x <= shape.x + 10;
                const isNearRight = x >= shape.x + shape.width - 10 && x <= shape.x + shape.width + 10;
                const isNearTop = y >= shape.y - 10 && y <= shape.y + 10;
                const isNearBottom = y >= shape.y + shape.height - 10 && y <= shape.y + shape.height + 10;

                if (isNearLeft || isNearRight || isNearTop || isNearBottom) {
                    if (isNearLeft && isNearTop) {
                        newCursor = 'nwse-resize';
                    } else if (isNearLeft && isNearBottom) {
                        newCursor = 'nesw-resize';
                    } else if (isNearRight && isNearTop) {
                        newCursor = 'nesw-resize';
                    } else if (isNearRight && isNearBottom) {
                        newCursor = 'nwse-resize';
                    } else if (isNearLeft) {
                        newCursor = 'ew-resize';
                    } else if (isNearRight) {
                        newCursor = 'ew-resize';
                    } else if (isNearTop) {
                        newCursor = 'ns-resize';
                    } else if (isNearBottom) {
                        newCursor = 'ns-resize';
                    }
                }
            }

            setCursor(newCursor);

            if (isMoveMode && offset) {
                setCanvasOffset({
                    x: x - offset.x,
                    y: y - offset.y,
                });
            }

            if (draggingShape) {
                if (offset) {
                    // Save current state before making updates
                    saveState();

                    setShapes(shapes.map(shape => {
                        if (shape.id === draggingShape.id) {
                            return {
                                ...shape,
                                x: (x - offset.x) * zoom, // Adjust for zoom
                                y: (y - offset.y) * zoom, // Adjust for zoom
                            };
                        }
                        return shape;
                    }));
                }
            }

            if (resizingShape && resizeDirection) {
                if (offset) {
                    const newShape = { ...resizingShape };
                    const dx = x - resizingShape.x;
                    const dy = y - resizingShape.y;

                    // Resize shape based on resize direction
                    if (resizeDirection.includes('right')) {
                        newShape.width = Math.max(10, dx * zoom); // Adjust for zoom
                    }
                    if (resizeDirection.includes('left')) {
                        newShape.width = Math.max(10, resizingShape.width - dx * zoom); // Adjust for zoom
                        newShape.x = x * zoom;
                    }
                    if (resizeDirection.includes('bottom')) {
                        newShape.height = Math.max(10, dy * zoom); // Adjust for zoom
                    }
                    if (resizeDirection.includes('top')) {
                        newShape.height = Math.max(10, resizingShape.height - dy * zoom); // Adjust for zoom
                        newShape.y = y * zoom;
                    }

                    // Save current state before resizing
                    saveState();

                    setShapes(shapes.map(shape => shape.id === resizingShape.id ? newShape : shape));
                }
            }
        }
    };

    const saveTextChanges = () => {
        console.log("editingText.fontStyle.bold", editingText.fontStyle.bold, shapes);

        if (editingText) {
            // Ensure fontStyle is an object before spreading
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

            // Save changes made to the text content
            setShapes(shapes.map(shape =>
                shape.id === editingText.id ? updatedText : shape
            ));

            console.log("shapes", shapes);


            saveState(); // Save the changes to undo stack
            setEditingText(null); // Exit text editing mode
        }
    };



    const handleMouseUp = () => {
        setDraggingShape(null);
        setOffset(null);
        setResizingShape(null);
        setResizeDirection(null);
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


    return (
        <div className="flex justify-center p-8 bg-gray-50 min-h-screen">
            <div className="flex flex-row-reverse space-y-8 w-full gap-10">
                <div className='w-full'>
                    <button className="btn btn-primary bg-red-400 text-black rounded px-4 py-2 mt-8 mr-2 mb-4" onClick={handleResetCanvas}>Reset Canvas</button>

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
                                className={`btn btn-secondary ${fontOptions.fontStyle.bold ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
                            >
                                Bold
                            </button>

                            <button
                                onClick={() => setFontOptions({ ...fontOptions, fontStyle: { ...fontOptions.fontStyle, italic: !fontOptions.fontStyle.italic } })}
                                className={`btn btn-secondary ${fontOptions.fontStyle.italic ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
                            >
                                Italic
                            </button>

                            <button
                                onClick={() => setFontOptions({ ...fontOptions, textDecoration: 'underline' })}
                                className={`btn btn-secondary ${fontOptions.textDecoration === 'underline' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
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
                    <div className='flex justify-between'>
                        <div>
                            <button onClick={toggleMoveMode} className="btn btn-primary bg-gray-200 text-black rounded px-4 py-2 mt-4 mr-2">{!isMoveMode ? 'Move mode' : 'Draw Mode'}</button>
                            <button onClick={undo} className="btn btn-primary bg-gray-200 text-black rounded px-4 py-2 mt-4 mr-2">Undo</button>
                            <button onClick={redo} className="btn btn-primary bg-gray-200 text-black rounded px-4 py-2 mt-4">Redo</button>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={zoomIn} className="btn btn-primary bg-gray-200 text-black rounded px-4 py-2 mt-4">Zoom In</button>
                            <button onClick={zoomOut} className="btn btn-primary bg-gray-200 text-black rounded px-4 py-2 mt-4">Zoom Out</button>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    {editingText && (
                        <div className="absolute top-3 right-3 space-y-6 w-52">
                            <h3 className="text-2xl font-semibold text-gray-700 mt-4 text-md">Text Options</h3>

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
                                className="p-3 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                    className={`btn btn-secondary ${editingText?.fontStyle?.bold ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
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
                                    className={`btn btn-secondary ${editingText?.fontStyle?.italic ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
                                >
                                    Italic
                                </button>

                                <button
                                    onClick={() => setEditingText({
                                        ...editingText,
                                        textDecoration: editingText?.textDecoration === 'underline' ? '' : 'underline'
                                    })}
                                    className={`btn btn-secondary ${editingText?.textDecoration === 'underline' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}
                                >
                                    Underline
                                </button>
                            </div>

                            {/* Font size and font family inputs */}
                            <div className="flex space-x-4">
                                <label className="block w-1/3 text-sm">
                                    Font Size:
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
