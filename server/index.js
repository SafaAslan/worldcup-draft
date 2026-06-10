const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const squads = require('./data/squads');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ─── Constants ───────────────────────────────────────────────────────────────
const TURN_SECONDS = 30;
const TEAM_SIZE = 11;

const POS_GROUP = {
  GK: 'GK',
  RB: 'DEF', CB: 'DEF', LB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', RM: 'MID', LM: 'MID',
  RW: 'ATT', LW: 'ATT', ST: 'ATT', CF: 'ATT'
};

// Minimum requirements for a legal XI
const MIN_REQ = { GK: 1, DEF: 3, MID: 2, ATT: 1 };

const FORMATIONS = {
  '4-3-3': { label: '4-3-3 Attacking', atk: 1.15, def: 0.95 },
  '4-4-2': { label: '4-4-2 Balanced', atk: 1.0, def: 1.0 },
  '5-3-2': { label: '5-3-2 Defensive', atk: 0.88, def: 1.18 },
};

const MENTALITIES = {
  'offensive': { label: '⚔️ Ofansif', atkMod: 1.35, defMod: 0.78 },
  'balanced':  { label: '⚖️ Dengeli', atkMod: 1.0,  defMod: 1.0  },
  'defensive': { label: '🛡️ Defansif', atkMod: 0.72, defMod: 1.38 },
};

// ─── Room store ──────────────────────────────────────────────────────────────
const rooms = {};

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function rollSquadOptions(count = 3, takenPlayers = new Set()) {
  const keys = Object.keys(squads);
  const picked = new Set();
  const options = [];
  while (options.length < count) {
    const key = keys[Math.floor(Math.random() * keys.length)];
    if (!picked.has(key)) {
      picked.add(key);
      const squad = squads[key];
      const playersWithStatus = squad.players.map(p => ({
        ...p,
        taken: takenPlayers.has(key + ':' + p.name)
      }));
      options.push({ key, ...squad, players: playersWithStatus });
    }
  }
  return options;
}

// ─── Draft helpers ───────────────────────────────────────────────────────────

function requiredGroups(team) {
  const counts = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  team.forEach(p => counts[POS_GROUP[p.pos]]++);

  const missing = {};
  let missingTotal = 0;
  for (const [g, min] of Object.entries(MIN_REQ)) {
    const need = Math.max(0, min - counts[g]);
    if (need > 0) { missing[g] = need; missingTotal += need; }
  }

  const slotsLeft = TEAM_SIZE - team.length;
  const mustFill = slotsLeft <= missingTotal;
  return { missing, mustFill, slotsLeft };
}

function isPickAllowed(team, pos) {
  const { missing, mustFill } = requiredGroups(team);
  const group = POS_GROUP[pos];
  // Never allow a 2nd GK
  if (group === 'GK' && team.some(p => POS_GROUP[p.pos] === 'GK')) return false;
  if (!mustFill) return true;
  return !!missing[group];
}

// Chemistry: each source (country+year) with 3+ players → +2 strength, capped at +6
function chemistryBonus(team) {
  const counts = {};
  team.forEach(p => { counts[p.from] = (counts[p.from] || 0) + 1; });
  let bonus = 0;
  const links = [];
  for (const [src, n] of Object.entries(counts)) {
    if (n >= 3) { bonus += 2; links.push({ source: src, players: n }); }
  }
  return { bonus: Math.min(bonus, 6), links };
}

function teamStrength(player) {
  if (!player.team.length) return 0;
  const avg = player.team.reduce((s, p) => s + p.rating, 0) / player.team.length;
  const { bonus } = chemistryBonus(player.team);
  return avg + bonus;
}

function autoPick(room, player) {
  const options = room.currentOptions || [];
  let best = null;
  options.forEach(squad => {
    squad.players.forEach((pl, idx) => {
      if (!isPickAllowed(player.team, pl.pos)) return;
      if (!best || pl.rating > best.player.rating) {
        best = { squadKey: squad.key, playerIndex: idx, player: pl };
      }
    });
  });
  return best;
}

