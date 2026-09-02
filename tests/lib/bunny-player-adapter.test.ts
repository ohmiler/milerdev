import { describe, expect, it, vi } from 'vitest';

import {
  connectBunnyPlayer,
  type BunnyPlayerMessageHost,
} from '@/lib/bunny-player-adapter';

type PlayerMessage = {
  context: string;
  method?: string;
  event?: string;
  value?: unknown;
  listener?: string;
};

function playerHarness(resumeAtSeconds?: number) {
  let messageListener: ((event: MessageEvent) => void) | null = null;
  const postMessage = vi.fn();
  const contentWindow = { postMessage };
  const frame = {
    src: 'https://iframe.mediadelivery.net/embed/123/video-id?token=signed',
    contentWindow,
  };
  const host: BunnyPlayerMessageHost = {
    addEventListener(_type, listener) {
      messageListener = listener;
    },
    removeEventListener(_type, listener) {
      if (messageListener === listener) messageListener = null;
    },
  };
  const callbacks = {
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onTimeUpdate: vi.fn(),
    onEnded: vi.fn(),
    onError: vi.fn(),
    onResume: vi.fn(),
  };

  const connection = connectBunnyPlayer({
    frame,
    resumeAtSeconds,
    callbacks,
  }, host);

  function sentMessages() {
    return postMessage.mock.calls.map(([message]) => JSON.parse(message as string) as PlayerMessage);
  }

  function emit(data: PlayerMessage | string, overrides: Partial<MessageEvent> = {}) {
    messageListener?.({
      data: typeof data === 'string' ? data : JSON.stringify(data),
      origin: 'https://iframe.mediadelivery.net',
      source: contentWindow,
      ...overrides,
    } as MessageEvent);
  }

  function ready(methods = ['getDuration', 'setCurrentTime', 'getCurrentTime']) {
    emit({
      context: 'player.js',
      event: 'ready',
      value: {
        src: frame.src,
        events: ['play', 'pause', 'timeupdate', 'ended', 'error'],
        methods,
      },
    });
  }

  function listenerFor(eventName: string) {
    return sentMessages().find((message) => (
      message.method === 'addEventListener' && message.value === eventName
    ))?.listener;
  }

  return {
    callbacks,
    connection,
    contentWindow,
    emit,
    frame,
    host,
    listenerFor,
    postMessage,
    ready,
    sentMessages,
  };
}

describe('trusted Bunny Player.js adapter', () => {
  it('accepts only the current iframe, exact origin, Player.js context, and subscription listener', () => {
    const harness = playerHarness();
    expect(harness.connection).not.toBeNull();
    harness.ready();
    const playListener = harness.listenerFor('play');
    expect(playListener).toBeTruthy();

    harness.emit({ context: 'player.js', event: 'play', listener: playListener }, {
      source: { postMessage: vi.fn() } as unknown as MessageEventSource,
    });
    harness.emit({ context: 'player.js', event: 'play', listener: playListener }, {
      origin: 'https://evil.example',
    });
    harness.emit({ context: 'other', event: 'play', listener: playListener });
    harness.emit({ context: 'player.js', event: 'play', listener: 'wrong-listener' });
    expect(harness.callbacks.onPlay).not.toHaveBeenCalled();

    harness.emit({ context: 'player.js', event: 'play', listener: playListener });
    expect(harness.callbacks.onPlay).toHaveBeenCalledOnce();
  });

  it('validates timeupdate payloads and emits trusted ended exactly once', () => {
    const harness = playerHarness();
    harness.ready();
    const timeListener = harness.listenerFor('timeupdate');
    const endedListener = harness.listenerFor('ended');

    harness.emit({
      context: 'player.js',
      event: 'timeupdate',
      listener: timeListener,
      value: JSON.stringify({ seconds: 42, duration: 120 }),
    });
    harness.emit({
      context: 'player.js',
      event: 'timeupdate',
      listener: timeListener,
      value: { seconds: -1, duration: 120 },
    });
    harness.emit({ context: 'player.js', event: 'ended', listener: endedListener });
    harness.emit({ context: 'player.js', event: 'ended', listener: endedListener });

    expect(harness.callbacks.onTimeUpdate).toHaveBeenCalledOnce();
    expect(harness.callbacks.onTimeUpdate).toHaveBeenCalledWith(42, 120);
    expect(harness.callbacks.onEnded).toHaveBeenCalledOnce();
  });

  it('claims exact-position resume only after capability checks and a verified seek', () => {
    const harness = playerHarness(42);
    harness.ready();
    const durationRequest = harness.sentMessages().find((message) => message.method === 'getDuration');
    expect(durationRequest?.listener).toBeTruthy();

    harness.emit({
      context: 'player.js',
      event: 'getDuration',
      listener: durationRequest?.listener,
      value: 120,
    });
    expect(harness.sentMessages()).toContainEqual(expect.objectContaining({
      context: 'player.js',
      method: 'setCurrentTime',
      value: 42,
    }));
    const currentTimeRequest = harness.sentMessages().find((message) => message.method === 'getCurrentTime');
    expect(harness.callbacks.onResume).not.toHaveBeenCalled();

    harness.emit({
      context: 'player.js',
      event: 'getCurrentTime',
      listener: currentTimeRequest?.listener,
      value: 42.5,
    });
    expect(harness.callbacks.onResume).toHaveBeenCalledWith(42);
  });

  it('does not claim resume when the provider omits a required seek capability', () => {
    const harness = playerHarness(42);
    harness.ready(['getDuration', 'getCurrentTime']);

    expect(harness.sentMessages().some((message) => message.method === 'getDuration')).toBe(false);
    expect(harness.sentMessages().some((message) => message.method === 'setCurrentTime')).toBe(false);
    expect(harness.callbacks.onResume).not.toHaveBeenCalled();
  });
  it('does not seek near the beginning/end and removes provider/window subscriptions on disconnect', () => {
    const harness = playerHarness(115);
    harness.ready();
    const durationRequest = harness.sentMessages().find((message) => message.method === 'getDuration');
    harness.emit({
      context: 'player.js',
      event: 'getDuration',
      listener: durationRequest?.listener,
      value: 120,
    });
    expect(harness.sentMessages().some((message) => message.method === 'setCurrentTime')).toBe(false);

    harness.connection?.disconnect();
    expect(harness.sentMessages()).toEqual(expect.arrayContaining([
      expect.objectContaining({ method: 'removeEventListener', value: 'play' }),
      expect.objectContaining({ method: 'removeEventListener', value: 'ended' }),
    ]));
    const playListener = harness.listenerFor('play');
    harness.emit({ context: 'player.js', event: 'play', listener: playListener });
    expect(harness.callbacks.onPlay).not.toHaveBeenCalled();
  });

  it('refuses non-HTTPS and lookalike Bunny origins without installing a listener', () => {
    const addEventListener = vi.fn();
    const host: BunnyPlayerMessageHost = {
      addEventListener,
      removeEventListener: vi.fn(),
    };

    expect(connectBunnyPlayer({
      frame: {
        src: 'https://iframe.mediadelivery.net.evil.example/embed/123/video',
        contentWindow: { postMessage: vi.fn() },
      },
      callbacks: {},
    }, host)).toBeNull();
    expect(connectBunnyPlayer({
      frame: {
        src: 'http://iframe.mediadelivery.net/embed/123/video',
        contentWindow: { postMessage: vi.fn() },
      },
      callbacks: {},
    }, host)).toBeNull();
    expect(addEventListener).not.toHaveBeenCalled();
  });
});
