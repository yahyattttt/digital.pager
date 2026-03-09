import { useState, useEffect, useRef, useCallback } from "react";

export function useWakeLock(autoAcquire: boolean = true) {
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isSupported = "wakeLock" in navigator;

  const requestWakeLock = useCallback(async () => {
    if (!isSupported) return;
    if (wakeLockRef.current) return;
    try {
      const lock = await navigator.wakeLock.request("screen");
      wakeLockRef.current = lock;
      setIsActive(true);
      lock.addEventListener("release", () => {
        wakeLockRef.current = null;
        setIsActive(false);
      });
    } catch (err) {
      console.warn("Wake Lock request failed:", err);
      setIsActive(false);
    }
  }, [isSupported]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
      setIsActive(false);
    }
  }, []);

  useEffect(() => {
    if (autoAcquire) {
      requestWakeLock();
    }

    function handleVisibilityChange() {
      if (autoAcquire && document.visibilityState === "visible" && !wakeLockRef.current) {
        requestWakeLock();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [requestWakeLock, autoAcquire]);

  return { isActive, isSupported, requestWakeLock, releaseWakeLock };
}
