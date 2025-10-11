package main

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/heroiclabs/nakama-common/runtime"
)

type GameState struct {
	Board       [9]string         `json:"board"`
	CurrentTurn string            `json:"currentTurn"`
	Players     map[string]string `json:"players"` // userID -> X or O
	Winner      string            `json:"winner"`
	GameOver    bool              `json:"gameOver"`
}

type TicTacToeMatch struct{}

func (m *TicTacToeMatch) MatchInit(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, params map[string]interface{}) (interface{}, int, string) {
	state := &GameState{
		Board:       [9]string{},
		Players:     make(map[string]string),
		CurrentTurn: "",
		Winner:      "",
		GameOver:    false,
	}

	tickRate := 1    // Updates per second
	label := "skill" // For matchmaking

	if mode, ok := params["mode"].(string); ok {
		label = mode
	}

	return state, tickRate, label
}

func (m *TicTacToeMatch) MatchJoinAttempt(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presence runtime.Presence, metadata map[string]string) (interface{}, bool, string) {
	gameState := state.(*GameState)

	if len(gameState.Players) >= 2 {
		return state, false, "Match is full"
	}

	return state, true, ""
}

func (m *TicTacToeMatch) MatchJoin(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presences []runtime.Presence) interface{} {
	gameState := state.(*GameState)

	for _, presence := range presences {
		if len(gameState.Players) == 0 {
			gameState.Players[presence.GetUserId()] = "X"
			gameState.CurrentTurn = presence.GetUserId()
		} else {
			gameState.Players[presence.GetUserId()] = "O"
		}
	}

	if len(gameState.Players) == 2 {
		m.broadcastState(dispatcher, gameState, 1)
	}

	return gameState
}

func (m *TicTacToeMatch) MatchLoop(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, messages []runtime.MatchData) interface{} {
	gameState := state.(*GameState)

	for _, msg := range messages {
		if msg.GetOpCode() == 1 { // Move op code
			var move struct {
				Position int `json:"position"`
			}
			if err := json.Unmarshal(msg.GetData(), &move); err != nil {
				continue
			}

			if m.isValidMove(gameState, msg.GetUserId(), move.Position) {
				symbol := gameState.Players[msg.GetUserId()]
				gameState.Board[move.Position] = symbol

				if winner := m.checkWinner(gameState.Board); winner != "" {
					gameState.Winner = winner
					gameState.GameOver = true
					m.updateLeaderboard(ctx, nk, gameState, logger)
				} else if m.isBoardFull(gameState.Board) {
					gameState.GameOver = true
				}

				m.switchTurn(gameState)
				m.broadcastState(dispatcher, gameState, 2)
			}
		}
	}

	return gameState
}

func (m *TicTacToeMatch) MatchLeave(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, presences []runtime.Presence) interface{} {
	gameState := state.(*GameState)

	for _, presence := range presences {
		delete(gameState.Players, presence.GetUserId())
	}

	if len(gameState.Players) < 2 && !gameState.GameOver {
		gameState.GameOver = true
		m.broadcastState(dispatcher, gameState, 3)
	}

	return gameState
}

func (m *TicTacToeMatch) MatchTerminate(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, graceSeconds int) interface{} {
	return state
}

func (m *TicTacToeMatch) MatchSignal(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, dispatcher runtime.MatchDispatcher, tick int64, state interface{}, data string) (interface{}, string) {
	return state, ""
}

// Helpers
func (m *TicTacToeMatch) isValidMove(state *GameState, userId string, position int) bool {
	return state.CurrentTurn == userId && position >= 0 && position < 9 && state.Board[position] == "" && !state.GameOver
}

func (m *TicTacToeMatch) checkWinner(board [9]string) string {
	lines := [][]int{{0, 1, 2}, {3, 4, 5}, {6, 7, 8}, {0, 3, 6}, {1, 4, 7}, {2, 5, 8}, {0, 4, 8}, {2, 4, 6}}
	for _, line := range lines {
		if board[line[0]] != "" && board[line[0]] == board[line[1]] && board[line[1]] == board[line[2]] {
			return board[line[0]]
		}
	}
	return ""
}

