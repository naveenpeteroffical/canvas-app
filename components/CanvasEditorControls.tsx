// CanvasControls.tsx
import React from "react";

interface CanvasControlsProps {
  addShape: (type: "rectangle" | "circle") => void;
  zoomIn: () => void;
  zoomOut: () => void;
  undo: () => void;
  redo: () => void;
  toggleMoveMode: () => void;
  isMoveMode: boolean;
  resetCanvas: () => void;
  changeBackgroundColor: (color: string) => void;
}

const CanvasControls: React.FC<CanvasControlsProps> = ({
  addShape,
  zoomIn,
  zoomOut,
  undo,
  redo,
  toggleMoveMode,
  isMoveMode,
  resetCanvas,
  changeBackgroundColor
}) => {
  return (
    <div className="w-full">
      <div className="mb-4">
        <button onClick={() => resetCanvas()} className="btn">Reset Canvas</button>
        <button onClick={() => addShape("rectangle")} className="btn">
          Add Rectangle
        </button>
        <button onClick={() => addShape("circle")} className="btn">
          Add Circle
        </button>
        <button onClick={() => toggleMoveMode()} className="btn">
          {isMoveMode ? "Switch to Draw Mode" : "Switch to Move Mode"}
        </button>
      </div>

      <div className="mb-4">
        <button onClick={zoomIn} className="btn">Zoom In</button>
        <button onClick={zoomOut} className="btn">Zoom Out</button>
      </div>

      <div className="mb-4">
        <button onClick={undo} className="btn">Undo</button>
        <button onClick={redo} className="btn">Redo</button>
      </div>

      <div className="mb-4">
        <label>Background Color: </label>
        <input
          type="color"
          onChange={(e) => changeBackgroundColor(e.target.value)}
          className="p-1 rounded"
        />
      </div>
    </div>
  );
};

export default CanvasControls;
