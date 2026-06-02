'use client';

import React, { useState, useEffect, useRef } from 'react';
import GameCanvas from './GameCanvas';
import UIOverlay from './UIOverlay';
import { GameStatus, LeaderboardEntry, PlayerProfile, ScoreState } from './types';

const MAX_LIVES = 3;
const LEADERBOARD_KEY = 'kiloman:leaderboard';

const GameContainer: React.FC = () => {
  const [gameState, setGameState] = useState<GameStatus>('start');
  const [score, setScore] = useState<ScoreState>({ current: 0, best: 0, distance: 0 });
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [livesRemaining, setLivesRemaining] = useState<number>(MAX_LIVES);
  const [turnBest, setTurnBest] = useState<ScoreState>({ current: 0, best: 0, distance: 0 });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [countdown, setCountdown] = useState<number>(3);
  const lastLossHandledRef = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(LEADERBOARD_KEY);
    if (!saved) return;

    try {
      setLeaderboard(JSON.parse(saved) as LeaderboardEntry[]);
    } catch {
      setLeaderboard([]);
    }
  }, []);

  useEffect(() => {
    if (gameState === 'countdown') {
      setCountdown(3);
      const ticks = [2, 1, 0];
      const timers = ticks.map((value, index) => window.setTimeout(() => {
        if (value === 0) {
          setGameState('playing');
        } else {
          setCountdown(value);
        }
      }, (index + 1) * 1000));

      return () => timers.forEach((timer) => window.clearTimeout(timer));
    }

    if (gameState === 'playing') {
      lastLossHandledRef.current = false;
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'lost' || lastLossHandledRef.current) return;

    lastLossHandledRef.current = true;
    setTurnBest((best) => score.current > best.current ? score : best);
    setLivesRemaining((lives) => Math.max(0, lives - 1));
  }, [gameState, score]);

  const saveLeaderboard = (entry: LeaderboardEntry) => {
    const nextLeaderboard = [...leaderboard, entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setLeaderboard(nextLeaderboard);
    window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(nextLeaderboard));
  };

  const startTurn = (profile: PlayerProfile) => {
    setPlayerProfile(profile);
    setLivesRemaining(MAX_LIVES);
    setTurnBest({ current: 0, best: 0, distance: 0 });
    setScore({ current: 0, best: 0, distance: 0 });
    setGameState('countdown');
  };

  const handleContinue = () => {
    if (livesRemaining > 0) {
      setGameState('countdown');
      return;
    }

    if (playerProfile) {
      saveLeaderboard({
        ...playerProfile,
        score: turnBest.current,
        distance: turnBest.distance,
        date: new Date().toISOString(),
      });
    }
    setGameState('start');
  };

  const handleNewTurn = () => {
    setGameState('start');
    setLivesRemaining(MAX_LIVES);
    setTurnBest({ current: 0, best: 0, distance: 0 });
    setScore({ current: 0, best: 0, distance: 0 });
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <GameCanvas
        gameState={gameState}
        setGameState={setGameState}
        onScoreChange={setScore}
      />
      <UIOverlay
        gameState={gameState}
        onStartTurn={startTurn}
        onContinue={handleContinue}
        onNewTurn={handleNewTurn}
        score={score}
        playerProfile={playerProfile}
        livesRemaining={livesRemaining}
        maxLives={MAX_LIVES}
        turnBest={turnBest}
        leaderboard={leaderboard}
        countdown={countdown}
      />
    </div>
  );
};

export default GameContainer;
