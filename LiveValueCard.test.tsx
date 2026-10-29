import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LiveValueCard } from '../LiveValueCard';

describe('LiveValueCard', () => {
  it('renders while awaiting the first sample', () => {
    render(<LiveValueCard fieldRef="dht11.temperature" />);

    expect(screen.getByText('Awaiting telemetry')).toBeTruthy();
  });
});