func (m *TicTacToeMatch) isBoardFull(board [9]string) bool {
	for _, cell := range board {
		if cell == "" {
			return false
		}
	}
	return true
}

func (m *TicTacToeMatch) switchTurn(state *GameState) {
	for userId := range state.Players {
		if userId != state.CurrentTurn {
			state.CurrentTurn = userId
			break
		}
	}
}

func (m *TicTacToeMatch) broadcastState(dispatcher runtime.MatchDispatcher, state *GameState, opCode int64) {
	data, _ := json.Marshal(state)
	dispatcher.BroadcastMessage(opCode, data, nil, nil, true)
}

func (m *TicTacToeMatch) updateLeaderboard(ctx context.Context, nk runtime.NakamaModule, state *GameState, logger runtime.Logger) {
	// Find winner's userId from the symbol
	var winnerUserId string
	for userId, symbol := range state.Players {
		if symbol == state.Winner {
			winnerUserId = userId
			break
		}
	}

	logger.Info("Updating leaderboard for game with winner symbol: %s, winner userId: %s", state.Winner, winnerUserId)

	for userId := range state.Players {
		var score int64    // for win count
		var subscore int64 // for loss count
		var metadata map[string]interface{}

		if userId == winnerUserId {
			// Winner
			score = 1 // 1 win
			subscore = 0
			// metadata = map[string]interface{}{
			// 	"wins":   1,
			// 	"losses": 0,
			// 	"draws":  0,
			// }
		} else if state.Winner == "" {
			// Draw
			score = 0
			subscore = 0
			// metadata = map[string]interface{}{
			// 	"wins":   0,
			// 	"losses": 0,
			// 	"draws":  1,
			// }
		} else {
			// Loss - still give 1 point to ensure record exists
			score = 0
			subscore = 1 // 1 loss
			// metadata = map[string]interface{}{
			// 	"wins":   0,
			// 	"losses": 1,
			// 	"draws":  0,
			// }
		}

		logger.Info("Writing leaderboard record: userId=%s, score=%d, subscore=%d", userId, score, subscore)

		_, err := nk.LeaderboardRecordWrite(ctx, "tictactoe_leaderboard", userId, "", score, subscore, metadata, nil)
		if err != nil {
			logger.Error("Failed to write leaderboard record for %s: %v", userId, err)
		} else {
			logger.Info("Successfully wrote leaderboard record for %s", userId)
		}
	}
}

func InitModule(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, initializer runtime.Initializer) error {
	logger.Info("TicTacToe module loaded!")

	// Register the match handler
	if err := initializer.RegisterMatch("tictactoe_match", func(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule) (runtime.Match, error) {
		return &TicTacToeMatch{}, nil
	}); err != nil {
		return err
	}

	// Register matchmaker matched hook
	if err := initializer.RegisterMatchmakerMatched(func(ctx context.Context, logger runtime.Logger, db *sql.DB, nk runtime.NakamaModule, entries []runtime.MatchmakerEntry) (string, error) {
		logger.Info("Matchmaker matched %d players, creating match", len(entries))

		matchId, err := nk.MatchCreate(ctx, "tictactoe_match", map[string]interface{}{
			"mode": "casual",
		})
		if err != nil {
			logger.Error("Failed to create match: %v", err)
			return "", err
		}

		logger.Info("Created match: %s", matchId)
		return matchId, nil
	}); err != nil {
		return err
	}

	// Create leaderboard with "incr" operator to accumulate wins
	id := "tictactoe_leaderboard"
	authoritative := false
	sortOrder := "desc"
	operator := "incr"  // Changed from "best" to "incr" to accumulate scores
	resetSchedule := "" // No reset
	metadata := map[string]interface{}{
		"description": "Tic Tac Toe Leaderboard",
	}

	err := nk.LeaderboardCreate(ctx, id, authoritative, sortOrder, operator, resetSchedule, metadata, true)
	if err != nil {
		logger.Warn("Leaderboard creation returned error (may already exist): %v", err)
	} else {
		logger.Info("Leaderboard created: %s", id)
	}

	logger.Info("All RPCs and matches registered successfully")
	return nil
}
