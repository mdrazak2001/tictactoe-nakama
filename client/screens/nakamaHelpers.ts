// nakamaHelpers.ts (example functions; import from your screens)
import { Client, Socket, Session } from '@heroiclabs/nakama-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MatchData, MatchmakerTicket } from '@heroiclabs/nakama-js';

const SERVER_KEY = 'defaultkey';
const HOST = '192.168.0.109'; // your LAN IP (or 10.0.2.2 for emulator)
const PORT = '7350';

const client = new Client(SERVER_KEY, HOST, PORT, false);

// module-level socket holder so GameScreen can access the same socket
let currentSocket: Socket | null = null;

export function getSocket(): Socket | null {
  return currentSocket;
}

export async function getStoredSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem('session_full');
  if (!raw) return null;
  
  const sessionData = JSON.parse(raw);
  
  // Restore the Session instance with its methods
  const session = Session.restore(
    sessionData.token,
    sessionData.refresh_token
  );
  
  return session;
}

export async function createSocketAndConnect(session: Session) {
  const socket = client.createSocket(false, false);
  // connect attaches the session (JWT)
  await socket.connect(session, true);
  // attach a simple handler for match data (opCode + data)
  socket.onmatchdata = (matchData: MatchData) => {
    const text = matchData.data ? new TextDecoder().decode(matchData.data) : null;
    console.log('match data', matchData.op_code, text, matchData);
    };
  socket.onerror = (err) => console.error('socket error', err);
  socket.ondisconnect = () => console.log('socket disconnected');

  currentSocket = socket;
  console.log('[nakamaHelpers] socket connected');
  return socket;
}

// Fixed: socket.addMatchmakerAsync (WS method, session via connect)
export async function findMatch(socket: Socket, mode = 'casual'): Promise<MatchmakerTicket> {
  const min = 2, max = 2;
  const query = mode === 'casual' ? '*' : `mode = "${mode}"`;
  console.log('Calling addMatchmakerAsync with query:', query, 'min:', min, 'max:', max);
  const ticket: MatchmakerTicket = await socket.addMatchmaker(query, min, max);
  console.log('addMatchmaker ticket created:', ticket.ticket);
  return ticket;
}

export async function joinMatch(socket: Socket, matchId: string, token: string) {
  try {
    await socket.joinMatch(matchId, token);
    console.log('[nakamaHelpers] joinMatch success', matchId);
  } catch (err) {
    console.error('[nakamaHelpers] joinMatch failed', err);
    throw err;
  }
}

export async function removeMatchmaker(socket: Socket, ticket: MatchmakerTicket | string) {
  try {
    const ticketStr = typeof ticket === 'string' ? ticket : (ticket.ticket ?? '');
    if (!ticketStr) return;
    await socket.removeMatchmaker(ticketStr);
    console.log('[nakamaHelpers] removed matchmaker ticket', ticketStr);
  } catch (err) {
    console.warn('[nakamaHelpers] removeMatchmaker failed', err);
  }
}

export function disconnect() {
  try {
    if (currentSocket) {
      try { currentSocket.disconnect(true); } catch(e){/* ignore */ }
      currentSocket = null;
    }
  } catch {}
}