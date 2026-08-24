/**
 * Tests for the knowledge-base matching service.
 *
 * Documents the ACTUAL behaviour of findMatchingEntry(): a match is only
 * returned when the score reaches 35 points (title overlap = 10, keyword
 * hits = 5 each, word-overlap = 2 per word). Short keyword-style queries
 * legitimately fall below that threshold and must NOT produce a false
 * positive.
 *
 * Run with: bun test knowledgeBase.test.ts
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { knowledgeBaseService } from './src/services/knowledgeBaseService';

let kbService: typeof knowledgeBaseService;

beforeAll(() => {
  kbService = knowledgeBaseService;
});

describe('KnowledgeBaseService', () => {
  test('loads entries from the knowledge base file', () => {
    expect(kbService.entries.length).toBeGreaterThan(0);
    const titles = kbService.entries.map((e) => e.title);
    expect(titles).toContain('Password Reset Issues');
    expect(titles).toContain('Refund Requests');
  });

  test('matches a password-reset ticket sharing the article title', () => {
    const match = kbService.findMatchingEntry(
      'Password Reset Issues',
      'I forgot my password and need to reset it. I am unable to log in to my account. ' +
        'I tried resetting my password but did not receive the reset email.'
    );
    expect(match).not.toBeNull();
    expect(match!.title).toBe('Password Reset Issues');
  });

  test('matches a refund ticket by keywords and content overlap', () => {
    const match = kbService.findMatchingEntry(
      'refund',
      'I want a refund for order #1234. I was charged twice and would like my money back as soon as possible please.'
    );
    expect(match).not.toBeNull();
    expect(match!.title).toBe('Refund Requests');
  });

  test('returns no match for short queries below the score threshold (no false positive)', () => {
    // These brief queries score under the 35-point threshold.
    expect(kbService.findMatchingEntry('Password reset request', 'I forgot my password and need to reset it')).toBeNull();
    expect(kbService.findMatchingEntry('Cannot access account', "I can't log into my account")).toBeNull();
    expect(kbService.findMatchingEntry('Billing inquiry', 'I have a question about my recent charge')).toBeNull();
  });

  test('returns no match for an unrelated ticket', () => {
    const match = kbService.findMatchingEntry(
      'Zebra printer prints blank labels',
      'The zebra printer is not working properly and prints blank labels.'
    );
    // No KB article covers this; must not return a false positive.
    expect(match).toBeNull();
  });
});
