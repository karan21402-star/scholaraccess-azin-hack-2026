import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

type CameraState = "off" | "loading" | "ready" | "unsupported" | "error";
type PointerPosition = { x: number; y: number } | null;

const wasmPath = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const modelPath = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export function useFacePointer(videoRef: RefObject<HTMLVideoElement | null>) {
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<CameraState>("off");
  const [pointer, setPointer] = useState<PointerPosition>(null);
  const calibration = useRef<{ x: number; y: number } | null>(null);
  const recalibratePending = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let animationFrame = 0;
    let lastFrame = 0;
    let stream: MediaStream | null = null;
    let landmarker: FaceLandmarker | null = null;
    setState("loading");

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setState("unsupported");
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) throw new Error("Camera preview is not available.");
        video.srcObject = stream;
        await video.play();

        const files = await FilesetResolver.forVisionTasks(wasmPath);
        if (cancelled) return;
        landmarker = await FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: modelPath },
          runningMode: "VIDEO",
          numFaces: 1
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        setState("ready");

        const detect = (time: number) => {
          if (cancelled || !landmarker || !video.videoWidth) {
            animationFrame = requestAnimationFrame(detect);
            return;
          }
          if (time - lastFrame > 55) {
            lastFrame = time;
            const face = landmarker.detectForVideo(video, time).faceLandmarks[0];
            const nose = face?.[1];
            if (nose) {
              if (!calibration.current || recalibratePending.current) {
                calibration.current = { x: nose.x, y: nose.y };
                recalibratePending.current = false;
              }
              const anchor = calibration.current;
              const clamp = (value: number) => Math.min(97, Math.max(3, value));
              setPointer({
                x: clamp(50 + (anchor.x - nose.x) * 250),
                y: clamp(50 + (nose.y - anchor.y) * 250)
              });
            } else {
              setPointer(null);
            }
          }
          animationFrame = requestAnimationFrame(detect);
        };
        animationFrame = requestAnimationFrame(detect);
      } catch (error) {
        if (!cancelled) {
          console.error("Experimental face pointer could not start:", error);
          setState("error");
          setPointer(null);
        }
      }
    };

    void start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      landmarker?.close();
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setPointer(null);
    };
  }, [enabled, videoRef]);

  const enable = useCallback(() => {
    calibration.current = null;
    setEnabled(true);
  }, []);
  const disable = useCallback(() => {
    setEnabled(false);
    setState("off");
    setPointer(null);
  }, []);
  const recalibrate = useCallback(() => {
    recalibratePending.current = true;
    setPointer(null);
  }, []);

  return { enabled, state, pointer, enable, disable, recalibrate };
}
