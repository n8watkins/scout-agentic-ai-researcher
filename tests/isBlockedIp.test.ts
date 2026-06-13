import { describe, it, expect } from 'vitest';
import { isBlockedIp } from '@/lib/agent/fetchUrl';

describe('isBlockedIp', () => {
  it('blocks 10.0.0.0/8', () => {
    expect(isBlockedIp('10.0.0.1')).toBe(true);
    expect(isBlockedIp('10.255.255.255')).toBe(true);
  });

  it('blocks loopback 127.0.0.0/8', () => {
    expect(isBlockedIp('127.0.0.1')).toBe(true);
  });

  it('blocks link-local 169.254.0.0/16 incl. cloud metadata 169.254.169.254', () => {
    expect(isBlockedIp('169.254.0.1')).toBe(true);
    expect(isBlockedIp('169.254.169.254')).toBe(true);
  });

  it('blocks 172.16.0.0/12', () => {
    expect(isBlockedIp('172.16.0.1')).toBe(true);
    expect(isBlockedIp('172.31.255.255')).toBe(true);
    // boundary: 172.32.x is public
    expect(isBlockedIp('172.32.0.1')).toBe(false);
    expect(isBlockedIp('172.15.0.1')).toBe(false);
  });

  it('blocks 192.168.0.0/16', () => {
    expect(isBlockedIp('192.168.1.1')).toBe(true);
  });

  it('blocks CGNAT 100.64.0.0/10', () => {
    expect(isBlockedIp('100.64.0.1')).toBe(true);
    expect(isBlockedIp('100.127.255.255')).toBe(true);
    // boundary: 100.63 and 100.128 are public
    expect(isBlockedIp('100.63.255.255')).toBe(false);
    expect(isBlockedIp('100.128.0.1')).toBe(false);
  });

  it('blocks IPv6 loopback / unspecified / unique-local', () => {
    expect(isBlockedIp('::1')).toBe(true);
    expect(isBlockedIp('::')).toBe(true);
    expect(isBlockedIp('fe80::1')).toBe(true);
    expect(isBlockedIp('fc00::1')).toBe(true);
    expect(isBlockedIp('fd12:3456::1')).toBe(true);
  });

  it('blocks IPv4-mapped IPv6 of a private address', () => {
    expect(isBlockedIp('::ffff:127.0.0.1')).toBe(true);
    expect(isBlockedIp('::ffff:10.0.0.1')).toBe(true);
  });

  it('blocks non-parseable input (fail safe)', () => {
    expect(isBlockedIp('not-an-ip')).toBe(true);
  });

  it('allows a public IPv4', () => {
    expect(isBlockedIp('8.8.8.8')).toBe(false);
    expect(isBlockedIp('1.1.1.1')).toBe(false);
  });
});
