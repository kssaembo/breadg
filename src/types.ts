export interface TicketVote {
  id: string;
  choice: 'abundance' | 'famine' | null;
}

export interface Team {
  id: string;
  name: string;
  tickets: number; // Current remaining tickets
  cumulativeBread: number; // Accrued score
  currentVote: {
    votes: TicketVote[];
    isMasked: boolean;
  };
}

export interface RoundLog {
  round: number;
  breadSupply: {
    abundance: number;
    famine: number;
  };
  teamVotes: {
    teamId: string;
    teamName: string;
    choice: 'abundance' | 'famine' | 'mixed' | null;
    ticketsUsed: number;
    abundanceTickets?: number;
    famineTickets?: number;
    breadEarned: number;
  }[];
  totalTickets: {
    abundance: number;
    famine: number;
  };
  results: {
    abundanceStatus: 'bankrupt' | 'distributed' | 'empty';
    famineStatus: 'bankrupt' | 'distributed' | 'empty';
    abundanceRatio: number;
    famineRatio: number;
  };
}

export interface GameState {
  totalRounds: number;
  currentRound: number;
  teams: Team[];
  logs: RoundLog[];
  status: 'setup' | 'playing' | 'round_ended' | 'finished';
  resultsRevealed: boolean;
  timerDuration: number; // in seconds
  timerSeconds: number;
  timerIsActive: boolean;
}
