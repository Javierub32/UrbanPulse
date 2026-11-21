import assert from 'node:assert/strict';
import test from 'node:test';
import { getTicketCutOffset } from '../src/pages/report/ticket-cut-scroll.ts';

test('leaves the ticket in place when its cut is already visible', () => {
  assert.equal(getTicketCutOffset(640, 600, 300), 300);
});

test('brings a cut below the viewport into view above the footer', () => {
  const viewportHeight = 600;
  const cut = 1100;
  assert.ok(cut - getTicketCutOffset(cut, viewportHeight, 0) <= viewportHeight - 160);
});

test('keeps the cut inside a short viewport rather than scrolling it above the screen', () => {
  const viewportHeight = 140;
  const cut = 580;
  const position = cut - getTicketCutOffset(cut, viewportHeight, 0);
  assert.ok(position >= 32 && position < viewportHeight);
});
