# Multi-stage: Build plugin in stage 1, copy to runtime in stage 2
FROM heroiclabs/nakama-pluginbuilder:3.32.0 AS builder

ENV GO111MODULE=on
ENV CGO_ENABLED=1

WORKDIR /src
COPY . .

# Build your plugin (trimpath for clean builds)
RUN go mod download && go build --trimpath --buildmode=plugin -o tictactoe.so main.go

FROM heroiclabs/nakama:3.32.0

# Copy plugin to modules dir
COPY --from=builder /src/tictactoe.so /nakama/data/modules/

# Copy config (if you want overrides)
COPY nakama.yml /nakama/data/