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

function FormationScreen({ formations, onChoose, chosen, myId, total }) {
  const myChoice = chosen.find(c => c.id === myId);

  return (
    <div className="formation-screen">
      <h2>⚙️ Choose Your Formation</h2>
      <p className="formation-hint">Attack boosts goals, defense reduces conceding. 25 seconds to decide!</p>

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
              <span>⚔️ ATK ×{f.atk}</span>
              <span>🛡️ DEF ×{f.def}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="formation-status">
        {chosen.length}/{total} players ready
        {chosen.map(c => <span key={c.id} className="formation-chip">{c.avatar} {c.formation}</span>)}
      </div>
    </div>
  );
}

// ─── LIVE MATCH ───────────────────────────────────────────────────────────────

function LiveScreen({ liveMatch, events, teams, stageBanner }) {
  return (
    <div className="live-screen">
      {stageBanner && <div className="stage-banner">{stageBanner}</div>}

      {liveMatch ? (
        <div className="live-match-card">
          <div className="live-tag"><span className="live-dot" /> LIVE</div>
          <div className="live-scoreboard">
            <div className="live-team">
              <span className="live-avatar">{liveMatch.home.avatar}</span>
              <span className="live-name">{liveMatch.home.name}</span>
            </div>
            <div className="live-score">
              {liveMatch.score.home} – {liveMatch.score.away}
            </div>
            <div className="live-team">
              <span className="live-avatar">{liveMatch.away.avatar}</span>
              <span className="live-name">{liveMatch.away.name}</span>
            </div>
          </div>
          {liveMatch.stage && <div className="live-stage">{liveMatch.stage}</div>}
        </div>
      ) : (
        <div className="live-match-card">
          <div className="sim-ball">⚽</div>
          <h3>Tournament kicking off...</h3>
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
              <><span className="event-minute">{e.minute}'</span> {e.text} <span className="event-score">{e.score}</span></>
            )}
            {e.type === 'miss' && (
              <><span className="event-minute">{e.minute}'</span> {e.text}</>
            )}
            {e.type === 'commentary' && (
              <><span className="event-minute">{e.minute}'</span> {e.text}</>
            )}
            {e.type === 'foul' && (
              <><span className="event-minute">{e.minute}'</span> {e.text}</>
            )}
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
          {matches.map((m, i) => (
            <div key={i} className="match-row">
              <span className={`match-team ${m.player1.goals > m.player2.goals ? 'winner' : ''}`}>{m.player1.name}</span>
              <span className="match-score">{m.player1.goals} – {m.player2.goals}</span>
              <span className={`match-team right ${m.player2.goals > m.player1.goals ? 'winner' : ''}`}>{m.player2.name}</span>
            </div>
          ))}
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

  // Results state
  const [results, setResults] = useState(null);

  const socketRef = useRef(null);
  const roomRef = useRef(null);
  roomRef.current = room;

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setMyId(socket.id));

    socket.on('room_created', ({ room }) => { setRoom(room); setScreen('lobby'); setErrorMsg(''); });
    socket.on('room_joined', ({ room }) => { setRoom(room); setScreen('lobby'); setErrorMsg(''); });
    socket.on('room_updated', (room) => setRoom(room));
    socket.on('player_left', ({ room }) => setRoom(room));
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

    socket.on('formation_phase', ({ formations, teams }) => {
      setFormations(formations);
      setFormationChosen([]);
      setProgress(teams);
      setScreen('formation');
    });

    socket.on('formation_update', ({ chosen }) => setFormationChosen(chosen));

    socket.on('simulation_starting', ({ teams }) => {
      setSimTeams(teams);
      setLiveMatch(null);
      setEvents([]);
      setStageBanner(null);
      setScreen('live');
    });

    socket.on('match_kickoff', ({ home, away, stage }) => {
      setLiveMatch({ home, away, score: { home: 0, away: 0 }, stage });
      setEvents(prev => [...prev, { type: 'kickoff', text: `${home.name} vs ${away.name}${stage ? ` (${stage})` : ''}` }]);
    });

    socket.on('match_event', ({ minute, type, scorer, side, text, score, stage }) => {
      if (type === 'goal') {
        setLiveMatch(prev => prev ? { ...prev, score: score || prev.score } : prev);
      }
      setEvents(prev => [...prev, { type, minute, scorer, side, text,
        score: score ? `${score.home}–${score.away}` : ''
      }]);
    });

    socket.on('match_fulltime', ({ home, away, stage }) => {
      setEvents(prev => [...prev, {
        type: 'fulltime',
        text: `${home.name} ${home.goals} – ${away.goals} ${away.name}${stage ? ` (${stage})` : ''}`
      }]);
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

  const handlePlayAgain = useCallback(() => {
    socketRef.current?.emit('play_again', { code: roomRef.current?.code });
  }, []);

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
          onChoose={handleChooseFormation}
          chosen={formationChosen}
          myId={myId}
          total={room?.players?.length || 0}
        />
      )}
      {screen === 'live' && (
        <LiveScreen liveMatch={liveMatch} events={events} teams={simTeams} stageBanner={stageBanner} />
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
