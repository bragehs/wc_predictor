import { useState, useEffect } from "react";
import {
  SCORING, KNOCKOUT_SCORING, BONUS_QUESTIONS,
  MAX_PLAYERS, COLORS, TABS, STORAGE_KEY,
} from "./config.js";
import { GROUPS, GROUP_MATCHES, flag } from "./data.js";
import {
  calcGroupStandings, calcGroupStandingsFromOutcomes,
  getQualifiers, getBestThirdPlaces,
  buildR32Bracket, getKnockoutMatchup,
  KNOCKOUT_ROUNDS_META, BRACKET_FEEDS,
} from "./bracketLogic.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
function groupIsComplete(g, results) {
  return GROUP_MATCHES.filter(m => m.group === g).every(m => {
    const r = results[m.id];
    return r && r.home !== "" && r.away !== "" && r.home != null && r.away != null;
  });
}

function pointsForOutcome(pred, actual) {
  if (!pred?.outcome) return 0;
  const h = parseInt(actual?.home), a = parseInt(actual?.away);
  if (isNaN(h) || isNaN(a)) return 0;
  const actualOutcome = h > a ? "H" : h < a ? "A" : "D";
  return pred.outcome === actualOutcome ? SCORING.correctOutcome : 0;
}

// Within equal-pts groups, respect the stored manual ordering
function applyManualOrder(standings, storedOrder) {
  if (!storedOrder || storedOrder.length === 0) return standings;
  const result = [];
  let i = 0;
  while (i < standings.length) {
    let j = i;
    while (j < standings.length - 1 && standings[j + 1].pts === standings[j].pts) j++;
    const group = standings.slice(i, j + 1);
    if (group.length <= 1) {
      result.push(...group);
    } else {
      result.push(...[...group].sort((a, b) => {
        const ia = storedOrder.indexOf(a.team);
        const ib = storedOrder.indexOf(b.team);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      }));
    }
    i = j + 1;
  }
  return result;
}

function getPredEffectiveOrder(pi, g, predictions) {
  const preds = predictions[pi] || {};
  const outcomes = Object.fromEntries(
    GROUP_MATCHES.filter(m => m.group === g).map(m => [m.id, preds[m.id]?.outcome || null])
  );
  const standings = calcGroupStandingsFromOutcomes(g, GROUPS[g], outcomes);
  return applyManualOrder(standings, preds.tableOrder?.[g]);
}

function buildPredQualifiers(pi, predictions) {
  const qualifiers = {};
  Object.entries(GROUPS).forEach(([g, teams]) => {
    const ordered = getPredEffectiveOrder(pi, g, predictions);
    qualifiers[g] = {
      first:  ordered[0]?.team || `${g}1`,
      second: ordered[1]?.team || `${g}2`,
      third:  ordered[2]?.team || `${g}3`,
      row:    ordered[2] || { team:`${g}3`, pts:0, gd:0, gf:0 },
    };
  });
  return qualifiers;
}

