"use client"
import React, { useRef } from "react";
interface VideoProps {
    src: string;
    title: string;
    description: string;
}
export const Video: React.FC<VideoProps> = ({ src, title, description }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    const handlePlayPause = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
            } else {
                videoRef.current.pause();
            }
        }
    };

    return (
        <div className="video-player">
            <h3>{title}</h3>
            <p>{description}</p>
            <video ref={videoRef} width="320" height="240" controls preload="none">
                <source src={src} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <button onClick={handlePlayPause}>Play/Pause</button>
        </div>
    );
}
