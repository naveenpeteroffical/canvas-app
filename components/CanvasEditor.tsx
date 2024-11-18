"use client";

import React, { useRef, useState, useEffect } from "react";
import CanvasControls from "./CanvasControls"; // Import CanvasControls

interface Shape {
  id: number;
  type: "rectangle" | "circle" | "text" | "image";
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
  const [cursor, setCursor] = useState<string>("default");
  const [zoom, setZoom] = useState(1); // Zoom level
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 }); // Canvas offset for move mode
  const [isMoveMode, setIsMoveMode] = useState(false); // Flag to switch between draw and move mode
  const [undoStack, setUndoStack] = useState<Shape[][]>([]);
  const [redoStack, setRedoStack] = useState<Shape[][]>([]);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");

  // Drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext("2d");
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        context.fillStyle = backgroundColor; // Set the background color
        context.fillRect(0, 0, canvas.width, canvas.height); // Fill the background

        context.save();
        context.translate(canvasOffset.x, canvasOffset.y); // Apply canvas translation for move mode
        context.scale(zoom, zoom); // Apply zoom level

        shapes.forEach((shape) => {
          drawShape(context, shape);
        });

        context.restore();
      }
    }
  }, [shapes, zoom, canvasOffset, backgroundColor]);

  const drawShape = (context: any, shape: Shape) => {
    context.strokeStyle = shape.outlineColor || "black";
    context.lineWidth = 2;

    if (shape.type === "rectangle") {
      context.strokeRect(shape.x, shape.y, shape.width, shape.height);
    } else if (shape.type === "circle") {
      context.beginPath();
      context.arc(
        shape.x + shape.width / 2,
        shape.y + shape.height / 2,
        shape.width / 2,
        0,
        Math.PI * 2
      );
      context.stroke();
    } else if (shape.type === "image" && shape.src) {
      const img = new Image();
      img.src = shape.src;
      img.onload = () => {
        const zoomedWidth = shape.width * zoom;
        const zoomedHeight = shape.height * zoom;
        context.drawImage(img, shape.x, shape.y, zoomedWidth, zoomedHeight);
        context.strokeRect(shape.x, shape.y, zoomedWidth, zoomedHeight);
      };
    } else if (shape.type === "text" && shape.text) {
      const fontSize = shape.fontSize || 16;
      let fontStyle = "";
      if (shape.fontStyle?.includes("bold")) fontStyle += "bold ";
      if (shape.fontStyle?.includes("italic")) fontStyle += "italic ";
      context.font = `${fontStyle.trim()} ${fontSize}px ${shape.font || "Arial"}`;
      context.fillStyle = "black"; // Text color
      context.fillText(shape.text, shape.x, shape.y + fontSize);

      if (shape.textDecoration === "underline") {
        const textWidth = context.measureText(shape.text).width;
        const underlineY = shape.y + fontSize + 2;
        context.beginPath();
        context.moveTo(shape.x, underlineY);
        context.lineTo(shape.x + textWidth, underlineY);
        context.strokeStyle = "black";
        context.lineWidth = 1;
        context.stroke();
      }
    }
  };

  // Handle mouse events (dragging, resizing)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - canvasOffset.x) / zoom;
      const y = (e.clientY - rect.top - canvasOffset.y) / zoom;

      const shape = shapes.find((s) => {
        return (
          x >= s.x &&
          x <= s.x + s.width &&
          y >= s.y &&
          y <= s.y + s.height
        );
      });

      if (shape) {
        setDraggingShape(shape);
        setOffset({ x: x - shape.x, y: y - shape.y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - canvasOffset.x) / zoom;
      const y = (e.clientY - rect.top - canvasOffset.y) / zoom;

      if (draggingShape) {
        setShapes(
          shapes.map((shape) =>
            shape.id === draggingShape.id
              ? { ...shape, x: x - offset!.x, y: y - offset!.y }
              : shape
          )
        );
      }
    }
  };

  const handleMouseUp = () => {
    setDraggingShape(null);
    setOffset(null);
    setResizeDirection(null);
    setCursor("default");
  };

  const saveState = () => {
    setUndoStack([...undoStack, shapes.map((shape) => ({ ...shape }))]);
    setRedoStack([]);
  };

  const addShape = (type: "rectangle" | "circle") => {
    saveState();
    const newShape: Shape = {
      id: Date.now(),
      type,
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      outlineColor: "black",
    };
    setShapes([...shapes, newShape]);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const lastState = undoStack.pop();
    if (lastState) {
      setRedoStack([shapes, ...redoStack]);
      setShapes(lastState);
    }
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const lastState = redoStack.pop();
    if (lastState) {
      setUndoStack([shapes, ...undoStack]);
      setShapes(lastState);
    }
  };

  const zoomIn = () => setZoom((prevZoom) => Math.min(prevZoom + 0.1, 3));
  const zoomOut = () => setZoom((prevZoom) => Math.max(prevZoom - 0.1, 0.5));

  const toggleMoveMode = () => setIsMoveMode(!isMoveMode);

  const resetCanvas = () => {
    setShapes([]);
    setZoom(1);
    setCanvasOffset({ x: 0, y: 0 });
    setBackgroundColor("#ffffff"); // Reset to default background color
  };

  const changeBackgroundColor = (color: string) => setBackgroundColor(color);

  return (
    <div className="flex justify-center p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-row-reverse w-full gap-10">
        <CanvasControls
          addShape={addShape}
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          undo={undo}
          redo={redo}
          toggleMoveMode={toggleMoveMode}
          isMoveMode={isMoveMode}
          resetCanvas={resetCanvas}
          changeBackgroundColor={changeBackgroundColor}
        />
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="border bg-white rounded-md shadow-lg"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>
      </div>
    </div>
  );
};

export default Canvas;