function buildPredR32(pi, predictions) {
  const q = buildPredQualifiers(pi, predictions);
  const picks = predictions[pi]?.thirdPlaces || [];
  return buildR32Bracket(q, picks.length === 8 ? picks : null);
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
  function setTableOrder(pi, group, order) {
    setPredictions(prev => ({
      ...prev,
      [pi]: { ...prev[pi], tableOrder: { ...(prev[pi]?.tableOrder||{}), [group]: order } },
    }));
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
  function setTiebreaker(group, type, team, val) {
    setResults(prev => ({
      ...prev,
      tiebreakers: {
        ...(prev.tiebreakers || {}),
        [group]: {
          ...(prev.tiebreakers?.[group] || {}),
          [type]: { ...(prev.tiebreakers?.[group]?.[type] || {}), [team]: val },
        },
      },
    }));
  }

  // ── Scoring ────────────────────────────────────────────────────────────────
  function calcScore(pi) {
    let score = 0;
    // Group match outcomes
    GROUP_MATCHES.forEach(m => {
      score += pointsForOutcome(predictions[pi]?.[m.id], results[m.id]);
    });
    // Table positions — only once all 6 group matches are played
    Object.entries(GROUPS).forEach(([g, teams]) => {
      if (!groupIsComplete(g, results)) return;
      const predOrder = getPredEffectiveOrder(pi, g, predictions).map(r => r.team);
      const actualS   = calcGroupStandings(g, teams, results);
      predOrder.forEach((team, idx) => {
        if (actualS[idx]?.team === team) score += SCORING.tablePosition;
      });
    });
    // Bonus questions
    BONUS_QUESTIONS.forEach(bq => {
      const pred   = predictions[pi]?.bonus?.[bq.id];
      const actual = results[`bonus_${bq.id}`];
      if (pred && actual && pred.toLowerCase().trim() === actual.toLowerCase().trim())
        score += bq.pts;
    });
    // Knockout rounds
    KNOCKOUT_ROUNDS_META.forEach(round => {
      round.matchIds.forEach(mid => {
        const pw = predictions[pi]?.knockoutWinners?.[mid];
        const aw = results.knockoutWinners?.[mid];
        if (pw && aw && pw === aw) score += round.pts;
      });
    });
    return score;
  }

  function calcScoreBreakdown(pi) {
    let outcomes = 0, table = 0, bonus = 0;
    const knockout = {};
    KNOCKOUT_ROUNDS_META.forEach(r => { knockout[r.id] = 0; });

    GROUP_MATCHES.forEach(m => {
      outcomes += pointsForOutcome(predictions[pi]?.[m.id], results[m.id]);
    });
    Object.entries(GROUPS).forEach(([g, teams]) => {
      if (!groupIsComplete(g, results)) return;
      const predOrder = getPredEffectiveOrder(pi, g, predictions).map(r => r.team);
      const actualS   = calcGroupStandings(g, teams, results);
      predOrder.forEach((team, idx) => {
        if (actualS[idx]?.team === team) table += SCORING.tablePosition;
      });
    });
    BONUS_QUESTIONS.forEach(bq => {
      const pred   = predictions[pi]?.bonus?.[bq.id];
      const actual = results[`bonus_${bq.id}`];
      if (pred && actual && pred.toLowerCase().trim() === actual.toLowerCase().trim())
        bonus += bq.pts;
    });
    KNOCKOUT_ROUNDS_META.forEach(round => {
      round.matchIds.forEach(mid => {
        const pw = predictions[pi]?.knockoutWinners?.[mid];
        const aw = results.knockoutWinners?.[mid];
        if (pw && aw && pw === aw) knockout[round.id] += round.pts;
      });
    });
    return { outcomes, table, bonus, knockout };
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
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#111;}
        ::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}
        .tab-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:8px 14px;transition:all 0.15s;background:transparent;}
        .match-row{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:6px;background:#12121c;border:1px solid #1c1c2c;margin-bottom:5px;}
        .grp-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:12px;font-weight:700;padding:5px 11px;border-radius:4px;transition:all 0.15s;letter-spacing:1px;}
        .bonus-input{width:100%;background:#080810;border:1.5px solid #252535;color:#fff;font-size:14px;padding:7px 10px;border-radius:6px;outline:none;font-family:'Barlow',Arial;}
        .bonus-input:focus{border-color:#f97316;}
        .bonus-input.actual{border-color:#3b82f6;}
        .hscroll{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;}
        .hscroll::-webkit-scrollbar{height:3px;}
        .pick-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:12px;font-weight:700;padding:6px 10px;border-radius:6px;transition:all 0.15s;text-align:left;width:100%;}
        .ko-team{flex:1;border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:11px;font-weight:600;padding:5px 8px;border-radius:5px;transition:all 0.15s;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .hub-btn{border:none;cursor:pointer;font-family:'Barlow Condensed',Arial;font-size:13px;font-weight:900;padding:5px 10px;border-radius:5px;transition:all 0.15s;letter-spacing:1px;min-width:32px;}
        .sort-btn{background:transparent;border:none;cursor:pointer;color:#555;font-size:13px;padding:1px 3px;line-height:1;transition:color 0.1s;}
        .sort-btn:hover{color:#aaa;}
        .sort-btn:disabled{cursor:default;color:#252535;}
        .score-input{width:36px;height:32px;background:#080810;border:1.5px solid #252535;color:#fff;font-size:16px;font-weight:700;text-align:center;border-radius:5px;outline:none;font-family:inherit;}
        .score-input:focus{border-color:#3b82f6;}
        .score-input.actual{border-color:#3b82f6;background:#0c1118;}
        .score-input.actual:focus{border-color:#60a5fa;}
      `}</style>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1a0800 0%,#080810 60%)",padding:"18px 16px 0",borderBottom:"1px solid #181828" }}>
        <div style={{ maxWidth:760,margin:"0 auto" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6 }}>
            <div>
              <div style={{ fontSize:20,fontWeight:900,letterSpacing:2,textTransform:"uppercase",lineHeight:1 }}>FIFA World Cup 2026</div>
              <div style={{ fontSize:11,color:"#f97316",letterSpacing:3,textTransform:"uppercase",fontWeight:600 }}>Prediction Tracker</div>
            </div>
          </div>
          {activePlayers.some(p=>p) && (
            <div className="hscroll" style={{ marginTop:8 }}>
              {activePlayers.map((p,i) => p ? (
                <div key={i} style={{ flexShrink:0,background:`${COLORS[i]}15`,border:`1.5px solid ${COLORS[i]}44`,borderRadius:8,padding:"4px 10px",minWidth:70,textAlign:"center" }}>
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
                  <div style={{ width:28,height:28,borderRadius:"50%",background:`${COLORS[i]}22`,border:`2px solid ${COLORS[i]}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:COLORS[i],flexShrink:0 }}>
                    {i+1}
                  </div>
                  <input placeholder={`Player ${i+1}`} value={players[i]}
                    onChange={e => { const p=[...players]; p[i]=e.target.value; setPlayers(p); }}
                    style={{ flex:1,background:"#12121c",border:`1.5px solid ${players[i]?COLORS[i]+"66":"#252535"}`,color:"#fff",padding:"6px 10px",borderRadius:7,fontSize:14,fontFamily:"'Barlow',Arial",outline:"none",minWidth:0 }}/>
                </div>
              ))}
            </div>
            <div style={{ padding:14,background:"#0d0d18",borderRadius:8,border:"1px solid #1c1c2c",fontSize:13,color:"#999",lineHeight:2 }}>
              <div style={{ color:"#3b82f6",fontWeight:700,marginBottom:4,fontSize:14 }}>Reglene</div>
              <div><b style={{color:"#fff"}}>+{SCORING.correctOutcome} pt</b> — riktig tips (H/U/B) per kamp</div>
              <div><b style={{color:"#fff"}}>+{SCORING.tablePosition} pt</b> — riktig tabellplassering per lag</div>
              <div style={{ marginTop:6,paddingTop:6,borderTop:"1px solid #1c1c2c" }}>
                {KNOCKOUT_ROUNDS_META.map(r => (
                  <div key={r.id}><b style={{color:"#fff"}}>+{r.pts} pts</b> — {r.label}</div>
                ))}
              </div>
              <div style={{ marginTop:6,paddingTop:6,borderTop:"1px solid #1c1c2c" }}>
                {BONUS_QUESTIONS.map(bq => (
                  <div key={bq.id}><b style={{color:"#fff"}}>+{bq.pts} pts</b> — {bq.label}</div>
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
            setTableOrder={setTableOrder}
            setBonusPred={setBonusPred}
            setThirdPlacesPred={setThirdPlacesPred}
            setKnockoutWinnerPred={setKnockoutWinnerPred}
            pointsForOutcome={pointsForOutcome}
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
            setTiebreaker={setTiebreaker}
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
            calcScoreBreakdown={calcScoreBreakdown}
          />
        )}
      </div>
    </div>
  );
}

// ── Predictions Tab ───────────────────────────────────────────────────────────
function PredictionsTab({ activePlayers, selectedPlayer, setSelectedPlayer, groupFilter, setGroupFilter, predictions, results, setPred, setTableOrder, setBonusPred, setThirdPlacesPred, setKnockoutWinnerPred, pointsForOutcome }) {
  const pi = selectedPlayer;

  return (
    <div>
      <STitle>Enter Predictions</STitle>
      {/* Player selector */}
      <div className="hscroll" style={{ marginBottom:12 }}>
        {activePlayers.map((p,i) => p ? (
          <button key={i} className="grp-btn" onClick={() => setSelectedPlayer(i)}
            style={{ background:selectedPlayer===i?COLORS[i]:"#12121c",color:selectedPlayer===i?"#000":"#aaa",border:`1px solid ${selectedPlayer===i?COLORS[i]:"#222"}`,flexShrink:0 }}>
            {p||`P${i+1}`}
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
          Bonus
        </button>
        <button className="grp-btn" onClick={() => setGroupFilter("BRACKET")}
          style={{ background:groupFilter==="BRACKET"?"#f43f5e":"#12121c",color:groupFilter==="BRACKET"?"#fff":"#888",border:`1px solid ${groupFilter==="BRACKET"?"#f43f5e":"#222"}` }}>
          Bracket
        </button>
      </div>

      {/* ── Group predictions ── */}
      {!["BONUS","BRACKET"].includes(groupFilter) && (() => {
        const pred = predictions[pi] || {};
        const outcomes = Object.fromEntries(
          GROUP_MATCHES.filter(m=>m.group===groupFilter).map(m=>[m.id, pred[m.id]?.outcome||null])
        );
        return (
          <>
            <div style={{ fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>
              Group {groupFilter} — {activePlayers[pi]||`Player ${pi+1}`}'s predictions
            </div>
            {GROUP_MATCHES.filter(m=>m.group===groupFilter).map(m => {
              const p = pred[m.id] || {};
              const actual = results[m.id];
              const outcome = p.outcome;
              return (
                <div key={m.id} className="match-row">
                  <span style={{ fontSize:10,color:"#444",minWidth:42,flexShrink:0 }}>{m.date}</span>
                  <span style={{ fontSize:12,flex:1,textAlign:"right",fontWeight:600,whiteSpace:"nowrap" }}>{flag(m.home)} {m.home}</span>
                  <div style={{ display:"flex",gap:3,flexShrink:0 }}>
                    {[["H","H"],["U","D"],["B","A"]].map(([label, val]) => (
                      <button key={val} className="hub-btn"
                        onClick={() => setPred(pi, m.id, "outcome", outcome===val ? null : val)}
                        style={{
                          background: outcome===val ? "#f97316" : "#0d0d1a",
                          color:      outcome===val ? "#000" : "#555",
                          border:     `1.5px solid ${outcome===val ? "#f97316" : "#252535"}`,
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize:12,flex:1,fontWeight:600,whiteSpace:"nowrap" }}>{flag(m.away)} {m.away}</span>
                  {actual && <PointsBadge pts={pointsForOutcome(p, actual)}/>}
                </div>
              );
            })}

            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:4 }}>
                Predicted standings
                <span style={{ color:"#333",marginLeft:6,textTransform:"none",letterSpacing:0 }}>— ↑↓ swap tied teams</span>
              </div>
              <GroupTableEditable
                group={groupFilter}
                teams={GROUPS[groupFilter]}
                outcomes={outcomes}
                storedOrder={pred.tableOrder?.[groupFilter]}
                onOrderChange={order => setTableOrder(pi, groupFilter, order)}
              />
            </div>
          </>
        );
      })()}

      {/* ── Bonus ── */}
      {groupFilter==="BONUS" && (
        <div>
          {BONUS_QUESTIONS.map(bq => {
            const pred   = predictions[pi]?.bonus?.[bq.id] || "";
            const actual = results[`bonus_${bq.id}`];
            const correct = actual && pred && pred.toLowerCase().trim() === actual.toLowerCase().trim();
            return (
              <div key={bq.id} style={{ marginBottom:16 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                  <span style={{ fontSize:13,fontWeight:700,color:"#ddd" }}>{bq.label}</span>
                  <span style={{ fontSize:10,background:"#f9731622",color:"#f97316",border:"1px solid #f9731640",borderRadius:4,padding:"1px 7px",fontWeight:700 }}>+{bq.pts} pts</span>
                </div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  <input className="bonus-input" placeholder="Your answer…" value={pred} onChange={e=>setBonusPred(pi,bq.id,e.target.value)}/>
                  {actual && <PointsBadge pts={correct?bq.pts:0}/>}
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

// ── Group Table Editable (predictions) ────────────────────────────────────────
function GroupTableEditable({ group, teams, outcomes, storedOrder, onOrderChange }) {
  const standings = calcGroupStandingsFromOutcomes(group, teams, outcomes);
  const effective = applyManualOrder(standings, storedOrder);

  const swap = (i, j) => {
    const newOrder = effective.map(r => r.team);
    [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
    onOrderChange(newOrder);
  };

  return (
    <div style={{ background:"#0c0c18",borderRadius:8,overflow:"hidden",border:"1px solid #181828",fontSize:12 }}>
      <div style={{ display:"grid",gridTemplateColumns:"28px 1fr 26px 26px 26px 38px 44px",padding:"4px 10px",background:"#121220",color:"#444",fontSize:9,letterSpacing:1,textTransform:"uppercase" }}>
        <div>#</div><div>Team</div>
        <div style={{textAlign:"center"}}>W</div>
        <div style={{textAlign:"center"}}>D</div>
        <div style={{textAlign:"center"}}>L</div>
        <div style={{textAlign:"center",color:"#f97316"}}>Pts</div>
        <div style={{textAlign:"center"}}>↑↓</div>
      </div>
      {effective.map((row, i) => {
        const canUp   = i > 0 && effective[i-1].pts === row.pts;
        const canDown = i < effective.length-1 && effective[i+1].pts === row.pts;
        const barColor = i===0?"#f97316":i===1?"#3b82f6":i===2?"#555":"transparent";
        return (
          <div key={row.team} style={{ display:"grid",gridTemplateColumns:"28px 1fr 26px 26px 26px 38px 44px",padding:"5px 10px",background:i%2===0?"#0c0c18":"#0a0a14",borderTop:"1px solid #121220",alignItems:"center" }}>
            <div style={{ display:"flex",alignItems:"center",gap:3 }}>
              <span style={{ width:3,height:12,borderRadius:1,background:barColor,flexShrink:0,display:"inline-block" }}/>
              <span style={{ color:"#555",fontSize:10 }}>{i+1}</span>
            </div>
            <div style={{ whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{flag(row.team)} {row.team}</div>
            <div style={{textAlign:"center",color:"#888"}}>{row.w}</div>
            <div style={{textAlign:"center",color:"#888"}}>{row.d}</div>
            <div style={{textAlign:"center",color:"#888"}}>{row.l}</div>
            <div style={{textAlign:"center",fontWeight:700,color:"#f97316",fontSize:14}}>{row.pts}</div>
            <div style={{ display:"flex",justifyContent:"center",gap:1 }}>
              <button className="sort-btn" onClick={() => canUp && swap(i,i-1)} disabled={!canUp}>↑</button>
              <button className="sort-btn" onClick={() => canDown && swap(i,i+1)} disabled={!canDown}>↓</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Bracket Predictions ───────────────────────────────────────────────────────
function BracketPredictions({ pi, playerName, predictions, results, setThirdPlacesPred, setKnockoutWinnerPred }) {
  const pred       = predictions[pi] || {};
  const thirdPicks = pred.thirdPlaces || [];
  const koWinners  = pred.knockoutWinners || {};

  const predQ = buildPredQualifiers(pi, predictions);

  const thirds = Object.entries(GROUPS).map(([g]) => ({
    group:g, team: predQ[g]?.third || `3rd ${g}`
  }));

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
            const sel  = thirdPicks.includes(group);
            const full = !sel && thirdPicks.length >= 8;
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
          {round.matchIds.map(mid => {
            const { home, away } = getKnockoutMatchup(mid, r32, koWinners);
            const winner  = koWinners[mid] || null;
            const actual  = results.knockoutWinners?.[mid];
            const correct = actual && winner && winner===actual;
            const wrong   = actual && winner && winner!==actual;
            const bothKnown = !home.startsWith("W(") && home!=="TBD" && !away.startsWith("W(") && away!=="TBD";

            return (
              <div key={mid} style={{ marginBottom:5 }}>
                <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                  <span style={{ fontSize:9,color:"#333",minWidth:34,fontWeight:700 }}>{mid}</span>
                  <button className="ko-team" onClick={() => bothKnown&&pickKO(mid,home)}
                    style={{
                      background: winner===home?"#f97316":"#12121c",
                      border:`1px solid ${winner===home?"#f97316":"#252535"}`,
                      color: winner===home?"#000":"#aaa",
                      cursor: bothKnown?"pointer":"default",
                      opacity: !bothKnown ? 0.5 : 1,
                    }}>
                    {flag(home)} {home}
                  </button>
                  <span style={{ color:"#333",fontSize:10,fontWeight:700,flexShrink:0 }}>vs</span>
                  <button className="ko-team" onClick={() => bothKnown&&pickKO(mid,away)}
                    style={{
                      background: winner===away?"#f97316":"#12121c",
                      border:`1px solid ${winner===away?"#f97316":"#252535"}`,
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
function ResultsTab({ groupFilter, setGroupFilter, results, setResult, setBonusResult, setKnockoutWinnerResult, setTiebreaker }) {
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
          Bonus
        </button>
        <button className="grp-btn" onClick={() => setGroupFilter("KNOCKOUT")}
          style={{ background:groupFilter==="KNOCKOUT"?"#f43f5e":"#12121c",color:groupFilter==="KNOCKOUT"?"#fff":"#888",border:`1px solid ${groupFilter==="KNOCKOUT"?"#f43f5e":"#222"}` }}>
          Knockout
        </button>
      </div>

      {/* Group results */}
      {!["BONUS","KNOCKOUT","BRACKET"].includes(groupFilter) && (
        <>
          {GROUP_MATCHES.filter(m=>m.group===groupFilter).map(m => {
            const actual = results[m.id] || {};
            return (
              <div key={m.id} className="match-row">
                <span style={{ fontSize:10,color:"#444",minWidth:42,flexShrink:0 }}>{m.date}</span>
                <span style={{ fontSize:12,flex:1,textAlign:"right",fontWeight:600,whiteSpace:"nowrap" }}>{flag(m.home)} {m.home}</span>
                <div style={{ display:"flex",alignItems:"center",gap:4,flexShrink:0 }}>
                  <input className="score-input actual" type="number" min={0} max={99}
                    value={actual.home ?? ""}
                    onChange={e => setResult(m.id, "home", e.target.value)}
                    placeholder="0"/>
                  <span style={{ color:"#333",fontSize:11 }}>–</span>
                  <input className="score-input actual" type="number" min={0} max={99}
                    value={actual.away ?? ""}
                    onChange={e => setResult(m.id, "away", e.target.value)}
                    placeholder="0"/>
                </div>
                <span style={{ fontSize:12,flex:1,fontWeight:600,whiteSpace:"nowrap" }}>{flag(m.away)} {m.away}</span>
              </div>
            );
          })}
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:6 }}>Group {groupFilter} Standings</div>
            <GroupTable group={groupFilter} teams={GROUPS[groupFilter]} results={results} highlight/>
          </div>
          <TiebreakerSection group={groupFilter} results={results} setTiebreaker={setTiebreaker}/>
        </>
      )}

      {/* Bonus results */}
      {groupFilter==="BONUS" && (
        <div>
          <div style={{ fontSize:10,color:"#444",letterSpacing:1,textTransform:"uppercase",marginBottom:10 }}>Bonus — enter actual answers</div>
          {BONUS_QUESTIONS.map(bq => (
            <div key={bq.id} style={{ marginBottom:12 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5 }}>
                <span style={{ fontSize:13,fontWeight:600,color:"#ddd" }}>{bq.label}</span>
                <span style={{ fontSize:10,background:"#3b82f622",color:"#3b82f6",border:"1px solid #3b82f640",borderRadius:4,padding:"1px 7px" }}>+{bq.pts} pts</span>
              </div>
              <input className="bonus-input actual" placeholder="Actual answer…" value={results[`bonus_${bq.id}`]||""} onChange={e=>setBonusResult(bq.id,e.target.value)}/>
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
          Actual
        </button>
        {activePlayers.map((p,i) => p ? (
          <button key={i} className="grp-btn" onClick={() => setBracketView(i)}
            style={{ background:bracketView===i?COLORS[i]:"#12121c",color:bracketView===i?"#000":"#888",border:`1px solid ${bracketView===i?COLORS[i]:"#222"}`,flexShrink:0 }}>
            {p}
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
  const isTBD = t => !t || t.startsWith("W(") || t.endsWith("TBD") || (t.includes("1") && t.length<=3);
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
function StandingsTab({ activePlayers, scores, calcScoreBreakdown }) {
  const rows = activePlayers
    .map((p, i) => ({ name: p, score: scores[i], idx: i, bd: calcScoreBreakdown(i) }))
    .filter(p => p.name)
    .sort((a, b) => b.score - a.score);

  const koTotal = bd => Object.values(bd.knockout).reduce((s, v) => s + v, 0);

  const th = (extra) => ({
    padding:"9px 12px", fontWeight:600, fontSize:10, letterSpacing:1,
    textTransform:"uppercase", color:"#555", borderBottom:"1px solid #1c1c2c",
    background:"#121220", ...extra,
  });
  const td = (extra) => ({
    padding:"10px 12px", borderTop:"1px solid #121220", fontSize:13, ...extra,
  });

  return (
    <div>
      <STitle>Leaderboard</STitle>
      {rows.length === 0 ? (
        <div style={{ color:"#555",fontSize:14 }}>Add player names in Setup first.</div>
      ) : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
            <thead>
              <tr>
                <th style={th({ textAlign:"left",width:32 })}>#</th>
                <th style={th({ textAlign:"left" })}>Player</th>
                <th style={th({ textAlign:"right" })}>Outcomes</th>
                <th style={th({ textAlign:"right" })}>Table</th>
                <th style={th({ textAlign:"right" })}>KO</th>
                <th style={th({ textAlign:"right" })}>Bonus</th>
                <th style={th({ textAlign:"right", color:"#f97316" })}>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, rank) => {
                const ko = koTotal(p.bd);
                return (
                  <tr key={p.idx} style={{ background: rank%2===0?"#0c0c18":"#0a0a14" }}>
                    <td style={td({ color:"#555",fontSize:11 })}>{rank+1}</td>
                    <td style={td({})}>
                      <span style={{ color:COLORS[p.idx],fontWeight:700 }}>{p.name}</span>
                    </td>
                    <td style={td({ textAlign:"right",color:"#aaa" })}>{p.bd.outcomes}</td>
                    <td style={td({ textAlign:"right",color:"#aaa" })}>{p.bd.table}</td>
                    <td style={td({ textAlign:"right",color:"#aaa" })}>{ko}</td>
                    <td style={td({ textAlign:"right",color:"#aaa" })}>{p.bd.bonus}</td>
                    <td style={td({ textAlign:"right",fontWeight:900,fontSize:17,color:"#f97316" })}>{p.score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
  const on = pts > 0;
  return (
    <div style={{ width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,background:on?"#f9731620":"#ffffff08",color:on?"#f97316":"#444",border:`1px solid ${on?"#f9731640":"#1c1c2c"}`,flexShrink:0 }}>
      +{pts}
    </div>
  );
}
function MiniPts({ pts, purple }) {
  const c = purple ? (pts>0?"#a855f7":"#333") : (pts>0?"#f97316":"#333");
  return (
    <span style={{ fontSize:10,fontWeight:700,color:c,background:c+"18",borderRadius:3,padding:"1px 5px" }}>
      {pts>0?`+${pts}`:"0"}
    </span>
  );
}

function findTiedTeams(group, results) {
  const teams = GROUPS[group];
  if (!teams) return [];
  const s = calcGroupStandings(group, teams, results);
  const tied = new Set();
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) {
      if (s[i].pts === s[j].pts && s[i].gd === s[j].gd && s[i].gf === s[j].gf) {
        tied.add(s[i].team);
        tied.add(s[j].team);
      }
    }
  }
  return [...tied];
}

function TiebreakerSection({ group, results, setTiebreaker }) {
  const tiedTeams = findTiedTeams(group, results);
  if (tiedTeams.length === 0) return null;
  const tb = results.tiebreakers?.[group] || {};
  const inputStyle = { width:"100%",background:"#080810",border:"1.5px solid #252535",color:"#fff",fontSize:13,textAlign:"center",padding:"4px 6px",borderRadius:5,outline:"none",fontFamily:"inherit" };
  return (
    <div style={{ marginTop:12,padding:10,background:"#0d0d18",borderRadius:8,border:"1px solid #252535" }}>
      <div style={{ fontSize:10,color:"#555",letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>
        Tiebreakers — tied teams in Group {group}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 80px 80px",gap:6,alignItems:"center" }}>
        <div style={{ fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:1 }}>Team</div>
        <div style={{ fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:1,textAlign:"center" }}>Yellow</div>
        <div style={{ fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:1,textAlign:"center" }}>FIFA rank</div>
        {tiedTeams.flatMap(team => [
          <div key={team} style={{ fontSize:12,fontWeight:600 }}>{flag(team)} {team}</div>,
          <input key={team+"_yc"} type="number" min={0} style={inputStyle}
            value={tb.yellowCards?.[team] ?? ""}
            onChange={e => setTiebreaker(group, "yellowCards", team, e.target.value === "" ? undefined : parseInt(e.target.value))}
            placeholder="—"/>,
          <input key={team+"_fr"} type="number" min={1} style={inputStyle}
            value={tb.fifaRankings?.[team] ?? ""}
            onChange={e => setTiebreaker(group, "fifaRankings", team, e.target.value === "" ? undefined : parseInt(e.target.value))}
            placeholder="—"/>,
        ])}
      </div>
    </div>
  );
}
function GroupTable({ group, teams, results, highlight }) {
  if (!teams) return null;
  const s = calcGroupStandings(group, teams, results);
  return (
    <div style={{ background:"#0c0c18",borderRadius:8,overflow:"hidden",border:"1px solid #181828",fontSize:12 }}>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 26px 26px 26px 34px 34px",padding:"4px 10px",background:"#121220",color:"#444",fontSize:9,letterSpacing:1,textTransform:"uppercase" }}>
        <div>Team</div>
        <div style={{textAlign:"center"}}>W</div>
        <div style={{textAlign:"center"}}>D</div>
        <div style={{textAlign:"center"}}>L</div>
        <div style={{textAlign:"center"}}>GD</div>
        <div style={{textAlign:"center",color:"#f97316"}}>Pts</div>
      </div>
      {s.map((row,i) => (
        <div key={row.team} style={{ display:"grid",gridTemplateColumns:"1fr 26px 26px 26px 34px 34px",padding:"5px 10px",background:i%2===0?"#0c0c18":"#0a0a14",borderTop:"1px solid #121220" }}>
          <div style={{ display:"flex",alignItems:"center",gap:5 }}>
            {highlight && i<2  && <span style={{ width:3,height:12,borderRadius:1,background:i===0?"#f97316":"#3b82f6",display:"inline-block",flexShrink:0 }}/>}
            {highlight && i===2 && <span style={{ width:3,height:12,borderRadius:1,background:"#555",display:"inline-block",flexShrink:0 }}/>}
            <span style={{ whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{flag(row.team)} {row.team}</span>
          </div>
          <div style={{textAlign:"center",color:"#888"}}>{row.w}</div>
          <div style={{textAlign:"center",color:"#888"}}>{row.d}</div>
          <div style={{textAlign:"center",color:"#888"}}>{row.l}</div>
          <div style={{textAlign:"center",color:row.gd>0?"#10b981":row.gd<0?"#f43f5e":"#888"}}>{row.gd > 0 ? `+${row.gd}` : row.gd}</div>
          <div style={{textAlign:"center",fontWeight:700,color:"#f97316",fontSize:14}}>{row.pts}</div>
        </div>
      ))}
    </div>
  );
}
