'use client';

import React, { useState, useEffect, useRef } from 'react';
import GameCanvas from './GameCanvas';
import UIOverlay from './UIOverlay';
import { GameStatus, LeaderboardEntry, PlayerProfile, ScoreState } from './types';

const MAX_LIVES = 3;

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
    refreshLeaderboard();
  }, []);

  const refreshLeaderboard = async () => {
    const response = await fetch('/api/scores');
    if (!response.ok) return;

    const body = await response.json() as { scores?: LeaderboardEntry[] };
    setLeaderboard(body.scores ?? []);
  };

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

  const saveLeaderboard = async (entry: Omit<LeaderboardEntry, 'id' | 'date'>) => {
    const response = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!response.ok) return;

    const body = await response.json() as { scores?: LeaderboardEntry[] };
    setLeaderboard(body.scores ?? []);
  };

  const deleteLeaderboardScore = async (id: string, adminSecret: string) => {
    const response = await fetch(`/api/scores/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-secret': adminSecret },
    });
    if (!response.ok) return false;

    const body = await response.json() as { scores?: LeaderboardEntry[] };
    setLeaderboard(body.scores ?? []);
    return true;
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
      void saveLeaderboard({
        ...playerProfile,
        score: turnBest.current,
        distance: turnBest.distance,
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
        onDeleteScore={deleteLeaderboardScore}
      />
    </div>
  );
};

export default GameContainer;
