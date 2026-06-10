import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

const AVATARS = ['⚽', '🏆', '🦁', '🔥', '⚡', '🌟', '🎯', '🦅', '🐉', '🎪', '🚀', '💎'];

const POS_COLORS = {
  GK: '#f59e0b', RB: '#3b82f6', CB: '#3b82f6', LB: '#3b82f6',
  CDM: '#10b981', CM: '#10b981', CAM: '#10b981', RM: '#10b981', LM: '#10b981',
  RW: '#ef4444', LW: '#ef4444', ST: '#ef4444', CF: '#ef4444'
};

const POS_GROUP = {
  GK: 'GK', RB: 'DEF', CB: 'DEF', LB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', RM: 'MID', LM: 'MID',
  RW: 'ATT', LW: 'ATT', ST: 'ATT', CF: 'ATT'
};

const POS_ORDER = ['GK','RB','CB','LB','CDM','CM','CAM','RM','LM','RW','LW','ST','CF'];

function sortByPosition(team) {
  return [...team].sort((a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos));
}

function getChemistryHint(player, myTeam) {
  // Count how many from same source the player would add to
  const counts = {};
  myTeam.forEach(p => { counts[p.from] = (counts[p.from] || 0) + 1; });
  const src = player.from || null;
  if (!src) return false;
  // If adding this player would bring a source to exactly 3 → new chemistry bonus
  return counts[src] === 2;
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

function HomeScreen({ onCreateRoom, onJoinRoom, errorMsg }) {
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('⚽');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState(null);

  return (
    <div className="home-screen">
      <div className="home-hero">
        <div className="home-badge">MULTIPLAYER · SNAKE DRAFT</div>
        <h1 className="home-title">DREAM<br/>DRAFT</h1>
        <p className="home-subtitle">Draft legends turn by turn. Steal your friends' picks.<br/>Win the cup.</p>
      </div>

      <div className="home-form">
        {!mode && (
          <div className="mode-buttons">
            <button className="btn-primary" onClick={() => setMode('create')}>🏟️ Create Room</button>
            <button className="btn-secondary" onClick={() => setMode('join')}>🎟️ Join Room</button>
          </div>
        )}

        {mode && (
          <div className="form-card">
            <button className="back-btn" onClick={() => setMode(null)}>← Back</button>
            <h3>{mode === 'create' ? 'Create a Room' : 'Join a Room'}</h3>

            <label>Your Name</label>
            <input
              className="text-input"
              placeholder="Enter your name..."
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={16}
            />

            <label>Pick Your Avatar</label>
            <div className="avatar-grid">
              {AVATARS.map(a => (
                <button key={a} className={`avatar-btn ${avatar === a ? 'selected' : ''}`} onClick={() => setAvatar(a)}>{a}</button>
              ))}
            </div>

            {mode === 'join' && (
              <>
                <label>Room Code</label>
                <input
                  className="text-input code-input"
                  placeholder="XXXXXX"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </>
            )}

            {errorMsg && <div className="error-msg">{errorMsg}</div>}

            <button
              className="btn-primary"
              onClick={() => mode === 'create'
                ? onCreateRoom(username.trim(), avatar)
                : onJoinRoom(joinCode.trim().toUpperCase(), username.trim(), avatar)}
              disabled={!username.trim() || (mode === 'join' && joinCode.length !== 6)}
            >
              {mode === 'create' ? '🚀 Create & Enter Lobby' : '🎟️ Join Room'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LOBBY ────────────────────────────────────────────────────────────────────

function LobbyScreen({ room, myId, onStartDraft, errorMsg }) {
  const isHost = room.hostId === myId;
  const canStart = room.players.length >= 2;

  return (
    <div className="lobby-screen">
      <div className="room-code-display">
        <span className="room-code-label">ROOM CODE</span>
        <span className="room-code-value">{room.code}</span>
        <span className="room-code-hint">Share with friends — up to 8 players</span>
      </div>

      <div className="players-grid">
        <h3>Players ({room.players.length}/8)</h3>
        <div className="player-list">
          {room.players.map(p => (
            <div key={p.id} className={`player-card ${p.id === myId ? 'me' : ''}`}>
              <span className="player-avatar">{p.avatar}</span>
              <span className="player-name">{p.name}</span>
              {p.id === room.hostId && <span className="host-badge">HOST</span>}
              {p.id === myId && <span className="you-badge">YOU</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="rules-card">
        <h4>📋 How it works</h4>
        <ul>
          <li><strong>Snake draft:</strong> everyone sees the same 3 squads, picks rotate 1→8, then 8→1</li>
          <li><strong>30 seconds</strong> per pick — too slow and the best player is auto-picked</li>
          <li><strong>Squad rules:</strong> exactly 1 GK, at least 3 DEF, 2 MID, 1 ATT</li>
          <li><strong>Chemistry:</strong> 3+ players from the same squad = +2 team strength</li>
          <li>After drafting: choose your <strong>formation</strong>, then watch the live tournament</li>
        </ul>
      </div>

      {errorMsg && <div className="error-msg">{errorMsg}</div>}

      {isHost ? (
        <div className="lobby-actions">
          {!canStart && <p className="hint">Need at least 2 players to start</p>}
          <button className="btn-primary btn-large" onClick={onStartDraft} disabled={!canStart}>
            ⚡ Start Snake Draft
          </button>
        </div>
      ) : (
        <div className="waiting-msg"><div className="pulse-dot" />Waiting for host to start...</div>
      )}
    </div>
  );
}

// ─── DRAFT ────────────────────────────────────────────────────────────────────


// ─── RIVAL PANEL ─────────────────────────────────────────────────────────────
function RivalPanel({ player, isActive }) {
  const [open, setOpen] = React.useState(false);
  const sorted = sortByPosition(player.team || []);
  return (
    <div className={`rival-panel ${isActive ? 'active' : ''}`}>
      <div className="rival-header" onClick={() => setOpen(o => !o)}>
        <span>{player.avatar}</span>
        <span className="other-name">{player.name}</span>
        <div className="progress-track" style={{flex:1}}>
          <div className="progress-fill" style={{ width: `${(player.picked / 11) * 100}%` }} />
        </div>
        <span className="progress-count">{player.picked}/11</span>
        <span className="rival-toggle">{open ? '▲' : '▼'}</span>
      </div>
      {open && sorted.length > 0 && (
        <div className="rival-team">
          {sorted.map((p, i) => (
            <div key={i} className="rival-player">
              <span className="slot-pos" style={{ background: POS_COLORS[p.pos], fontSize:'9px', padding:'2px 5px', borderRadius:'3px', color:'#fff', minWidth:'32px', textAlign:'center' }}>{p.pos}</span>
              <span style={{flex:1, fontSize:'12px', color:'var(--white)'}}>{p.name}</span>
              <span style={{fontSize:'12px', color:'var(--gold)', fontWeight:700}}>{p.rating}</span>
            </div>
          ))}
        </div>
      )}
      {open && sorted.length === 0 && (
        <div className="rival-empty">No picks yet</div>
      )}
    </div>
  );
}

function Countdown({ deadline }) {
  const [left, setLeft] = useState(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => {
      setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 250);
    return () => clearInterval(t);
  }, [deadline]);

  return (
    <div className={`countdown ${left <= 10 ? 'urgent' : ''}`}>
      {left}s
    </div>
  );
}

function DraftScreen({ myId, turnState, progress, lastPick, takenPlayers }) {
  const isMyTurn = turnState?.activePlayerId === myId;
  const me = progress.find(p => p.id === myId);
  const myTeam = me?.team || [];
  const myReq = me?.requirements;

  const canPick = (pos) => {
    if (!myReq) return true;
    const group = POS_GROUP[pos];
    if (group === 'GK' && myTeam.some(p => POS_GROUP[p.pos] === 'GK')) return false;
    if (!myReq.mustFill) return true;
    return !!myReq.missing[group];
  };

  return (
    <div className="draft-screen">
      {/* Turn banner */}
      <div className={`turn-banner ${isMyTurn ? 'my-turn' : ''}`}>
        {turnState ? (
          <>
            <div className="turn-info">
              <span className="turn-avatar">{turnState.activePlayerAvatar}</span>
              <span className="turn-text">
                {isMyTurn ? "🔥 YOUR TURN — PICK NOW!" : `${turnState.activePlayerName} is picking...`}
              </span>
            </div>
            <Countdown deadline={turnState.deadline} />
          </>
        ) : (
          <span className="turn-text">Draft starting...</span>
        )}
      </div>

      {/* Last pick toast */}
      {lastPick && (
        <div className="last-pick-toast" key={lastPick.ts}>
          {lastPick.playerAvatar} <strong>{lastPick.playerName}</strong> picked{' '}
          <strong style={{ color: '#fbbf24' }}>{lastPick.pick.name}</strong> ({lastPick.pick.rating})
          {lastPick.wasAuto && <span className="auto-tag">AUTO</span>}
        </div>
      )}

      <div className="draft-body">
        {/* Left: my squad */}
        <div className="draft-left">
          <div className="squad-summary">
            <h3>Your Squad ({myTeam.length}/11)</h3>
            {me?.chemistry?.bonus > 0 && (
              <span className="chem-badge">🧪 +{me.chemistry.bonus} chemistry</span>
            )}
          </div>

          {myReq?.mustFill && (
            <div className="req-warning">
              ⚠️ Must fill: {Object.entries(myReq.missing).map(([g, n]) => `${n}× ${g}`).join(', ')}
            </div>
          )}

          <div className="team-slots">
            {sortByPosition(myTeam).map((player, i) => (
              <div key={i} className="team-slot filled">
                <span className="slot-pos" style={{ background: POS_COLORS[player.pos] }}>{player.pos}</span>
                <span className="slot-name">{player.name}</span>
                <span className="slot-rating">{player.rating}</span>
              </div>
            ))}
            {[...Array(11 - myTeam.length)].map((_, i) => (
              <div key={'empty-'+i} className="team-slot empty">
                <span className="slot-empty">#{myTeam.length + i + 1}</span>
              </div>
            ))}
          </div>

          {/* Other players' squads - collapsible */}
          <div className="others-progress">
            <h4>All Squads</h4>
            {progress.filter(p => p.id !== myId).map(p => (
              <RivalPanel key={p.id} player={p} isActive={p.id === turnState?.activePlayerId} />
            ))}
          </div>
        </div>

        {/* Right: options */}
        <div className="draft-right">
          {turnState?.options?.length > 0 ? (
            <div className="rolls-section">
              <h3>{isMyTurn ? '🎯 Pick One Player' : '👀 Squads on the Board'}</h3>
              {turnState.options.map(squad => (
                <div key={squad.key} className="squad-card">
                  <div className="squad-header">
                    <span className="squad-flag">{squad.flag}</span>
                    <span className="squad-name">{squad.country} {squad.year}</span>
                  </div>
                  <div className="squad-players">
                    {squad.players.map((player, idx) => {
                      const isTaken = player.taken || takenPlayers?.includes(squad.key + ':' + player.name);
                      const allowed = !isTaken && canPick(player.pos);
                      const chemHint = !isTaken && isMyTurn && getChemistryHint({...player, from: squad.country + ' ' + squad.year}, myTeam);
                      return (
                        <button
                          key={idx}
                          className={`pick-player-btn ${isTaken ? 'taken' : (!isMyTurn || !allowed ? 'disabled' : '')}`}
                          disabled={!isMyTurn || !allowed || isTaken}
                          onClick={() => window.__pickPlayer?.(squad.key, idx)}
                        >
                          <span className="pick-pos" style={{ background: POS_COLORS[player.pos] }}>{player.pos}</span>
                          <span className="pick-name">{player.name}</span>
                          {chemHint && <span className="chem-hint">🧪</span>}
                          <span className="pick-rating">{player.rating}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="waiting-msg"><div className="pulse-dot" />Rolling the dice...</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FORMATION ────────────────────────────────────────────────────────────────

function FormationScreen({ formations, mentalities, onChoose, onChooseMentality, chosen, mentalityChosen, myId, total }) {
  const myChoice = chosen.find(c => c.id === myId);
  const myMentality = mentalityChosen[myId] || 'balanced';

  return (
    <div className="formation-screen">
      <h2>⚙️ Taktik Seç</h2>
      <p className="formation-hint">Formasyon ve mentalite seç. 30 saniye sonra otomatik seçilir!</p>

      <div className="tactic-section-label">📐 Formasyon</div>
      <div className="formation-cards">
        {formations.map(f => (
          <button
            key={f.key}
            className={`formation-card ${myChoice?.formation === f.key ? 'selected' : ''}`}
            onClick={() => onChoose(f.key)}
          >
            <span className="formation-name">{f.key}</span>
            <span className="formation-label">{f.label.replace(f.key + ' ', '')}</span>
            <div className="formation-stats">
              <span>⚔️ ×{f.atk}</span>
              <span>🛡️ ×{f.def}</span>
            </div>
          </button>
        ))}
      </div>

      {mentalities && mentalities.length > 0 && (
        <>
          <div className="tactic-section-label" style={{marginTop:'20px'}}>🧠 Mentalite</div>
          <div className="formation-cards">
            {mentalities.map(m => (
              <button
                key={m.key}
                className={`formation-card ${myMentality === m.key ? 'selected' : ''}`}
                onClick={() => onChooseMentality(m.key)}
              >
                <span className="formation-name" style={{fontSize:'22px'}}>{m.label.split(' ')[0]}</span>
                <span className="formation-label">{m.label.split(' ').slice(1).join(' ')}</span>
                <div className="formation-stats">
                  <span>⚔️ ×{m.atkMod}</span>
                  <span>🛡️ ×{m.defMod}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="formation-status">
        {chosen.length}/{total} hazır
        {chosen.map(c => <span key={c.id} className="formation-chip">{c.avatar} {c.formation}</span>)}
      </div>
    </div>
  );
}

// ─── LIVE MATCH ───────────────────────────────────────────────────────────────


// ─── PITCH VIEW (FM style) ───────────────────────────────────────────────────

const FORMATION_POSITIONS = {
  '4-3-3': [
    { pos: 'GK', x: 8, y: 50 },
    { pos: 'RB', x: 22, y: 18 }, { pos: 'CB', x: 20, y: 35 }, { pos: 'CB', x: 20, y: 65 }, { pos: 'LB', x: 22, y: 82 },
    { pos: 'CM', x: 42, y: 28 }, { pos: 'CDM', x: 37, y: 50 }, { pos: 'CM', x: 42, y: 72 },
    { pos: 'RW', x: 66, y: 14 }, { pos: 'ST', x: 74, y: 50 }, { pos: 'LW', x: 66, y: 86 },
  ],
  '4-4-2': [
    { pos: 'GK', x: 8, y: 50 },
    { pos: 'RB', x: 22, y: 18 }, { pos: 'CB', x: 20, y: 36 }, { pos: 'CB', x: 20, y: 64 }, { pos: 'LB', x: 22, y: 82 },
    { pos: 'RM', x: 44, y: 16 }, { pos: 'CM', x: 42, y: 38 }, { pos: 'CM', x: 42, y: 62 }, { pos: 'LM', x: 44, y: 84 },
    { pos: 'ST', x: 70, y: 38 }, { pos: 'ST', x: 70, y: 62 },
  ],
  '5-3-2': [
    { pos: 'GK', x: 8, y: 50 },
    { pos: 'RB', x: 18, y: 10 }, { pos: 'CB', x: 20, y: 28 }, { pos: 'CB', x: 20, y: 50 }, { pos: 'CB', x: 20, y: 72 }, { pos: 'LB', x: 18, y: 90 },
    { pos: 'CM', x: 40, y: 28 }, { pos: 'CDM', x: 36, y: 50 }, { pos: 'CM', x: 40, y: 72 },
    { pos: 'ST', x: 68, y: 38 }, { pos: 'ST', x: 68, y: 62 },
  ],
  'default': [
    { pos: 'GK', x: 8, y: 50 },
    { pos: 'DEF', x: 20, y: 25 }, { pos: 'DEF', x: 20, y: 42 }, { pos: 'DEF', x: 20, y: 58 }, { pos: 'DEF', x: 20, y: 75 },
    { pos: 'MID', x: 40, y: 25 }, { pos: 'MID', x: 40, y: 50 }, { pos: 'MID', x: 40, y: 75 },
    { pos: 'ATT', x: 65, y: 25 }, { pos: 'ATT', x: 70, y: 50 }, { pos: 'ATT', x: 65, y: 75 },
  ],
};

const POS_DOT_COLOR = {
  GK: '#f59e0b', RB: '#3b82f6', CB: '#3b82f6', LB: '#3b82f6',
  CDM: '#10b981', CM: '#10b981', CAM: '#10b981', RM: '#10b981', LM: '#10b981',
  RW: '#ef4444', LW: '#ef4444', ST: '#ef4444', CF: '#ef4444',
  DEF: '#3b82f6', MID: '#10b981', ATT: '#ef4444',
};

function getPositions(formation) {
  return FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['default'];
}

// Map ballZone to x% on pitch for home(left→right) or away(right→left)
const BALL_X_BY_ZONE = [12, 32, 62, 82];
const BALL_Y_OPTIONS = [22, 35, 50, 65, 78];

function PitchView({ ballPos, homeTeam, awayTeam, homeName, awayName, homeAvatar, awayAvatar, homeFormation, awayFormation }) {
  const [smoothBall, setSmoothBall] = React.useState({ x: 50, y: 50 });
  const [prevBall, setPrevBall] = React.useState({ x: 50, y: 50 });
  const [animating, setAnimating] = React.useState(false);
  const [ballYSeed] = React.useState(Math.random());

  React.useEffect(() => {
    if (!ballPos) return;
    const rawX = BALL_X_BY_ZONE[ballPos.zone ?? 1];
    const bx = ballPos.side === 1 ? rawX : 100 - rawX;
    const by = BALL_Y_OPTIONS[Math.floor(ballYSeed * BALL_Y_OPTIONS.length)];
    setPrevBall(smoothBall);
    setAnimating(true);
    setSmoothBall({ x: bx, y: by });
    const t = setTimeout(() => setAnimating(false), 600);
    return () => clearTimeout(t);
  }, [ballPos?.side, ballPos?.zone]);

  const W = 320, H = 200;
  const toSVG = (xPct, yPct) => ({ x: xPct / 100 * W, y: yPct / 100 * H });

  const homePositions = getPositions(homeFormation || '4-4-2');
  const awayPositions = getPositions(awayFormation || '4-4-2').map(p => ({
    ...p, x: 100 - p.x, y: 100 - p.y  // mirror for away
  }));

  const ball = toSVG(smoothBall.x, smoothBall.y);
  const prevBallSVG = toSVG(prevBall.x, prevBall.y);

  // Which side has ball — highlight their attack third
  const attackZone = ballPos?.side === 1
    ? { x: W * 0.55, w: W * 0.45 }
    : { x: 0, w: W * 0.45 };
  const isAttacking = ballPos?.zone >= 2;

  return (
    <div className="pitch-container">
      <svg viewBox={`0 0 ${W} ${H}`} className="pitch-svg" xmlns="http://www.w3.org/2000/svg">
        {/* Grass base */}
        <defs>
          <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#grassGrad)" rx="6" />

        {/* Grass stripes */}
        {[0,1,2,3,4,5,6,7].map(i => (
          <rect key={i} x={i * W/8} width={W/16} height={H} fill="rgba(0,0,0,0.04)" />
        ))}

        {/* Attack zone highlight */}
        {isAttacking && (
          <rect x={attackZone.x} y={0} width={attackZone.w} height={H}
            fill="rgba(245,158,11,0.08)" />
        )}

        {/* Field lines */}
        <rect x="6" y="5" width={W-12} height={H-10} rx="3" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
        <line x1={W/2} y1="5" x2={W/2} y2={H-5} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        <circle cx={W/2} cy={H/2} r="26" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        <circle cx={W/2} cy={H/2} r="2" fill="rgba(255,255,255,0.5)" />
        {/* Penalty areas */}
        <rect x="6" y={H*0.22} width={W*0.14} height={H*0.56} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        <rect x={W-6-W*0.14} y={H*0.22} width={W*0.14} height={H*0.56} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        {/* Goal areas */}
        <rect x="6" y={H*0.36} width={W*0.055} height={H*0.28} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        <rect x={W-6-W*0.055} y={H*0.36} width={W*0.055} height={H*0.28} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        {/* Goals */}
        <rect x="2" y={H*0.38} width="4" height={H*0.24} fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="0.8" />
        <rect x={W-6} y={H*0.38} width="4" height={H*0.24} fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="0.8" />

        {/* Ball trail */}
        {animating && (
          <line x1={prevBallSVG.x} y1={prevBallSVG.y} x2={ball.x} y2={ball.y}
            stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="3,3" />
        )}

        {/* Away players (mirrored, blue-ish) */}
        {awayPositions.map((p, i) => {
          const sv = toSVG(p.x, p.y);
          const col = POS_DOT_COLOR[p.pos] || '#6b7280';
          const pl = awayTeam?.[i];
          return (
            <g key={'away'+i}>
              <circle cx={sv.x} cy={sv.y} r="8" fill="#1e3a8a" stroke="white" strokeWidth="1.2" opacity="0.9" />
              <circle cx={sv.x} cy={sv.y} r="8" fill="none" stroke={col} strokeWidth="1.5" opacity="0.7" />
              <text x={sv.x} y={sv.y+3.5} textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">
                {pl ? pl.name.split(' ').pop().slice(0,6) : p.pos}
              </text>
            </g>
          );
        })}

        {/* Home players (green-ish) */}
        {homePositions.map((p, i) => {
          const sv = toSVG(p.x, p.y);
          const col = POS_DOT_COLOR[p.pos] || '#6b7280';
          const pl = homeTeam?.[i];
          return (
            <g key={'home'+i}>
              <circle cx={sv.x} cy={sv.y} r="8" fill="#14532d" stroke="white" strokeWidth="1.2" opacity="0.9" />
              <circle cx={sv.x} cy={sv.y} r="8" fill="none" stroke={col} strokeWidth="1.5" opacity="0.7" />
              <text x={sv.x} y={sv.y+3.5} textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">
                {pl ? pl.name.split(' ').pop().slice(0,6) : p.pos}
              </text>
            </g>
          );
        })}

        {/* Ball */}
        <circle cx={ball.x} cy={ball.y} r="6" fill="white" stroke="#1a1a1a" strokeWidth="1.5"
          style={{transition: animating ? 'cx 0.5s ease, cy 0.5s ease' : 'none'}} />
        <circle cx={ball.x} cy={ball.y} r="2.5" fill="#555" />

        {/* Zone label */}
        <text x={ball.x} y={ball.y - 10} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.9)" fontWeight="bold">
          {['DEF','MID','ATK','BOX'][ballPos?.zone ?? 1]}
        </text>

        {/* Team name tags */}
        <rect x="8" y="6" width="42" height="12" rx="3" fill="rgba(20,83,45,0.8)" />
        <text x="29" y="15" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">{homeAvatar} {homeName?.slice(0,8)}</text>
        <rect x={W-50} y="6" width="42" height="12" rx="3" fill="rgba(30,58,138,0.8)" />
        <text x={W-29} y="15" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">{awayName?.slice(0,8)} {awayAvatar}</text>
      </svg>
    </div>
  );
}

function StatBar({ label, val1, val2, highlight }) {
  const total = (val1 || 0) + (val2 || 0) || 1;
  const pct1 = Math.round((val1 || 0) / total * 100);
  return (
    <div className="stat-bar-row">
      <span className="stat-bar-val">{val1 ?? 0}</span>
      <div className="stat-bar-track">
        <div className="stat-bar-fill home" style={{ width: pct1 + '%' }} />
      </div>
      <span className="stat-bar-label">{label}</span>
      <div className="stat-bar-track">
        <div className="stat-bar-fill away" style={{ width: (100 - pct1) + '%' }} />
      </div>
      <span className="stat-bar-val">{val2 ?? 0}</span>
    </div>
  );
}

const MENTALITY_OPTS = [
  { key: 'offensive', icon: '⚔️', label: 'Ofansif' },
  { key: 'balanced', icon: '⚖️', label: 'Dengeli' },
  { key: 'defensive', icon: '🛡️', label: 'Defansif' },
];

function LiveScreen({ liveMatch, events, teams, stageBanner, liveStats, matchStats, ballPos, myId, onChangeMentality }) {
  const [myMentality, setMyMentality] = React.useState('balanced');
  const [showStats, setShowStats] = React.useState(false);

  const handleMentality = (key) => {
    setMyMentality(key);
    onChangeMentality(key);
  };

  return (
    <div className="live-screen">
      {stageBanner && <div className="stage-banner">{stageBanner}</div>}

      {/* In-match mentality changer */}
      {(liveMatch || matchStats) && (
        <div className="live-mentality-bar">
          <span className="live-mentality-label">Mentalite:</span>
          {MENTALITY_OPTS.map(m => (
            <button
              key={m.key}
              className={`live-mentality-btn ${myMentality === m.key ? 'active' : ''}`}
              onClick={() => handleMentality(m.key)}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      )}

      {liveMatch ? (
        <div className="live-match-card">
          <div className="live-tag"><span className="live-dot" /> LIVE</div>
          <div className="live-scoreboard">
            <div className="live-team">
              <span className="live-avatar">{liveMatch.home.avatar}</span>
              <span className="live-name">{liveMatch.home.name}</span>
              {liveMatch.home.formation && <span className="live-formation">{liveMatch.home.formation}</span>}
            </div>
            <div className="live-score">
              {liveMatch.score.home} – {liveMatch.score.away}
            </div>
            <div className="live-team">
              {liveMatch.away.formation && <span className="live-formation">{liveMatch.away.formation}</span>}
              <span className="live-avatar">{liveMatch.away.avatar}</span>
              <span className="live-name">{liveMatch.away.name}</span>
            </div>
          </div>
          {liveMatch.stage && <div className="live-stage">{liveMatch.stage}</div>}

          <PitchView
            ballPos={ballPos}
            homeName={liveMatch.home.name}
            awayName={liveMatch.away.name}
            homeAvatar={liveMatch.home.avatar}
            awayAvatar={liveMatch.away.avatar}
            homeFormation={liveMatch.home.formation}
            awayFormation={liveMatch.away.formation}
          />

          {liveStats && (
            <div className="live-stats-inline">
              <StatBar label="Şut" val1={liveStats.shots[0]} val2={liveStats.shots[1]} />
              <StatBar label="Top %" val1={liveStats.possession[0]} val2={liveStats.possession[1]} />
            </div>
          )}
        </div>
      ) : matchStats ? (
        <div className="match-result-panel">
          <div className="match-result-score">
            <span>{matchStats.home.avatar} {matchStats.home.name}</span>
            <span className="match-result-num">{matchStats.home.goals} – {matchStats.away.goals}</span>
            <span>{matchStats.away.name} {matchStats.away.avatar}</span>
          </div>

          {/* Scorers */}
          {(matchStats.stats.scorers[0].length > 0 || matchStats.stats.scorers[1].length > 0) && (
            <div className="match-scorers-row">
              <div className="match-scorers-side">
                {matchStats.stats.scorers[0].map((g, i) => (
                  <span key={i} className="scorer-item">⚽ {g.name} {g.minute}' {g.assister ? <small>(ast: {g.assister})</small> : ''}</span>
                ))}
              </div>
              <div className="match-scorers-side right">
                {matchStats.stats.scorers[1].map((g, i) => (
                  <span key={i} className="scorer-item">⚽ {g.name} {g.minute}' {g.assister ? <small>(ast: {g.assister})</small> : ''}</span>
                ))}
              </div>
            </div>
          )}

          {/* Full stats */}
          <div className="match-fullstats">
            <StatBar label="Şut" val1={matchStats.stats.shots[0]} val2={matchStats.stats.shots[1]} />
            <StatBar label="İsabetli" val1={matchStats.stats.onTarget[0]} val2={matchStats.stats.onTarget[1]} />
            <StatBar label="Pas" val1={matchStats.stats.passes[0]} val2={matchStats.stats.passes[1]} />
            <StatBar label="Top %" val1={matchStats.stats.possession[0]} val2={matchStats.stats.possession[1]} />
            <StatBar label="🟨" val1={matchStats.stats.yellows[0].length} val2={matchStats.stats.yellows[1].length} />
            <StatBar label="🟥" val1={matchStats.stats.reds[0].length} val2={matchStats.stats.reds[1].length} />
          </div>

          {/* MOTM */}
          {matchStats.stats.motm && (
            <div className="motm-card">
              ⭐ <strong>Maçın Adamı:</strong> {matchStats.stats.motm.name}
              <span className="motm-stats">{matchStats.stats.motm.goals}G {matchStats.stats.motm.assists}A {matchStats.stats.motm.shots}Ş</span>
            </div>
          )}
        </div>
      ) : (
        <div className="live-match-card">
          <div className="sim-ball">⚽</div>
          <h3>Turnuva başlıyor...</h3>
          {teams && (
            <div className="strength-list">
              {teams.map(t => (
                <div key={t.id} className="strength-row">
                  <span>{t.avatar} {t.name}</span>
                  <span className="strength-meta">{t.formation} · 💪 {t.strength}{t.chemistry?.bonus > 0 ? ` · 🧪+${t.chemistry.bonus}` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="event-feed">
        {events.slice().reverse().map((e, i) => (
          <div key={events.length - i} className={`event-row ${e.type}`}>
            {e.type === 'goal' && (
              <><span className="event-minute">{e.minute}'</span> {e.text}
              {e.assister && <span className="event-assist"> (ast: {e.assister})</span>}
              <span className="event-score">{e.score}</span></>
            )}
            {e.type === 'miss' && <><span className="event-minute">{e.minute}'</span> {e.text}</>}
            {e.type === 'commentary' && <><span className="event-minute">{e.minute}'</span> {e.text}</>}
            {e.type === 'foul' && <><span className="event-minute">{e.minute}'</span> {e.text}</>}
            {e.type === 'kickoff' && <>🟢 KICKOFF — {e.text}</>}
            {e.type === 'fulltime' && <>🏁 FULL TIME — <strong>{e.text}</strong></>}
            {e.type === 'stage' && <span className="event-stage">{e.text}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RESULTS ──────────────────────────────────────────────────────────────────


function MatchDetailCard({ match: m }) {
  const [open, setOpen] = React.useState(true);
  const hasStats = m.stats;

  return (
    <div className="match-detail-card">
      <div className="match-row" style={{cursor: hasStats ? 'pointer' : 'default'}} onClick={() => hasStats && setOpen(o => !o)}>
        <span className={`match-team ${m.player1.goals > m.player2.goals ? 'winner' : ''}`}>
          {m.player1.avatar || ''} {m.player1.name}
        </span>
        <span className="match-score">{m.player1.goals} – {m.player2.goals}</span>
        <span className={`match-team right ${m.player2.goals > m.player1.goals ? 'winner' : ''}`}>
          {m.player2.name} {m.player2.avatar || ''}
        </span>
        {hasStats && <span className="expand-toggle">{open ? '▲' : '▼'}</span>}
      </div>

      {open && hasStats && (
        <div className="match-stats-detail">
          {/* Scorers row */}
          {(m.stats.scorers[0].length > 0 || m.stats.scorers[1].length > 0) && (
            <div className="match-scorers-row" style={{marginBottom:'10px'}}>
              <div className="match-scorers-side">
                {m.stats.scorers[0].map((g, i) => (
                  <span key={i} className="scorer-item">⚽ {g.name} {g.minute}'{g.assister ? <small style={{color:'var(--muted)'}}> (ast: {g.assister})</small> : ''}</span>
                ))}
              </div>
              <div className="match-scorers-side right">
                {m.stats.scorers[1].map((g, i) => (
                  <span key={i} className="scorer-item">⚽ {g.name} {g.minute}'{g.assister ? <small style={{color:'var(--muted)'}}> (ast: {g.assister})</small> : ''}</span>
                ))}
              </div>
            </div>
          )}

          {/* Stat bars */}
          <div style={{display:'flex', flexDirection:'column', gap:'6px', marginBottom:'10px'}}>
            <StatBar label="Şut" val1={m.stats.shots[0]} val2={m.stats.shots[1]} />
            {m.stats.onTarget && <StatBar label="İsabetli" val1={m.stats.onTarget[0]} val2={m.stats.onTarget[1]} />}
            {m.stats.passes && <StatBar label="Pas" val1={m.stats.passes[0]} val2={m.stats.passes[1]} />}
            {m.stats.possession && <StatBar label="Top %" val1={m.stats.possession[0]} val2={m.stats.possession[1]} />}
            <StatBar label="🟨" val1={m.stats.yellows[0].length} val2={m.stats.yellows[1].length} />
            {(m.stats.reds[0].length > 0 || m.stats.reds[1].length > 0) && (
              <StatBar label="🟥" val1={m.stats.reds[0].length} val2={m.stats.reds[1].length} />
            )}
          </div>

          {/* Cards */}
          {(m.stats.yellows[0].length > 0 || m.stats.yellows[1].length > 0 || m.stats.reds[0].length > 0 || m.stats.reds[1].length > 0) && (
            <div className="match-stats-row">
              <div className="match-stats-col">
                {m.stats.yellows[0].map((p, i) => <div key={i} className="stat-item">🟨 {p}</div>)}
                {m.stats.reds[0].map((p, i) => <div key={i} className="stat-item">🟥 {p}</div>)}
              </div>
              <div className="match-stats-center" />
              <div className="match-stats-col right">
                {m.stats.yellows[1].map((p, i) => <div key={i} className="stat-item">🟨 {p}</div>)}
                {m.stats.reds[1].map((p, i) => <div key={i} className="stat-item">🟥 {p}</div>)}
              </div>
            </div>
          )}

          {/* MOTM */}
          {m.stats.motm && (
            <div className="motm-card" style={{marginTop:'8px'}}>
              ⭐ <strong>Maçın Adamı:</strong> {m.stats.motm.name}
              <span className="motm-stats">{m.stats.motm.goals}G {m.stats.motm.assists}A {m.stats.motm.shots}Ş</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultsScreen({ standings, matches, knockout, championId, teams, room, myId, onPlayAgain }) {
  const [tab, setTab] = useState('standings');
  const champion = teams?.find(t => t.id === championId) || standings.find(s => s.id === championId);
  const myRank = standings.findIndex(s => s.id === myId) + 1;
  const myStanding = standings.find(s => s.id === myId);
  const isHost = room?.hostId === myId;

  return (
    <div className="results-screen">
      <div className="champion-banner">
        <span className="trophy">🏆</span>
        <div>
          <div className="champion-label">{knockout ? 'CUP WINNER' : 'CHAMPION'}</div>
          <div className="champion-name">{champion?.avatar} {champion?.name}</div>
        </div>
      </div>

      {myStanding && (
        <div className="my-result">
          You finished <strong>#{myRank}</strong> in the league · {myStanding.points} pts · 💪 {myStanding.strength}
          {championId === myId && ' · 🏆 AND WON THE CUP!'}
        </div>
      )}

      <div className="results-tabs">
        <button className={tab === 'standings' ? 'active' : ''} onClick={() => setTab('standings')}>📊 League</button>
        {knockout && <button className={tab === 'cup' ? 'active' : ''} onClick={() => setTab('cup')}>🏆 Cup</button>}
        <button className={tab === 'matches' ? 'active' : ''} onClick={() => setTab('matches')}>⚽ Matches</button>
        <button className={tab === 'teams' ? 'active' : ''} onClick={() => setTab('teams')}>👥 Squads</button>
      </div>

      {tab === 'standings' && (
        <div className="standings-table">
          <div className="table-header">
            <span>#</span><span>Player</span><span>W</span><span>D</span><span>L</span><span>GD</span><span>PTS</span>
          </div>
          {standings.map((s, i) => (
            <div key={s.id} className={`table-row ${s.id === myId ? 'me' : ''} ${s.id === championId ? 'champion' : ''}`}>
              <span className="rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
              <span className="player-col"><span>{s.avatar}</span> {s.name} <small className="formation-tag">{s.formation}</small></span>
              <span>{s.wins}</span><span>{s.draws}</span><span>{s.losses}</span>
              <span className={s.gd > 0 ? 'positive' : s.gd < 0 ? 'negative' : ''}>{s.gd > 0 ? '+' : ''}{s.gd}</span>
              <span className="pts">{s.points}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'cup' && knockout && (
        <div className="cup-bracket">
          <h4>Semifinals</h4>
          {knockout.semifinals.map((m, i) => (
            <div key={i} className="match-row">
              <span className={`match-team ${m.home.goals > m.away.goals ? 'winner' : ''}`}>{m.home.avatar} {m.home.name}</span>
              <span className="match-score">{m.home.goals} – {m.away.goals}</span>
              <span className={`match-team right ${m.away.goals > m.home.goals ? 'winner' : ''}`}>{m.away.name} {m.away.avatar}</span>
            </div>
          ))}
          <h4>🏆 Final</h4>
          <div className="match-row final">
            <span className={`match-team ${knockout.final.home.goals > knockout.final.away.goals ? 'winner' : ''}`}>
              {knockout.final.home.avatar} {knockout.final.home.name}
            </span>
            <span className="match-score">{knockout.final.home.goals} – {knockout.final.away.goals}</span>
            <span className={`match-team right ${knockout.final.away.goals > knockout.final.home.goals ? 'winner' : ''}`}>
              {knockout.final.away.name} {knockout.final.away.avatar}
            </span>
          </div>
        </div>
      )}

      {tab === 'matches' && (
        <div className="matches-list">
          {matches.map((m, i) => <MatchDetailCard key={i} match={m} />)}
        </div>
      )}

      {tab === 'teams' && teams && (
        <div className="teams-review">
          {teams.map(t => (
            <div key={t.id} className="team-review-card">
              <div className="team-review-header">
                <span>{t.avatar} <strong>{t.name}</strong></span>
                <span className="team-review-meta">{t.formation} · 💪 {t.strength}{t.chemistry?.bonus > 0 ? ` · 🧪+${t.chemistry.bonus}` : ''}</span>
              </div>
              <div className="team-review-players">
                {t.team.map((p, i) => (
                  <span key={i} className="mini-player">
                    <span className="mini-pos" style={{ background: POS_COLORS[p.pos] }}>{p.pos}</span>
                    {p.name} <small>{p.rating}</small>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isHost && (
        <button className="btn-primary btn-large play-again" onClick={onPlayAgain}>
          🔄 Play Again (same lobby)
        </button>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState('home');
  const [room, setRoom] = useState(null);
  const [myId, setMyId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [takenPlayers, setTakenPlayers] = useState([]);
  const [mentalities, setMentalities] = useState([]);
  const [mentalityChosen, setMentalityChosen] = useState({});

  // Draft state
  const [turnState, setTurnState] = useState(null);
  const [progress, setProgress] = useState([]);
  const [lastPick, setLastPick] = useState(null);

  // Formation state
  const [formations, setFormations] = useState([]);
  const [formationChosen, setFormationChosen] = useState([]);

  // Live state
  const [liveMatch, setLiveMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [simTeams, setSimTeams] = useState(null);
  const [stageBanner, setStageBanner] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [liveKickoff, setLiveKickoff] = useState(null);
  const [matchStats, setMatchStats] = useState(null);
  const [ballPos, setBallPos] = useState({ side: 1, zone: 1 });
  const [disconnected, setDisconnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  // Results state
  const [results, setResults] = useState(null);

  const socketRef = useRef(null);
  const roomRef = useRef(null);
  const myNameRef = useRef('');
  const myCodeRef = useRef('');
  roomRef.current = room;

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setMyId(socket.id));

    socket.on('room_created', ({ room }) => { setRoom(room); setScreen('lobby'); setErrorMsg(''); });
    socket.on('room_joined', ({ room }) => { setRoom(room); setScreen('lobby'); setErrorMsg(''); });
    socket.on('room_updated', (room) => setRoom(room));
    socket.on('player_left', ({ name, room: r, disconnected: dc }) => {
      if (r) setRoom(r);
      if (name) {
        setEvents(prev => [...prev, {
          type: 'commentary', minute: '', score: '',
          text: dc ? `⚠️ ${name} bağlantısı koptu ama maç devam ediyor.` : `👋 ${name} oyundan ayrıldı.`
        }]);
      }
    });
    socket.on('error_msg', ({ message }) => setErrorMsg(message));

    socket.on('draft_started', () => {
      setTurnState(null);
      setProgress([]);
      setLastPick(null);
      setScreen('draft');
    });

    socket.on('turn_started', (data) => {
      setTurnState(data);
      setProgress(data.progress);
      if (data.takenPlayers) setTakenPlayers(data.takenPlayers);
    });

    socket.on('pick_made', (data) => {
      setLastPick({ ...data, ts: Date.now() });
      setProgress(data.progress);
    });

    socket.on('formation_phase', ({ formations, mentalities, teams }) => {
      setFormations(formations);
      if (mentalities) setMentalities(mentalities);
      setFormationChosen([]);
      setMentalityChosen({});
      setProgress(teams);
      setScreen('formation');
    });

    socket.on('formation_update', ({ chosen }) => setFormationChosen(chosen));
    socket.on('mentality_update', ({ playerId, mentality }) => {
      setMentalityChosen(prev => ({ ...prev, [playerId]: mentality }));
    });

    socket.on('simulation_starting', ({ teams }) => {
      setSimTeams(teams);
      setLiveMatch(null);
      setEvents([]);
      setStageBanner(null);
      setScreen('live');
    });

    socket.on('match_kickoff', ({ home, away, stage }) => {
      setLiveMatch({ home, away, score: { home: 0, away: 0 }, stage });
      setLiveKickoff({ home, away });
      setLiveStats({ shots: [0,0], passes: [0,0], possession: [50,50] });
      setMatchStats(null);
      setBallPos({ side: 1, zone: 1 });
      setEvents(prev => [...prev, { type: 'kickoff', text: `${home.name} vs ${away.name}${stage ? ` (${stage})` : ''}` }]);
    });

    socket.on('match_event', ({ minute, type, scorer, assister, side, ballSide, ballZone, text, score, liveStats: ls, stage }) => {
      if (type === 'goal') {
        setLiveMatch(prev => prev ? { ...prev, score: score || prev.score } : prev);
      }
      if (ls) setLiveStats(ls);
      if (ballSide !== undefined) setBallPos({ side: ballSide, zone: ballZone ?? 1 });
      if (type !== 'pass' && type !== 'position') {
        setEvents(prev => [...prev, { type, minute, scorer, assister, side, text,
          score: score ? `${score.home}–${score.away}` : ''
        }]);
      } else if (type === 'position') {
        setEvents(prev => [...prev, { type: 'commentary', minute, side, text, score: '' }]);
      }
    });

    socket.on('match_fulltime', ({ home, away, stats, stage }) => {
      setEvents(prev => [...prev, {
        type: 'fulltime',
        text: `${home.name} ${home.goals} – ${away.goals} ${away.name}${stage ? ` (${stage})` : ''}`
      }]);
      if (stats) setMatchStats({ home, away, stats });
      setLiveMatch(null);
    });

    socket.on('knockout_starting', ({ semifinalists }) => {
      setStageBanner('🏆 KNOCKOUT STAGE — Top 4 advance!');
      setEvents(prev => [...prev, { type: 'stage', text: `SEMIFINALS: ${semifinalists.map(s => s.name).join(' · ')}` }]);
    });

    socket.on('final_starting', ({ finalists }) => {
      setStageBanner(`🏆 THE FINAL — ${finalists[0].name} vs ${finalists[1].name}`);
      setEvents(prev => [...prev, { type: 'stage', text: `FINAL: ${finalists[0].name} vs ${finalists[1].name}` }]);
    });

    socket.on('results_ready', (data) => {
      setResults(data);
      setScreen('results');
    });

    socket.on('back_to_lobby', ({ room }) => {
      setRoom(room);
      setResults(null);
      setScreen('lobby');
    });

    // ── Reconnect system ──────────────────────────────────────────
    socket.on('disconnect', () => {
      setDisconnected(true);
      setReconnecting(true);
      setTimeout(() => {
        const code = myCodeRef.current;
        const name = myNameRef.current;
        if (!code || !name) { setReconnecting(false); return; }
        socket.connect();
        socket.once('connect', () => {
          socket.emit('reconnect_room', { code, username: name });
        });
      }, 2000);
    });

    socket.on('reconnected', ({ code, myId: newId, room, state, myTeam, currentOptions }) => {
      setDisconnected(false);
      setReconnecting(false);
      setMyId(newId);
      setRoom(room);
      roomRef.current = { code, room };
      if (state === 'drafting') {
        setMyTeam(myTeam || []);
        if (currentOptions) setSquadOptions(currentOptions);
        setScreen('draft');
      } else if (state === 'simulating') {
        setScreen('live');
      } else if (state === 'results') {
        setScreen('results');
      } else {
        setScreen('lobby');
      }
    });

    socket.on('player_disconnected', ({ name, playerId }) => {
      if (playerId !== socket.id) {
        setEvents(prev => [...prev, { type: 'commentary', minute: '', text: `⚠️ ${name} bağlantısı koptu, yeniden bağlanmayı deniyor...`, score: '' }]);
      }
    });

    socket.on('player_reconnected', ({ name }) => {
      setEvents(prev => [...prev, { type: 'commentary', minute: '', text: `✅ ${name} geri bağlandı!`, score: '' }]);
    });

    return () => socket.disconnect();
  }, []);

  // Expose pick handler for draft buttons
  useEffect(() => {
    window.__pickPlayer = (squadKey, playerIndex) => {
      socketRef.current?.emit('pick_player', { code: roomRef.current?.code, squadKey, playerIndex });
    };
    return () => { delete window.__pickPlayer; };
  }, []);

  const handleCreateRoom = useCallback((username, avatar) => {
    socketRef.current?.emit('create_room', { username, avatar });
  }, []);

  const handleJoinRoom = useCallback((code, username, avatar) => {
    socketRef.current?.emit('join_room', { code, username, avatar });
  }, []);

  const handleStartDraft = useCallback(() => {
    socketRef.current?.emit('start_draft', { code: roomRef.current?.code });
  }, []);

  const handleChooseFormation = useCallback((formation) => {
    socketRef.current?.emit('choose_formation', { code: roomRef.current?.code, formation });
  }, []);

  const handleChooseMentality = useCallback((mentality) => {
    socketRef.current?.emit('choose_mentality', { code: roomRef.current?.code, mentality });
  }, []);

  const handleChangeMentalityLive = useCallback((mentality) => {
    socketRef.current?.emit('change_mentality_live', { code: roomRef.current?.code, mentality });
  }, []);

  const handlePlayAgain = useCallback(() => {
    socketRef.current?.emit('play_again', { code: roomRef.current?.code });
  }, []);

  if (disconnected || reconnecting) {
    return (
      <div className="app">
        <div className="reconnect-overlay">
          <div className="reconnect-card">
            <div className="reconnect-spinner">⚽</div>
            <h3>Bağlantı koptu</h3>
            <p>{reconnecting ? 'Yeniden bağlanılıyor...' : 'Bağlantı kesildi.'}</p>
            {!reconnecting && (
              <button className="btn-primary" onClick={() => {
                setReconnecting(true);
                const code = myCodeRef.current;
                const name = myNameRef.current;
                if (code && name) {
                  socketRef.current?.emit('reconnect_room', { code, username: name });
                }
              }}>Tekrar Dene</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {screen === 'home' && (
        <HomeScreen onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} errorMsg={errorMsg} />
      )}
      {screen === 'lobby' && room && (
        <LobbyScreen room={room} myId={myId} onStartDraft={handleStartDraft} errorMsg={errorMsg} />
      )}
      {screen === 'draft' && (
        <DraftScreen
          myId={myId}
          turnState={turnState}
          progress={progress}
          lastPick={lastPick}
          takenPlayers={takenPlayers}
        />
      )}
      {screen === 'formation' && (
        <FormationScreen
          formations={formations}
          mentalities={mentalities}
          onChoose={handleChooseFormation}
          onChooseMentality={handleChooseMentality}
          chosen={formationChosen}
          mentalityChosen={mentalityChosen}
          myId={myId}
          total={room?.players?.length || 0}
        />
      )}
      {screen === 'live' && (
        <LiveScreen
          liveMatch={liveMatch}
          events={events}
          teams={simTeams}
          stageBanner={stageBanner}
          liveStats={liveStats}
          matchStats={matchStats}
          ballPos={ballPos}
          myId={myId}
          onChangeMentality={handleChangeMentalityLive}
        />
      )}
      {screen === 'results' && results && (
        <ResultsScreen
          {...results}
          room={room}
          myId={myId}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
