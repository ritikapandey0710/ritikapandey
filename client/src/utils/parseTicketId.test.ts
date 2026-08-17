import { parseTicketId } from './parseTicketId';

describe('parseTicketId', () => {
  it('should return 0 for null or undefined', () => {
    expect(parseTicketId(null)).toBe(0);
    expect(parseTicketId(undefined)).toBe(0);
  });

  it('should handle positive numbers', () => {
    expect(parseTicketId(123)).toBe(123);
    expect(parseTicketId(45.67)).toBe(45); // floor
    expect(parseTicketId(-123)).toBe(123); // absolute value
  });

  it('should handle numeric strings', () => {
    expect(parseTicketId('123')).toBe(123);
    expect(parseTicketId('  456  ')).toBe(456); // trim
    expect(parseTicketId('-789')).toBe(789); // absolute value
  });

  it('should extract numbers from strings', () => {
    expect(parseTicketId('ticket #123')).toBe(123);
    expect(parseTicketId('TKT-00456')).toBe(456);
    expect(parseTicketId('abc789def')).toBe(789);
  });

  it('should return 0 for non-numeric strings', () => {
    expect(parseTicketId('abc')).toBe(0);
    expect(parseTicketId('')).toBe(0);
    expect(parseTicketId('   ')).toBe(0);
  });

  it('should handle objects with toString method', () => {
    const obj = {
      toString() {
        return '42';
      }
    };
    expect(parseTicketId(obj)).toBe(42);
  });

  it('should handle NaN and Infinity', () => {
    expect(parseTicketId(NaN)).toBe(0);
    expect(parseTicketId(Infinity)).toBe(1_000_000_000); // capped at max
    expect(parseTicketId(-Infinity)).toBe(1_000_000_000); // capped at max
  });

  it('should cap very large numbers', () => {
    expect(parseTicketId(2_000_000_000)).toBe(1_000_000_000); // capped
    expect(parseTicketId('2000000000')).toBe(1_000_000_000); // capped
  });
});