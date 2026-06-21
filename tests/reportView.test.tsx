import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import ReportView from '@/components/ReportView';
import type { Citation } from '@/lib/agent/types';

afterEach(cleanup);

const citations: Citation[] = [
  { index: 1, title: 'Source One', url: 'https://example.com/1', snippet: 's1' },
];

describe('ReportView citation rendering', () => {
  it('renders a registered [n] marker as a citation link', () => {
    render(
      <ReportView
        report="EVs are improving [1]."
        citations={citations}
        stoppedEarly={false}
      />
    );
    const link = screen.getByRole('link', { name: '1' });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('#source-1');
    expect(link.className).toContain('citation-link');
  });

  it('leaves an unregistered [n] marker as plain text (no link)', () => {
    const { container } = render(
      <ReportView
        report="This cites a missing source [9]."
        citations={citations}
        stoppedEarly={false}
      />
    );
    expect(screen.queryByRole('link', { name: '9' })).toBeNull();
    expect(container.textContent).toContain('[9]');
  });
});