// ─── Turn engine (snake draft) ───────────────────────────────────────────────

function startTurn(code) {
  const room = rooms[code];
  if (!room || room.state !== 'drafting') return;

  if (room.players.every(p => p.team.length >= TEAM_SIZE)) {
    return startFormationPhase(code);
  }

  let guard = 0;
  do {
    room.turnIndex += room.turnDirection;
    if (room.turnIndex >= room.players.length) {
      room.turnIndex = room.players.length - 1;
      room.turnDirection = -1;
    } else if (room.turnIndex < 0) {
      room.turnIndex = 0;
      room.turnDirection = 1;
    }
    guard++;
  } while (room.players[room.turnIndex].team.length >= TEAM_SIZE && guard < 100);

  const active = room.players[room.turnIndex];
  room.currentOptions = rollSquadOptions(3, room.takenPlayers);
  room.turnDeadline = Date.now() + TURN_SECONDS * 1000;

  io.to(code).emit('turn_started', {
    activePlayerId: active.id,
    activePlayerName: active.name,
    activePlayerAvatar: active.avatar,
    options: room.currentOptions,
    deadline: room.turnDeadline,
    seconds: TURN_SECONDS,
    progress: draftProgress(room),
    takenPlayers: Array.from(room.takenPlayers),
  });

  clearTimeout(room.turnTimer);
  room.turnTimer = setTimeout(() => {
    const best = autoPick(room, active);
    if (best) {
      applyPick(code, active, best.squadKey, best.playerIndex, true);
    } else {
      room.turnIndex -= room.turnDirection;
      startTurn(code);
    }
  }, TURN_SECONDS * 1000 + 500);
}

function applyPick(code, player, squadKey, playerIndex, wasAuto = false) {
  const room = rooms[code];
  if (!room) return;

  const squad = (room.currentOptions || []).find(s => s.key === squadKey);
  if (!squad) return;
  const picked = squad.players[playerIndex];
  if (!picked) return;
  if (!isPickAllowed(player.team, picked.pos)) return;

  // DUPLICATE GUARD: reject if already taken by anyone
  const takenKey = squadKey + ':' + picked.name;
  if (room.takenPlayers.has(takenKey)) return;

  player.team.push({ ...picked, from: `${squad.country} ${squad.year}` });
  room.takenPlayers.add(takenKey);
  clearTimeout(room.turnTimer);

  io.to(code).emit('pick_made', {
    playerId: player.id,
    playerName: player.name,
    playerAvatar: player.avatar,
    pick: { ...picked, from: `${squad.country} ${squad.year}` },
    wasAuto,
    progress: draftProgress(room),
  });

  setTimeout(() => startTurn(code), 600);
}

function draftProgress(room) {
  return room.players.map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    picked: p.team.length,
    team: p.team,
    chemistry: chemistryBonus(p.team),
    requirements: requiredGroups(p.team),
  }));
}

// ─── Formation phase ─────────────────────────────────────────────────────────

function startFormationPhase(code) {
  const room = rooms[code];
  room.state = 'formation';
  clearTimeout(room.turnTimer);

  io.to(code).emit('formation_phase', {
    formations: Object.entries(FORMATIONS).map(([key, f]) => ({ key, label: f.label, atk: f.atk, def: f.def })),
    mentalities: Object.entries(MENTALITIES).map(([key, m]) => ({ key, label: m.label, atkMod: m.atkMod, defMod: m.defMod })),
    teams: draftProgress(room),
    seconds: 30,
  });

  room.formationTimer = setTimeout(() => {
    room.players.forEach(p => { if (!p.formation) p.formation = '4-4-2'; });
    startSimulation(code);
  }, 25000);
}

// ─── Live simulation ─────────────────────────────────────────────────────────

