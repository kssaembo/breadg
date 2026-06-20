import { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Play, Pause, RotateCcw, Trash2, Users, Settings, 
  ChevronRight, ChevronLeft, X, BookOpen, Download, HelpCircle, ShieldAlert, Sparkles, 
  Check, Plus, Minus, Lock, Unlock, Eye, EyeOff, Award, 
  Hourglass, Flame, EggOff, ExternalLink, RefreshCw, Ticket
} from 'lucide-react';
import { GameState, Team, RoundLog, TicketVote } from './types';

const LOCAL_STORAGE_KEY = "genius_abundance_famine_game_state_v1";

const DEFAULT_STATE: GameState = {
  totalRounds: 5,
  currentRound: 1,
  teams: [],
  logs: [],
  status: 'setup',
  resultsRevealed: false,
  timerDuration: 180, // 3 minutes standard
  timerSeconds: 180,
  timerIsActive: false,
};

// Initial stub data for text-area templates so the user can easily get started.
const DEFAULT_TEAMS_STRING = "1팀 (홍길동)\n2팀 (이순신)\n3팀 (세종대왕)\n4팀 (신사임당)\n5팀 (김구)\n6팀 (장영실)";

export default function App() {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.status === 'string') {
          return parsed;
        }
      } catch (err) {
        console.error("Failed to parse game state on load", err);
      }
    }
    return DEFAULT_STATE;
  });

  const [currentView, setCurrentView] = useState<'teacher' | 'student'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam === 'student' || viewParam === 'teacher') {
        return viewParam as 'teacher' | 'student';
      }
    }
    return 'teacher';
  });
  const [teamsString, setTeamsString] = useState(DEFAULT_TEAMS_STRING);
  const [showRules, setShowRules] = useState(false);
  const [showSyncGuild, setShowSyncGuid] = useState(false);
  const [showSplash, setShowSplash] = useState(() => state.status === 'setup');
  
  // Custom elegant dialog/confirm modal state
  interface DialogState {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void;
    type?: 'danger' | 'info' | 'warning' | 'success';
    isAlert?: boolean;
  }

  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '확인',
    cancelText: '취소',
    onConfirm: () => {},
    type: 'info',
    isAlert: false
  });

  const [isInAppStudentPopupOpen, setIsInAppStudentPopupOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  const showCustomConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info' | 'warning' | 'success';
    onConfirm: () => void;
  }) => {
    setDialog({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || '확인',
      cancelText: options.cancelText || '취소',
      type: options.type || 'info',
      onConfirm: () => {
        options.onConfirm();
        setDialog(prev => ({ ...prev, isOpen: false }));
      },
      isAlert: false
    });
  };

  const showCustomAlert = (title: string, message: string, type: 'danger' | 'info' | 'warning' | 'success' = 'warning') => {
    setDialog({
      isOpen: true,
      title: title,
      message: message,
      confirmText: '확인',
      onConfirm: () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
      },
      type: type,
      isAlert: true
    });
  };

  const handleOpenStudentPopup = () => {
    if (typeof window !== 'undefined') {
      const url = window.location.origin + window.location.pathname + '?view=student';
      const target = 'genius_abundance_famine_student_view';
      const features = 'width=1200,height=800,scrollbars=yes,resizable=yes';
      
      const popup = window.open(url, target, features);
      
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Pop-up block fallback - open overlay in-app popup modal instead
        setIsInAppStudentPopupOpen(true);
      }
    }
  };

  // Quick reveal states for Teacher input (per-team hover/reveal)
  const [revealedVotes, setRevealedVotes] = useState<{ [teamId: string]: boolean }>({});
  
  // Ref for playing sound effect
  const audioContextRef = useRef<AudioContext | null>(null);

  // Function to save state to localStorage and React state
  const saveGameState = (updater: GameState | ((prev: GameState) => GameState)) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Listen to standard storage events to sync across browser tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setState(parsed);
        } catch (err) {
          console.error("Storage state sync failed", err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Web Audio synth for clean classroom alarm sound
  const playBeep = (freq: number, duration: number, count: number = 1) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      let time = ctx.currentTime;
      for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration - 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + duration);
        time += duration + 0.15;
      }
    } catch (e) {
      console.warn("Audio synthesis failed:", e);
    }
  };

  // Timer Tick implementation. Only the window designated as 'teacher' performs the tick on the central clock!
  useEffect(() => {
    if (!state.timerIsActive || state.status !== 'playing') return;

    const interval = setInterval(() => {
      if (currentView === 'teacher') {
        saveGameState(prev => {
          if (prev.timerSeconds <= 1) {
            clearInterval(interval);
            playBeep(523.25, 0.4, 3); // High pitch notification beep on completion
            return {
              ...prev,
              timerSeconds: 0,
              timerIsActive: false
            };
          }
          // Periodic warnings in last 10 seconds
          if (prev.timerSeconds <= 11 && prev.timerSeconds > 1) {
            playBeep(440, 0.08); // simple soft warning click
          }
          return {
            ...prev,
            timerSeconds: prev.timerSeconds - 1
          };
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.timerIsActive, state.status, currentView]);

  // Compute round dependencies based on current setup in real-time
  const parseTeams = (raw: string): string[] => {
    return raw
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  const lines = parseTeams(teamsString);
  const calculatedTotalTeams = lines.length;
  const calculatedTotalBread = Math.max(1, calculatedTotalTeams - 2);
  const calculatedAbundanceBread = Math.round(calculatedTotalBread * 2 / 3);
  const calculatedFamineBread = calculatedTotalBread - calculatedAbundanceBread;

  // Initialize Game Action
  const handleStartGame = () => {
    const finalTeams = parseTeams(teamsString);
    if (finalTeams.length < 3) {
      showCustomAlert("학급 팀 부족", "⚠️ 게임을 시작하려면 최소 3개 팀 이상 필요합니다.", "danger");
      return;
    }

    const tks = state.totalRounds; // Default round-count as starting ticket pool
    const teams: Team[] = finalTeams.map((name, index) => ({
      id: `team_${index}_${Date.now()}`,
      name,
      tickets: tks,
      cumulativeBread: 0,
      currentVote: {
        votes: [{ id: 'v_0', choice: null }],
        isMasked: true
      }
    }));

    saveGameState({
      ...state,
      teams,
      currentRound: 1,
      logs: [],
      status: 'playing',
      resultsRevealed: false,
      timerSeconds: state.timerDuration,
      timerIsActive: false,
    });
    setRevealedVotes({});
    playBeep(587.33, 0.2, 1);
  };

  // Ticket handling helpers
  const addTicketRow = (teamId: string) => {
    saveGameState(prev => {
      const updated = prev.teams.map(t => {
        if (t.id === teamId) {
          const usedSoFar = t.currentVote.votes.length;
          if (usedSoFar < t.tickets) {
            const newVotes = [
              ...t.currentVote.votes,
              { id: `vote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, choice: null }
            ];
            return {
              ...t,
              currentVote: {
                ...t.currentVote,
                votes: newVotes
              }
            };
          } else {
            showCustomAlert("티켓 초과", "⚠️ 보유하고 있는 남은 티켓 범위를 초과하여 추가할 수 없습니다.", "warning");
          }
        }
        return t;
      });
      return { ...prev, teams: updated };
    });
    playBeep(587.33, 0.05, 1);
  };

  const removeTicketRow = (teamId: string, rowId: string) => {
    saveGameState(prev => {
      const updated = prev.teams.map(t => {
        if (t.id === teamId) {
          const newVotes = t.currentVote.votes.filter(v => v.id !== rowId);
          return {
            ...t,
            currentVote: {
              ...t.currentVote,
              votes: newVotes
            }
          };
        }
        return t;
      });
      return { ...prev, teams: updated };
    });
    playBeep(329.63, 0.05, 1);
  };

  const setTicketRowChoice = (teamId: string, rowId: string, choice: 'abundance' | 'famine' | null) => {
    saveGameState(prev => {
      const updated = prev.teams.map(t => {
        if (t.id === teamId) {
          const newVotes = t.currentVote.votes.map(v => {
            if (v.id === rowId) {
              return { ...v, choice };
            }
            return v;
          });
          return {
            ...t,
            currentVote: {
              ...t.currentVote,
              votes: newVotes
            }
          };
        }
        return t;
      });
      return { ...prev, teams: updated };
    });
    playBeep(523.25, 0.05, 1);
  };

  const toggleTeamMask = (teamId: string) => {
    saveGameState(prev => {
      const updated = prev.teams.map(t => {
        if (t.id === teamId) {
          return {
            ...t,
            currentVote: {
              ...t.currentVote,
              isMasked: !t.currentVote.isMasked
            }
          };
        }
        return t;
      });
      return { ...prev, teams: updated };
    });
  };

  // Add secret ticket to team (Ticket Purchase)
  const grantSecretTicket = (id: string, name: string) => {
    showCustomConfirm({
      title: '티켓 추가 구매 승인',
      message: `"${name}" 팀의 티켓 추가 구매(1장 승인)를 진행하시겠습니까?\n(교사가 즉시 1장을 추가 충전 처리합니다)`,
      confirmText: '구매 승인',
      cancelText: '취소',
      type: 'info',
      onConfirm: () => {
        saveGameState(prev => {
          const updated = prev.teams.map(t => {
            if (t.id === id) {
              return {
                ...t,
                tickets: t.tickets + 1
              };
            }
            return t;
          });
          return { ...prev, teams: updated };
        });
        playBeep(659.25, 0.15, 1);
      }
    });
  };

  // Calculate results for current round and transition
  const handleCalculateRound = () => {
    const unvotedTeams = state.teams.filter(t => t.currentVote.votes.length > 0 && t.currentVote.votes.some(v => v.choice === null));
    
    const calculate = () => {
      const tCount = state.teams.length;
      const roundBread = Math.max(1, tCount - 2);
      const roundAbundance = Math.round(roundBread * 2 / 3);
      const roundFamine = roundBread - roundAbundance;

      // 1. Group / Sum votes
      let sumAbundanceTickets = 0;
      let sumFamineTickets = 0;

      state.teams.forEach(t => {
        t.currentVote.votes.forEach(v => {
          if (v.choice === 'abundance') {
            sumAbundanceTickets += 1;
          } else if (v.choice === 'famine') {
            sumFamineTickets += 1;
          }
        });
      });

      // 2. Status check
      let abundanceStatus: 'bankrupt' | 'distributed' | 'empty' = 'empty';
      let famineStatus: 'bankrupt' | 'distributed' | 'empty' = 'empty';

      let abundanceRatio = 0;
      let famineRatio = 0;

      if (sumAbundanceTickets > 0) {
        if (sumAbundanceTickets > roundAbundance) {
          abundanceStatus = 'bankrupt';
        } else {
          abundanceStatus = 'distributed';
          abundanceRatio = Math.floor(roundAbundance / sumAbundanceTickets);
        }
      }

      if (sumFamineTickets > 0) {
        if (sumFamineTickets > roundFamine) {
          famineStatus = 'bankrupt';
        } else {
          famineStatus = 'distributed';
          famineRatio = Math.floor(roundFamine / sumFamineTickets);
        }
      }

      // 3. New state variables
      const updatedTeams = state.teams.map(team => {
        const votes = team.currentVote.votes;
        const abundanceSpent = votes.filter(v => v.choice === 'abundance').length;
        const famineSpent = votes.filter(v => v.choice === 'famine').length;
        const totalSpent = abundanceSpent + famineSpent;

        let earnedBread = 0;

        if (abundanceStatus === 'distributed') {
          earnedBread += abundanceSpent * abundanceRatio;
        }
        if (famineStatus === 'distributed') {
          earnedBread += famineSpent * famineRatio;
        }

        const decimalEarned = Math.round(earnedBread);
        const remains = Math.max(0, team.tickets - totalSpent);

        return {
          ...team,
          tickets: remains,
          cumulativeBread: Math.round(team.cumulativeBread + decimalEarned),
          currentVote: {
            votes: remains > 0 ? [{ id: 'v_0', choice: null as 'abundance' | 'famine' | null }] : [],
            isMasked: true
          }
        };
      });

      // Create current round log entry
      const logEntry: RoundLog = {
        round: state.currentRound,
        breadSupply: {
          abundance: roundAbundance,
          famine: roundFamine,
        },
        teamVotes: state.teams.map(t => {
          const votes = t.currentVote.votes;
          const abundanceSpent = votes.filter(v => v.choice === 'abundance').length;
          const famineSpent = votes.filter(v => v.choice === 'famine').length;
          const totalSpent = abundanceSpent + famineSpent;

          let earnedAbundance = 0;
          let earnedFamine = 0;
          if (abundanceStatus === 'distributed') {
            earnedAbundance = abundanceSpent * abundanceRatio;
          }
          if (famineStatus === 'distributed') {
            earnedFamine = famineSpent * famineRatio;
          }
          const totalEarned = earnedAbundance + earnedFamine;

          let logChoice: 'abundance' | 'famine' | 'mixed' | null = null;
          if (abundanceSpent > 0 && famineSpent > 0) {
            logChoice = 'mixed';
          } else if (abundanceSpent > 0) {
            logChoice = 'abundance';
          } else if (famineSpent > 0) {
            logChoice = 'famine';
          }

          return {
            teamId: t.id,
            teamName: t.name,
            choice: logChoice,
            ticketsUsed: totalSpent,
            abundanceTickets: abundanceSpent,
            famineTickets: famineSpent,
            breadEarned: Math.round(totalEarned),
          };
        }),
        totalTickets: {
          abundance: sumAbundanceTickets,
          famine: sumFamineTickets,
        },
        results: {
          abundanceStatus,
          famineStatus,
          abundanceRatio,
          famineRatio,
        }
      };

      saveGameState(prev => ({
        ...prev,
        teams: updatedTeams,
        logs: [...prev.logs, logEntry],
        status: 'round_ended',
        resultsRevealed: false,
        timerIsActive: false,
        timerSeconds: prev.timerDuration
      }));

      playBeep(523.25, 0.4, 2);
    };

    if (unvotedTeams.length > 0) {
      showCustomConfirm({
        title: '투표 결정 대기 팀 존재',
        message: `아직 모든 티켓의 땅 선택 또는 결정을 완료하지 않은 대기 팀들이 감지되었습니다:\n[ ${unvotedTeams.map(u => u.name).join(', ')} ]\n\n해당 빈 티켓들은 기원(기권) 처리하고 정산하시겠습니까?`,
        confirmText: '예, 빵 정산하기',
        cancelText: '아니오, 취소',
        type: 'warning',
        onConfirm: calculate
      });
    } else {
      calculate();
    }
  };

  // Rollback previous round completely
  const handleRollback = () => {
    if (state.logs.length === 0) {
      showCustomAlert("복구 불가", "이전 라운드 기록이 없습니다.", "warning");
      return;
    }

    showCustomConfirm({
      title: '라운드 강제 롤백(복구)',
      message: "정말로 직전 라운드로 롤백하시겠습니까?\n이전 라운드의 소모된 티켓 및 획득 상태가 완전 복원됩니다.",
      confirmText: '복구 완료',
      cancelText: '취소',
      type: 'warning',
      onConfirm: () => {
        const lastLog = state.logs[state.logs.length - 1];
        const prevLogs = state.logs.slice(0, -1);

        // Restore teams base attributes based on the log
        const restoredTeams = state.teams.map(currentTeam => {
          const matchLog = lastLog.teamVotes.find(v => v.teamId === currentTeam.id);
          if (matchLog) {
            const restoredBread = Math.max(0, Math.round(currentTeam.cumulativeBread - matchLog.breadEarned));
            
            // Reconstruct the matching votes layout
            const votesList: TicketVote[] = [];
            const abundanceTickets = matchLog.abundanceTickets || 0;
            const famineTickets = matchLog.famineTickets || 0;
            
            for (let i = 0; i < abundanceTickets; i++) {
              votesList.push({ id: `v_a_${Date.now()}_${i}`, choice: 'abundance' });
            }
            for (let i = 0; i < famineTickets; i++) {
              votesList.push({ id: `v_f_${Date.now()}_${i}`, choice: 'famine' });
            }
            if (votesList.length === 0 && matchLog.ticketsUsed > 0) {
              if (matchLog.choice === 'abundance') {
                for (let i = 0; i < matchLog.ticketsUsed; i++) {
                  votesList.push({ id: `v_${Date.now()}_${i}`, choice: 'abundance' });
                }
              } else if (matchLog.choice === 'famine') {
                for (let i = 0; i < matchLog.ticketsUsed; i++) {
                  votesList.push({ id: `v_${Date.now()}_${i}`, choice: 'famine' });
                }
              }
            }
            // Ensure least 1 blank vote if nothing spent but they have tickets
            if (votesList.length === 0) {
              votesList.push({ id: `v_0`, choice: null });
            }

            return {
              ...currentTeam,
              tickets: currentTeam.tickets + matchLog.ticketsUsed,
              cumulativeBread: restoredBread,
              currentVote: {
                votes: votesList,
                isMasked: false
              }
            };
          }
          return currentTeam;
        });

        saveGameState(prev => ({
          ...prev,
          teams: restoredTeams,
          logs: prevLogs,
          currentRound: lastLog.round,
          status: 'playing',
          resultsRevealed: false,
          timerIsActive: false,
          timerSeconds: prev.timerDuration
        }));
        playBeep(440, 0.3, 1);
      }
    });
  };

  // Go to next round or finish
  const handleAdvanceRound = () => {
    const isLastRound = state.currentRound >= state.totalRounds;

    if (isLastRound) {
      saveGameState(prev => ({
        ...prev,
        status: 'finished'
      }));
      playBeep(587.33, 0.5, 3);
    } else {
      saveGameState(prev => ({
        ...prev,
        currentRound: prev.currentRound + 1,
        status: 'playing',
        resultsRevealed: false,
        timerSeconds: prev.timerDuration,
        timerIsActive: false
      }));
      playBeep(659.25, 0.2, 1);
    }
  };

  const handleRevealResults = () => {
    saveGameState(prev => ({
      ...prev,
      resultsRevealed: true
    }));
    playBeep(440, 0.1, 2);
  };

  const handleResetGame = () => {
    showCustomConfirm({
      title: '게임 강제 초기화',
      message: '모든 현재 게임 진행 상황, 라운드 세부 내역 및 누적 빵 수치 점수가 완전 삭제됩니다. 초기 원본 사전 설정 화면으로 리셋하시겠습니까?',
      confirmText: '예, 초기화합니다',
      cancelText: '아니오, 취소',
      type: 'danger',
      onConfirm: () => {
        saveGameState({
          ...DEFAULT_STATE,
          totalRounds: state.totalRounds, // maintain current preferences
          timerDuration: state.timerDuration,
          timerSeconds: state.timerDuration,
        });
        setShowSplash(true);
        playBeep(220, 0.4);
      }
    });
  };

  // Generate CSV data download
  const handleCSVDownload = () => {
    if (state.logs.length === 0) {
      showCustomAlert("기록 없음", "저장할 게임 라운드 기록이 존재하지 않습니다.", "warning");
      return;
    }

    // Excel CSV-UTF8 compatibility with BOM
    let csvStr = "\uFEFF";
    csvStr += "라운드,팀명,선택한 땅,사용한 티켓수,획득한 빵,누적 빵\n";

    // Track running totals per round
    const currentScores: { [id: string]: number } = {};
    state.teams.forEach(t => { currentScores[t.id] = 0; });

    state.logs.forEach(log => {
      log.teamVotes.forEach(vote => {
        currentScores[vote.teamId] = Math.round((currentScores[vote.teamId] || 0) + vote.breadEarned);
        const land = vote.choice === 'abundance' ? '풍요의 땅' : vote.choice === 'famine' ? '기근의 땅' : '기권(0장)';
        csvStr += `${log.round},"${vote.teamName}",${land},${vote.ticketsUsed},${vote.breadEarned},${currentScores[vote.teamId]}\n`;
      });
    });

    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Abundance_Famine_Class_Log.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper formatting for clock display
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render Student Relay Screen (reusable for both normal switching and in-app overlay popups)
  const renderStudentView = (isPopupMode: boolean = false) => {
    return (
      <div className={`bg-white ${isPopupMode ? '' : 'border-2 border-slate-200 rounded-3xl shadow-md p-6 md:p-10'} space-y-10 flex-1 flex flex-col justify-between`}>
        {state.status === 'setup' ? (
          /* 0. SETUP SCREEN FOR CLIENTS */
          <div className="space-y-8 flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full text-center py-10">
            <div className="inline-flex p-5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 animate-pulse shadow-xs mx-auto">
              <Hourglass className="w-12 h-12" />
            </div>
            <div className="space-y-3.5">
              <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
                📢 풍요와 기근 게임 준비 중
              </h2>
              <p className="text-indigo-650 font-extrabold text-sm uppercase tracking-wider">
                지니어스한 우리 반 학급 놀이
              </p>
              <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed font-medium">
                현재 교사가 게임 라운드 및 팀 목록 세팅을 진행하고 있습니다. 교사 화면에서 [풍요와 기근 게임 시작] 버튼을 누르면 이 화면에 자동으로 게임판이 중계됩니다!
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold font-mono tracking-wider">Status: WAITING ON SETUP</span>
              <div className="flex gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping delay-150"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping delay-300"></span>
              </div>
            </div>
          </div>
        ) : state.status === 'finished' ? (
          /* 1. GAME COMPLETED PODIUM AND LEADERBOARD */
          <div className="space-y-8 flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
            
            {/* Header Celebration */}
            <div className="text-center space-y-3.5">
              <div className="inline-flex p-4 rounded-full bg-amber-100 text-amber-700 border border-amber-200/60 animate-bounce shadow-md">
                <Trophy className="w-12 h-12" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-indigo-600 tracking-tight">
                🎉 게임 종료! 최종 랭킹 발표 🎉
              </h2>
              <p className="text-slate-500 text-sm sm:text-base font-medium">
                치열했던 심리 전쟁이 모두 끝났습니다. 최종 성과에 따라 누적 빵 개수가 가장 많은 동맹/팀을 발표합니다!
              </p>
            </div>

            {/* Top 3 Podium layout */}
            {(() => {
              const sortedTeams = [...state.teams].sort((a, b) => b.cumulativeBread - a.cumulativeBread);
              const top1 = sortedTeams[0];
              const top2 = sortedTeams[1];
              const top3 = sortedTeams[2];

              return (
                <div className="pt-6">
                  <div className="grid grid-cols-3 items-end gap-2.5 sm:gap-4 max-w-2xl mx-auto mb-10">
                    
                    {/* 2nd place */}
                    {top2 && (
                      <div className="flex flex-col items-center">
                        <div className="text-center font-bold text-sm text-slate-850 mb-2 truncate max-w-full px-1.5">{top2.name}</div>
                        <div className="text-xs font-bold text-slate-500 mb-1">🍞 {top2.cumulativeBread}개</div>
                        <div className="w-full bg-slate-200 border-t border-slate-300 rounded-t-lg h-28 flex flex-col items-center justify-center shadow-xs">
                          <span className="text-2xl font-black text-slate-500 font-mono">2</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">Silver</span>
                        </div>
                      </div>
                    )}

                    {/* 1st place */}
                    {top1 && (
                      <div className="flex flex-col items-center">
                        <div className="text-center font-extrabold text-base text-amber-700 mb-2.5 flex items-center justify-center gap-1">
                          <Award className="w-4 h-4 text-amber-500" /> {top1.name}
                        </div>
                        <div className="text-sm font-extrabold text-amber-600 mb-1.5">🍞 {top1.cumulativeBread}개</div>
                        <div className="w-full bg-amber-100 border-2 border-amber-300 rounded-t-xl h-36 flex flex-col items-center justify-center shadow-md relative">
                          <div className="absolute -top-3.5 text-xl">👑</div>
                          <span className="text-4xl font-black text-amber-700 font-mono">1</span>
                          <span className="text-xs text-amber-800 font-bold uppercase tracking-wider mt-1">Champion</span>
                        </div>
                      </div>
                    )}

                    {/* 3rd place */}
                    {top3 && (
                      <div className="flex flex-col items-center">
                        <div className="text-center font-bold text-sm text-amber-900 mb-2 truncate max-w-full px-1.5">{top3.name}</div>
                        <div className="text-xs font-bold text-amber-850 mb-1">🍞 {top3.cumulativeBread}개</div>
                        <div className="w-full bg-amber-50 border-t border-amber-200 rounded-t-lg h-24 flex flex-col items-center justify-center shadow-xs">
                          <span className="text-2xl font-black text-amber-800 font-mono">3</span>
                          <span className="text-[10px] text-amber-800 font-bold uppercase mt-1">Bronze</span>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Remainder Leaderboard lists */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="bg-slate-250 font-bold text-xs text-slate-700 px-4 py-2 border-b">
                      전체 팀 누적 빵 수령 순위표
                    </div>
                    <div className="divide-y divide-slate-100">
                      {sortedTeams.map((t, idx) => (
                        <div key={t.id} className="px-4 py-3.5 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-500 font-mono text-center w-5">
                              {idx + 1}
                            </span>
                            <span className="font-extrabold text-slate-900">{t.name}</span>
                          </div>
                          <span className="font-extrabold text-indigo-700 font-mono text-base">
                            🍞 {t.cumulativeBread} 개
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        ) : (
          /* 2. ONGOING IN-GAME VIEW FOR CLIENTS/STUDENTS */
          <div className="space-y-6 flex-1 flex flex-col justify-between">
            
            {/* Top status indicator header */}
            <div className="text-center space-y-1">
              <h2 className="text-4xl font-black font-display text-slate-850 tracking-tight flex items-center justify-center gap-2">
                ROUND <span className="text-indigo-600 font-mono">{state.currentRound}</span> / {state.totalRounds}
              </h2>
              <p className="text-slate-400 text-xs tracking-wider uppercase font-bold">
                더 지니어스: 풍요와 기근 전광판
              </p>
            </div>

            {/* Middle Core Panel toggles (Main Timer vs Status results) */}
            <div>
              {state.status === 'playing' ? (
                /* CURRENT ROUND IN INTERACTION TIMER DISPLAY */
                <div className="space-y-12">
                  
                  {/* Mega Countdown visual */}
                  <div className="text-center space-y-3">
                    <p className="text-xs font-bold text-slate-500 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span> 
                      남은 토의 및 투표 제출 시간
                    </p>
                    <div className={`text-6xl sm:text-8xl md:text-9xl font-black font-mono tracking-widest text-slate-900 select-all ${
                      state.timerSeconds <= 10 && state.timerSeconds > 0 ? 'text-rose-600 animate-pulse' : ''
                    }`}>
                      {formatTime(state.timerSeconds)}
                    </div>
                  </div>

                  {/* Allocation of Breads to Lands (BIG EMOJIS CARD) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 max-w-4xl mx-auto w-full">
                    
                    {/* Abundance card */}
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6.5 text-center shadow-xs space-y-4">
                      <span className="text-5xl inline-block select-none filter drop-shadow-sm">🍞</span>
                      <div>
                        <h3 className="font-display font-extrabold text-lg text-emerald-900 mb-1">
                          풍요의 땅 (Abundance Land)
                        </h3>
                        <p className="text-xs text-slate-500">배정된 자원 빵 공급량 (약 66%)</p>
                      </div>
                      <div className="flex items-center justify-center flex-wrap gap-1.5">
                        {Array.from({ length: activeAbundanceBread }).map((_, i) => (
                          <span key={i} className="text-3xl animate-pulse">🍞</span>
                        ))}
                      </div>
                      <div className="text-2xl font-black text-emerald-800 font-mono">
                        {activeAbundanceBread} 개 배정
                      </div>
                    </div>

                    {/* Famine card */}
                    <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6.5 text-center shadow-xs space-y-4">
                      <span className="text-5xl inline-block select-none filter drop-shadow-sm">🏜️</span>
                      <div>
                        <h3 className="font-display font-extrabold text-lg text-amber-900 mb-1">
                          기근의 땅 (Famine Land)
                        </h3>
                        <p className="text-xs text-slate-500">배정된 자원 빵 공급량 (약 33%)</p>
                      </div>
                      <div className="flex items-center justify-center flex-wrap gap-1.5">
                        {Array.from({ length: activeFamineBread }).map((_, i) => (
                          <span key={i} className="text-3xl animate-pulse">🍞</span>
                        ))}
                      </div>
                      <div className="text-2xl font-black text-amber-800 font-mono">
                        {activeFamineBread} 개 배정
                      </div>
                    </div>

                  </div>

                </div>
              ) : (
                /* REVEAL SCREEN RESULTS: EXCLUDING INDIVIDUAL BREW AND SCORES */
                <div className="space-y-12">
                  
                  {/* Wait block if teacher hasnt clicked reveal yet */}
                  {!state.resultsRevealed ? (
                    <div className="text-center py-16 px-4 space-y-6">
                      <div className="inline-flex relative">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 animate-ping"></span>
                        <div className="bg-indigo-600 text-white p-5 rounded-full relative shadow-md">
                          <Lock className="w-10 h-10 animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900">
                          투표 마감 및 결과 수렴 완료
                        </h3>
                        <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
                          교사가 제어반에서 전광판 결과 공개 승인을 대기 중입니다. 대표들은 결과를 확인하기위해 대형 스크린을 집중해 주십시오!
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* THE MEGA REVEAL SCREEN! */
                    <div className="space-y-10">
                      
                      <div className="text-center space-y-2">
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
                          Round {state.logs[state.logs.length - 1]?.round} 무기명 결과 전광판
                        </h3>
                        <p className="text-slate-500 font-bold text-sm">
                          나에게 배정된 빵이 몇 개일지 확인하고 누적된 빵의 개수를 계산하세요.
                        </p>
                      </div>

                      {(() => {
                        const lastLog = state.logs[state.logs.length - 1];
                        if (!lastLog) return null;

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
                            
                            {/* Abundance visual details */}
                            <div className="rounded-3xl border-2 p-8 text-center space-y-6 transition-all shadow-md bg-emerald-50/50 border-emerald-300">
                              <div className="space-y-2">
                                <div className="flex items-center justify-center flex-wrap gap-1 min-h-[30px] mb-1">
                                  {Array.from({ length: Math.round(lastLog.breadSupply.abundance) }).map((_, i) => (
                                    <span key={i} className="text-2xl">🍞</span>
                                  ))}
                                </div>
                                <h4 className="font-extrabold font-display text-lg text-emerald-900">풍요의 땅 배정 빵: {Math.round(lastLog.breadSupply.abundance)}개</h4>
                              </div>

                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs text-slate-500 font-bold">투표 된 총 티켓</p>
                                  <p className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-emerald-700">
                                    {lastLog.totalTickets.abundance} 장
                                  </p>
                                </div>
                                <div className="flex items-center justify-center flex-wrap gap-1 md:max-w-xs mx-auto p-2 bg-emerald-100/40 rounded-xl border border-emerald-200/55 min-h-[46px]">
                                  {lastLog.totalTickets.abundance === 0 ? (
                                    <span className="text-emerald-600/60 text-xs font-semibold">투표된 티켓 없음</span>
                                  ) : (
                                    Array.from({ length: lastLog.totalTickets.abundance }).map((_, i) => (
                                      <span key={i} className="text-xl" title="투표된 티켓">🎟️</span>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Famine visual details */}
                            <div className="rounded-3xl border-2 p-8 text-center space-y-6 transition-all shadow-md bg-amber-50/50 border-amber-300">
                              <div className="space-y-2">
                                <div className="flex items-center justify-center flex-wrap gap-1 min-h-[30px] mb-1">
                                  {Array.from({ length: Math.round(lastLog.breadSupply.famine) }).map((_, i) => (
                                    <span key={i} className="text-2xl">🍞</span>
                                  ))}
                                </div>
                                <h4 className="font-extrabold font-display text-lg text-amber-900">기근의 땅 배정 빵: {Math.round(lastLog.breadSupply.famine)}개</h4>
                              </div>

                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs text-slate-500 font-bold">투표 된 총 티켓</p>
                                  <p className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-amber-700">
                                    {lastLog.totalTickets.famine} 장
                                  </p>
                                </div>
                                <div className="flex items-center justify-center flex-wrap gap-1 md:max-w-xs mx-auto p-2 bg-amber-100/40 rounded-xl border border-amber-200/55 min-h-[46px]">
                                  {lastLog.totalTickets.famine === 0 ? (
                                    <span className="text-amber-600/60 text-xs font-semibold">투표된 티켓 없음</span>
                                  ) : (
                                    Array.from({ length: lastLog.totalTickets.famine }).map((_, i) => (
                                      <span key={i} className="text-xl" title="투표된 티켓">🎟️</span>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>

                          </div>
                        );
                      })()}

                      {/* Alert message advising groups to calculate manually */}
                      <div className="bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl p-5 max-w-2xl mx-auto flex items-start gap-3.5">
                        <span className="text-2xl shrink-0">💡</span>
                        <div className="text-xs text-slate-650 leading-relaxed font-semibold font-sans">
                          <p className="font-extrabold text-slate-900 text-sm mb-1 text-center md:text-left">
                            ★ 중요안내: 빵 지급 결과는 자동으로 누적되어 선생님이 관리합니다.<br />여러분도 자신에게 누적된 빵 개수를 확인하세요.
                          </p>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom visual guide and disclaimer footer */}
            <div className="pt-6 border-t border-slate-150 flex flex-col sm:flex-row justify-between items-center text-slate-400 text-[11px] gap-2">
              <p className="font-bold">지니어스한 학급 놀이: 풍요와 기근</p>
              <p>※ 교사 제어 데스크의 타이머와 실시간 완전 동기화가 유지 중입니다.</p>
            </div>

          </div>
        )}

      </div>
    );
  };

  // Confetti arrays generator for the victory celebration visual
  const [confetti, setConfetti] = useState<{ id: number; left: number; color: string; delay: number; duration: number }[]>([]);
  useEffect(() => {
    if (state.status === 'finished') {
      const list = Array.from({ length: 120 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'][Math.floor(Math.random() * 7)],
        delay: Math.random() * 4,
        duration: 2.5 + Math.random() * 3
      }));
      setConfetti(list);
    } else {
      setConfetti([]);
    }
  }, [state.status]);

  const activeBreadTotal = Math.max(1, state.teams.length - 2);
  const activeAbundanceBread = Math.round(activeBreadTotal * 2 / 3);
  const activeFamineBread = activeBreadTotal - activeAbundanceBread;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative overflow-hidden select-none pb-20">
      
      {/* Dynamic Confetti for final podium */}
      {confetti.map(c => (
        <div
          key={c.id}
          className="confetti z-50 pointer-events-none"
          style={{
            left: `${c.left}%`,
            '--confetti-color': c.color,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
          } as any}
        />
      ))}

      {/* Global Real-time Shared Banner & Control Rail */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold tracking-wider uppercase shadow-xs">
              더 지니어스
            </span>
            <h1 className="text-xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
              🌾 풍요와 기근 <span className="text-sm font-normal text-slate-500">Class Edition</span>
            </h1>
          </div>

          {/* Controller Switch & Mode Helper */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setCurrentView('teacher');
                setIsInAppStudentPopupOpen(false);
              }}
              className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                currentView === 'teacher' && !isInAppStudentPopupOpen
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-150 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🎓 교사 화면
            </button>
            <button
              onClick={handleOpenStudentPopup}
              className="px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="대형 스크린이나 다른 창에 연결하려면 클릭하세요(팝업 차단을 해제해 주세요)"
            >
              🖥️ 학생용 중계 화면 (새 창 팝업)
            </button>
            <button
              onClick={() => {
                setIsInAppStudentPopupOpen(true);
              }}
              className="px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg bg-slate-150 text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
              title="이 탭에서 바로 학생용 중계 화면을 팝업 레이어로 보여줍니다"
            >
              📺 이 탭에서 바로보기
            </button>
            <button
              onClick={() => setShowRules(!showRules)}
              className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              title="게임 규칙서"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Sync instructions panel if toggled */}
      {showSyncGuild && (
        <div className="bg-orange-50 border-b border-orange-150 py-3.5 px-4 text-orange-950 text-sm">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold flex items-center gap-1">
                🖥️ 2채널 듀얼 모니터 완벽 연동 기능 탑재!
              </p>
              <p className="text-xs text-orange-800 mt-1">
                이 브라우저 창을 <strong>한 개 더 열거나 다른 탭으로 띄워</strong> 학생용 모니터(빔 프로젝터 등)에 배치해 보세요. 
                그 화면을 <strong>[학생용 중계 화면]</strong>으로 설정하면, 교사용 관리자 페이지에서 조작하는 타이머, 투표 마감, 기근 수치 등이 
                별도의 외부 서버 없이도 실시간(Local Broadcast)으로 완벽 중계 및 연동됩니다!
              </p>
            </div>
            <button 
              onClick={() => setShowSyncGuid(false)}
              className="ml-auto text-xs font-bold text-orange-700 hover:text-orange-900 border border-orange-200 px-2 py-1 rounded"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Game Rules Panel overlay if toggled */}
      {showRules && (
        <div className="bg-blue-50 border-b border-blue-150 py-4 px-4 text-slate-800 text-sm">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-blue-900 text-base flex items-center gap-1.5 font-display">
                📋 지니어스 풍요와 기근 게임 규칙 요약
              </h3>
              <button 
                onClick={() => setShowRules(false)}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 border border-blue-300 px-2.5 py-1 rounded-md bg-white shadow-xs"
              >
                닫기
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700 leading-relaxed">
              <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-xs">
                <p className="font-bold text-blue-800 mb-1">1. 기본 세팅</p>
                <p>각 팀은 총 라운드 수 만큼의 티켓 보유 (예: 5라운드는 티켓 5장). 빵 수량은 <strong>[팀 수 - 2]개</strong>로 결정되며, 풍요의 땅에 대략 2/3, 기근의 땅에 1/3이 할당됩니다.</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-xs">
                <p className="font-bold text-blue-800 mb-1">2. 게임 진행</p>
                <p>매 라운드 팀원들은 풍요/기근 중 하나를 선택하고 티켓을 사용합니다. 특정 땅에 사용된 티켓 수가 그 땅에 배정된 빵의 수보다 많을 경우 아무도 빵을 획득하지 못합니다. 특정 땅에 사용된 티켓 수보다 그 땅에 배정된 빵의 수가 많을 경우 티켓 수에 따라 균등 배분됩니다.</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-xs">
                <p className="font-bold text-blue-800 mb-1">3. 추가 규칙 및 게임 종료</p>
                <p className="mb-1"><strong>게임 종료 :</strong> 라운드마다 획득한 빵의 수는 누적됩니다. 마지막 라운드가 종료되고 가장 많은 빵을 갖고 있는 팀이 우승합니다.</p>
                <p><strong>추가 규칙 :</strong> 한 라운드에서 티켓을 사용하지 않아도 되고 여러 장을 사용할 수도 있습니다.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 mt-6 flex-1 w-full flex flex-col">

        {currentView === 'student' ? (
          renderStudentView()
        ) : (
          <>
            {/* 1. SETUP STATUS VIEW */}
            {state.status === 'setup' && (
          showSplash ? (
            <div className="bg-amber-50/50 border-4 border-slate-900 rounded-3xl shadow-2xl p-6 md:p-12 max-w-2xl mx-auto w-full my-auto text-center relative overflow-hidden flex flex-col items-center">
              {/* Retro keyframes style injections inside an inline style tag */}
              <style>{`
                @keyframes pixel-drift-1 {
                  0% { transform: translate(0px, 0px) rotate(0deg); }
                  50% { transform: translate(30px, -15px) rotate(12deg); }
                  100% { transform: translate(0px, 0px) rotate(0deg); }
                }
                @keyframes pixel-drift-2 {
                  0% { transform: translate(0px, 0px) rotate(0deg); }
                  50% { transform: translate(-25px, 20px) rotate(-15deg); }
                  100% { transform: translate(0px, 0px) rotate(0deg); }
                }
                @keyframes pixel-pulse {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.05); }
                }
                .pixel-drift-1-class {
                  animation: pixel-drift-1 10s infinite steps(10);
                }
                .pixel-drift-2-class {
                  animation: pixel-drift-2 12s infinite steps(12);
                }
                .pixel-pulse-btn {
                  animation: pixel-pulse 2s infinite steps(5);
                }
                .pixel-grid {
                  background-image: linear-gradient(to right, rgba(217, 119, 6, 0.08) 2px, transparent 2px),
                                    linear-gradient(to bottom, rgba(217, 119, 6, 0.08) 2px, transparent 2px);
                  background-size: 16px 16px;
                }
                .pixel-border-retro {
                  box-shadow: 
                    0 0 0 4px #1e293b,
                    0 0 0 8px #f59e0b,
                    0 0 0 12px #1e293b;
                }
                .pixel-shadow-btn {
                  box-shadow: 4px 4px 0px 0px #1e293b;
                }
                .pixel-shadow-btn:active {
                  box-shadow: 1px 1px 0px 0px #1e293b;
                  transform: translate(3px, 3px);
                }
              `}</style>

              {/* Grid backdrop */}
              <div className="absolute inset-0 pixel-grid pointer-events-none z-0 opacity-80" />

              {/* Floating pixel themes */}
              <div className="absolute top-6 left-8 text-4xl pixel-drift-1-class opacity-70">🍞</div>
              <div className="absolute top-12 right-12 text-5xl pixel-drift-2-class opacity-60">🌾</div>
              <div className="absolute bottom-10 left-12 text-5xl pixel-drift-2-class opacity-50">🏜️</div>
              <div className="absolute bottom-16 right-8 text-4xl pixel-drift-1-class opacity-70">🍞</div>
              <div className="absolute top-1/3 left-[15%] text-2xl pixel-drift-2-class opacity-40">🥖</div>
              <div className="absolute top-[60%] right-[15%] text-3xl pixel-drift-1-class opacity-40">🎟️</div>

              {/* Pixelated board borders */}
              <div className="p-8 md:p-12 bg-white pixel-border-retro rounded-xl max-w-lg w-full relative z-10 my-4">
                
                {/* Decorative arcade header */}
                <div className="flex items-center justify-center gap-1.5 mb-6">
                  <div className="w-3 h-3 bg-red-500 rounded-none border border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,0.15)] animate-pulse"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-none border border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,0.15)] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-3 h-3 bg-green-500 rounded-none border border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,0.15)] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  <span className="text-[10px] font-mono font-extrabold text-slate-500 tracking-widest uppercase ml-1.5">CLASSROOM ARCADE</span>
                </div>

                {/* Big Main Title */}
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight font-display mb-3 select-none drop-shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
                  풍요와 기근 게임
                </h1>

                {/* Friendly subtitle */}
                <p className="text-amber-700 font-extrabold text-sm md:text-base tracking-wide mb-10 font-sans">
                  지니어스한 우리 반 학급 놀이
                </p>

                {/* Illustrated theme components */}
                <div className="flex items-center justify-center gap-4 mb-10 bg-amber-50/70 p-4 rounded-xl border border-amber-200/50">
                  <div className="text-center p-2.5 bg-white border-2 border-slate-800 rounded-lg shadow-[3px_3px_0px_#1e293b]">
                    <div className="text-3xl">🌾</div>
                    <span className="text-[10px] font-bold text-slate-500 block mt-1">풍요</span>
                  </div>
                  <div className="text-2xl text-slate-400 shrink-0">🤝</div>
                  <div className="text-center p-2.5 bg-white border-2 border-slate-800 rounded-lg shadow-[3px_3px_0px_#1e293b]">
                    <div className="text-3xl">🍞</div>
                    <span className="text-[10px] font-bold text-slate-500 block mt-1">보상 빵</span>
                  </div>
                  <div className="text-2xl text-slate-400 shrink-0">🤝</div>
                  <div className="text-center p-2.5 bg-white border-2 border-slate-800 rounded-lg shadow-[3px_3px_0px_#1e293b]">
                    <div className="text-3xl">🏜️</div>
                    <span className="text-[10px] font-bold text-slate-500 block mt-1 font-sans">기근</span>
                  </div>
                </div>

                {/* Glowing game start button & User manual button */}
                <div className="flex flex-col sm:flex-row gap-3.5 w-full">
                  <button
                    onClick={() => {
                      setShowSplash(false);
                      playBeep(523.25, 0.1); 
                      setTimeout(() => playBeep(659.25, 0.1), 100);
                      setTimeout(() => playBeep(783.99, 0.16), 200);
                    }}
                    className="pixel-pulse-btn pixel-shadow-btn flex-[1.2] py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg rounded-xl border-4 border-slate-900 transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    🎮 게임 시작
                  </button>
                  <button
                    onClick={() => {
                      playBeep(587.33, 0.12);
                      setGuideStep(0);
                      setIsGuideOpen(true);
                    }}
                    className="pixel-shadow-btn flex-1 py-4 bg-slate-100 hover:bg-white text-slate-950 font-bold text-lg rounded-xl border-4 border-slate-950 transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    📖 사용설명서
                  </button>
                </div>
              </div>

              {/* Decorative Press Start footer */}
              <p className="text-[10px] font-mono tracking-widest text-amber-700/80 uppercase font-bold mt-4 animate-pulse">
                PRESS START BUTTON TO ENTER SETTINGS
              </p>
            </div>
          ) : (
            <div className="bg-white border-4 border-slate-900 rounded-2xl shadow-md p-6 md:p-8 max-w-3xl mx-auto w-full my-auto animate-in fade-in duration-205">
              <h2 className="text-2xl font-bold font-display text-indigo-900 tracking-tight mb-2 text-center flex items-center justify-center gap-2">
                🎮 게임 초기 설정 <span className="text-xl">Setup Node</span>
              </h2>
              <p className="text-slate-500 text-sm text-center mb-8">
                학급 인원에 맞춰 라운드 수 및 팀 목록을 작성해 주세요.
              </p>

              <div className="space-y-6">
                {/* Round Setting slider */}
                <div className="bg-indigo-50/80 p-5 rounded-2xl border-2 border-indigo-400 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-slate-700 font-bold text-sm block flex items-center gap-1.5">
                      <Hourglass className="w-4 h-4 text-indigo-600" /> 총 게임 라운드 수
                    </label>
                    <span className="text-indigo-800 font-extrabold text-base bg-indigo-100 px-3 py-1 rounded-full font-mono">
                      {state.totalRounds} 라운드
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => saveGameState(prev => ({ ...prev, totalRounds: Math.max(1, prev.totalRounds - 1) }))}
                      className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors shadow-xs font-bold text-slate-800"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      value={state.totalRounds}
                      onChange={(e) => saveGameState(prev => ({ ...prev, totalRounds: parseInt(e.target.value) || 5 }))}
                      className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <button 
                      onClick={() => saveGameState(prev => ({ ...prev, totalRounds: Math.min(15, prev.totalRounds + 1) }))}
                      className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors shadow-xs font-bold text-slate-800"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1.5">
                    ※ 매 라운드 각 팀은 설정된 라운드 개수 분량인 {state.totalRounds}개의 생존 투표권을 최초 확보합니다. (최대 15라운드 제한)
                  </p>
                </div>

                {/* Direct-input and Arrow time adjuster */}
                <div className="bg-slate-100 p-5 rounded-2xl border-2 border-slate-400 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-slate-700 font-bold text-sm flex items-center gap-1.5">
                      ⏱️ 라운드 제한시간 설정
                    </label>
                    <span className="text-indigo-800 font-bold font-mono text-sm bg-indigo-100 px-2 py-0.5 rounded">
                      총 {Math.floor(state.timerDuration / 60)}분 {state.timerDuration % 60}초 ({state.timerDuration}초)
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-6 bg-white p-3.5 rounded-xl border-2 border-slate-300 shadow-3xs">
                    {/* Minute adjustable input with arrows */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-450 mb-1 font-sans">분 (MIN)</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const currentMin = Math.floor(state.timerDuration / 60);
                            const currentSec = state.timerDuration % 60;
                            const nextMin = Math.max(0, currentMin - 1);
                            const nextDuration = nextMin * 60 + currentSec;
                            saveGameState(prev => ({ ...prev, timerDuration: nextDuration, timerSeconds: nextDuration }));
                            playBeep(440, 0.05);
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer text-slate-700 font-extrabold transition-colors border border-slate-200"
                        >
                          ◀
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={Math.floor(state.timerDuration / 60)}
                          onChange={(e) => {
                            const min = Math.max(0, Math.min(99, parseInt(e.target.value) || 0));
                            const sec = state.timerDuration % 60;
                            const nextDuration = min * 60 + sec;
                            saveGameState(prev => ({ ...prev, timerDuration: nextDuration, timerSeconds: nextDuration }));
                          }}
                          className="w-14 text-center border-2 border-slate-250 rounded-lg p-1.5 font-bold font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => {
                            const currentMin = Math.floor(state.timerDuration / 60);
                            const currentSec = state.timerDuration % 60;
                            const nextMin = Math.min(99, currentMin + 1);
                            const nextDuration = nextMin * 60 + currentSec;
                            saveGameState(prev => ({ ...prev, timerDuration: nextDuration, timerSeconds: nextDuration }));
                            playBeep(440, 0.05);
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer text-slate-700 font-extrabold transition-colors border border-slate-200"
                        >
                          ▶
                        </button>
                      </div>
                    </div>

                    <span className="text-3xl font-black text-slate-300 self-center mt-4">:</span>

                    {/* Second adjustable input with arrows */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-450 mb-1 font-sans">초 (SEC)</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const currentMin = Math.floor(state.timerDuration / 60);
                            const currentSec = state.timerDuration % 60;
                            let nextSec = currentSec - 5;
                            let nextMin = currentMin;
                            if (nextSec < 0) {
                              if (nextMin > 0) {
                                nextMin -= 1;
                                nextSec = 55;
                              } else {
                                nextSec = 0;
                              }
                            }
                            const nextDuration = nextMin * 60 + nextSec;
                            saveGameState(prev => ({ ...prev, timerDuration: nextDuration, timerSeconds: nextDuration }));
                            playBeep(440, 0.05);
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer text-slate-700 font-extrabold transition-colors border border-slate-200"
                          title="-5초"
                        >
                          ◀
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={state.timerDuration % 60}
                          onChange={(e) => {
                            const min = Math.floor(state.timerDuration / 60);
                            const sec = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                            const nextDuration = min * 60 + sec;
                            saveGameState(prev => ({ ...prev, timerDuration: nextDuration, timerSeconds: nextDuration }));
                          }}
                          className="w-14 text-center border-2 border-slate-250 rounded-lg p-1.5 font-bold font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => {
                            const currentMin = Math.floor(state.timerDuration / 60);
                            const currentSec = state.timerDuration % 60;
                            let nextSec = currentSec + 5;
                            let nextMin = currentMin;
                            if (nextSec >= 60) {
                              nextMin += 1;
                              nextSec = nextSec % 60;
                            }
                            const nextDuration = nextMin * 60 + nextSec;
                            saveGameState(prev => ({ ...prev, timerDuration: nextDuration, timerSeconds: nextDuration }));
                            playBeep(440, 0.05);
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer text-slate-700 font-extrabold transition-colors border border-slate-200"
                          title="+5초"
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Teams Input area */}
                <div className="bg-slate-100 p-5 rounded-2xl border-2 border-slate-400 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-slate-700 font-bold text-sm block flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" /> 참여 팀 입력 (줄바꿈/엔터로 구분)
                    </label>
                    <span className="text-slate-550 text-xs font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                      설정된 줄 수: {calculatedTotalTeams}팀
                    </span>
                  </div>
                  <textarea
                    value={teamsString}
                    onChange={(e) => setTeamsString(e.target.value)}
                    placeholder="예시:&#10;홍길동팀&#10;이순신팀&#10;삼국지팀"
                    className="w-full h-44 p-3.5 border-2 border-slate-300 rounded-xl font-mono text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all resize-y shadow-3xs"
                  />
                </div>

                {/* Dynamic Game Resource Simulation Card */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm">
                  <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider mb-2">
                    ⚡ 게임에 반영될 내용
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-center">
                    <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                      <p className="text-slate-400 text-[10px]">전체 참여 팀 수</p>
                      <p className="font-display font-bold text-lg text-white">{calculatedTotalTeams} 개 팀</p>
                    </div>
                    <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                      <p className="text-slate-400 text-[10px]">기본 제공 티켓</p>
                      <p className="font-display font-bold text-lg text-indigo-400">{state.totalRounds} 장 / 팀당</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                      <p className="text-slate-400 text-[10px]">라운드당 총 빵 공급량</p>
                      <p className="font-display font-bold text-lg text-emerald-400">{calculatedTotalBread} 개</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-800 text-xs text-slate-300 grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🍞</span>
                      <div>
                        <p className="text-[10px] text-slate-400">풍요의 땅 배정량 (약 66%)</p>
                        <p className="font-bold text-emerald-300 text-sm">{calculatedAbundanceBread} 개</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏜️</span>
                      <div>
                        <p className="text-[10px] text-slate-400">기근의 땅 배정량 (약 33%)</p>
                        <p className="font-bold text-amber-300 text-sm">{calculatedFamineBread} 개</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Start game button */}
                <button
                  onClick={handleStartGame}
                  disabled={calculatedTotalTeams < 3}
                  className={`w-full py-4 rounded-xl text-base font-extrabold shadow-md transition-all flex items-center justify-center gap-2 ${
                    calculatedTotalTeams >= 3
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" /> 풍요와 기근 게임 시작 (Round 1)
                </button>
              </div>
            </div>
          )
        )}

        {/* 2. CHANNELS: ACTIVE GAME STATE */}
        {state.status !== 'setup' && (
          <div className="flex-1 flex flex-col gap-6">
            
            {/* 2-1: COMMON GAME SUMMARY BADGES */}
            <div className="bg-white border-2 border-slate-400 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="bg-slate-100 text-slate-800 border border-slate-200 text-xs px-3 py-1 rounded-md font-bold font-mono">
                  ROUND {state.currentRound} / {state.totalRounds}
                </span>
                <span className="text-slate-500 text-xs hidden sm:inline">|</span>
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  👥 <strong>{state.teams.length}</strong>개 팀 참가중
                </span>
                <span className="text-slate-500 text-xs hidden sm:inline">|</span>
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  🍞 라운드당 총 빵 공급량: <strong>{activeBreadTotal}개</strong>
                </span>
                <span className="text-slate-500 text-xs hidden sm:inline">|</span>
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  상태: 
                  {state.status === 'playing' ? (
                    <span className="text-blue-600 font-bold flex items-center gap-0.5">● 투표 진행중</span>
                  ) : state.status === 'round_ended' ? (
                    <span className="text-purple-600 font-bold flex items-center gap-0.5">● 정산 완료 {state.resultsRevealed ? '(전광판 공개)' : '(결과 대기)'}</span>
                  ) : (
                    <span className="text-emerald-600 font-bold flex items-center gap-0.5">🏆 최종 종료</span>
                  )}
                </span>
              </div>

              {/* Reset Game and Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetGame}
                  className="px-3 py-1.5 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 
                  {state.status === 'finished' ? '처음으로' : '게임 강제 리셋'}
                </button>
              </div>
            </div>

            {/* 2-2: CHANNELS SPLIT */}
            
            {/* VIEW A: TEACHER VIEW PANEL */}
            {currentView === 'teacher' && (
              <div className="space-y-6">
                
                {/* UPPER GRID AREA */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* TEACHER CARD LEFT/MIDDLE: TABLE AREA */}
                  <div className="lg:col-span-2">
                  
                  {/* MAIN PANEL */}
                  <div className="bg-white border-2 border-slate-400 rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-slate-900 border-b border-slate-800 p-4 shrink-0 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        <h3 className="font-display font-extrabold text-white text-base">
                          🗳️ 실시간 투표 현황
                        </h3>
                      </div>
                    </div>

                    {/* Team Selection Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold text-xs">
                            <th className="p-3.5">팀 정보 및 남은 티켓</th>
                            <th className="p-3.5 text-center">땅 선택하기</th>
                            <th className="p-3.5 text-center">티켓 추가 사용</th>
                            <th className="p-3.5 text-center">티켓 추가 구매</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {state.teams.map((team) => {
                            const votes = team.currentVote.votes || [];
                            const isVoted = votes.length > 0 && votes.every(v => v.choice !== null);
                            const isMask = team.currentVote.isMasked && state.status === 'playing';
                            const selfRevealed = revealedVotes[team.id] || false;

                            return (
                              <tr key={team.id} className="hover:bg-slate-50/50 transition-colors">
                                {/* 1. Team info */}
                                <td className="p-3.5">
                                  <div className="font-bold text-sm text-slate-900">{team.name}</div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-[10px] text-slate-450 font-bold">배정 티켓 현황:</span>
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono ${
                                      team.tickets === 0 
                                        ? 'bg-rose-100 text-rose-700' 
                                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                    }`}>
                                      🎟️ 소지 {team.tickets}장 | 잔여 {team.tickets - votes.length}장
                                    </span>
                                  </div>
                                </td>

                                {/* 2. Land Choice choice */}
                                <td className="p-3.5 text-center min-w-[240px]">
                                  {state.status === 'playing' ? (
                                    <div className="flex flex-col items-center justify-center gap-1.5">
                                      <div className="flex flex-col gap-2 py-1 select-none">
                                        {votes.length === 0 ? (
                                          <span className="text-slate-400 text-xs italic bg-slate-50 px-2.5 py-1 rounded-md border border-dashed select-none text-center">
                                            🎟️ 제출한 티켓 없음 (이번 라운드 기권)
                                          </span>
                                        ) : (
                                          votes.map((v, vIdx) => (
                                            <div key={v.id} className="flex items-center justify-center gap-2">
                                              <span className="text-[10px] font-mono text-slate-450 font-bold">티켓 #{vIdx + 1}</span>
                                              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                                <button
                                                  onClick={() => setTicketRowChoice(team.id, v.id, 'abundance')}
                                                  className={`px-2.5 py-1 text-xs font-black rounded-md transition-all cursor-pointer ${
                                                    v.choice === 'abundance'
                                                      ? 'bg-emerald-600 text-white shadow-xs'
                                                      : 'text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent'
                                                  }`}
                                                >
                                                  🍞 풍요
                                                </button>
                                                <button
                                                  onClick={() => setTicketRowChoice(team.id, v.id, 'famine')}
                                                  className={`px-2.5 py-1 text-xs font-black rounded-md transition-all cursor-pointer ${
                                                    v.choice === 'famine'
                                                      ? 'bg-amber-600 text-white shadow-xs'
                                                      : 'text-slate-650 hover:bg-white hover:text-slate-900 border border-transparent'
                                                  }`}
                                                >
                                                  🏜️ 기근
                                                </button>
                                                <button
                                                  onClick={() => setTicketRowChoice(team.id, v.id, null)}
                                                  className="px-1.5 py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-md transition-all cursor-pointer"
                                                >
                                                  취소
                                                </button>
                                              </div>
                                              <button
                                                onClick={() => removeTicketRow(team.id, v.id)}
                                                className="text-rose-450 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                                                title="티켓 행 삭제"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-100">
                                      정산 단계 (전체 투표 완료)
                                    </span>
                                  )}
                                </td>

                                {/* 3. Ticket addition (티켓 추가 사용) */}
                                <td className="p-3.5 text-center min-w-[130px]">
                                  {state.status === 'playing' ? (
                                    <div className="flex flex-col items-center justify-center space-y-1">
                                      <button
                                        onClick={() => addTicketRow(team.id)}
                                        disabled={votes.length >= team.tickets}
                                        className={`px-3 py-1.5 border border-dashed rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                                          votes.length >= team.tickets
                                            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                                            : 'bg-indigo-50 border-indigo-250 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 cursor-pointer'
                                        }`}
                                      >
                                        <Ticket className="w-3.5 h-3.5 text-indigo-500 fill-indigo-200" />
                                        티켓 추가
                                      </button>
                                      <span className="text-[10px] text-slate-500 font-semibold font-mono">
                                        사용가능 {team.tickets - votes.length}장 남음
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-600 font-semibold font-mono bg-slate-100 px-2.5 py-0.5 rounded text-xs select-none">
                                      정산 완료
                                    </span>
                                  )}
                                </td>

                                {/* 4. Secret Ticket purchase button (티켓 추가 구매) */}
                                <td className="p-3.5 text-center">
                                  <button
                                    onClick={() => grantSecretTicket(team.id, team.name)}
                                    className="p-1.5 bg-slate-150 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-lg text-slate-700 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                                    title="보너스 티켓 추가 구매"
                                  >
                                    🎟️ +1 구매
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* TEACHER CARD RIGHT: MASTER CONTROL & TIMERS */}
                <div className="lg:col-span-1">
                  
                  {/* MASTER ACTIONS STATUS CARD */}
                  <div className="bg-white border-2 border-slate-400 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-display font-extrabold text-slate-900 text-base mb-4 pb-2 border-b border-rose-50 flex items-center gap-1.5 text-indigo-900">
                      🗝️ 타이머&라운드 <span className="text-xs text-slate-400">Master Key</span>
                    </h3>

                    {/* Timer Panel */}
                    <div className="bg-slate-50 border border-slate-250 p-4.5 rounded-xl text-center space-y-3 mb-5">
                      <div className="text-5xl md:text-6xl font-black font-mono tracking-wider text-slate-900 py-1">
                        {formatTime(state.timerSeconds)}
                      </div>

                      <div className="flex gap-2">
                        {state.timerIsActive ? (
                          <button
                            onClick={() => saveGameState(prev => ({ ...prev, timerIsActive: false }))}
                            className="flex-1 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Pause className="w-3.5 h-3.5" /> 타이머 일시정지
                          </button>
                        ) : (
                          <button
                            onClick={() => saveGameState(prev => ({ ...prev, timerIsActive: true }))}
                            className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-750 text-white text-xs font-bold rounded-lg border border-blue-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" /> 타이머 가동
                          </button>
                        )}
                        <button
                          onClick={() => saveGameState(prev => ({ ...prev, timerSeconds: prev.timerDuration, timerIsActive: false }))}
                          className="px-3 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer"
                          title="타이머 초기화"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          onClick={() => saveGameState(prev => ({ ...prev, timerSeconds: prev.timerSeconds + 60 }))}
                          className="py-1 bg-white hover:bg-slate-100 text-[11px] text-slate-650 rounded border border-slate-200 font-bold"
                        >
                          +1분 연장
                        </button>
                        <button
                          onClick={() => saveGameState(prev => ({ ...prev, timerSeconds: Math.max(0, prev.timerSeconds - 60) }))}
                          className="py-1 bg-white hover:bg-slate-100 text-[11px] text-slate-650 rounded border border-slate-200 font-bold"
                        >
                          -1분 단축
                        </button>
                      </div>
                    </div>

                    {/* Sequential Progress Operations */}
                    <div className="space-y-3.5">
                      {state.status === 'playing' ? (
                        <div className="space-y-2">
                          <button
                            onClick={handleCalculateRound}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl border border-indigo-700 shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Lock className="w-4 h-4" /> 투표 마감 및 결과 계산
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          
                          {/* Reveal results to screen action */}
                          {!state.resultsRevealed ? (
                            <button
                              onClick={handleRevealResults}
                              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl border border-emerald-700 shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Sparkles className="w-4 h-4 fill-current text-amber-300" /> 📢 전광판에 결과 전격 공개!!
                            </button>
                          ) : (
                            <div className="bg-emerald-50 text-emerald-950 p-3 rounded-lg border border-emerald-100 text-xs text-center font-bold">
                              📢 학생 전광판 화면에 결과 수치가 노출되고 있습니다!
                            </div>
                          )}

                          {/* Advance/Next Round */}
                          <button
                            onClick={handleAdvanceRound}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl border border-indigo-700 shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {state.currentRound >= state.totalRounds 
                              ? '🏆 최종 우승자 확인하기' 
                              : `➡️ 다음 라운드 (${state.currentRound + 1}R) 진행`
                            }
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Rollback button */}
                      {state.logs.length > 0 && (
                        <button
                          onClick={handleRollback}
                          className="w-full py-2.5 bg-slate-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer col-span-2"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> 라운드 강제 롤백 (복구)
                        </button>
                      )}

                      {/* Download Log option */}
                      <button
                        onClick={handleCSVDownload}
                        disabled={state.logs.length === 0}
                        className={`w-full py-2.5 font-bold text-xs rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                          state.logs.length > 0 
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-bold'
                            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed font-bold'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" /> 게임 로그 CSV 파일로 저장
                      </button>
                    </div>

                  </div>

                </div>

              </div> {/* Close UPPER GRID AREA */}

              {/* Bottom full-width areas */}
              {/* SUB PANEL: REAL-TIME ROUND CALCULATOR RESULTS PREVIEW */}
              {state.status === 'round_ended' && (
                <div className="bg-indigo-900 text-white rounded-2xl p-6 border-2 border-indigo-950 shadow-md">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-indigo-800">
                    <h4 className="font-display font-bold text-lg flex items-center gap-2 text-indigo-100">
                      📊 이번 라운드 정산 완료 <span className="text-sm font-normal text-indigo-300">(교사 전용 데이터 보드)</span>
                    </h4>
                    <span className="bg-indigo-800 text-indigo-200 text-xs px-2 py-0.5 rounded font-mono font-bold">
                      ROUND {state.logs[state.logs.length - 1]?.round}
                    </span>
                  </div>

                  {(() => {
                    const lastLog = state.logs[state.logs.length - 1];
                    if (!lastLog) return null;

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Abundance outcome */}
                          <div className="bg-indigo-950/75 p-4 rounded-xl border border-indigo-800">
                            <p className="text-xs text-indigo-400 font-bold mb-1">🍞 풍요의 땅 정산 현황</p>
                            <div className="space-y-1.5 text-xs text-slate-300">
                              <p>배정된 빵: <span className="text-white font-bold">{lastLog.breadSupply.abundance}개</span></p>
                              <p>투표된 티켓: <span className="text-indigo-300 font-bold">{lastLog.totalTickets.abundance}장</span></p>
                              <p className="pt-1.5 flex items-center gap-2 border-t border-indigo-900 text-sm mt-2">
                                결과: 
                                {lastLog.results.abundanceStatus === 'bankrupt' ? (
                                  <span className="text-rose-400 font-bold">💥 과수요 파산 (팀별 0개 수령)</span>
                                ) : lastLog.results.abundanceStatus === 'distributed' ? (
                                  <span className="text-emerald-400 font-bold">🎉 지급 성공 (1장당 {Math.round(lastLog.results.abundanceRatio)}개)</span>
                                ) : (
                                  <span className="text-slate-400">시행 안 됨 (티켓 없음)</span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Famine outcome */}
                          <div className="bg-indigo-950/75 p-4 rounded-xl border border-indigo-800">
                            <p className="text-xs text-indigo-400 font-bold mb-1">🏜️ 기근의 땅 정산 현황</p>
                            <div className="space-y-1.5 text-xs text-slate-300">
                              <p>배정된 빵: <span className="text-white font-bold">{lastLog.breadSupply.famine}개</span></p>
                              <p>투표된 티켓: <span className="text-indigo-300 font-bold">{lastLog.totalTickets.famine}장</span></p>
                              <p className="pt-1.5 flex items-center gap-2 border-t border-indigo-900 text-sm mt-2">
                                결과: 
                                {lastLog.results.famineStatus === 'bankrupt' ? (
                                  <span className="text-rose-400 font-bold">💥 과수요 파산 (팀별 0개 수령)</span>
                                ) : lastLog.results.famineStatus === 'distributed' ? (
                                  <span className="text-emerald-400 font-bold">🎉 지급 성공 (1장당 {Math.round(lastLog.results.famineRatio)}개)</span>
                                ) : (
                                  <span className="text-slate-400">시행 안 됨 (티켓 없음)</span>
                                )}
                              </p>
                            </div>
                          </div>

                        </div>

                        {/* Detailed team breakdown for teacher audit */}
                        <div className="bg-indigo-950/50 p-4.5 rounded-xl border border-indigo-800 text-xs">
                          <p className="font-bold mb-2.5 text-indigo-250 border-b border-indigo-900 pb-1 flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-emerald-400" /> 팀별 개별 빵 획득 수량 (즉시 누적 계산됨)
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                            {lastLog.teamVotes.map((v, i) => {
                              const exactTeam = state.teams.find(t => t.id === v.teamId);
                              const cumulative = exactTeam ? exactTeam.cumulativeBread : 0;
                              return (
                                <div key={i} className="flex justify-between items-center text-slate-300 py-0.5">
                                  <span>{v.teamName}</span>
                                  <span className="font-mono text-white text-right">
                                    {v.choice === 'abundance' ? '🍞 풍요' : v.choice === 'famine' ? '🏜️ 기근' : '기권'} ({v.ticketsUsed}장) ➡️ <strong className="text-emerald-400 font-extrabold">+{v.breadEarned}개</strong> <span className="text-indigo-300 font-bold text-[11px] font-sans ml-1.5">(누적 {cumulative}개)</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* HISTORIC LOG TABLE (TEACHER REPORT) */}
              <div className="bg-white border-2 border-slate-400 rounded-2xl shadow-sm p-4 text-slate-800">
                <h4 className="font-display font-extrabold text-sm mb-3 text-slate-900 flex items-center justify-between">
                  📊 라운드별 상세 게임 로그
                  <span className="text-xs font-normal text-slate-500 font-mono">Total {state.logs.length} entries</span>
                </h4>
                {state.logs.length === 0 ? (
                  <p className="text-xs text-slate-400 p-6 text-center border border-dashed rounded-xl border-slate-200 bg-slate-50/50">
                    아직 기록이 없습니다. 라운드를 종료하면 자동으로 정교한 영구 기록 로그가 저장됩니다.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {state.logs.map((log, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <p className="font-bold text-slate-900">ROUND {log.round} 결과</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            풍요: 티켓합 {log.totalTickets.abundance}장 / 빵 {Math.round(log.breadSupply.abundance)}개 ({log.results.abundanceStatus === 'bankrupt' ? '파산' : `${Math.round(log.results.abundanceRatio)}개씩`}) | 
                            기근: 티켓합 {log.totalTickets.famine}장 / 빵 {Math.round(log.breadSupply.famine)}개 ({log.results.famineStatus === 'bankrupt' ? '파산' : `${Math.round(log.results.famineRatio)}개씩`})
                          </p>
                        </div>
                        <div className="flex gap-2 font-mono font-bold">
                          {log.teamVotes.map((v, sIdx) => {
                            // Let's locate the cumulative sum up to this log round!
                            let historicCumulative = 0;
                            for (let rIdx = 0; rIdx <= idx; rIdx++) {
                              const pastLog = state.logs[rIdx];
                              const pastVote = pastLog?.teamVotes.find(pv => pv.teamId === v.teamId);
                              if (pastVote) {
                                historicCumulative += pastVote.breadEarned;
                              }
                            }
                            return (
                              <span key={sIdx} className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-slate-750">
                                {v.teamName}:+{v.breadEarned} (누적 {historicCumulative}개)
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          </div>
        )}
          </>
        )}
      </main>

      {/* Global floating footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-3.5 text-center bg-slate-100 border-t border-slate-200 text-xs text-slate-600 font-medium z-10">
        <span>ⓒ 2026. Kwon's class. All rights reserved.</span>
      </footer>

      {/* IN-APP OVERLAY POPUP MODAL (Fallback when OS window.open popup is blocked) */}
      {isInAppStudentPopupOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-slate-200 overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                  🖥️ 학생 화면
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-500 hidden md:inline font-semibold">
                  💡 주소창 우측에서 팝업을 허용하시면 아예 별개의 진짜 듀얼모니터용 브라우저 창으로 전송해 띄울 수 있습니다.
                </span>
                <button
                  onClick={() => setIsInAppStudentPopupOpen(false)}
                  className="px-3 py-1 bg-slate-200 text-slate-700 hover:bg-rose-100 hover:text-rose-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  ✖ 닫기
                </button>
              </div>
            </div>
            
            {/* Modal Content - Reuses student relay screen perfectly */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50/50">
              {renderStudentView(true)}
            </div>
          </div>
        </div>
      )}

      {/* GAME USE GUIDE SIDE-SLIDE SHOW DIALOG */}
      {isGuideOpen && (() => {
        const guideSlides = [
          {
            title: "🌾 풍요와 기근 게임의 목표",
            emoji: "🌾",
            subtitle: "해당 지역의 빵을 분배받기 위한 전략 학급 놀이",
            content: (
              <div className="space-y-4 text-left py-2 font-sans">
                <div className="bg-amber-50 border-2 border-amber-200/65 p-6 rounded-2xl space-y-3.5 shadow-xs">
                  <h5 className="font-extrabold text-amber-950 text-base md:text-lg flex items-center gap-2">
                    🎯 게임의 목표
                  </h5>
                  <p className="text-slate-750 text-sm md:text-base leading-relaxed font-semibold">
                    각 팀은 매 라운드마다 소유한 티켓을 활용해 <strong>'풍요의 땅'</strong> 또는 <strong>'기근의 땅'</strong>으로 이동하게 됩니다. 해당 지역의 빵의 개수를 균등하게 나누거나 균등하게 나눌 수 없을 경우 빵을 얻을 수 없습니다. 최종적으로 누적된 빵이 가장 많은 사람(팀)이 우승합니다.
                  </p>
                </div>
              </div>
            )
          },
          {
            title: "🔁 게임의 전개 과정",
            emoji: "🔁",
            subtitle: "게임 단계별 기본 프로세스 안내",
            content: (
              <div className="space-y-4 text-left font-sans">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-3xs hover:border-amber-300 transition-all">
                    <div className="w-7 h-7 bg-slate-900 text-white rounded-full text-xs font-black flex items-center justify-center mb-2.5">1</div>
                    <h5 className="font-black text-slate-900 text-sm mb-1.5">게임 사전 설정</h5>
                    <p className="text-xs text-slate-650 leading-relaxed font-medium">
                      게임 라운드 수, 제한시간, 참여 팀(학생)을 사전에 설정합니다. 각 팀에 제공되는 티켓 수는 라운드 횟수와 같으며 풍요의 땅과 기근의 땅에 배정되는 빵의 개수는 2:1로 자동 배정됩니다.
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-3xs hover:border-amber-300 transition-all">
                    <div className="w-7 h-7 bg-slate-900 text-white rounded-full text-xs font-black flex items-center justify-center mb-2.5">2</div>
                    <h5 className="font-black text-slate-900 text-sm mb-1.5">게임 진행</h5>
                    <p className="text-xs text-slate-650 leading-relaxed font-medium">
                      라운드가 진행되는 시간 동안 학생들은 갖고 있는 티켓을 활용해 풍요의 땅으로 갈지, 기근의 땅으로 갈지를 결정합니다. 한 라운드 당 사용할 수 있는 티켓의 수에는 제한이 없습니다.
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-3xs hover:border-amber-300 transition-all">
                    <div className="w-7 h-7 bg-slate-900 text-white rounded-full text-xs font-black flex items-center justify-center mb-2.5">3</div>
                    <h5 className="font-black text-slate-900 text-sm mb-1.5">게임 종료</h5>
                    <p className="text-xs text-slate-650 leading-relaxed font-medium">
                      매 라운드가 종료될 때마다 각각의 땅에 간 학생의 수가 공개됩니다. 그리고 최종 라운드가 끝나고 가장 많은 빵을 소유한 학생(팀)이 승리하게 됩니다.
                    </p>
                  </div>
                </div>
              </div>
            )
          },
          {
            title: "세부 규칙 : 균등 분배",
            emoji: "⚖️",
            subtitle: "소수점 없는 정수 단위 지급 및 탈락 원칙",
            content: (
              <div className="space-y-4 text-left font-sans">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 border-2 border-emerald-200 p-4.5 rounded-2xl space-y-3">
                    <h5 className="font-extrabold text-emerald-950 text-xs md:text-sm leading-snug">
                      1. 특정 땅에 투표 된 티켓 수보다 배정된 빵의 수가 더 많다면 모든 학생은 균등하게 빵을 분배 받습니다.
                    </h5>
                    <div className="bg-white/85 p-3 rounded-xl border border-emerald-100 space-y-1.5 text-[11px] text-emerald-900 font-semibold leading-relaxed">
                      <p><strong>예)</strong> 풍요의 땅에 배정된 빵 6개, 투표 된 티켓 수가 4개라면 해당 학생들은 빵을 1개씩 분배 받음</p>
                      <p><strong>예)</strong> 풍요의 땅에 배정된 빵 6개, 투표 된 티켓 수가 3개라면 해당 학생들은 빵을 2개씩 분배 받음</p>
                    </div>
                  </div>

                  <div className="bg-rose-50 border-2 border-rose-200 p-4.5 rounded-2xl space-y-3">
                    <h5 className="font-extrabold text-rose-950 text-xs md:text-sm leading-snug">
                      2. 특정 땅에 투표 된 티켓 수보다 배정된 빵의 수가 더 적다면 모든 학생은 빵을 분배 받지 못합니다.
                    </h5>
                    <div className="bg-white/85 p-3 rounded-xl border border-rose-100 text-[11px] text-rose-900 font-semibold leading-relaxed">
                      <p><strong>예)</strong> 기근의 땅에 배정된 빵 3개, 투표 된 티켓 수가 4개라면 해당 학생들은 빵을 분배 받지 못함.</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          },
          {
            title: "풍요와 기근 서비스 운영 TIP",
            emoji: "💡",
            subtitle: "학급 놀이를 원활하게 진행하기 위한 최고의 팁",
            content: (
              <div className="space-y-3 text-left font-sans">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-start gap-2 shadow-3xs">
                    <span className="text-amber-500 font-extrabold text-sm">1.</span>
                    <p className="text-slate-650 leading-relaxed font-semibold">라운드 수는 학급 상황에 맞게 조절하세요. <strong>5라운드</strong>가 가장 적당합니다.</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-start gap-2 shadow-3xs">
                    <span className="text-amber-500 font-extrabold text-sm">2.</span>
                    <p className="text-slate-650 leading-relaxed font-semibold">라운드 시간은 선생님이 티켓을 조작하는 시간도 필요하므로 학생 수에 맞게 조절해 주세요. <strong>10분</strong> 정도가 적당합니다.</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-start gap-2 shadow-3xs">
                    <span className="text-amber-500 font-extrabold text-sm">3.</span>
                    <p className="text-slate-650 leading-relaxed font-semibold">개인전으로 할 수도 있지만 게임 성격 상 <strong>10~14명</strong> 정도의 플레이어가 적절하며, <strong>2인 1조</strong>로 팀을 구성하는 것도 좋습니다.</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-start gap-2 shadow-3xs">
                    <span className="text-amber-500 font-extrabold text-sm">4.</span>
                    <p className="text-slate-650 leading-relaxed font-semibold">교사 화면은 교사용 디바이스에만 띄우고, 학생용 TV화면에는 <strong>'학생용 중계 화면'</strong>을 연결해 주세요.</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-start gap-2 shadow-3xs">
                    <span className="text-amber-500 font-extrabold text-sm">5.</span>
                    <p className="text-slate-650 leading-relaxed font-semibold">학생들은 자신의 빵 개수 계산이나 전략 수립을 위해 <strong>메모장과 필기도구</strong>를 준비하도록 권장하세요.</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-start gap-2 shadow-3xs">
                    <span className="text-amber-500 font-extrabold text-sm">6.</span>
                    <p className="text-slate-100 font-semibold" style={{display: "none"}}></p>
                    <p className="text-slate-650 leading-relaxed font-semibold"><strong>티켓 추가 구매(가불 및 대출)</strong> 기능을 학급 경제활동이나 학급 보상 점수 시스템과 연계하여 운영할 수 있습니다.</p>
                  </div>
                </div>
              </div>
            )
          },
          {
            title: "교사 화면과 학생용 중계 화면 활용",
            emoji: "🖥️",
            subtitle: "교실 내 멀티스크린 구성 및 조작법 가이드",
            content: (
              <div className="space-y-4 text-left font-sans">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 shadow-3xs hover:border-indigo-300 transition-all">
                    <h5 className="font-extrabold text-indigo-950 text-xs md:text-sm flex items-center gap-1.5 mb-2">
                      📺 학생용 중계 화면
                    </h5>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                      교실 TV에 학생용 중계 화면을 띄워주세요. 라운드 타이머 및 라운드 종료 시 결과를 보여줍니다. 최종 결과도 확인할 수 있습니다.
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100 shadow-3xs hover:border-amber-300 transition-all">
                    <h5 className="font-extrabold text-amber-950 text-xs md:text-sm flex items-center gap-1.5 mb-2">
                      ⚙️ 교사 화면
                    </h5>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                      게임에 대한 사전 설정 및 라운드 티켓 사용을 제어합니다. 학생들은 교사에게 와서 티켓을 사용하면 교사가 교사 화면에서 반영합니다. 한 라운드에 여러 장의 티켓을 활용할 수도 있습니다. 타이머 시간을 유연하게 조작할 수 있고, 게임 상세 로그와 게임 결과를 다운로드할 수 있습니다.
                    </p>
                  </div>
                </div>

                {/* Highly highlighted video search tip */}
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2.5 text-[11px] font-bold text-amber-900 leading-relaxed shadow-3xs mt-2">
                  <span className="text-sm shrink-0">📺</span>
                  <span>유튜브에서 <strong>'지니어스 게임-풍요와 기근'</strong>으로 검색하시면 게임 소개 영상을 확인하실 수 있습니다.<br />본 서비스는 학급에 활용할 수 있게 변형되었습니다.</span>
                </div>
              </div>
            )
          }
        ];

        return (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200/60 overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200 flex flex-col md:h-[75vh] min-h-[540px] max-h-[90vh]">
              
              {/* Header top row */}
              <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shadow-xs">
                    📖
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      풍요와 기근 사용설명서
                    </h3>
                    <p className="text-[9px] text-amber-800 font-extrabold uppercase tracking-widest mt-0.5">
                      Classroom Guide Menu
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    playBeep(440, 0.1);
                    setIsGuideOpen(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                  title="설명서 닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Middle body section: Slide contents selection */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                
                {/* Header inside slide illustration */}
                <div className="text-center space-y-2">
                  <div className="inline-flex text-5xl bg-amber-50 p-3.5 pt-4 rounded-2xl border border-amber-200/55 mb-1">
                    {guideSlides[guideStep].emoji}
                  </div>
                  <h4 className="text-lg font-black text-slate-900 tracking-tight">
                    {guideSlides[guideStep].title}
                  </h4>
                  <p className="text-xs text-indigo-650 font-black">
                    {guideSlides[guideStep].subtitle}
                  </p>
                </div>

                {/* Real Content container */}
                <div className="bg-slate-50/50 p-4.5 rounded-2xl border border-slate-200/80">
                  {guideSlides[guideStep].content}
                </div>

              </div>

              {/* Footer containing navigation */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0 font-sans">
                
                {/* Left back button */}
                <button
                  disabled={guideStep === 0}
                  onClick={() => {
                    if (guideStep > 0) {
                      playBeep(493.88, 0.08);
                      setGuideStep(prev => prev - 1);
                    }
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    guideStep === 0 
                    ? 'text-slate-300 pointer-events-none' 
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 bg-white border border-slate-200 shadow-2xs'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> 이전
                </button>

                {/* Center dots navigation guide */}
                <div className="flex items-center gap-1.5">
                  {guideSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        playBeep(440 + idx * 40, 0.06);
                        setGuideStep(idx);
                      }}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        guideStep === idx 
                        ? 'w-6 bg-amber-500' 
                        : 'w-2 bg-slate-300 hover:bg-slate-400'
                      }`}
                      title={`${idx + 1}번째 정보로 가기`}
                    />
                  ))}
                </div>

                {/* Right forward or complete buttons */}
                {guideStep < guideSlides.length - 1 ? (
                  <button
                    onClick={() => {
                      playBeep(523.25 + guideStep * 30, 0.08);
                      setGuideStep(prev => prev + 1);
                    }}
                    className="flex items-center gap-1 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
                  >
                    다음 <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      playBeep(659.25, 0.12);
                      setIsGuideOpen(false);
                    }}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black cursor-pointer transition-all shadow-xs flex items-center gap-1 hover:scale-[1.02]"
                  >
                    확인 완료 👌
                  </button>
                )}

              </div>

            </div>
          </div>
        );
      })()}

      {/* CUSTOM POPUP CONFIRM & ALERT DESIGN PORTAL */}
      {dialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200/50 overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-150">
            {/* Title header */}
            <div className={`px-6 py-4 border-b flex items-center gap-2 ${
              dialog.type === 'danger' ? 'bg-rose-50 border-rose-100' :
              dialog.type === 'warning' ? 'bg-amber-50 border-amber-100' :
              dialog.type === 'success' ? 'bg-emerald-50 border-emerald-100' :
              'bg-blue-50 border-blue-100'
            }`}>
              <span className="text-lg">
                {dialog.type === 'danger' ? '🚨' :
                 dialog.type === 'warning' ? '⚠️' :
                 dialog.type === 'success' ? '✅' : '📢'}
              </span>
              <h3 className={`text-base font-extrabold ${
                dialog.type === 'danger' ? 'text-rose-900' :
                dialog.type === 'warning' ? 'text-amber-900' :
                dialog.type === 'success' ? 'text-emerald-900' :
                'text-blue-900'
              }`}>
                {dialog.title}
              </h3>
            </div>

            {/* Content body */}
            <div className="p-6">
              <p className="text-slate-650 text-sm whitespace-pre-line leading-relaxed font-semibold">
                {dialog.message}
              </p>
            </div>

            {/* Footer controls layout */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              {!dialog.isAlert && dialog.cancelText && (
                <button
                  onClick={() => setDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  {dialog.cancelText}
                </button>
              )}
              <button
                onClick={dialog.onConfirm}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer shadow-sm ${
                  dialog.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700' :
                  dialog.type === 'warning' ? 'bg-orange-500 hover:bg-orange-600' :
                  dialog.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* LEGACY_DEBRIS_REMOVED */}
    </div>
  );
}
