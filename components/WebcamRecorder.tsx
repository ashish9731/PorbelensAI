import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Icons } from '../constants';

interface WebcamRecorderProps {
  onDataAvailable: (blob: Blob) => void;
  onFrameCapture: (base64: string) => void;
  isRecording: boolean;
}

export interface WebcamRef {
  stopRecording: () => void;
  startRecording: () => void;
  captureFrame: () => string | null;
}

const WebcamRecorder = forwardRef<WebcamRef, WebcamRecorderProps>(({ onDataAvailable, isRecording }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Default to Screen Share since this is for Interviewer recording Candidate on screen
  const [sourceType, setSourceType] = useState<'screen' | 'camera'>('screen');
  const [error, setError] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Initialize Stream
  useEffect(() => {
    let isMounted = true;
    
    const initStream = async () => {
      setIsVideoReady(false);
      setError(null);

      // Stop previous tracks if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      try {
        let currentStream: MediaStream | null = null;

        if (sourceType === 'screen') {
          // SCREEN SHARE LOGIC (For Zoom/Meet recording)
          try {
            // Request screen share with audio
            const displayMedia = await navigator.mediaDevices.getDisplayMedia({ 
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 15 }
                }, 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });
            
            // Always use system audio from screen share
            currentStream = displayMedia;
            
            // Try to add microphone audio as well for better quality
            try {
                const micMedia = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 44100
                    }
                });
                // Combine video from screen and audio from both sources
                currentStream = new MediaStream([
                    ...displayMedia.getVideoTracks(),
                    ...displayMedia.getAudioTracks(),
                    ...micMedia.getAudioTracks()
                ]);
            } catch (micErr) {
                console.warn("Microphone access failed, using system audio only", micErr);
                // If mic fails, just use system audio
                currentStream = displayMedia;
            }

            // Handle "Stop Sharing" button
            if (displayMedia.getVideoTracks()[0]) {
                displayMedia.getVideoTracks()[0].onended = () => {
                    if (isMounted) setSourceType('camera'); // Fallback
                };
            }

          } catch (err: any) {
             console.warn("Screen share cancelled or failed", err);
             if (isMounted) {
                 if (err.name === 'NotAllowedError') {
                     setError("Screen recording permission denied. Please grant permission or use Camera.");
                 } else {
                     setSourceType('camera'); // Auto fallback
                 }
             }
             return;
          }
        } else {
          // CAMERA LOGIC (For in-person or fallback)
          try {
            currentStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' }, // Prefer back camera if mobile
                audio: true 
            });
          } catch (err: any) {
            if (isMounted) setError("Camera access denied.");
            return;
          }
        }

        if (!isMounted) {
            currentStream?.getTracks().forEach(t => t.stop());
            return;
        }

        streamRef.current = currentStream;

        if (videoRef.current && currentStream) {
          videoRef.current.srcObject = currentStream;
          
          // Robust play handling to prevent AbortError
          // We wait for the metadata to load before playing
          videoRef.current.onloadedmetadata = async () => {
             try {
                 if (videoRef.current) {
                    await videoRef.current.play();
                    if (isMounted) setIsVideoReady(true);
                 }
             } catch (playErr: any) {
                 if (playErr.name !== 'AbortError') {
                     console.error("Video play error", playErr);
                 }
             }
          };
        }

      } catch (err: any) {
        console.error("Stream init error:", err);
        if (isMounted) setError("Failed to access media source.");
      }
    };

    initStream();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [sourceType]);

  useImperativeHandle(ref, () => ({
    startRecording: () => {
      chunksRef.current = [];
      if (streamRef.current && isVideoReady) {
        try {
            // Use supported mime type
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') 
            ? 'video/webm;codecs=vp8,opus' 
            : 'video/webm';

            const recorder = new MediaRecorder(streamRef.current, { mimeType });
            
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                onDataAvailable(blob);
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
        } catch (e) {
            console.error("Recorder start error", e);
        }
      }
    },
    stopRecording: () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    },
    captureFrame: () => {
      if (videoRef.current && isVideoReady) {
        const canvas = document.createElement('canvas');
        // Downscale for AI processing speed (max width 640)
        const scale = 640 / videoRef.current.videoWidth;
        const w = 640;
        const h = videoRef.current.videoHeight * scale;
        
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, w, h);
            return canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        }
      }
      return null;
    }
  }));

  if (error) {
    return (
      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-red-400 p-6 text-center border border-red-900 rounded-xl">
        <Icons.AlertCircle className="w-10 h-10 mb-3" />
        <p className="text-sm font-semibold mb-4">{error}</p>
        <div className="flex space-x-3">
            <button onClick={() => setSourceType('screen')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-600">
                Retry Screen Share
            </button>
            <button onClick={() => setSourceType('camera')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-600">
                Use Camera
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full group bg-black flex items-center justify-center overflow-hidden rounded-xl">
        <video 
            ref={videoRef} 
            playsInline 
            muted // Always mute output to prevent feedback loop
            className={`w-full h-full object-contain ${sourceType === 'camera' ? 'scale-x-[-1]' : ''}`} 
        />
        
        {/* REC Indicator */}
        {isRecording && (
            <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-600 px-3 py-1.5 rounded-full animate-pulse z-20 shadow-lg">
                <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                <span className="text-white text-xs font-bold tracking-wider">REC</span>
            </div>
        )}

        {/* Source Selector (Overlay) */}
        {!isRecording && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 backdrop-blur-[2px] transition-opacity p-4">
                <p className="text-slate-300 text-sm font-bold uppercase tracking-wider mb-6">Select Input Source</p>
                <div className="flex space-x-4">
                    <button 
                        onClick={() => setSourceType('screen')}
                        className={`flex flex-col items-center p-4 rounded-xl border-2 transition w-32 ${sourceType === 'screen' ? 'border-cyan-500 bg-cyan-500/20 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:border-white/30'}`}
                    >
                        <Icons.Monitor className="w-8 h-8 mb-3" />
                        <span className="text-xs font-bold">Screen Share</span>
                        <span className="text-[10px] opacity-60 mt-1 text-center">Zoom / Meet / Teams</span>
                    </button>

                    <button 
                        onClick={() => setSourceType('camera')}
                        className={`flex flex-col items-center p-4 rounded-xl border-2 transition w-32 ${sourceType === 'camera' ? 'border-cyan-500 bg-cyan-500/20 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:border-white/30'}`}
                    >
                        <Icons.Camera className="w-8 h-8 mb-3" />
                        <span className="text-xs font-bold">Camera</span>
                        <span className="text-[10px] opacity-60 mt-1 text-center">In-Person Interview</span>
                    </button>
                </div>
                <div className="mt-6 text-center max-w-xs">
                    <p className="text-[10px] text-slate-500">
                        {sourceType === 'screen' 
                            ? "Tip: Select the window where the candidate is visible. Audio will be captured from your system." 
                            : "Tip: Point the camera at the candidate."}
                    </p>
                </div>
            </div>
        )}
        
        {/* Loading Spinner */}
        {!isVideoReady && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black">
                <Icons.Loader2 className="w-10 h-10 animate-spin text-cyan-500 mb-4" />
                <p className="text-slate-400 text-xs">Initializing Media...</p>
            </div>
        )}
    </div>
  );
});

export default WebcamRecorder;