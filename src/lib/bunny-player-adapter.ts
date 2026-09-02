import 'client-only';

const PLAYER_CONTEXT = 'player.js';
const PLAYER_VERSION = '0.0.11';
const TRUSTED_BUNNY_ORIGINS = new Set([
  'https://iframe.mediadelivery.net',
  'https://video.bunnycdn.com',
]);
const RESUME_EDGE_SECONDS = 10;
const RESUME_VERIFY_TOLERANCE_SECONDS = 2;

type PlayerEventName = 'play' | 'pause' | 'timeupdate' | 'ended' | 'error';
type PlayerMethodName = 'getDuration' | 'setCurrentTime' | 'getCurrentTime';

type PlayerMessage = {
  context?: unknown;
  event?: unknown;
  value?: unknown;
  listener?: unknown;
};

type PlayerMessageTarget = {
  postMessage(message: string, targetOrigin: string): void;
};

export type BunnyPlayerFrame = {
  src: string;
  contentWindow: PlayerMessageTarget | null;
};

export type BunnyPlayerMessageHost = {
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
};

export type BunnyPlayerCallbacks = {
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (seconds: number, duration: number) => void;
  onEnded?: () => void;
  onError?: () => void;
  onResume?: (seconds: number) => void;
};

export type BunnyPlayerConnection = {
  disconnect(): void;
};

let listenerSequence = 0;

function nextListenerId(label: string) {
  listenerSequence += 1;
  return `milerdev-${label}-${listenerSequence}`;
}

function parsePlayerMessage(data: unknown): PlayerMessage | null {
  let parsed = data;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return parsed as PlayerMessage;
}

function parseTimingValue(value: unknown) {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const { seconds, duration } = parsed as { seconds?: unknown; duration?: unknown };
  if (
    typeof seconds !== 'number'
    || !Number.isFinite(seconds)
    || seconds < 0
    || typeof duration !== 'number'
    || !Number.isFinite(duration)
    || duration <= 0
  ) return null;
  return { seconds, duration };
}

function playerOrigin(frameUrl: string) {
  try {
    const url = new URL(frameUrl);
    return TRUSTED_BUNNY_ORIGINS.has(url.origin) ? url.origin : null;
  } catch {
    return null;
  }
}

function stringSet(value: unknown) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    return new Set<string>();
  }
  return new Set(value);
}

export function connectBunnyPlayer(
  input: {
    frame: BunnyPlayerFrame;
    resumeAtSeconds?: number;
    callbacks: BunnyPlayerCallbacks;
  },
  host: BunnyPlayerMessageHost = window as unknown as BunnyPlayerMessageHost,
): BunnyPlayerConnection | null {
  const { frame, callbacks } = input;
  const origin = playerOrigin(frame.src);
  const target = frame.contentWindow;
  if (!origin || !target) return null;

  let disconnected = false;
  let ready = false;
  let ended = false;
  const subscriptions = new Map<PlayerEventName | 'ready', string>();
  const pendingMethods = new Map<string, {
    method: PlayerMethodName;
    receive(value: unknown): void;
  }>();

  const send = (message: Record<string, unknown>) => {
    if (disconnected) return;
    target.postMessage(JSON.stringify({
      context: PLAYER_CONTEXT,
      version: PLAYER_VERSION,
      ...message,
    }), origin);
  };

  const unsubscribe = (eventName: PlayerEventName | 'ready') => {
    const listener = subscriptions.get(eventName);
    if (!listener) return;
    send({ method: 'removeEventListener', value: eventName, listener });
    subscriptions.delete(eventName);
  };

  const subscribe = (eventName: PlayerEventName | 'ready') => {
    const listener = nextListenerId(eventName);
    subscriptions.set(eventName, listener);
    send({ method: 'addEventListener', value: eventName, listener });
  };

  const request = (
    method: PlayerMethodName,
    receive: (value: unknown) => void,
  ) => {
    const listener = nextListenerId(method);
    pendingMethods.set(listener, { method, receive });
    send({ method, listener });
  };

  const attemptResume = (methods: Set<string>) => {
    const resumeAtSeconds = input.resumeAtSeconds;
    if (
      typeof resumeAtSeconds !== 'number'
      || !Number.isFinite(resumeAtSeconds)
      || resumeAtSeconds <= RESUME_EDGE_SECONDS
      || !methods.has('getDuration')
      || !methods.has('setCurrentTime')
      || !methods.has('getCurrentTime')
    ) return;

    request('getDuration', (durationValue) => {
      if (
        typeof durationValue !== 'number'
        || !Number.isFinite(durationValue)
        || resumeAtSeconds >= durationValue - RESUME_EDGE_SECONDS
      ) return;

      send({ method: 'setCurrentTime', value: resumeAtSeconds });
      request('getCurrentTime', (currentTimeValue) => {
        if (
          typeof currentTimeValue === 'number'
          && Number.isFinite(currentTimeValue)
          && Math.abs(currentTimeValue - resumeAtSeconds) <= RESUME_VERIFY_TOLERANCE_SECONDS
        ) callbacks.onResume?.(resumeAtSeconds);
      });
    });
  };

  const onMessage = (event: MessageEvent) => {
    if (disconnected || event.source !== target || event.origin !== origin) return;
    const message = parsePlayerMessage(event.data);
    if (!message || message.context !== PLAYER_CONTEXT || typeof message.event !== 'string') return;

    if (message.event === 'ready') {
      if (ready) return;
      if (!message.value || typeof message.value !== 'object' || Array.isArray(message.value)) return;
      const value = message.value as { src?: unknown; events?: unknown; methods?: unknown };
      if (value.src !== frame.src) return;
      ready = true;
      unsubscribe('ready');
      const supportedEvents = stringSet(value.events);
      const supportedMethods = stringSet(value.methods);
      for (const eventName of ['play', 'pause', 'timeupdate', 'ended', 'error'] as const) {
        if (supportedEvents.has(eventName)) subscribe(eventName);
      }
      attemptResume(supportedMethods);
      return;
    }

    if (typeof message.listener !== 'string') return;
    const pendingMethod = pendingMethods.get(message.listener);
    if (pendingMethod) {
      if (message.event !== pendingMethod.method) return;
      pendingMethods.delete(message.listener);
      pendingMethod.receive(message.value);
      return;
    }

    const eventName = message.event as PlayerEventName;
    if (subscriptions.get(eventName) !== message.listener) return;
    if (eventName === 'play') callbacks.onPlay?.();
    if (eventName === 'pause') callbacks.onPause?.();
    if (eventName === 'error') callbacks.onError?.();
    if (eventName === 'timeupdate') {
      const timing = parseTimingValue(message.value);
      if (timing) callbacks.onTimeUpdate?.(timing.seconds, timing.duration);
    }
    if (eventName === 'ended' && !ended) {
      ended = true;
      callbacks.onEnded?.();
    }
  };

  host.addEventListener('message', onMessage);
  subscribe('ready');

  return {
    disconnect() {
      if (disconnected) return;
      for (const eventName of [...subscriptions.keys()]) unsubscribe(eventName);
      disconnected = true;
      pendingMethods.clear();
      host.removeEventListener('message', onMessage);
    },
  };
}
