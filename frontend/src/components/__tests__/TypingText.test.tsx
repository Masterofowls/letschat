import { render, screen, act } from '@testing-library/react';
import { TypingText } from '@/components/TypingText';

describe('TypingText', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('types characters over time', () => {
    render(<TypingText text="Hi" speedMs={20} startDelayMs={0} showCursor={false} />);

    expect(screen.getByLabelText('Hi')).toHaveTextContent('');

    act(() => {
      jest.runOnlyPendingTimers();
    });
    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(screen.getByLabelText('Hi')).toHaveTextContent('H');

    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(screen.getByLabelText('Hi')).toHaveTextContent('Hi');
  });
});
