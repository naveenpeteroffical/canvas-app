"use client";

import { useEffect, useRef, useState } from "react";

const CanvasControls: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragStartLocation, setDragStartLocation] = useState({ x: 0, y: 0 });
  const [lineWidth, setLineWidth] = useState(4);
  const [fillColor, setFillColor] = useState("#24B0D5");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [shape, setShape] = useState("line");
  const [polygonSides, setPolygonSides] = useState(5);
  const [textInput, setTextInput] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [shapes, setShapes] = useState<any[]>([]);
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(null);
  const [cursor, setCursor] = useState<"default" | "move">("default");

  const canvas = canvasRef.current;
  const context: any = canvas?.getContext("2d");

  useEffect(() => {
    if (canvas) {
      canvas.width = 650;
      canvas.height = 800;
      context!.fillStyle = backgroundColor;
      context!.fillRect(0, 0, canvas.width, canvas.height);
      redrawShapes();
    }
  }, [canvas, backgroundColor, shapes]);

  const getCanvasCoordinates = (event: MouseEvent) => {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const drawShape = (shape: any) => {
    if (context) {
      context.lineWidth = shape.lineWidth;
      context.strokeStyle = shape.strokeColor;
      context.fillStyle = shape.fillColor;

      switch (shape.type) {
        case "line":
          context.beginPath();
          context.moveTo(shape.start.x, shape.start.y);
          context.lineTo(shape.end.x, shape.end.y);
          context.stroke();
          break;
        case "rect":
          context.beginPath();
          context.rect(
            shape.start.x,
            shape.start.y,
            shape.end.x - shape.start.x,
            shape.end.y - shape.start.y
          );
          context.stroke();
          if (shape.fill) context.fill();
          break;
        case "circle":
          context.beginPath();
          const radius = Math.sqrt(
            Math.pow(shape.end.x - shape.start.x, 2) +
              Math.pow(shape.end.y - shape.start.y, 2)
          );
          context.arc(shape.start.x, shape.start.y, radius, 0, Math.PI * 2);
          context.stroke();
          if (shape.fill) context.fill();
          break;
        case "polygon":
          context.beginPath();
          const angle = (2 * Math.PI) / polygonSides;
          for (let i = 0; i < polygonSides; i++) {
            const x =
              shape.start.x + Math.cos(angle * i) * (shape.end.x - shape.start.x);
            const y =
              shape.start.y + Math.sin(angle * i) * (shape.end.y - shape.start.y);
            if (i === 0) {
              context.moveTo(x, y);
            } else {
              context.lineTo(x, y);
            }
          }
          context.closePath();
          context.stroke();
          if (shape.fill) context.fill();
          break;
        case "text":
          context.font = `${isBold ? "bold " : ""}${isItalic ? "italic " : ""}${fontSize}px sans-serif`;
          context.textDecoration = isUnderline ? "underline" : "none";
          context.fillStyle = shape.fillColor;
          context.fillText(shape.text, shape.start.x, shape.start.y);
          break;
        default:
          break;
      }
    }
  };

  const redrawShapes = () => {
    if (context && canvas) {
      context.clearRect(0, 0, canvas!.width, canvas!.height);
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
      shapes.forEach((shape: any) => drawShape(shape));
    }
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    const position = getCanvasCoordinates(event.nativeEvent);

    // Check if we clicked on an existing shape
    const selectedIndex = shapes.findIndex((shape: any) => isPointInShape(position, shape));

    if (selectedIndex !== -1) {
      // Select the shape for dragging
      setSelectedShapeIndex(selectedIndex);
      setDragging(true);
      setDragStartLocation(position);
      setCursor("move");
    } else {
      // If no shape is clicked, start drawing a new shape
      setDragging(true);
      setSelectedShapeIndex(null);
      setDragStartLocation(position);
      setShapes((prevShapes) => [
        ...prevShapes,
        {
          type: shape,
          start: position,
          end: position,
          strokeColor,
          fillColor,
          lineWidth,
        },
      ]);
      setCursor("default");
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!canvas || !context || !dragging) return;

    const position = getCanvasCoordinates(event.nativeEvent);

    if (selectedShapeIndex !== null) {
      // If dragging an existing shape
      const shape = shapes[selectedShapeIndex];
      const dx = position.x - dragStartLocation.x;
      const dy = position.y - dragStartLocation.y;

      const updatedShape = {
        ...shape,
        start: { x: shape.start.x + dx, y: shape.start.y + dy },
        end: { x: shape.end.x + dx, y: shape.end.y + dy },
      };

      setShapes((prevShapes) =>
        prevShapes.map((s, index) => (index === selectedShapeIndex ? updatedShape : s))
      );

      setDragStartLocation(position); // Update drag start location
      redrawShapes();
    } else {
      // Drawing a new shape (if no shape is selected)
      const newShape = {
        type: shape,
        start: dragStartLocation,
        end: position,
        strokeColor,
        fillColor,
        lineWidth,
      };
      setShapes((prevShapes) => {
        const newShapes = [...prevShapes];
        newShapes[newShapes.length - 1] = newShape;
        return newShapes;
      });
      redrawShapes();
      drawShape(newShape);
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
    setSelectedShapeIndex(null);
    setCursor("default");
  };

  const handleMouseEnter = (event: React.MouseEvent) => {
    const position = getCanvasCoordinates(event.nativeEvent);
    const selectedIndex = shapes.findIndex((shape: any) => isPointInShape(position, shape));
    if (selectedIndex !== -1) {
      setCursor("move");
    }
  };

  const handleMouseLeave = () => {
    setCursor("default");
  };

  const isPointInShape = (point: { x: number; y: number }, shape: any) => {
    if (shape.type === "rect") {
      return (
        point.x >= shape.start.x &&
        point.x <= shape.end.x &&
        point.y >= shape.start.y &&
        point.y <= shape.end.y
      );
    }
    if (shape.type === "circle") {
      const radius = Math.sqrt(
        Math.pow(shape.end.x - shape.start.x, 2) + Math.pow(shape.end.y - shape.start.y, 2)
      );
      const distance = Math.sqrt(
        Math.pow(point.x - shape.start.x, 2) + Math.pow(point.y - shape.start.y, 2)
      );
      return distance <= radius;
    }
    if (shape.type === "text") {
      const width = context!.measureText(shape.text).width;
      const height = fontSize; // Approximate height of text
      return (
        point.x >= shape.start.x &&
        point.x <= shape.start.x + width &&
        point.y >= shape.start.y &&
        point.y <= shape.start.y + height
      );
    }
    return false;
  };

  return (
    <div className="flex">
      <div className="controls bg-gray-300 p-4 rounded-lg shadow-md">
        <h3 className="text-gray-700 uppercase text-sm">Shape:</h3>
        <div className="border border-gray-400 p-2 rounded mt-2">
          {["line", "rect", "circle", "polygon"].map((s) => (
            <label key={s} className="block">
              <input
                type="radio"
                name="shape"
                value={s}
                checked={shape === s}
                onChange={() => setShape(s)}
                className="mr-2"
              />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </label>
          ))}
        </div>
        <h3 className="text-gray-700 uppercase text-sm mt-4">Input Text:</h3>
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          className="border p-1 rounded w-full"
          rows={3}
        />
        <div className="mt-2">
          <label className="block">
            <input
              type="checkbox"
              checked={isBold}
              onChange={() => setIsBold(!isBold)}
              className="mr-2"
            />
            Bold
          </label>
          <label className="block">
            <input
              type="checkbox"
              checked={isItalic}
              onChange={() => setIsItalic(!isItalic)}
              className="mr-2"
            />
            Italic
          </label>
          <label className="block">
            <input
              type="checkbox"
              checked={isUnderline}
              onChange={() => setIsUnderline(!isUnderline)}
              className="mr-2"
            />
            Underline
          </label>
        </div>
        <label className="block mt-2">
          Font Size:
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="ml-2"
          >
            {[12, 14, 16, 18, 20, 24, 28, 32].map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            if (textInput.trim()) {
              const newText = {
                type: "text",
                text: textInput,
                start: { x: 50, y: 50 }, // Default position for text
                fillColor: strokeColor,
              };
              setShapes((prevShapes) => [...prevShapes, newText]);
              setTextInput(""); // Clear the text input
              redrawShapes();
            }
          }}
          className="button-success bg-green-600 text-white rounded px-4 py-2 mt-4"
        >
          Apply Text
        </button>

        {/* Clear Canvas */}
        <button
          type="button"
          onClick={() => {
            setShapes([]);
            redrawShapes();
          }}
          className="button-error bg-red-600 text-white rounded px-4 py-2 mt-4"
        >
          Clear Canvas
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="border border-gray-500 rounded-lg ml-4"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        style={{ cursor }}
      />
    </div>
  );
};

export default CanvasControls;
