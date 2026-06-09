# 🏆 Dream Draft v2 — Multiplayer World Cup Game

Snake-draft football legends with your friends, build a legal XI, pick a formation, then watch a live-streamed tournament decide the champion.

## What's New in v2

| Feature | Description |
|---------|-------------|
| 🐍 **Snake Draft** | Everyone sees the same 3 squads. Picks rotate 1→8, then 8→1. Steal your friends' targets! |
| ⏱️ **30s Turn Timer** | Too slow? Best legal player is auto-picked |
| 📋 **Position Rules** | Exactly 1 GK, min 3 DEF, 2 MID, 1 ATT — enforced during draft |
| 🧪 **Chemistry** | 3+ players from the same squad = +2 team strength (max +6) |
| ⚙️ **Formations** | 4-3-3 attacking / 4-4-2 balanced / 5-3-2 defensive — affects the sim |
| 📺 **Live Simulation** | Goal-by-goal event feed, everyone watches together |
| 🏆 **Knockout Stage** | With 4+ players: league top-4 → semifinals → final |
| 🔄 **Play Again** | Host can restart in the same lobby |
| 🇹🇷 **Turkey 2002** | Rüştü, Hakan Şükür, Hasan Şaş and the bronze-medal squad |

## Game Flow

```
Lobby (2–8 players, room code)
  → Snake Draft (11 picks each, 30s/turn, position rules)
  → Formation pick (25s)
  → Live league simulation (round-robin, goal feed)
  → Knockout: semis + final (4+ players)
  → Results: league table, cup bracket, all squads
```

## Run Locally

```bash
# Terminal 1
cd server && npm install && node index.js

# Terminal 2
cd client && npm install && npm start
```

Open several browser tabs at `http://localhost:3000` to test multiplayer.

## Test

```bash
cd server
node index.js &        # start server
node test-e2e.js       # 3 bots play a full game
```

## Deploy

**Server → Railway:** connect repo, set root dir to `/server`. Done.

**Client → Vercel:** root dir `/client`, env var `REACT_APP_SERVER_URL=https://your-app.railway.app`

## Add Squads

Edit `server/data/squads.js`:

```js
"Netherlands_1974": {
  country: "Netherlands", year: 1974, flag: "🇳🇱",
  players: [
    { name: "Johan Cruyff", pos: "CAM", rating: 98 },
    // ... 11 total. Positions: GK RB CB LB CDM CM CAM RM LM RW LW ST CF
  ]
}
```

## Architecture Notes

- **All game logic is server-side** — clients can't cheat by emitting fake picks (turn + legality validated)
- Rooms are in-memory; a server restart clears them (fine for friend groups, add Redis if you ever need persistence)
- Disconnect handling: host migrates, active drafter's turn passes on
