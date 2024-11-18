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
  changeBackgroundColor,
}) => {
  return (
    <div className="w-80 bg-white shadow-lg rounded-md p-6">
      <button onClick={resetCanvas} className="btn mb-4 w-full">
        Reset Canvas
      </button>
      <button onClick={() => addShape("rectangle")} className="btn mb-4 w-full">
        Add Rectangle
      </button>
      <button onClick={() => addShape("circle")} className="btn mb-4 w-full">
        Add Circle
      </button>
      <button onClick={toggleMoveMode} className="btn mb-4 w-full">
        {isMoveMode ? "Switch to Draw Mode" : "Switch to Move Mode"}
      </button>
      <button onClick={zoomIn} className="btn mb-4 w-full">
        Zoom In
      </button>
      <button onClick={zoomOut} className="btn mb-4 w-full">
        Zoom Out
      </button>
      <button onClick={undo} className="btn mb-4 w-full">
        Undo
      </button>
      <button onClick={redo} className="btn mb-4 w-full">
        Redo
      </button>
      <div className="mb-4">
        <label className="block">Background Color:</label>
        <input
          type="color"
          onChange={(e) => changeBackgroundColor(e.target.value)}
          className="w-full p-2 mt-2 rounded"
        />
      </div>
    </div>
  );
};

export default CanvasControls;