// Commentary templates
const COMMENTARY = {
  goal: [
    (scorer, team) => `⚽ GOL! ${scorer} ağları havalandırıyor! ${team} öne geçiyor!`,
    (scorer, team) => `⚽ GOOOL! Muhteşem bir bitiriş ${scorer}'dan! ${team} seviniyor!`,
    (scorer, team) => `⚽ ${scorer} müthiş bir vuruşla gönderdi köşeye! ${team} fark atıyor!`,
    (scorer, team) => `⚽ ${team} golü buldu! ${scorer} doğru yerde doğru zamanda!`,
    (scorer, team) => `⚽ SÜPER GOL! ${scorer} muhteşem bir frikik golü attı!`,
    (scorer, team) => `⚽ ${scorer} kafa golü! ${team} taraftarları çılgına döndü!`,
  ],
  miss: [
    (shooter, gk) => `😤 ${shooter} tam gol gibi vurdu ama direğe takıldı!`,
    (shooter, gk) => `🧤 ${gk} harika bir refleksle topu çeldi! Nefes kesen kurtarış!`,
    (shooter, gk) => `😱 ${shooter} boş kaleyi kaçırdı! İnanamıyoruz!`,
    (shooter, gk) => `🧤 ${gk} çıkış yaptı ve topu son anda kapıp aldı!`,
    (shooter, gk) => `📏 ${shooter}'ın şutu direkten döndü, kaleci şanslı!`,
    (shooter, gk) => `🙅 ${shooter} serbest pozisyonda ama vuruşu üstten aştı!`,
    (shooter, gk) => `🧤 ${gk} inanılmaz bir kurtarış yaptı! Adam gibi kaleci!`,
    (shooter, gk) => `😤 ${shooter} penaltı pozisyonunda ama ${gk} okuyup çıktı!`,
  ],
  pressure: [
    (team) => `🔥 ${team} peş peşe korneler kazanıyor, baskı artıyor!`,
    (team) => `⚡ ${team} yüksek pres uyguluyor, rakip çıkamıyor!`,
    (team) => `🎯 ${team} ceza sahasını zorluyor, gol yakın görünüyor!`,
    (team) => `🌊 ${team} üst üste atak yapıyor, rakip nefes alamıyor!`,
    (team) => `📐 ${team} kombinasyonlarla rakibi parçalıyor!`,
  ],
  counter: [
    (team) => `💨 ${team}'dan tehlikeli bir kontratak! Hız farkı ortaya çıkıyor!`,
    (team) => `🏃 ${team} savunmadan çıktı ve hızla hücuma geçti!`,
    (team) => `⚡ ${team} 3'e 2 durumda! Harika kontratak fırsatı!`,
  ],
  pass: [
    (player, team) => `🎯 ${player} 'dan mükemmel bir pas, ${team} organize oluyor.`,
    (player, team) => `👟 ${player} topla ilerliyor, ${team} pozisyon alıyor.`,
    (player, team) => `🔄 ${team} kısa paslarla topu dolaştırıyor, sabırlı oyun.`,
    (player, team) => `📍 ${player} topu kaptı ve hızla dağıttı.`,
  ],
  foul: [
    (player) => `🟨 ${player}'a sarı kart! Sert müdahale tartışma yarattı.`,
    (player) => `😤 ${player} sinirlerine hakim olamadı, kart gördü!`,
    (player) => `🟨 Hakem ${player}'ı uyardı, bir sonraki kart tehlikeli olur!`,
  ],
};

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function simulateMatch(p1, p2) {
  const m1 = MENTALITIES[p1.mentality || 'balanced'];
  const m2 = MENTALITIES[p2.mentality || 'balanced'];
  const s1 = teamStrength(p1) * FORMATIONS[p1.formation].atk * m1.atkMod;
  const s2 = teamStrength(p2) * FORMATIONS[p2.formation].atk * m2.atkMod;
  const d1 = FORMATIONS[p1.formation].def * m1.defMod;
  const d2 = FORMATIONS[p2.formation].def * m2.defMod;

  const xg1 = Math.max(0.3, (s1 / (85 * d2)) * 1.8);
  const xg2 = Math.max(0.3, (s2 / (85 * d1)) * 1.8);

  const events = [];
  const allPlayers = (team) => team;
  const attackers = (team) => team.filter(p => ['ATT', 'MID'].includes(POS_GROUP[p.pos]));
  const midfielders = (team) => team.filter(p => POS_GROUP[p.pos] === 'MID');
  const gkOf = (team) => team.find(p => POS_GROUP[p.pos] === 'GK');
  const sc1 = attackers(p1.team), sc2 = attackers(p2.team);
  const mid1 = midfielders(p1.team), mid2 = midfielders(p2.team);
  const gk1 = gkOf(p1.team), gk2 = gkOf(p2.team);

  // Per-player stats tracking
  const playerStats = {};
  [...p1.team, ...p2.team].forEach(p => {
    playerStats[p.name] = { goals: 0, assists: 0, shots: 0, passes: 0, side: p1.team.includes(p) ? 1 : 2 };
  });

  let passes1 = 0, passes2 = 0;

  const weightedPick = (list) => {
    if (!list.length) return { name: 'Oyuncu', rating: 75 };
    const pool = list.flatMap(p => Array(Math.ceil(p.rating / 20)).fill(p));
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // More frequent events — step 3-7 minutes
  let minute = 2;
  while (minute <= 90) {
    minute += 3 + Math.floor(Math.random() * 7);
    if (minute > 90) break;

    const side1attacks = Math.random() < xg1 / 12;
    const side2attacks = Math.random() < xg2 / 12;

    // Pass events (frequent, atmospheric)
    if (Math.random() < 0.35) {
      const side = Math.random() < 0.5 ? 1 : 2;
      const passer = weightedPick(side === 1 ? mid1 : mid2);
      if (side === 1) passes1 += Math.floor(3 + Math.random() * 5);
      else passes2 += Math.floor(3 + Math.random() * 5);
      if (playerStats[passer.name]) playerStats[passer.name].passes += 3;
      events.push({ minute, type: 'pass', side,
        text: rnd(COMMENTARY.pass)(passer.name, side === 1 ? p1.name : p2.name) });
    }

    if (side1attacks) {
      const shooter = weightedPick(sc1);
      const assister = weightedPick(mid1.filter(p => p.name !== shooter.name));
      passes1 += 2;
      if (playerStats[shooter.name]) playerStats[shooter.name].shots++;
      if (playerStats[assister.name]) playerStats[assister.name].passes++;

      if (Math.random() < 0.38) {
        if (playerStats[shooter.name]) playerStats[shooter.name].goals++;
        if (playerStats[assister.name]) playerStats[assister.name].assists++;
        events.push({ minute, type: 'goal', side: 1, scorer: shooter.name, assister: assister.name,
          text: rnd(COMMENTARY.goal)(shooter.name, p1.name) });
      } else {
        const gkName = gk2 ? gk2.name : 'kaleci';
        events.push({ minute, type: 'miss', side: 1,
          text: rnd(COMMENTARY.miss)(shooter.name, gkName) });
      }
    } else if (Math.random() < 0.18) {
      const commentType = Math.random() < 0.55 ? 'pressure' : 'counter';
      events.push({ minute, type: 'commentary', side: 1,
        text: rnd(COMMENTARY[commentType])(p1.name) });
    }

    if (side2attacks) {
      const shooter2 = weightedPick(sc2);
      const assister2 = weightedPick(mid2.filter(p => p.name !== shooter2.name));
      passes2 += 2;
      const m2 = Math.min(90, minute + 1);
      if (playerStats[shooter2.name]) playerStats[shooter2.name].shots++;
      if (playerStats[assister2.name]) playerStats[assister2.name].passes++;

      if (Math.random() < 0.38) {
        if (playerStats[shooter2.name]) playerStats[shooter2.name].goals++;
        if (playerStats[assister2.name]) playerStats[assister2.name].assists++;
        events.push({ minute: m2, type: 'goal', side: 2, scorer: shooter2.name, assister: assister2.name,
          text: rnd(COMMENTARY.goal)(shooter2.name, p2.name) });
      } else {
        const gkName2 = gk1 ? gk1.name : 'kaleci';
        events.push({ minute: m2, type: 'miss', side: 2,
          text: rnd(COMMENTARY.miss)(shooter2.name, gkName2) });
      }
    } else if (Math.random() < 0.14) {
      events.push({ minute, type: 'commentary', side: 2,
        text: rnd(COMMENTARY.counter)(p2.name) });
    }

    // Cards
    if (Math.random() < 0.10) {
      const side = Math.random() < 0.5 ? 1 : 2;
      const team = side === 1 ? p1.team : p2.team;
      const fouler = team[Math.floor(Math.random() * team.length)];
      const isRed = Math.random() < 0.05;
      events.push({ minute, type: 'foul', side, player: fouler.name, card: isRed ? 'red' : 'yellow',
        text: isRed
          ? `🟥 KIRMIZI KART! ${fouler.name} oyundan çıkarılıyor! Takım 10 kişi kalıyor!`
          : rnd(COMMENTARY.foul)(fouler.name) });
    }
  }

  events.sort((a, b) => a.minute - b.minute);
  const goals = events.filter(e => e.type === 'goal');
  const shots1 = events.filter(e => (e.type === 'goal' || e.type === 'miss') && e.side === 1).length;
  const shots2 = events.filter(e => (e.type === 'goal' || e.type === 'miss') && e.side === 2).length;
  const onTarget1 = goals.filter(g => g.side === 1).length + Math.floor(shots1 * 0.4);
  const onTarget2 = goals.filter(g => g.side === 2).length + Math.floor(shots2 * 0.4);
  const yellows1 = events.filter(e => e.type === 'foul' && e.side === 1 && e.card === 'yellow').map(e => e.player);
  const yellows2 = events.filter(e => e.type === 'foul' && e.side === 2 && e.card === 'yellow').map(e => e.player);
  const reds1 = events.filter(e => e.type === 'foul' && e.side === 1 && e.card === 'red').map(e => e.player);
  const reds2 = events.filter(e => e.type === 'foul' && e.side === 2 && e.card === 'red').map(e => e.player);
  const scorers1 = goals.filter(g => g.side === 1).map(g => ({ name: g.scorer, assister: g.assister, minute: g.minute }));
  const scorers2 = goals.filter(g => g.side === 2).map(g => ({ name: g.scorer, assister: g.assister, minute: g.minute }));

  // Possession based on passes + attacks
  const totalPasses = passes1 + passes2 + 1;
  const poss1 = Math.round((passes1 / totalPasses) * 100);

  // Man of the match — highest combined score
  const topPlayers = Object.entries(playerStats)
    .map(([name, s]) => ({ name, score: s.goals * 5 + s.assists * 3 + s.shots * 1, ...s }))
    .sort((a, b) => b.score - a.score);
  const motm = topPlayers[0];

  // Top performers per side
  const top1 = topPlayers.filter(p => p.side === 1).slice(0, 3);
  const top2 = topPlayers.filter(p => p.side === 2).slice(0, 3);

  return {
    g1: scorers1.length,
    g2: scorers2.length,
    goals,
    events,
    stats: {
      shots: [shots1, shots2],
      onTarget: [onTarget1, onTarget2],
      passes: [passes1, passes2],
      possession: [poss1, 100 - poss1],
      yellows: [yellows1, yellows2],
      reds: [reds1, reds2],
      scorers: [scorers1, scorers2],
      motm: motm ? { name: motm.name, goals: motm.goals, assists: motm.assists, shots: motm.shots, side: motm.side } : null,
      topPlayers: [top1, top2],
    }
  };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function streamMatch(code, p1, p2, result, stage = null) {
  io.to(code).emit('match_kickoff', {
    home: { id: p1.id, name: p1.name, avatar: p1.avatar, formation: p1.formation, mentality: p1.mentality || 'balanced' },
    away: { id: p2.id, name: p2.name, avatar: p2.avatar, formation: p2.formation, mentality: p2.mentality || 'balanced' },
    stage,
  });

  await sleep(2200);

  let homeScore = 0, awayScore = 0;
  let liveShots = [0, 0], livePasses = [0, 0];

  for (const event of result.events) {
    const delay = event.type === 'goal' ? 3200 + Math.random() * 1400
                : event.type === 'miss' ? 2200 + Math.random() * 1000
                : event.type === 'pass' ? 1600 + Math.random() * 800
                : 1800 + Math.random() * 800;
    await sleep(delay);

    if (event.type === 'goal') {
      if (event.side === 1) homeScore++; else awayScore++;
    }
    if (event.type === 'goal' || event.type === 'miss') {
      liveShots[event.side - 1]++;
    }
    if (event.type === 'pass') {
      livePasses[event.side - 1] += 4;
    }

    const totalP = livePasses[0] + livePasses[1] + 1;
    const livePoss = [Math.round(livePasses[0] / totalP * 100), Math.round(livePasses[1] / totalP * 100)];

    io.to(code).emit('match_event', {
      minute: event.minute,
      type: event.type,
      scorer: event.scorer,
      assister: event.assister,
      side: event.side,
      text: event.text,
      score: { home: homeScore, away: awayScore },
      liveStats: { shots: liveShots, passes: livePasses, possession: livePoss },
      stage,
    });
  }

  await sleep(1600);
  io.to(code).emit('match_fulltime', {
    home: { id: p1.id, name: p1.name, avatar: p1.avatar, goals: result.g1 },
    away: { id: p2.id, name: p2.name, avatar: p2.avatar, goals: result.g2 },
    stats: result.stats,
    stage,
  });
  await sleep(1400);
}

async function startSimulation(code) {
  const room = rooms[code];
  if (!room) return;
  room.state = 'simulating';
  clearTimeout(room.formationTimer);

  io.to(code).emit('simulation_starting', {
    teams: room.players.map(p => ({
      id: p.id, name: p.name, avatar: p.avatar,
      formation: p.formation,
      strength: Math.round(teamStrength(p) * 10) / 10,
      chemistry: chemistryBonus(p.team),
    }))
  });

  await sleep(3000);

  // LEAGUE PHASE (round-robin)
  const results = {};
  room.players.forEach(p => {
    results[p.id] = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
  });

  const fixtures = [];
  for (let i = 0; i < room.players.length; i++) {
    for (let j = i + 1; j < room.players.length; j++) {
      fixtures.push([room.players[i], room.players[j]]);
    }
  }

  const allMatches = [];

  for (const [p1, p2] of fixtures) {
    if (!rooms[code]) return; // room destroyed mid-sim
    const result = simulateMatch(p1, p2);
    await streamMatch(code, p1, p2, result);

    allMatches.push({
      player1: { id: p1.id, name: p1.name, avatar: p1.avatar, goals: result.g1 },
      player2: { id: p2.id, name: p2.name, avatar: p2.avatar, goals: result.g2 },
      stats: result.stats,
    });

    results[p1.id].goalsFor += result.g1; results[p1.id].goalsAgainst += result.g2;
    results[p2.id].goalsFor += result.g2; results[p2.id].goalsAgainst += result.g1;
    if (result.g1 > result.g2) { results[p1.id].wins++; results[p1.id].points += 3; results[p2.id].losses++; }
    else if (result.g2 > result.g1) { results[p2.id].wins++; results[p2.id].points += 3; results[p1.id].losses++; }
    else { results[p1.id].draws++; results[p1.id].points++; results[p2.id].draws++; results[p2.id].points++; }
  }

  let standings = room.players.map(p => ({
    id: p.id, name: p.name, avatar: p.avatar,
    formation: p.formation,
    strength: Math.round(teamStrength(p) * 10) / 10,
    ...results[p.id],
    gd: results[p.id].goalsFor - results[p.id].goalsAgainst,
  })).sort((a, b) => b.points - a.points || b.gd - a.gd || b.goalsFor - a.goalsFor);

  // KNOCKOUT (4+ players)
  let knockout = null;
  let championId = standings[0].id;

  if (room.players.length >= 4) {
    const top4 = standings.slice(0, 4).map(s => room.players.find(p => p.id === s.id));

    io.to(code).emit('knockout_starting', {
      semifinalists: top4.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })),
    });
    await sleep(3000);

    const semis = [[top4[0], top4[3]], [top4[1], top4[2]]];
    const finalists = [];
    const semiResults = [];

    for (const [a, b] of semis) {
      if (!rooms[code]) return;
      const r = simulateMatch(a, b);
      while (r.g1 === r.g2) {
        const extra = { minute: 90 + Math.floor(Math.random() * 30), side: Math.random() < 0.5 ? 1 : 2, scorer: 'Golden Goal' };
        r.goals.push(extra);
        if (extra.side === 1) r.g1++; else r.g2++;
      }
      await streamMatch(code, a, b, r, 'SEMIFINAL');
      semiResults.push({
        home: { name: a.name, avatar: a.avatar, goals: r.g1 },
        away: { name: b.name, avatar: b.avatar, goals: r.g2 }
      });
      finalists.push(r.g1 > r.g2 ? a : b);
    }

    io.to(code).emit('final_starting', {
      finalists: finalists.map(f => ({ id: f.id, name: f.name, avatar: f.avatar })),
    });
    await sleep(3000);

    const fr = simulateMatch(finalists[0], finalists[1]);
    while (fr.g1 === fr.g2) {
      const extra = { minute: 90 + Math.floor(Math.random() * 30), side: Math.random() < 0.5 ? 1 : 2, scorer: 'Golden Goal' };
      fr.goals.push(extra);
      if (extra.side === 1) fr.g1++; else fr.g2++;
    }
    await streamMatch(code, finalists[0], finalists[1], fr, 'FINAL');

    const champion = fr.g1 > fr.g2 ? finalists[0] : finalists[1];
    championId = champion.id;
    knockout = {
      semifinals: semiResults,
      final: {
        home: { name: finalists[0].name, avatar: finalists[0].avatar, goals: fr.g1 },
        away: { name: finalists[1].name, avatar: finalists[1].avatar, goals: fr.g2 }
      },
      championId,
    };
    await sleep(1500);
  }

  if (!rooms[code]) return;
  room.state = 'results';
  io.to(code).emit('results_ready', {
    standings,
    matches: allMatches,
    knockout,
    championId,
    teams: room.players.map(p => ({
      id: p.id, name: p.name, avatar: p.avatar, team: p.team, formation: p.formation,
      chemistry: chemistryBonus(p.team), strength: Math.round(teamStrength(p) * 10) / 10,
    })),
  });
}

