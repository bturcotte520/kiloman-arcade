import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameStatus, LeaderboardEntry, PlayerProfile, ScoreState } from './types';
import TouchControls from './TouchControls';

const MENU_EVENT_NAME = 'kiloman:menu-action';
const MENU_NAV_EVENT_NAME = 'kiloman:menu-nav';
const INITIAL_CHOICES = [' ', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
const INITIAL_SLOT_COUNT = 5;
const DEATH_ACTION_DELAY_MS = 900;
const VEGAS_BULB_COUNT = 40;

interface UIOverlayProps {
  gameState: GameStatus;
  onStartTurn: (profile: PlayerProfile) => void;
  onContinue: () => void;
  onNewTurn: () => void;
  score: ScoreState;
  playerProfile: PlayerProfile | null;
  livesRemaining: number;
  maxLives: number;
  turnBest: ScoreState;
  leaderboard: LeaderboardEntry[];
  countdown: number;
  onDeleteScore: (id: string, adminSecret: string) => Promise<boolean>;
}

function nextLetter(letter: string, delta: number) {
  const index = INITIAL_CHOICES.indexOf(letter);
  return INITIAL_CHOICES[(index + delta + INITIAL_CHOICES.length) % INITIAL_CHOICES.length];
}

function isTextInputTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

interface VegasBulbRingProps {
  reverse?: boolean;
  startOffset?: number;
}

const VegasBulbRing: React.FC<VegasBulbRingProps> = ({ reverse = false, startOffset = 0 }) => (
  <div className="vegas-bulb-ring" aria-hidden="true">
    {Array.from({ length: VEGAS_BULB_COUNT }, (_, index) => {
      const progress = index / VEGAS_BULB_COUNT;
      const chaseIndex = reverse
        ? (VEGAS_BULB_COUNT - index + startOffset) % VEGAS_BULB_COUNT
        : (index + startOffset) % VEGAS_BULB_COUNT;
      let style: React.CSSProperties;

      if (progress < 0.25) {
        style = { left: `${progress * 4 * 100}%`, top: '0%' };
      } else if (progress < 0.5) {
        style = { left: '100%', top: `${(progress - 0.25) * 4 * 100}%` };
      } else if (progress < 0.75) {
        style = { left: `${(1 - (progress - 0.5) * 4) * 100}%`, top: '100%' };
      } else {
        style = { left: '0%', top: `${(1 - (progress - 0.75) * 4) * 100}%` };
      }

      return <span key={index} className="vegas-bulb" style={{ ...style, '--bulb-index': chaseIndex } as React.CSSProperties} />;
    })}
  </div>
);

const UIOverlay: React.FC<UIOverlayProps> = ({
  gameState,
  onStartTurn,
  onContinue,
  onNewTurn,
  score,
  playerProfile,
  livesRemaining,
  maxLives,
  turnBest,
  leaderboard,
  countdown,
  onDeleteScore,
}) => {
  const [initials, setInitials] = useState(['A', 'A', ' ', ' ', ' ']);
  const [selectedInitial, setSelectedInitial] = useState(0);
  const [deathActionReady, setDeathActionReady] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [adminSecret, setAdminSecret] = useState('');
  const [adminError, setAdminError] = useState('');
  const [controlExplainer, setControlExplainer] = useState<'joystick' | 'keyboard'>('joystick');
  const primaryActionRef = useRef<(() => void) | null>(null);
  const initialsRef = useRef(initials);
  const selectedInitialRef = useRef(selectedInitial);

  const hasLivesAfterDeath = gameState === 'lost' && livesRemaining > 0;
  const turnOver = gameState === 'lost' && livesRemaining === 0;
  const enteredInitials = initials.join('').trim();
  const canStart = enteredInitials.length >= 2;

  useEffect(() => {
    initialsRef.current = initials;
  }, [initials]);

  useEffect(() => {
    selectedInitialRef.current = selectedInitial;
  }, [selectedInitial]);

  const startTurn = useCallback(() => {
    if (!canStart) return;
    onStartTurn({ initials: enteredInitials });
  }, [canStart, enteredInitials, onStartTurn]);

  const deleteScore = async (id: string) => {
    setAdminError('');
    const deleted = await onDeleteScore(id, adminSecret);
    if (!deleted) {
      setAdminError('BAD ADMIN CODE');
    }
  };

  useEffect(() => {
    if (gameState === 'start') {
      setSelectedInitial(0);
      setInitials(['A', 'A', ' ', ' ', ' ']);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'lost') {
      setDeathActionReady(true);
      return;
    }

    setDeathActionReady(false);
    const timeoutId = window.setTimeout(() => setDeathActionReady(true), DEATH_ACTION_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'start') {
      primaryActionRef.current = startTurn;
    } else if (gameState === 'lost') {
      primaryActionRef.current = deathActionReady ? onContinue : null;
    } else if (gameState === 'won') {
      primaryActionRef.current = onNewTurn;
    } else {
      primaryActionRef.current = null;
    }
  }, [deathActionReady, gameState, onContinue, onNewTurn, startTurn]);

  useEffect(() => {
    const handleMenuAction = () => primaryActionRef.current?.();
    const handleMenuNav = (event: Event) => {
      if (gameState !== 'start') return;

      const direction = (event as CustomEvent<{ direction: string }>).detail?.direction;
      if (direction === 'left') {
        setSelectedInitial((value) => Math.max(0, value - 1));
      } else if (direction === 'right') {
        setSelectedInitial((value) => Math.min(INITIAL_SLOT_COUNT - 1, value + 1));
      } else if (direction === 'up' || direction === 'down') {
        const delta = direction === 'up' ? 1 : -1;
        const index = selectedInitialRef.current;
        setInitials((value) => value.map((letter, i) => i === index ? nextLetter(letter, delta) : letter));
      }
    };

    const handleInitialKeyDown = (event: KeyboardEvent) => {
      if (gameState !== 'start') return;
      if (isTextInputTarget(event.target)) return;

      if (/^[a-z]$/i.test(event.key)) {
        event.preventDefault();
        const index = selectedInitialRef.current;
        setInitials((value) => value.map((letter, i) => i === index ? event.key.toUpperCase() : letter));
        setSelectedInitial((value) => Math.min(INITIAL_SLOT_COUNT - 1, value + 1));
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        const index = selectedInitialRef.current;
        setInitials((value) => value.map((letter, i) => i === index ? ' ' : letter));
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedInitial((value) => Math.max(0, value - 1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedInitial((value) => Math.min(INITIAL_SLOT_COUNT - 1, value + 1));
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const delta = event.key === 'ArrowUp' ? 1 : -1;
        const index = selectedInitialRef.current;
        setInitials((value) => value.map((letter, i) => i === index ? nextLetter(letter, delta) : letter));
      }
    };

    window.addEventListener(MENU_EVENT_NAME, handleMenuAction);
    window.addEventListener(MENU_NAV_EVENT_NAME, handleMenuNav as EventListener);
    window.addEventListener('keydown', handleInitialKeyDown);
    return () => {
      window.removeEventListener(MENU_EVENT_NAME, handleMenuAction);
      window.removeEventListener(MENU_NAV_EVENT_NAME, handleMenuNav as EventListener);
      window.removeEventListener('keydown', handleInitialKeyDown);
    };
  }, [gameState]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 arcade-root">
      <div className="flex justify-between items-start pointer-events-auto gap-4">
        <div className="arcade-panel p-5 text-yellow-300 min-w-72">
          <h1 className="arcade-title text-3xl mb-3">KILO MAN</h1>
          <div className="arcade-stat-grid">
            <p>PLAYER {playerProfile?.initials ?? '---'}</p>
            <p>LIVES {'♥'.repeat(livesRemaining)}{'♡'.repeat(maxLives - livesRemaining)}</p>
            <p>SCORE {score.current.toLocaleString()}</p>
            <p>BEST {Math.max(turnBest.current, score.current).toLocaleString()}</p>
            <p>DIST {score.distance.toLocaleString()}M</p>
          </div>
        </div>

        <div className="arcade-panel p-5 text-yellow-300 text-right hidden sm:block">
          <p className="arcade-help">MOVE: STICK / D-PAD</p>
          <p className="arcade-help">JUMP / SELECT: BUTTON</p>
          <p className="arcade-help">KEYBOARD: ARROWS + SPACE</p>
        </div>
      </div>

      {gameState === 'lost' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 pointer-events-auto kiloman-death-screen-shake">
          <div className="arcade-panel arcade-menu text-center max-w-3xl w-full mx-4 p-8">
            <Image src="/kman2.png" alt="Kilo Man defeated" width={280} height={280} className="kiloman-death-image mx-auto mb-5 max-h-56 object-contain" />
            <h2 className="arcade-title text-6xl text-red-500 mb-5">
              {turnOver ? 'TURN OVER' : 'LIFE LOST'}
            </h2>
            <div className="arcade-score-card mb-6">
              <div className="text-7xl text-yellow-300">{score.current.toLocaleString()}</div>
              <div className="text-2xl text-yellow-100">RUN SCORE</div>
            </div>
            <p className="arcade-copy mb-6">
              LIVES LEFT {livesRemaining} • BEST RUN {Math.max(turnBest.current, score.current).toLocaleString()}
            </p>
            <button onClick={onContinue} disabled={!deathActionReady} className="arcade-button disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none">
              {hasLivesAfterDeath ? 'NEXT LIFE' : 'SAVE SCORE'}
            </button>
            <p className="arcade-help mt-5">{deathActionReady ? 'PRESS A' : 'GET READY...'}</p>
          </div>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/65 pointer-events-auto">
          <div className="arcade-panel arcade-countdown-panel text-center p-10">
            <p className="arcade-copy text-3xl mb-4">GET READY</p>
            <div className="arcade-countdown-number" key={countdown}>{countdown}</div>
          </div>
        </div>
      )}

      {gameState === 'start' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 pointer-events-auto overflow-y-auto py-8">
          <div className="max-w-6xl w-full mx-4">
            <div className="vegas-title-wrap mb-7 text-center">
              <h1 className="vegas-title-main">KILO MAN</h1>
              <div className="vegas-title-script">in Vegas</div>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
              <div className="vegas-bulb-frame">
                <VegasBulbRing startOffset={VEGAS_BULB_COUNT / 4} />
                <div className="arcade-panel arcade-menu p-8 text-center h-full">
                  <p className="arcade-copy text-2xl mb-8">ENTER 2-5 INITIALS</p>

                  <div className="flex justify-center gap-4 md:gap-7 mb-8" aria-label="Initial selector">
                    {initials.map((letter, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedInitial(index)}
                        className={`arcade-initial ${selectedInitial === index ? 'arcade-initial--active' : ''}`}
                        aria-label={`Initial ${index + 1}`}
                      >
                        {letter === ' ' ? '_' : letter}
                      </button>
                    ))}
                  </div>

                  <div className="arcade-instructions mb-8">
                    <div className="arcade-control-toggle-row mb-3">
                      <span>Controls:</span>
                      <button
                        type="button"
                        onClick={() => setControlExplainer('joystick')}
                        className={`arcade-control-toggle ${controlExplainer === 'joystick' ? 'arcade-control-toggle--active' : ''}`}
                        aria-label="Show joystick controls"
                      >
                        🕹
                      </button>
                      <button
                        type="button"
                        onClick={() => setControlExplainer('keyboard')}
                        className={`arcade-control-toggle ${controlExplainer === 'keyboard' ? 'arcade-control-toggle--active' : ''}`}
                        aria-label="Show keyboard controls"
                      >
                        ⌨
                      </button>
                    </div>
                    {controlExplainer === 'joystick' ? (
                      <>
                        <p>Jump / Accept: Red Button</p>
                        <p>Move: Joystick</p>
                      </>
                    ) : (
                      <>
                        <p>Type Letters: Change Initial</p>
                        <p>Arrows: Move / Cycle</p>
                        <p>Space: Start / Jump</p>
                      </>
                    )}
                  </div>

                  <button onClick={startTurn} disabled={!canStart} className="arcade-button text-3xl disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none">
                    START GAME
                  </button>
                </div>
              </div>

              <div className="vegas-bulb-frame">
                <VegasBulbRing reverse startOffset={VEGAS_BULB_COUNT / 2} />
                <div className="arcade-panel p-6 text-yellow-300 h-full">
                  <h2 className="arcade-title text-4xl mb-5 text-center">TOP SCORES</h2>
                  <div className="mb-5 flex flex-col gap-3">
                    <button type="button" onClick={() => setAdminMode((value) => !value)} className="arcade-admin-button">
                      {adminMode ? 'CLOSE ADMIN' : 'ADMIN'}
                    </button>
                    {adminMode && (
                      <input
                        value={adminSecret}
                        onChange={(event) => setAdminSecret(event.target.value)}
                        type="password"
                        placeholder="ADMIN CODE"
                        className="arcade-admin-input"
                      />
                    )}
                    {adminError && <p className="arcade-help text-center text-red-300">{adminError}</p>}
                  </div>
                  {leaderboard.length === 0 ? (
                    <p className="arcade-copy text-center">NO SCORES YET</p>
                  ) : (
                    <ol className="space-y-3">
                      {leaderboard.map((entry, index) => (
                        <li key={`${entry.initials}-${entry.date}`} className="arcade-leader-row">
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <span>{entry.initials}</span>
                          <span>{entry.score.toLocaleString()}</span>
                          {adminMode && (
                            <button type="button" onClick={() => void deleteScore(entry.id)} className="arcade-delete-button">
                              DEL
                            </button>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'won' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 pointer-events-auto">
          <div className="arcade-panel arcade-menu p-8 text-center max-w-xl">
            <h2 className="arcade-title text-6xl mb-6 text-yellow-300">MISSION COMPLETE</h2>
            <p className="arcade-copy mb-8">OBJECTIVE SECURED</p>
            <button onClick={onNewTurn} className="arcade-button">NEW GAME</button>
            <p className="arcade-help mt-5">PRESS A</p>
          </div>
        </div>
      )}

      <TouchControls active={gameState === 'playing'} />
    </div>
  );
};

export default UIOverlay;
