'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type InputCode = 'ArrowLeft' | 'ArrowRight' | 'Space';

const INPUT_EVENT_NAME = 'kiloman:input';

function dispatchInput(code: InputCode, pressed: boolean) {
  // Integration point: GameCanvas listens for this CustomEvent and mirrors it into its internal keysRef.
  window.dispatchEvent(new CustomEvent(INPUT_EVENT_NAME, { detail: { code, pressed } }));
}

function useIsTouchControlDevice() {
  const [isTouchy, setIsTouchy] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia?.('(pointer: coarse)');
    const noHover = window.matchMedia?.('(hover: none)');

    const compute = () => {
      const coarseMatch = coarse?.matches ?? false;
      const noHoverMatch = noHover?.matches ?? false;
      // Keep gating simple: only show on small-ish viewports AND touch-oriented pointers.
      const smallViewport = window.innerWidth <= 1024;
      setIsTouchy((coarseMatch || noHoverMatch) && smallViewport);
    };

    compute();

    const handleResize = () => compute();
    window.addEventListener('resize', handleResize);
    coarse?.addEventListener?.('change', compute);
    noHover?.addEventListener?.('change', compute);

    return () => {
      window.removeEventListener('resize', handleResize);
      coarse?.removeEventListener?.('change', compute);
      noHover?.removeEventListener?.('change', compute);
    };
  }, []);

  return isTouchy;
}

function usePointerHeldButton(code: InputCode) {
  const activePointersRef = useRef<Set<number>>(new Set());

  return useMemo(() => {
    const press = (pointerId: number) => {
      activePointersRef.current.add(pointerId);
      dispatchInput(code, true);
    };

    const release = (pointerId: number) => {
      activePointersRef.current.delete(pointerId);
      if (activePointersRef.current.size === 0) {
        dispatchInput(code, false);
      }
    };

    const releaseAll = () => {
      if (activePointersRef.current.size > 0) {
        activePointersRef.current.clear();
        dispatchInput(code, false);
      }
    };

    return { press, release, releaseAll };
  }, [code]);
}

interface TouchControlsProps {
  active: boolean;
}

const TouchControls: React.FC<TouchControlsProps> = ({ active }: TouchControlsProps) => {
  const isTouchDevice = useIsTouchControlDevice();
  const visible = active && isTouchDevice;

  const left = usePointerHeldButton('ArrowLeft');
  const right = usePointerHeldButton('ArrowRight');
  const jump = usePointerHeldButton('Space');

  // If controls are hidden (e.g., rotate device / resize), make sure any held inputs are released.
  useEffect(() => {
    if (!visible) {
      left.releaseAll();
      right.releaseAll();
      jump.releaseAll();
    }
  }, [visible, left, right, jump]);

  if (!visible) return null;

  return (
    <div
      className="kiloman-touch-controls pointer-events-none"
      aria-label="Touch controls"
      // Defensive: stop scrolling/zoom gestures while interacting with the control overlay.
      onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
    >
      {/* Movement (bottom-left) */}
      <div className="kiloman-touch-controls__cluster kiloman-touch-controls__cluster--left pointer-events-auto">
        <button
          type="button"
          className="kiloman-touch-button"
          aria-label="Move left"
          onPointerDown={(e: React.PointerEvent<HTMLButtonElement>) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Some browsers may throw if pointer capture isn't available; input still works.
            }
            left.press(e.pointerId);
          }}
          onPointerUp={(e: React.PointerEvent<HTMLButtonElement>) => left.release(e.pointerId)}
          onPointerCancel={(e: React.PointerEvent<HTMLButtonElement>) => left.release(e.pointerId)}
          onLostPointerCapture={(e: React.PointerEvent<HTMLButtonElement>) => left.release(e.pointerId)}
        >
          ◀
        </button>
        <button
          type="button"
          className="kiloman-touch-button"
          aria-label="Move right"
          onPointerDown={(e: React.PointerEvent<HTMLButtonElement>) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // See note above.
            }
            right.press(e.pointerId);
          }}
          onPointerUp={(e: React.PointerEvent<HTMLButtonElement>) => right.release(e.pointerId)}
          onPointerCancel={(e: React.PointerEvent<HTMLButtonElement>) => right.release(e.pointerId)}
          onLostPointerCapture={(e: React.PointerEvent<HTMLButtonElement>) => right.release(e.pointerId)}
        >
          ▶
        </button>
      </div>

      {/* Action (bottom-right) */}
      <div className="kiloman-touch-controls__cluster kiloman-touch-controls__cluster--right pointer-events-auto">
        <button
          type="button"
          className="kiloman-touch-button kiloman-touch-button--action"
          aria-label="Jump"
          onPointerDown={(e: React.PointerEvent<HTMLButtonElement>) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // See note above.
            }
            jump.press(e.pointerId);
          }}
          onPointerUp={(e: React.PointerEvent<HTMLButtonElement>) => jump.release(e.pointerId)}
          onPointerCancel={(e: React.PointerEvent<HTMLButtonElement>) => jump.release(e.pointerId)}
          onLostPointerCapture={(e: React.PointerEvent<HTMLButtonElement>) => jump.release(e.pointerId)}
        >
          JUMP
        </button>
      </div>
    </div>
  );
};

export default TouchControls;