// ─── Socket handlers ─────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected`);

  socket.on('create_room', ({ username, avatar }) => {
    let code;
    do { code = generateRoomCode(); } while (rooms[code]);

    rooms[code] = {
      code,
      host: socket.id,
      state: 'lobby',
      players: [makePlayer(socket.id, username, avatar)],
      turnIndex: -1,
      turnDirection: 1,
      currentOptions: [],
      takenPlayers: new Set(),
      turnTimer: null,
      formationTimer: null,
    };

    socket.join(code);
    socket.emit('room_created', { code, room: sanitizeRoom(rooms[code]) });
    console.log(`[ROOM] ${code} created by ${username}`);
  });

  socket.on('join_room', ({ code, username, avatar }) => {
    const room = rooms[code];
    if (!room) return socket.emit('error_msg', { message: 'Room not found. Check your code.' });
    if (room.state !== 'lobby') return socket.emit('error_msg', { message: 'Game already started.' });
    if (room.players.length >= 8) return socket.emit('error_msg', { message: 'Room is full (max 8).' });
    if (room.players.find(p => p.name === username)) return socket.emit('error_msg', { message: 'Name already taken in this room.' });

    room.players.push(makePlayer(socket.id, username, avatar));
    socket.join(code);
    socket.emit('room_joined', { code, room: sanitizeRoom(room) });
    io.to(code).emit('room_updated', sanitizeRoom(room));
    console.log(`[ROOM] ${username} joined ${code}`);
  });

  socket.on('start_draft', ({ code }) => {
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    if (room.players.length < 2) return socket.emit('error_msg', { message: 'Need at least 2 players.' });

    room.state = 'drafting';
    room.players.sort(() => Math.random() - 0.5);
    room.turnIndex = -1;
    room.turnDirection = 1;

    io.to(code).emit('draft_started', {
      order: room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })),
    });

    setTimeout(() => startTurn(code), 2000);
    console.log(`[ROOM] ${code} snake draft started — ${room.players.length} players`);
  });

  socket.on('pick_player', ({ code, squadKey, playerIndex }) => {
    const room = rooms[code];
    if (!room || room.state !== 'drafting') return;
    const active = room.players[room.turnIndex];
    if (!active || active.id !== socket.id) return;
    applyPick(code, active, squadKey, playerIndex);
  });

  socket.on('choose_formation', ({ code, formation }) => {
    const room = rooms[code];
    if (!room || room.state !== 'formation') return;
    if (!FORMATIONS[formation]) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    player.formation = formation;

    io.to(code).emit('formation_update', {
      chosen: room.players.filter(p => p.formation).map(p => ({ id: p.id, name: p.name, avatar: p.avatar, formation: p.formation })),
      total: room.players.length,
    });

    if (room.players.every(p => p.formation)) {
      clearTimeout(room.formationTimer);
      startSimulation(code);
    }
  });

  socket.on('change_mentality_live', ({ code, mentality }) => {
    // Allow changing mentality during simulation too
    const room = rooms[code];
    if (!room) return;
    if (!MENTALITIES[mentality]) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    player.mentality = mentality;
    io.to(code).emit('mentality_update', { playerId: socket.id, mentality });
  });

  socket.on('choose_mentality', ({ code, mentality }) => {
    const room = rooms[code];
    if (!room || !MENTALITIES[mentality]) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    player.mentality = mentality;
    io.to(code).emit('mentality_update', {
      playerId: socket.id,
      mentality,
    });
  });

  socket.on('play_again', ({ code }) => {
    const room = rooms[code];
    if (!room || room.host !== socket.id) return;
    room.state = 'lobby';
    room.takenPlayers = new Set();
    room.players.forEach(p => { p.team = []; p.formation = null; p.mentality = 'balanced'; });
    io.to(code).emit('back_to_lobby', { room: sanitizeRoom(room) });
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id} disconnected`);
    for (const [code, room] of Object.entries(rooms)) {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx === -1) continue;

      const wasActive = room.state === 'drafting' && room.turnIndex === idx;
      const name = room.players[idx].name;
      room.players.splice(idx, 1);

      if (room.players.length === 0) {
        clearTimeout(room.turnTimer);
        clearTimeout(room.formationTimer);
        delete rooms[code];
        console.log(`[ROOM] ${code} deleted (empty)`);
      } else {
        if (room.host === socket.id) room.host = room.players[0].id;
        if (room.turnIndex >= room.players.length) room.turnIndex = room.players.length - 1;
        io.to(code).emit('player_left', { name, room: sanitizeRoom(room) });
        if (wasActive) {
          clearTimeout(room.turnTimer);
          room.turnIndex -= room.turnDirection;
          startTurn(code);
        }
      }
      break;
    }
  });
});

function makePlayer(id, name, avatar) {
  return { id, name, avatar: avatar || '⚽', team: [], formation: null, mentality: 'balanced' };
}

function sanitizeRoom(room) {
  return {
    code: room.code,
    state: room.state,
    hostId: room.host,
    players: room.players.map(p => ({
      id: p.id, name: p.name, avatar: p.avatar,
      picked: p.team.length,
    }))
  };
}

app.get('/health', (req, res) => res.json({ ok: true, rooms: Object.keys(rooms).length }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🏆 Dream Draft Server v2 on port ${PORT}`);
  console.log(`   Squads: ${Object.keys(squads).length} | Snake draft · Chemistry · Formations · Live sim\n`);
});
