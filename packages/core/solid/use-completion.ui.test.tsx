/** @jsxImportSource solid-js */
import { cleanup, findByText, render, screen } from '@solidjs/testing-library';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import {
  mockFetchDataStream,
  mockFetchDataStreamWithGenerator,
  mockFetchError,
  mockFetchTextStream,
} from '../tests/utils/mock-fetch';
import { useCompletion } from './use-completion';

const TestComponent = () => {
  const { completion, complete, error, isLoading } = useCompletion();

  return (
    <div>
      <div data-testid="loading">{isLoading().toString()}</div>
      <div data-testid="error">{error()?.toString()}</div>

      <div data-testid="completion">{completion()}</div>

      <button
        data-testid="button"
        onClick={() => {
          complete('hi');
        }}
      />
    </div>
  );
};

beforeEach(() => {
  render(() => <TestComponent />);
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

it('should render complex text stream', async () => {
  mockFetchDataStream({
    url: 'https://example.com/api/completion',
    chunks: ['0:"Hello"\n', '0:","\n', '0:" world"\n', '0:"."\n'],
  });

  await userEvent.click(screen.getByTestId('button'));

  await screen.findByTestId('completion');
  expect(screen.getByTestId('completion')).toHaveTextContent('Hello, world.');
});

describe('loading state', () => {
  it('should show loading state', async () => {
    let finishGeneration: ((value?: unknown) => void) | undefined;
    const finishGenerationPromise = new Promise(resolve => {
      finishGeneration = resolve;
    });

    mockFetchDataStreamWithGenerator({
      url: 'https://example.com/api/chat',
      chunkGenerator: (async function* generate() {
        const encoder = new TextEncoder();
        yield encoder.encode('0:"Hello"\n');
        await finishGenerationPromise;
      })(),
    });

    await userEvent.click(screen.getByTestId('button'));

    await screen.findByTestId('loading');
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    finishGeneration?.();

    await findByText(await screen.findByTestId('loading'), 'false');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('should reset loading state on error', async () => {
    mockFetchError({ statusCode: 404, errorMessage: 'Not found' });

    await userEvent.click(screen.getByTestId('button'));

    await screen.findByTestId('loading');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });
});
