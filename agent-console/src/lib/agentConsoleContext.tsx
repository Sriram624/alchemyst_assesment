'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { AppState, appStateReducer, buildTimelineEvent, createInitialState } from '@/lib/appState';
import { ScrollRegistry } from '@/lib/scrollRegistry';
import { TimelineAccumulator } from '@/lib/timelineAccumulator';
import { WebSocketManager } from '@/lib/websocketManager';
import {
  ContextSnapshotMessage,
  ServerMessage,
  StreamEndMessage,
  ToolAckMessage,
  ToolCallMessage,
  ToolResultMessage,
  TokenMessage,
  UiSelection,
  UserMessageMessage,
} from '@/types/protocol';

interface AgentConsoleContextValue {
  state: AppState;
  connectionState: string;
  isConnected: boolean;
  canSend: boolean;
  selection: UiSelection;
  select: (next: UiSelection) => void;
  sendUserMessage: (content: string) => void;
  scrollRegistry: ScrollRegistry;
}

const AgentConsoleContext = createContext<AgentConsoleContextValue | null>(null);

interface ProviderProps {
  children: React.ReactNode;
  wsUrl?: string;
}

export function AgentConsoleProvider({
  children,
  wsUrl = 'ws://localhost:4747/ws',
}: ProviderProps) {
  const [state, dispatch] = useReducer(appStateReducer, undefined, createInitialState);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [selection, setSelection] = useState<UiSelection>(null);
  const wsRef = useRef<WebSocketManager | null>(null);
  const scrollRegistry = useMemo(() => new ScrollRegistry(), []);
  const timelineRef = useRef<TimelineAccumulator | null>(null);

  const appendTimeline = useCallback((event: ReturnType<typeof buildTimelineEvent>) => {
    dispatch({ type: 'APPEND_TIMELINE', payload: event });
  }, []);

  const handleServerMessage = useCallback(
    (message: ServerMessage) => {
      timelineRef.current?.flushBefore(message.seq);

      switch (message.type) {
        case 'TOKEN': {
          const token = message as TokenMessage;
          dispatch({
            type: 'ADD_TOKEN',
            payload: { stream_id: token.stream_id, text: token.text },
          });
          timelineRef.current?.pushToken(token);
          break;
        }
        case 'TOOL_CALL': {
          const toolCall = message as ToolCallMessage;
          dispatch({ type: 'TOOL_CALL', payload: toolCall });
          appendTimeline(
            buildTimelineEvent(message, { id: `tool-${toolCall.call_id}`, callId: toolCall.call_id }),
          );

          
          wsRef.current?.sendCritical({ type: 'TOOL_ACK', call_id: toolCall.call_id } satisfies ToolAckMessage);
          break;
        }
        case 'TOOL_RESULT': {
          const result = message as ToolResultMessage;
          dispatch({ type: 'TOOL_RESULT', payload: result });
          appendTimeline(
            buildTimelineEvent(message, {
              id: `result-${result.call_id}`,
              callId: result.call_id,
            }),
          );
          break;
        }
        case 'STREAM_END': {
          const end = message as StreamEndMessage;
          dispatch({ type: 'STREAM_END', payload: { stream_id: end.stream_id } });
          appendTimeline(buildTimelineEvent(message));
          break;
        }
        case 'CONTEXT_SNAPSHOT': {
          const snapshot = message as ContextSnapshotMessage;
          dispatch({ type: 'ADD_CONTEXT_SNAPSHOT', payload: snapshot });
          appendTimeline(buildTimelineEvent(message));
          break;
        }
        case 'PING':
        case 'ERROR':
          appendTimeline(buildTimelineEvent(message));
          break;
        default:
          break;
      }
    },
    [appendTimeline],
  );

  useEffect(() => {
    timelineRef.current = new TimelineAccumulator((event) => {
      dispatch({ type: 'APPEND_TIMELINE', payload: event });
    });

    const manager = new WebSocketManager(wsUrl);
    wsRef.current = manager;

    manager.connect().catch(() => undefined);

    const offState = manager.onStateChange(setConnectionState);
    const offMessage = manager.onMessage(handleServerMessage);
    const offPong = manager.onPongSent((echo, seq) => {
      appendTimeline(
        buildTimelineEvent(
          { type: 'PONG', seq, echo },
          { id: `pong-${seq}-${echo.length}` },
        ),
      );
    });

    return () => {
      timelineRef.current?.dispose();
      timelineRef.current = null;
      offState();
      offMessage();
      offPong();
      manager.disconnect();
      wsRef.current = null;
    };
  }, [wsUrl, handleServerMessage, appendTimeline]);

  const select = useCallback(
    (next: UiSelection) => {
      setSelection(next);

      if (!next) {
        return;
      }

      if (next.kind === 'tool') {
        scrollRegistry.scrollToTool(next.callId);
        scrollRegistry.scrollToTimelineRow(`tool-${next.callId}`);
      } else if (next.kind === 'segment') {
        scrollRegistry.scrollToSegment(next.streamId, next.segmentIndex);
      } else if (next.kind === 'timeline') {
        scrollRegistry.scrollToTimelineRow(next.eventId);
        if (next.eventId.startsWith('tool-')) {
          scrollRegistry.scrollToTool(next.eventId.replace('tool-', ''));
        }
        if (next.eventId.startsWith('result-')) {
          scrollRegistry.scrollToTool(next.eventId.replace('result-', ''));
        }
      }
    },
    [scrollRegistry],
  );

  const sendUserMessage = useCallback((content: string) => {
    dispatch({ type: 'ADD_USER_MESSAGE', payload: { content } });

    const payload: UserMessageMessage = { type: 'USER_MESSAGE', content };
    if (wsRef.current?.isConnected()) {
      wsRef.current.sendMessage(payload);
    } else {
      wsRef.current?.sendMessage(payload);
    }
  }, []);

  const isConnected = connectionState === 'connected' || connectionState === 'resuming';
  const canSend = isConnected || connectionState === 'reconnecting';

  const value: AgentConsoleContextValue = {
    state,
    connectionState,
    isConnected,
    canSend,
    selection,
    select,
    sendUserMessage,
    scrollRegistry,
  };

  return <AgentConsoleContext.Provider value={value}>{children}</AgentConsoleContext.Provider>;
}

export function useAgentConsole(): AgentConsoleContextValue {
  const ctx = useContext(AgentConsoleContext);
  if (!ctx) {
    throw new Error('useAgentConsole must be used within AgentConsoleProvider');
  }
  return ctx;
}
