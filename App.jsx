import { useState, useEffect } from "react";
import {
  SCORING, KNOCKOUT_SCORING, BONUS_QUESTIONS,
  MAX_PLAYERS, COLORS, PLAYER_EMOJIS, TABS, STORAGE_KEY,
} from "./config.js";
import { GROUPS, GROUP_MATCHES, flag } from "./data.js";
import {
  calcGroupStandings, getQualifiers, getBestThirdPlaces,
  buildR32Bracket, getKnockoutMatchup,
  KNOCKOUT_ROUNDS_META, BRACKET_FEEDS,
} from "./bracketLogic.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
function pointsForResult(pred, actual) {
  if (!pred || !actual) return 0;
  const ph = parseInt(pred.home), pa = parseInt(pred.away);
  const ah = parseInt(actual.home), aa = parseInt(actual.away);
  if (isNaN(ph)||isNaN(pa)||isNaN(ah)||isNaN(aa)) return 0;
  if (ph===ah && pa===aa) return SCORING.exactScore;
  const po = ph>pa?"H":ph<pa?"A":"D";
  const ao = ah>aa?"H":ah<aa?"A":"D";
  return po===ao ? SCORING.correctOutcome : 0;
}

// Build predicted qualifiers for a player based on their score predictions
function buildPredQualifiers(pi, predictions) {
  const preds = predictions[pi] || {};
  const qualifiers = {};
  Object.entries(GROUPS).forEach(([g, teams]) => {
    const matchResults = Object.fromEntries(
      GROUP_MATCHES.filter(m => m.group===g).map(m => [m.id, preds[m.id]||null])
    );
    const s = calcGroupStandings(g, teams, matchResults);
    qualifiers[g] = { first:s[0]?.team||`${g}1`, second:s[1]?.team||`${g}2`, third:s[2]?.team||`${g}3` };
  });
  return qualifiers;
}

