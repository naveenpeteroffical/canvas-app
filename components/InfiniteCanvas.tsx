"use client";
import { useRef, useEffect, useState } from 'react';
import Toolbar from './ToolBar';
// import Toolbar from './toolbar';

const InfiniteCanvas = () => {
    const canvasRef = useRef<any>(null);
    const [scale, setScale] = useState(1);
    const [translateX, setTranslateX] = useState(0);
    const [translateY, setTranslateY] = useState(0);
    const [isPanning, setIsPanning] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [items, setItems] = useState<any>([]);
    const [gridSize, setGridSize] = useState(50);


    useEffect(() => {
        const canvas = canvasRef.current;

        // Check if canvas is not null
        if (canvas) {
            const ctx = canvas.getContext('2d');

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const draw = () => {
                ctx.save();
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.translate(translateX, translateY);
                ctx.scale(scale, scale);

                // Example drawing: An infinite grid
                const width = canvas.width;
                const height = canvas.height;

                // Calculate the top-left corner of the grid to start drawing
                const startX = Math.floor(-translateX / scale / gridSize) * gridSize;
                const startY = Math.floor(-translateY / scale / gridSize) * gridSize;

                for (let x = startX; x < width / scale - translateX / scale; x += gridSize) {
                    for (let y = startY; y < height / scale - translateY / scale; y += gridSize) {
                        ctx.strokeRect(x, y, gridSize, gridSize);
                    }
                }

                // Draw added items
                items.forEach((item: any) => {
                    if (item.type === 'rectangle') {
                        ctx.fillStyle = 'blue';
                        ctx.fillRect(item.x, item.y, 100, 50);
                    } else if (item.type === 'circle') {
                        ctx.fillStyle = 'red';
                        ctx.beginPath();
                        ctx.arc(item.x, item.y, 50, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                });

                ctx.restore();
            };

            draw();

            const handleResize = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                draw();
            };

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [scale, translateX, translateY, items, gridSize]);

    const handleWheel = (event: any) => {
        event.preventDefault();
        const zoomIntensity = 0.1;
        if (canvasRef && canvasRef != null) {
            const mouseX = event.clientX - canvasRef.current.offsetLeft;
            const mouseY = event.clientY - canvasRef.current.offsetTop;
            const zoomFactor = 1 + event.deltaY * -zoomIntensity;

            const newScale = Math.min(Math.max(0.5, scale * zoomFactor), 5); // Limit zoom scale

            setTranslateX(translateX - mouseX / scale * (newScale - scale));
            setTranslateY(translateY - mouseY / scale * (newScale - scale));
            setScale(newScale);
        }
    };

    const handleMouseDown = (event: any) => {
        setIsPanning(true);
        setStartX(event.clientX - translateX);
        setStartY(event.clientY - translateY);
    };

    const handleMouseMove = (event: any) => {
        if (!isPanning) return;
        setTranslateX(event.clientX - startX);
        setTranslateY(event.clientY - startY);
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    const handleMouseLeave = () => {
        setIsPanning(false);
    };

    const addItem = (type:any) => {
        const newItem = {
            type,
            x: (canvasRef.current.width / 2 - translateX) / scale,
            y: (canvasRef.current.height / 2 - translateY) / scale,
        };
        setItems([...items, newItem]);
    };

    const handleGridSizeChange = (event: any) => {
        setGridSize(parseInt(event.target.value));
    };

    return (
        <div>
            <Toolbar addItem={addItem} />
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <canvas
                    ref={canvasRef}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    style={{ width: '100%', height: '100%', display: 'block' }}
                />
                <div className="text-center fixed bottom-0 left-4 right-4 z-10 bg-gray-100 p-2 rounded shadow">
                    Zoom: {(scale * 100).toFixed(0)}%
                    <input type="range" min="10" max="100" value={gridSize} onChange={handleGridSizeChange} />
                </div>
            </div>
        </div>
    );
};

export default InfiniteCanvas;