// Build predicted R32 bracket for a player (uses their group preds + 3rd-place picks)
function buildPredR32(pi, predictions) {
  const q = buildPredQualifiers(pi, predictions);
  const picks = predictions[pi]?.thirdPlaces || [];
  return buildR32Bracket(q, picks.length===8 ? picks : null);
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]                   = useState("Setup");
  const [players, setPlayers]           = useState(Array(MAX_PLAYERS).fill(""));
  const [numPlayers, setNumPlayers]     = useState(3);
  const [predictions, setPredictions]   = useState({});
  const [results, setResults]           = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState(0);
  const [groupFilter, setGroupFilter]   = useState("A");
  const [bracketView, setBracketView]   = useState("actual");
  const [loaded, setLoaded]             = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const s = await window.storage.get(STORAGE_KEY);
        if (s) {
          const d = JSON.parse(s.value);
          if (d.players)     setPlayers(d.players);
          if (d.numPlayers)  setNumPlayers(d.numPlayers);
          if (d.predictions) setPredictions(d.predictions);
          if (d.results)     setResults(d.results);
        }
      } catch(e) {}
      setLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    async function save() {
      try { await window.storage.set(STORAGE_KEY, JSON.stringify({ players, numPlayers, predictions, results })); }
      catch(e) {}
    }
    save();
  }, [players, numPlayers, predictions, results, loaded]);

  const activePlayers = players.slice(0, numPlayers);

  // ── Mutations ──────────────────────────────────────────────────────────────
  function setPred(pi, matchId, side, val) {
    setPredictions(prev => ({ ...prev, [pi]: { ...prev[pi], [matchId]: { ...(prev[pi]?.[matchId]||{}), [side]:val } } }));
  }
  function setBonusPred(pi, qid, val) {
    setPredictions(prev => ({ ...prev, [pi]: { ...prev[pi], bonus:{ ...(prev[pi]?.bonus||{}), [qid]:val } } }));
  }
  function setThirdPlacesPred(pi, groups) {
    setPredictions(prev => ({ ...prev, [pi]: { ...prev[pi], thirdPlaces:groups } }));
  }
  function setKnockoutWinnerPred(pi, matchId, team) {
    setPredictions(prev => ({ ...prev, [pi]: { ...prev[pi], knockoutWinners:{ ...(prev[pi]?.knockoutWinners||{}), [matchId]:team } } }));
  }
  function setResult(matchId, side, val) {
    setResults(prev => ({ ...prev, [matchId]:{ ...(prev[matchId]||{}), [side]:val } }));
  }
  function setBonusResult(qid, val) {
    setResults(prev => ({ ...prev, [`bonus_${qid}`]:val }));
  }
  function setKnockoutWinnerResult(matchId, team) {
    setResults(prev => ({ ...prev, knockoutWinners:{ ...(prev.knockoutWinners||{}), [matchId]:team } }));
  }

  // ── Scoring ────────────────────────────────────────────────────────────────
  function calcScore(pi) {
    let score = 0;
    // Group stage
    GROUP_MATCHES.forEach(m => {
      score += pointsForResult(predictions[pi]?.[m.id], results[m.id]);
    });
    // Bonus
    BONUS_QUESTIONS.forEach(bq => {
      const pred   = predictions[pi]?.bonus?.[bq.id];
      const actual = results[`bonus_${bq.id}`];
      if (pred && actual && pred.toLowerCase().trim()===actual.toLowerCase().trim())
        score += SCORING.bonusQuestion;
    });
    // Knockout rounds
    KNOCKOUT_ROUNDS_META.forEach(round => {
      round.matchIds.forEach(mid => {
        const predWinner   = predictions[pi]?.knockoutWinners?.[mid];
        const actualWinner = results.knockoutWinners?.[mid];
        if (predWinner && actualWinner && predWinner===actualWinner)
          score += round.pts;
      });
    });
    return score;
  }

  function calcScoreBreakdown(pi) {
    let group=0, bonus=0;
    const knockout = {};
    KNOCKOUT_ROUNDS_META.forEach(r => { knockout[r.id]=0; });

    GROUP_MATCHES.forEach(m => { group += pointsForResult(predictions[pi]?.[m.id], results[m.id]); });
    BONUS_QUESTIONS.forEach(bq => {
      const pred=predictions[pi]?.bonus?.[bq.id], actual=results[`bonus_${bq.id}`];
      if (pred&&actual&&pred.toLowerCase().trim()===actual.toLowerCase().trim()) bonus+=SCORING.bonusQuestion;
    });
    KNOCKOUT_ROUNDS_META.forEach(round => {
      round.matchIds.forEach(mid => {
        const pw=predictions[pi]?.knockoutWinners?.[mid], aw=results.knockoutWinners?.[mid];
        if (pw&&aw&&pw===aw) knockout[round.id]+=round.pts;
      });
    });
    return { group, bonus, knockout };
  }

  const scores = activePlayers.map((_, i) => calcScore(i));

  if (!loaded) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#080810",color:"#fff",fontFamily:"monospace" }}>
      Loading...
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:"#080810",fontFamily:"'Barlow Condensed','Arial Narrow',Arial,sans-serif",color:"#f0f0f0",paddingBottom:80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500&display=swap');
        *{box-sizing:border-box;}
        input[type=number]{-moz-appearance:textfield;}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#111;}
        ::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}
        .tab-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:8px 14px;transition:all 0.15s;background:transparent;}
        .match-row{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;background:#12121c;border:1px solid #1c1c2c;margin-bottom:5px;}
        .score-input{width:36px;height:32px;background:#080810;border:1.5px solid #252535;color:#fff;font-size:16px;font-weight:700;text-align:center;border-radius:5px;outline:none;font-family:inherit;}
        .score-input:focus{border-color:#f97316;}
        .score-input.actual{border-color:#3b82f6;background:#0c1118;}
        .score-input.actual:focus{border-color:#60a5fa;}
        .grp-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:12px;font-weight:700;padding:5px 11px;border-radius:4px;transition:all 0.15s;letter-spacing:1px;}
        .bonus-input{width:100%;background:#080810;border:1.5px solid #252535;color:#fff;font-size:14px;padding:7px 10px;border-radius:6px;outline:none;font-family:'Barlow',Arial;}
        .bonus-input:focus{border-color:#f97316;}
        .bonus-input.actual{border-color:#3b82f6;}
        .hscroll{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;}
        .hscroll::-webkit-scrollbar{height:3px;}
        .pick-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:12px;font-weight:700;padding:6px 10px;border-radius:6px;transition:all 0.15s;text-align:left;width:100%;}
        .ko-team{flex:1;border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:11px;font-weight:600;padding:5px 8px;border-radius:5px;transition:all 0.15s;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      `}</style>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1a0800 0%,#080810 60%)",padding:"18px 16px 0",borderBottom:"1px solid #181828" }}>
        <div style={{ maxWidth:760,margin:"0 auto" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6 }}>
            <span style={{ fontSize:26 }}>⚽</span>
            <div>
              <div style={{ fontSize:20,fontWeight:900,letterSpacing:2,textTransform:"uppercase",lineHeight:1 }}>FIFA World Cup 2026</div>
              <div style={{ fontSize:11,color:"#f97316",letterSpacing:3,textTransform:"uppercase",fontWeight:600 }}>Prediction Tracker</div>
            </div>
          </div>
          {activePlayers.some(p=>p) && (
            <div className="hscroll" style={{ marginTop:8 }}>
              {activePlayers.map((p,i) => p ? (
                <div key={i} style={{ flexShrink:0,background:`${COLORS[i]}15`,border:`1.5px solid ${COLORS[i]}44`,borderRadius:8,padding:"4px 10px",minWidth:70,textAlign:"center" }}>
                  <div style={{ fontSize:14 }}>{PLAYER_EMOJIS[i]}</div>
                  <div style={{ fontSize:11,fontWeight:700,color:COLORS[i],whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:80 }}>{p}</div>
                  <div style={{ fontSize:20,fontWeight:900,color:"#fff",lineHeight:1 }}>{scores[i]}</div>
                  <div style={{ fontSize:9,color:"#666",letterSpacing:1 }}>PTS</div>
                </div>
              ) : null)}
            </div>
          )}
          <div style={{ display:"flex",gap:0,marginTop:4,overflowX:"auto" }}>
            {TABS.map(t => (
              <button key={t} className="tab-btn" onClick={() => setTab(t)}
                style={{ color:tab===t?"#f97316":"#666",borderBottom:tab===t?"2px solid #f97316":"2px solid transparent",flexShrink:0 }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:760,margin:"0 auto",padding:"16px 12px" }}>

        {/* ── SETUP ── */}
        {tab==="Setup" && (
          <div>
            <STitle>Players</STitle>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11,color:"#666",letterSpacing:1,textTransform:"uppercase",marginBottom:6 }}>Number of players</div>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                {[2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(n => (
                  <button key={n} className="grp-btn" onClick={() => setNumPlayers(n)}
                    style={{ background:numPlayers===n?"#f97316":"#12121c",color:numPlayers===n?"#000":"#aaa",border:`1px solid ${numPlayers===n?"#f97316":"#222"}` }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 12px",marginBottom:20 }}>
              {Array.from({length:numPlayers},(_,i) => (
                <div key={i} style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <div style={{ width:28,height:28,borderRadius:"50%",background:`${COLORS[i]}22`,border:`2px solid ${COLORS[i]}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0 }}>
                    {PLAYER_EMOJIS[i]}
                  </div>
                  <input placeholder={`Player ${i+1}`} value={players[i]}
                    onChange={e => { const p=[...players]; p[i]=e.target.value; setPlayers(p); }}
                    style={{ flex:1,background:"#12121c",border:`1.5px solid ${players[i]?COLORS[i]+"66":"#252535"}`,color:"#fff",padding:"6px 10px",borderRadius:7,fontSize:14,fontFamily:"'Barlow',Arial",outline:"none",minWidth:0 }}/>
                </div>
              ))}
            </div>
            <div style={{ padding:14,background:"#0d0d18",borderRadius:8,border:"1px solid #1c1c2c",fontSize:13,color:"#999",lineHeight:1.9 }}>
              <div style={{ color:"#3b82f6",fontWeight:700,marginBottom:4,fontSize:14 }}>How scoring works</div>
              <div>⚽ <b style={{color:"#fff"}}>+{SCORING.exactScore} pts</b> — exact group stage score</div>
              <div>✅ <b style={{color:"#fff"}}>+{SCORING.correctOutcome} pt</b> — correct outcome (W/D/L)</div>
              <div>⭐ <b style={{color:"#fff"}}>+{SCORING.bonusQuestion} pts</b> — correct bonus answer</div>
              <div style={{ marginTop:6,paddingTop:6,borderTop:"1px solid #1c1c2c" }}>
                {KNOCKOUT_ROUNDS_META.map(r => (
                  <div key={r.id}>🏆 <b style={{color:"#fff"}}>+{r.pts} pts</b> — correct {r.label} winner</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PREDICTIONS ── */}
        {tab==="Predictions" && (
          <PredictionsTab
            activePlayers={activePlayers}
            selectedPlayer={selectedPlayer}
            setSelectedPlayer={setSelectedPlayer}
            groupFilter={groupFilter}
            setGroupFilter={setGroupFilter}
            predictions={predictions}
            results={results}
            setPred={setPred}
            setBonusPred={setBonusPred}
            setThirdPlacesPred={setThirdPlacesPred}
            setKnockoutWinnerPred={setKnockoutWinnerPred}
            pointsForResult={pointsForResult}
          />
        )}

        {/* ── RESULTS ── */}
        {tab==="Results" && (
          <ResultsTab
            groupFilter={groupFilter}
            setGroupFilter={setGroupFilter}
            results={results}
            setResult={setResult}
            setBonusResult={setBonusResult}
            setKnockoutWinnerResult={setKnockoutWinnerResult}
          />
        )}

        {/* ── BRACKET ── */}
        {tab==="Bracket" && (
          <BracketTab
            activePlayers={activePlayers}
            predictions={predictions}
            results={results}
            bracketView={bracketView}
            setBracketView={setBracketView}
          />
        )}

        {/* ── STANDINGS ── */}
        {tab==="Standings" && (
          <StandingsTab
            activePlayers={activePlayers}
            scores={scores}
            predictions={predictions}
            results={results}
            groupFilter={groupFilter}
            setGroupFilter={setGroupFilter}
            calcScoreBreakdown={calcScoreBreakdown}
            pointsForResult={pointsForResult}
          />
        )}
      </div>
    </div>
  );
}

// ── Predictions Tab ───────────────────────────────────────────────────────────
function PredictionsTab({ activePlayers, selectedPlayer, setSelectedPlayer, groupFilter, setGroupFilter, predictions, results, setPred, setBonusPred, setThirdPlacesPred, setKnockoutWinnerPred, pointsForResult }) {
  const pi = selectedPlayer;

  return (
    <div>
      <STitle>Enter Predictions</STitle>
      {/* Player selector */}
      <div className="hscroll" style={{ marginBottom:12 }}>
        {activePlayers.map((p,i) => p ? (
          <button key={i} className="grp-btn" onClick={() => setSelectedPlayer(i)}
            style={{ background:selectedPlayer===i?COLORS[i]:"#12121c",color:selectedPlayer===i?"#000":"#aaa",border:`1px solid ${selectedPlayer===i?COLORS[i]:"#222"}`,flexShrink:0 }}>
            {PLAYER_EMOJIS[i]} {p||`P${i+1}`}
          </button>
        ) : null)}
      </div>

      {/* Filter bar */}
      <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:12 }}>
        {Object.keys(GROUPS).map(g => (
          <button key={g} className="grp-btn" onClick={() => setGroupFilter(g)}
            style={{ background:groupFilter===g?"#f97316":"#12121c",color:groupFilter===g?"#000":"#888",border:`1px solid ${groupFilter===g?"#f97316":"#222"}` }}>
            {g}
          </button>
        ))}
        <button className="grp-btn" onClick={() => setGroupFilter("BONUS")}
          style={{ background:groupFilter==="BONUS"?"#a855f7":"#12121c",color:groupFilter==="BONUS"?"#fff":"#888",border:`1px solid ${groupFilter==="BONUS"?"#a855f7":"#222"}` }}>
          ⭐
        </button>
        <button className="grp-btn" onClick={() => setGroupFilter("BRACKET")}
          style={{ background:groupFilter==="BRACKET"?"#f43f5e":"#12121c",color:groupFilter==="BRACKET"?"#fff":"#888",border:`1px solid ${groupFilter==="BRACKET"?"#f43f5e":"#222"}` }}>
          🏆 Bracket
        </button>
      </div>

      {/* ── Group predictions ── */}
      {!["BONUS","BRACKET"].includes(groupFilter) && (() => {
        const pred = predictions[pi] || {};
        return (
          <>
            <div style={{ fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>
              Group {groupFilter} — {activePlayers[pi]||`Player ${pi+1}`}'s predictions
            </div>
            {GROUP_MATCHES.filter(m=>m.group===groupFilter).map(m => {
              const p=pred[m.id]||{}, actual=results[m.id];
              return (
                <div key={m.id} className="match-row">
                  <span style={{ fontSize:10,color:"#444",minWidth:42,flexShrink:0 }}>{m.date}</span>
                  <span style={{ fontSize:12,flex:1,textAlign:"right",fontWeight:600,whiteSpace:"nowrap" }}>{flag(m.home)} {m.home}</span>
                  <input type="number" min="0" max="20" className="score-input" value={p.home??""} onChange={e=>setPred(pi,m.id,"home",e.target.value)} placeholder="-"/>
                  <span style={{ color:"#333",fontSize:11,fontWeight:700 }}>:</span>
                  <input type="number" min="0" max="20" className="score-input" value={p.away??""} onChange={e=>setPred(pi,m.id,"away",e.target.value)} placeholder="-"/>
                  <span style={{ fontSize:12,flex:1,fontWeight:600,whiteSpace:"nowrap" }}>{flag(m.away)} {m.away}</span>
                  {actual && <PointsBadge pts={pointsForResult(p,actual)}/>}
                </div>
              );
            })}
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:6 }}>Predicted standings</div>
              <GroupTable group={groupFilter} teams={GROUPS[groupFilter]}
                results={Object.fromEntries(GROUP_MATCHES.filter(m=>m.group===groupFilter).map(m=>[m.id,pred[m.id]||null]))}/>
            </div>
          </>
        );
      })()}

      {/* ── Bonus ── */}
      {groupFilter==="BONUS" && (
        <div>
          <div style={{ fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:10 }}>
            Bonus — {SCORING.bonusQuestion} pts each
          </div>
          {BONUS_QUESTIONS.map(bq => {
            const pred=predictions[pi]?.bonus?.[bq.id]||"";
            const actual=results[`bonus_${bq.id}`];
            const correct=actual&&pred&&pred.toLowerCase().trim()===actual.toLowerCase().trim();
            return (
              <div key={bq.id} style={{ marginBottom:12 }}>
                <div style={{ fontSize:13,fontWeight:600,marginBottom:5,color:"#ddd" }}>{bq.label}</div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  <input className="bonus-input" placeholder="Your answer..." value={pred} onChange={e=>setBonusPred(pi,bq.id,e.target.value)}/>
                  {actual && <PointsBadge pts={correct?SCORING.bonusQuestion:0}/>}
                </div>
                {actual && <div style={{ fontSize:11,color:"#3b82f6",marginTop:3 }}>Actual: {actual}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bracket predictions ── */}
      {groupFilter==="BRACKET" && (
        <BracketPredictions
          pi={pi}
          playerName={activePlayers[pi]||`Player ${pi+1}`}
          predictions={predictions}
          results={results}
          setThirdPlacesPred={setThirdPlacesPred}
          setKnockoutWinnerPred={setKnockoutWinnerPred}
        />
      )}
    </div>
  );
}

// ── Bracket Predictions ───────────────────────────────────────────────────────
function BracketPredictions({ pi, playerName, predictions, results, setThirdPlacesPred, setKnockoutWinnerPred }) {
  const pred       = predictions[pi] || {};
  const thirdPicks = pred.thirdPlaces || [];
  const koWinners  = pred.knockoutWinners || {};

  // Build predicted qualifiers from this player's group score predictions
  const predQ = buildPredQualifiers(pi, predictions);

  // Get predicted 3rd-place team per group
  const thirds = Object.entries(GROUPS).map(([g]) => ({
    group:g, team: predQ[g]?.third || `3rd ${g}`
  }));

  // Build predicted R32 bracket
  const r32 = buildR32Bracket(predQ, thirdPicks.length===8 ? thirdPicks : null);

  const toggleThird = (g) => {
    if (thirdPicks.includes(g)) {
      setThirdPlacesPred(pi, thirdPicks.filter(x => x!==g));
    } else if (thirdPicks.length < 8) {
      setThirdPlacesPred(pi, [...thirdPicks, g]);
    }
  };

  const pickKO = (matchId, team) => {
    setKnockoutWinnerPred(pi, matchId, koWinners[matchId]===team ? null : team);
  };

  return (
    <div>
      {/* 3rd-place picks */}
      <div style={{ marginBottom:18 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
          <div style={{ fontSize:13,fontWeight:700,color:"#ddd",letterSpacing:1 }}>Best 3rd-place teams — pick 8</div>
          <div style={{ fontSize:12,color:thirdPicks.length===8?"#10b981":"#f97316",fontWeight:700 }}>
            {thirdPicks.length}/8 selected
          </div>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5 }}>
          {thirds.map(({ group, team }) => {
            const sel = thirdPicks.includes(group);
            const full = !sel && thirdPicks.length>=8;
            return (
              <button key={group} onClick={() => !full && toggleThird(group)} disabled={full}
                style={{ background:sel?"#f97316":"#12121c",border:`1px solid ${sel?"#f97316":"#252535"}`,borderRadius:6,padding:"6px 8px",cursor:full?"default":"pointer",opacity:full?0.4:1,textAlign:"left" }}>
                <div style={{ fontSize:9,color:sel?"#000":"#666",letterSpacing:1,textTransform:"uppercase" }}>Group {group}</div>
                <div style={{ fontSize:11,fontWeight:700,color:sel?"#000":"#ccc",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                  {flag(team)} {team}
                </div>
              </button>
            );
          })}
        </div>
        {thirdPicks.length!==8 && (
          <div style={{ fontSize:11,color:"#555",marginTop:6 }}>
            Select exactly 8 groups to unlock bracket predictions below.
          </div>
        )}
      </div>

      {/* Knockout rounds */}
      {KNOCKOUT_ROUNDS_META.map(round => (
        <div key={round.id} style={{ marginBottom:20 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
            <div style={{ fontSize:13,fontWeight:700,color:"#f97316",letterSpacing:1,textTransform:"uppercase" }}>{round.label}</div>
            <div style={{ fontSize:10,background:"#f9731622",color:"#f97316",border:"1px solid #f9731640",borderRadius:4,padding:"1px 7px",fontWeight:700 }}>+{round.pts} pts</div>
          </div>
          {round.matchIds.map((mid, i) => {
            const { home, away } = getKnockoutMatchup(mid, r32, koWinners);
            const winner  = koWinners[mid] || null;
            const actual  = results.knockoutWinners?.[mid];
            const correct = actual && winner && winner===actual;
            const wrong   = actual && winner && winner!==actual;
            const bothKnown = !home.startsWith("W(") && home!=="TBD" && !away.startsWith("W(") && away!=="TBD";

            return (
              <div key={mid} style={{ marginBottom:5 }}>
                <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                  <span style={{ fontSize:9,color:"#333",minWidth:34,fontWeight:700 }}>M{i+1+round.matchIds.indexOf(mid)-round.matchIds.indexOf(mid)}{mid.replace("M","")}</span>
                  <button className="ko-team" onClick={() => bothKnown&&pickKO(mid,home)}
                    style={{
                      background: winner===home ? "#f97316" : "#12121c",
                      border: `1px solid ${winner===home?"#f97316":"#252535"}`,
                      color: winner===home?"#000":"#aaa",
                      cursor: bothKnown?"pointer":"default",
                      opacity: (!bothKnown||(!winner&&false)) ? 0.5 : 1,
                    }}>
                    {flag(home)} {home}
                  </button>
                  <span style={{ color:"#333",fontSize:10,fontWeight:700,flexShrink:0 }}>vs</span>
                  <button className="ko-team" onClick={() => bothKnown&&pickKO(mid,away)}
                    style={{
                      background: winner===away ? "#f97316" : "#12121c",
                      border: `1px solid ${winner===away?"#f97316":"#252535"}`,
                      color: winner===away?"#000":"#aaa",
                      cursor: bothKnown?"pointer":"default",
                      opacity: !bothKnown ? 0.5 : 1,
                    }}>
                    {flag(away)} {away}
                  </button>
                  {actual && (
                    <span style={{ fontSize:10,fontWeight:700,color:correct?"#10b981":wrong?"#f43f5e":"#444",background:correct?"#10b98118":wrong?"#f43f5e18":"#ffffff08",borderRadius:3,padding:"1px 6px",flexShrink:0 }}>
                      {correct?`+${round.pts}`:wrong?"✗":"?"}
                    </span>
                  )}
                </div>
                {!bothKnown && (
                  <div style={{ fontSize:9,color:"#333",paddingLeft:40,marginTop:1 }}>
                    Predict prior rounds first
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Results Tab ───────────────────────────────────────────────────────────────
function ResultsTab({ groupFilter, setGroupFilter, results, setResult, setBonusResult, setKnockoutWinnerResult }) {
  const actualQ   = getQualifiers(results);
  const actualR32 = buildR32Bracket(actualQ);
  const koWinners = results.knockoutWinners || {};

  return (
    <div>
      <STitle>Enter Real Results</STitle>
      <div style={{ fontSize:12,color:"#555",marginBottom:12 }}>Enter actual scores and knockout results as the tournament progresses.</div>

      {/* Filter bar */}
      <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:12 }}>
        {Object.keys(GROUPS).map(g => (
          <button key={g} className="grp-btn" onClick={() => setGroupFilter(g)}
            style={{ background:groupFilter===g?"#3b82f6":"#12121c",color:groupFilter===g?"#fff":"#888",border:`1px solid ${groupFilter===g?"#3b82f6":"#222"}` }}>
            {g}
          </button>
        ))}
        <button className="grp-btn" onClick={() => setGroupFilter("BONUS")}
          style={{ background:groupFilter==="BONUS"?"#a855f7":"#12121c",color:groupFilter==="BONUS"?"#fff":"#888",border:`1px solid ${groupFilter==="BONUS"?"#a855f7":"#222"}` }}>
          ⭐
        </button>
        <button className="grp-btn" onClick={() => setGroupFilter("KNOCKOUT")}
          style={{ background:groupFilter==="KNOCKOUT"?"#f43f5e":"#12121c",color:groupFilter==="KNOCKOUT"?"#fff":"#888",border:`1px solid ${groupFilter==="KNOCKOUT"?"#f43f5e":"#222"}` }}>
          🏆
        </button>
      </div>

      {/* Group results */}
      {!["BONUS","KNOCKOUT"].includes(groupFilter) && (
        <>
          {GROUP_MATCHES.filter(m=>m.group===groupFilter).map(m => {
            const actual=results[m.id]||{};
            return (
              <div key={m.id} className="match-row">
                <span style={{ fontSize:10,color:"#444",minWidth:42,flexShrink:0 }}>{m.date}</span>
                <span style={{ fontSize:12,flex:1,textAlign:"right",fontWeight:600,whiteSpace:"nowrap" }}>{flag(m.home)} {m.home}</span>
                <input type="number" min="0" max="20" className="score-input actual" value={actual.home??""} onChange={e=>setResult(m.id,"home",e.target.value)} placeholder="-"/>
                <span style={{ color:"#222",fontSize:11,fontWeight:700 }}>:</span>
                <input type="number" min="0" max="20" className="score-input actual" value={actual.away??""} onChange={e=>setResult(m.id,"away",e.target.value)} placeholder="-"/>
                <span style={{ fontSize:12,flex:1,fontWeight:600,whiteSpace:"nowrap" }}>{flag(m.away)} {m.away}</span>
              </div>
            );
          })}
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:6 }}>Group {groupFilter} Standings</div>
            <GroupTable group={groupFilter} teams={GROUPS[groupFilter]} results={results} highlight/>
          </div>
        </>
      )}

      {/* Bonus results */}
      {groupFilter==="BONUS" && (
        <div>
          <div style={{ fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:10 }}>Bonus — enter actual answers</div>
          {BONUS_QUESTIONS.map(bq => (
            <div key={bq.id} style={{ marginBottom:12 }}>
              <div style={{ fontSize:13,fontWeight:600,marginBottom:5,color:"#ddd" }}>{bq.label}</div>
              <input className="bonus-input actual" placeholder="Actual answer..." value={results[`bonus_${bq.id}`]||""} onChange={e=>setBonusResult(bq.id,e.target.value)}/>
            </div>
          ))}
        </div>
      )}

      {/* Knockout results */}
      {groupFilter==="KNOCKOUT" && (
        <div>
          {KNOCKOUT_ROUNDS_META.map(round => (
            <div key={round.id} style={{ marginBottom:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#3b82f6",letterSpacing:1,textTransform:"uppercase" }}>{round.label}</div>
                <div style={{ fontSize:10,background:"#3b82f622",color:"#3b82f6",border:"1px solid #3b82f640",borderRadius:4,padding:"1px 7px" }}>+{round.pts} pts</div>
              </div>
              {round.matchIds.map(mid => {
                const { home, away } = getKnockoutMatchup(mid, actualR32, koWinners);
                const winner = koWinners[mid] || null;
                const bothKnown = !home.startsWith("W(") && home!=="TBD" && !away.startsWith("W(") && away!=="TBD";
                return (
                  <div key={mid} style={{ display:"flex",alignItems:"center",gap:5,marginBottom:5 }}>
                    <span style={{ fontSize:9,color:"#333",minWidth:34,fontWeight:700 }}>{mid}</span>
                    <button className="ko-team" onClick={() => bothKnown&&setKnockoutWinnerResult(mid,winner===home?null:home)}
                      style={{ background:winner===home?"#3b82f6":"#12121c",border:`1px solid ${winner===home?"#3b82f6":"#252535"}`,color:winner===home?"#fff":"#aaa",cursor:bothKnown?"pointer":"default",opacity:!bothKnown?0.4:1 }}>
                      {flag(home)} {home}
                    </button>
                    <span style={{ color:"#333",fontSize:10,fontWeight:700,flexShrink:0 }}>vs</span>
                    <button className="ko-team" onClick={() => bothKnown&&setKnockoutWinnerResult(mid,winner===away?null:away)}
                      style={{ background:winner===away?"#3b82f6":"#12121c",border:`1px solid ${winner===away?"#3b82f6":"#252535"}`,color:winner===away?"#fff":"#aaa",cursor:bothKnown?"pointer":"default",opacity:!bothKnown?0.4:1 }}>
                      {flag(away)} {away}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bracket Tab ───────────────────────────────────────────────────────────────
function BracketTab({ activePlayers, predictions, results, bracketView, setBracketView }) {
  const isActual  = bracketView==="actual";
  const koWinners = isActual ? (results.knockoutWinners||{}) : (predictions[bracketView]?.knockoutWinners||{});
  const qualifiers = isActual ? getQualifiers(results) : buildPredQualifiers(bracketView, predictions);
  const thirdPicks = isActual ? null : (predictions[bracketView]?.thirdPlaces||null);
  const r32 = buildR32Bracket(qualifiers, thirdPicks?.length===8 ? thirdPicks : null);

  const best8 = getBestThirdPlaces(qualifiers);

  return (
    <div>
      <STitle>Knockout Bracket</STitle>
      <div className="hscroll" style={{ marginBottom:14 }}>
        <button className="grp-btn" onClick={() => setBracketView("actual")}
          style={{ background:isActual?"#3b82f6":"#12121c",color:isActual?"#fff":"#888",border:`1px solid ${isActual?"#3b82f6":"#222"}`,flexShrink:0 }}>
          📊 Actual
        </button>
        {activePlayers.map((p,i) => p ? (
          <button key={i} className="grp-btn" onClick={() => setBracketView(i)}
            style={{ background:bracketView===i?COLORS[i]:"#12121c",color:bracketView===i?"#000":"#888",border:`1px solid ${bracketView===i?COLORS[i]:"#222"}`,flexShrink:0 }}>
            {PLAYER_EMOJIS[i]} {p}
          </button>
        ) : null)}
      </div>

      {isActual && best8.length>0 && (
        <div style={{ marginBottom:12,padding:10,background:"#0d0d18",borderRadius:8,border:"1px solid #1c1c2c" }}>
          <div style={{ fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:6 }}>Best 3rd-place qualifiers</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
            {best8.map(t => (
              <span key={t.group} style={{ fontSize:11,background:"#181828",border:"1px solid #252535",borderRadius:4,padding:"2px 8px",color:"#aaa" }}>
                <span style={{ color:"#f97316",fontWeight:700 }}>Grp {t.group}</span> {flag(t.team)} {t.team}
              </span>
            ))}
          </div>
        </div>
      )}

      {KNOCKOUT_ROUNDS_META.map(round => (
        <div key={round.id} style={{ marginBottom:16 }}>
          <div style={{ fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:6 }}>{round.label}</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:5 }}>
            {round.matchIds.map(mid => {
              const { home, away } = getKnockoutMatchup(mid, r32, koWinners);
              const winner = koWinners[mid];
              return <BracketMatch key={mid} label={mid} t1={home} t2={away} winner={winner}/>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function BracketMatch({ t1, t2, label, winner }) {
  const isTBD = t => !t || t.startsWith("W(") || t.endsWith("TBD") || t.includes("1") && t.length<=3;
  const col1 = winner ? (winner===t1?"#10b981":"#444") : (isTBD(t1)?"#444":"#f0f0f0");
  const col2 = winner ? (winner===t2?"#10b981":"#444") : (isTBD(t2)?"#444":"#f0f0f0");
  return (
    <div style={{ background:"#0f0f1a",border:"1px solid #1c1c2c",borderRadius:6,overflow:"hidden" }}>
      <div style={{ display:"flex",alignItems:"center",borderBottom:"1px solid #1c1c2c" }}>
        <span style={{ fontSize:8,color:"#333",padding:"0 5px",borderRight:"1px solid #1c1c2c",fontWeight:700,letterSpacing:0.5,whiteSpace:"nowrap" }}>{label}</span>
        <span style={{ padding:"5px 7px",fontSize:11,fontWeight:600,color:col1,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{flag(t1)} {t1}</span>
      </div>
      <div style={{ display:"flex",alignItems:"center" }}>
        <span style={{ fontSize:8,color:"#0f0f1a",padding:"0 5px",borderRight:"1px solid #1c1c2c",fontWeight:700 }}>{label}</span>
        <span style={{ padding:"5px 7px",fontSize:11,fontWeight:600,color:col2,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{flag(t2)} {t2}</span>
      </div>
    </div>
  );
}

// ── Standings Tab ─────────────────────────────────────────────────────────────
function StandingsTab({ activePlayers, scores, predictions, results, groupFilter, setGroupFilter, calcScoreBreakdown, pointsForResult }) {
  const sorted = [...activePlayers.map((p,i) => ({ name:p||`P${i+1}`,score:scores[i],idx:i,color:COLORS[i],emoji:PLAYER_EMOJIS[i] }))]
    .filter(p=>p.name).sort((a,b)=>b.score-a.score);

  return (
    <div>
      <STitle>Leaderboard</STitle>
      {!activePlayers.some(p=>p) ? (
        <div style={{ color:"#555",fontSize:14 }}>Add player names in Setup first.</div>
      ) : (
        <>
          {/* Score cards */}
          <div style={{ display:"flex",gap:8,marginBottom:16,flexWrap:"wrap" }}>
            {sorted.map((p,rank) => {
              const bd = calcScoreBreakdown(p.idx);
              return (
                <div key={p.idx} style={{ flex:"1 1 90px",minWidth:80,background:`${p.color}12`,border:`2px solid ${rank===0?p.color:p.color+"44"}`,borderRadius:10,padding:"8px 6px",textAlign:"center",position:"relative" }}>
                  {rank===0 && <div style={{ position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",fontSize:14 }}>👑</div>}
                  <div style={{ fontSize:18,marginTop:rank===0?4:0 }}>{p.emoji}</div>
                  <div style={{ fontSize:11,fontWeight:700,color:p.color,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{p.name}</div>
                  <div style={{ fontSize:22,fontWeight:900,lineHeight:1 }}>{p.score}</div>
                  <div style={{ fontSize:9,color:"#555",letterSpacing:1,marginBottom:4 }}>#{rank+1}</div>
                  <div style={{ fontSize:9,color:"#444",lineHeight:1.5 }}>
                    <div>Grps: {bd.group}</div>
                    <div>Bonus: {bd.bonus}</div>
                    {Object.entries(bd.knockout).map(([k,v]) => v>0 && <div key={k}>{k}: {v}</div>)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Group breakdown */}
          <div style={{ fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>Group Breakdown</div>
          <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:10 }}>
            {Object.keys(GROUPS).map(g => (
              <button key={g} className="grp-btn" onClick={() => setGroupFilter(g)}
                style={{ background:groupFilter===g?"#f97316":"#12121c",color:groupFilter===g?"#000":"#888",border:`1px solid ${groupFilter===g?"#f97316":"#222"}` }}>
                {g}
              </button>
            ))}
          </div>
          {GROUP_MATCHES.filter(m=>m.group===groupFilter).map(m => {
            const actual=results[m.id];
            return (
              <div key={m.id} style={{ background:"#0c0c18",border:"1px solid #181828",borderRadius:7,padding:"7px 10px",marginBottom:5 }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4 }}>
                  <span style={{ fontSize:11,color:"#444" }}>{m.date}</span>
                  <span style={{ fontSize:12,fontWeight:600 }}>{flag(m.home)} {m.home} <span style={{color:"#444"}}>vs</span> {flag(m.away)} {m.away}</span>
                  <span style={{ fontSize:12,color:actual?"#3b82f6":"#333" }}>{actual?`${actual.home}-${actual.away}`:"TBD"}</span>
                </div>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                  {activePlayers.map((p,pi) => p ? (
                    <div key={pi} style={{ display:"flex",alignItems:"center",gap:4 }}>
                      <span style={{ fontSize:11,color:COLORS[pi],fontWeight:700 }}>{p}</span>
                      <span style={{ fontSize:11,color:"#555" }}>{predictions[pi]?.[m.id]?`${predictions[pi][m.id].home??"-"}-${predictions[pi][m.id].away??"-"}`:"?"}</span>
                      {actual && <MiniPts pts={pointsForResult(predictions[pi]?.[m.id],actual)}/>}
                    </div>
                  ) : null)}
                </div>
              </div>
            );
          })}

          {/* Knockout breakdown */}
          <div style={{ marginTop:16,fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>Knockout Results</div>
          {KNOCKOUT_ROUNDS_META.map(round => (
            <div key={round.id} style={{ marginBottom:14 }}>
              <div style={{ fontSize:11,color:"#666",fontWeight:700,marginBottom:6 }}>{round.label} (+{round.pts} each)</div>
              {round.matchIds.map(mid => {
                const actual = results.knockoutWinners?.[mid];
                if (!actual) return null;
                return (
                  <div key={mid} style={{ background:"#0c0c18",border:"1px solid #181828",borderRadius:7,padding:"6px 10px",marginBottom:4 }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4 }}>
                      <span style={{ fontSize:10,color:"#444" }}>{mid}</span>
                      <span style={{ fontSize:12,fontWeight:700,color:"#10b981" }}>✓ {flag(actual)} {actual}</span>
                    </div>
                    <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                      {activePlayers.map((p,pi) => p ? (
                        <div key={pi} style={{ display:"flex",alignItems:"center",gap:4 }}>
                          <span style={{ fontSize:11,color:COLORS[pi],fontWeight:700 }}>{p}</span>
                          <span style={{ fontSize:11,color:"#555" }}>{predictions[pi]?.knockoutWinners?.[mid]||"?"}</span>
                          {actual && <MiniPts pts={predictions[pi]?.knockoutWinners?.[mid]===actual?round.pts:0}/>}
                        </div>
                      ) : null)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Bonus */}
          <div style={{ marginTop:4,fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>Bonus Questions</div>
          {BONUS_QUESTIONS.map(bq => {
            const actual=results[`bonus_${bq.id}`];
            return (
              <div key={bq.id} style={{ background:"#0c0c18",border:"1px solid #181828",borderRadius:7,padding:"7px 10px",marginBottom:5 }}>
                <div style={{ fontSize:12,fontWeight:600,marginBottom:4,color:"#ddd" }}>{bq.label}</div>
                {actual && <div style={{ fontSize:11,color:"#3b82f6",marginBottom:4 }}>✓ {actual}</div>}
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                  {activePlayers.map((p,pi) => p ? (
                    <div key={pi} style={{ display:"flex",alignItems:"center",gap:4 }}>
                      <span style={{ fontSize:11,color:COLORS[pi],fontWeight:700 }}>{p}</span>
                      <span style={{ fontSize:11,color:"#555" }}>{predictions[pi]?.bonus?.[bq.id]||"—"}</span>
                      {actual && <MiniPts pts={predictions[pi]?.bonus?.[bq.id]?.toLowerCase().trim()===actual.toLowerCase().trim()?SCORING.bonusQuestion:0} purple/>}
                    </div>
                  ) : null)}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── Shared Components ─────────────────────────────────────────────────────────
function STitle({ children }) {
  return (
    <div style={{ fontSize:15,fontWeight:900,letterSpacing:2,textTransform:"uppercase",color:"#f97316",marginBottom:14,borderBottom:"1px solid #181828",paddingBottom:6 }}>
      {children}
    </div>
  );
}
function PointsBadge({ pts }) {
  const bg = pts>=SCORING.exactScore?"#10b98120":pts>=SCORING.correctOutcome?"#f9731620":"#ffffff08";
  const cl = pts>=SCORING.exactScore?"#10b981":pts>=SCORING.correctOutcome?"#f97316":"#444";
  const br = pts>=SCORING.exactScore?"#10b98140":pts>=SCORING.correctOutcome?"#f9731640":"#1c1c2c";
  return (
    <div style={{ width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,background:bg,color:cl,border:`1px solid ${br}`,flexShrink:0 }}>
      +{pts}
    </div>
  );
}
function MiniPts({ pts, purple }) {
  const c = purple?(pts>0?"#a855f7":"#333"):(pts>=SCORING.exactScore?"#10b981":pts>=SCORING.correctOutcome?"#f97316":"#333");
  return (
    <span style={{ fontSize:10,fontWeight:700,color:c,background:c+"18",borderRadius:3,padding:"1px 5px" }}>
      {pts>0?`+${pts}`:"0"}
    </span>
  );
}
function GroupTable({ group, teams, results, highlight }) {
  const s = calcGroupStandings(group, teams, results);
  return (
    <div style={{ background:"#0c0c18",borderRadius:8,overflow:"hidden",border:"1px solid #181828",fontSize:12 }}>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 26px 26px 26px 26px 26px 34px",padding:"4px 10px",background:"#121220",color:"#444",fontSize:9,letterSpacing:1,textTransform:"uppercase" }}>
        <div>Team</div><div style={{textAlign:"center"}}>W</div><div style={{textAlign:"center"}}>D</div><div style={{textAlign:"center"}}>L</div><div style={{textAlign:"center"}}>GD</div><div style={{textAlign:"center"}}>GF</div><div style={{textAlign:"center",color:"#f97316"}}>Pts</div>
      </div>
      {s.map((row,i) => (
        <div key={row.team} style={{ display:"grid",gridTemplateColumns:"1fr 26px 26px 26px 26px 26px 34px",padding:"5px 10px",background:i%2===0?"#0c0c18":"#0a0a14",borderTop:"1px solid #121220" }}>
          <div style={{ display:"flex",alignItems:"center",gap:5 }}>
            {highlight && i<2  && <span style={{ width:3,height:12,borderRadius:1,background:i===0?"#f97316":"#3b82f6",display:"inline-block",flexShrink:0 }}/>}
            {highlight && i===2 && <span style={{ width:3,height:12,borderRadius:1,background:"#555",display:"inline-block",flexShrink:0 }}/>}
            <span style={{ whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{flag(row.team)} {row.team}</span>
          </div>
          <div style={{textAlign:"center",color:"#888"}}>{row.w}</div>
          <div style={{textAlign:"center",color:"#888"}}>{row.d}</div>
          <div style={{textAlign:"center",color:"#888"}}>{row.l}</div>
          <div style={{textAlign:"center",color:row.gd>0?"#10b981":row.gd<0?"#f43f5e":"#888"}}>{row.gd>0?"+":""}{row.gd}</div>
          <div style={{textAlign:"center",color:"#888"}}>{row.gf}</div>
          <div style={{textAlign:"center",fontWeight:700,color:"#f97316",fontSize:14}}>{row.pts}</div>
        </div>
      ))}
    </div>
  );
}
