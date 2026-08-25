/**
 * Tests for Feature 16: Plan → Space Engine Integration
 */
import { describe, it, expect } from 'vitest';
import {
  createDetectedRoom,
  createPlanDetectionResult,
  startRoomReview,
  editDetectedRoom,
  confirmDetectedRoom,
  rejectDetectedRoom,
  confirmAllRooms,
  updateDetectionStatus,
  detectedRoomToSpace,
  detectionToVerifiedSpaces,
  verifiedSpacesToSpaces,
  selectForCalculation,
  detectionSummary,
  roomsByVerificationState,
  VERIFICATION_STATE_LABELS,
} from '../plan-intelligence';
import type {} from '../units';

describe('Feature 16: Plan → Space Engine Integration', () => {
  describe('DetectedRoom factory', () => {
    it('creates a detected room with AI defaults', () => {
      const room = createDetectedRoom({
        name: 'Bedroom 1',
        spaceType: 'bedroom',
        length: 12,
        width: 12,
        unit: 'feet',
      });
      expect(room.name).toBe('Bedroom 1');
      expect(room.spaceType).toBe('bedroom');
      expect(room.verificationState).toBe('ai_detected');
      expect(room.userEdited).toBe(false);
      expect(room.userCorrections).toEqual([]);
      expect(room.source).toBe('ai_estimated');
      expect(room.quantity).toBe(1);
    });

    it('assigns confidence level from score', () => {
      const high = createDetectedRoom({
        name: 'R', spaceType: 'bedroom', length: 10, unit: 'feet',
        aiConfidence: 0.9,
      });
      expect(high.aiConfidenceLevel).toBe('high');

      const mod = createDetectedRoom({
        name: 'R', spaceType: 'bedroom', length: 10, unit: 'feet',
        aiConfidence: 0.6,
      });
      expect(mod.aiConfidenceLevel).toBe('moderate');

      const low = createDetectedRoom({
        name: 'R', spaceType: 'bedroom', length: 10, unit: 'feet',
        aiConfidence: 0.3,
      });
      expect(low.aiConfidenceLevel).toBe('low');
    });
  });

  describe('PlanDetectionResult factory', () => {
    it('creates a detection result', () => {
      const room = createDetectedRoom({
        name: 'Bedroom', spaceType: 'bedroom', length: 12, unit: 'feet',
      });
      const detection = createPlanDetectionResult({
        planReference: 'plan_001',
        rooms: [room],
        detectedUnit: 'feet',
      });
      expect(detection.rooms).toHaveLength(1);
      expect(detection.scaleVerified).toBe(false);
      expect(detection.allRoomsVerified).toBe(false);
      expect(detection.allRoomsReviewed).toBe(false);
    });

    it('creates a detection with scale verified', () => {
      const detection = createPlanDetectionResult({
        planReference: 'plan_002',
        rooms: [],
        detectedUnit: 'meters',
        scaleVerified: true,
        scaleFactor: 0.01,
      });
      expect(detection.scaleVerified).toBe(true);
      expect(detection.scaleFactor).toBe(0.01);
    });
  });

  describe('User review operations', () => {
    it('starts room review', () => {
      const room = createDetectedRoom({
        name: 'Bedroom', spaceType: 'bedroom', length: 12, unit: 'feet',
      });
      const reviewed = startRoomReview(room);
      expect(reviewed.verificationState).toBe('ai_detected_review');
    });

    it('does not re-review an already-reviewed room', () => {
      const room = createDetectedRoom({
        name: 'Bedroom', spaceType: 'bedroom', length: 12, unit: 'feet',
      });
      const reviewed = startRoomReview(room);
      const reviewedAgain = startRoomReview(reviewed);
      // Should stay in review state, not reset
      expect(reviewedAgain.verificationState).toBe('ai_detected_review');
    });

    it('edits a detected room and tracks corrections', () => {
      const room = createDetectedRoom({
        name: 'Bedroom', spaceType: 'bedroom', length: 12, unit: 'feet',
      });
      const edited = editDetectedRoom(room, { length: 14, name: 'Master Bedroom' });
      expect(edited.verificationState).toBe('user_corrected');
      expect(edited.userEdited).toBe(true);
      expect(edited.length).toBe(14);
      expect(edited.name).toBe('Master Bedroom');
      expect(edited.userCorrections).toContain('length');
      expect(edited.userCorrections).toContain('name');
    });

    it('edits only changed fields', () => {
      const room = createDetectedRoom({
        name: 'Bedroom', spaceType: 'bedroom', length: 12, unit: 'feet',
      });
      const edited = editDetectedRoom(room, { length: 12 }); // Same value
      expect(edited.userCorrections).not.toContain('length');
    });

    it('confirms a detected room', () => {
      const room = createDetectedRoom({
        name: 'Bedroom', spaceType: 'bedroom', length: 12, unit: 'feet',
      });
      const confirmed = confirmDetectedRoom(room);
      expect(confirmed.verificationState).toBe('user_verified');
    });

    it('rejects a detected room', () => {
      const room = createDetectedRoom({
        name: 'Bedroom', spaceType: 'bedroom', length: 12, unit: 'feet',
      });
      const rejected = rejectDetectedRoom(room);
      expect(rejected.verificationState).toBe('user_rejected');
    });
  });

  describe('Batch operations', () => {
    it('confirms all rooms', () => {
      const r1 = createDetectedRoom({ name: 'A', spaceType: 'bedroom', length: 10, unit: 'feet' });
      const r2 = createDetectedRoom({ name: 'B', spaceType: 'kitchen', length: 12, unit: 'feet' });
      const detection = createPlanDetectionResult({
        planReference: 'p1', rooms: [r1, r2], detectedUnit: 'feet',
      });
      const confirmed = confirmAllRooms(detection);
      expect(confirmed.rooms.every((r) => r.verificationState === 'user_verified')).toBe(true);
      expect(confirmed.allRoomsVerified).toBe(true);
      expect(confirmed.allRoomsReviewed).toBe(true);
    });

    it('does not confirm rejected rooms in batch', () => {
      const r1 = createDetectedRoom({ name: 'A', spaceType: 'bedroom', length: 10, unit: 'feet' });
      const r2 = createDetectedRoom({ name: 'B', spaceType: 'kitchen', length: 12, unit: 'feet' });
      const rejected = rejectDetectedRoom(r2);
      const detection = createPlanDetectionResult({
        planReference: 'p1', rooms: [r1, rejected], detectedUnit: 'feet',
      });
      const confirmed = confirmAllRooms(detection);
      // r2 should stay rejected
      expect(confirmed.rooms[1].verificationState).toBe('user_rejected');
      // But r1 should be verified, and allRoomsReviewed should be true
      expect(confirmed.allRoomsReviewed).toBe(true);
    });
  });

  describe('Detection → Space conversion', () => {
    it('converts a verified room to Space', () => {
      const room = createDetectedRoom({
        name: 'Bedroom 1',
        spaceType: 'bedroom',
        length: 12,
        width: 12,
        height: 10,
        unit: 'feet',
      });
      const confirmed = confirmDetectedRoom(room);
      const verified = detectedRoomToSpace(confirmed);

      expect(verified.space.name).toBe('Bedroom 1');
      expect(verified.space.type).toBe('bedroom');
      expect(verified.space.length).toBe(12);
      expect(verified.space.width).toBe(12);
      expect(verified.space.height).toBe(10);
      expect(verified.space.unit).toBe('feet');
      expect(verified.verificationState).toBe('user_verified');
      expect(verified.selectedForCalculation).toBe(false);
    });

    it('throws when converting unverified room', () => {
      const room = createDetectedRoom({
        name: 'Bedroom', spaceType: 'bedroom', length: 12, unit: 'feet',
      });
      expect(() => detectedRoomToSpace(room)).toThrow('user_verified');
    });

    it('converts detection to verified spaces (skips unverified/rejected)', () => {
      const r1 = createDetectedRoom({ name: 'A', spaceType: 'bedroom', length: 10, unit: 'feet' });
      const r2 = createDetectedRoom({ name: 'B', spaceType: 'kitchen', length: 12, unit: 'feet' });
      const r3 = createDetectedRoom({ name: 'C', spaceType: 'store', length: 6, unit: 'feet' });

      const confirmed1 = confirmDetectedRoom(r1);
      const rejected3 = rejectDetectedRoom(r3);
      // r2 stays unverified

      const detection = createPlanDetectionResult({
        planReference: 'p1', rooms: [confirmed1, r2, rejected3], detectedUnit: 'feet',
      });

      const verified = detectionToVerifiedSpaces(detection);
      expect(verified).toHaveLength(1); // Only r1
      expect(verified[0].space.name).toBe('A');
    });

    it('preserves user-selected measurement units', () => {
      const room = createDetectedRoom({
        name: 'Room', spaceType: 'bedroom', length: 3.5, width: 3, unit: 'meters',
      });
      const confirmed = confirmDetectedRoom(room);
      const verified = detectedRoomToSpace(confirmed);
      expect(verified.space.unit).toBe('meters');
      expect(verified.space.length).toBe(3.5);
    });

    it('converts verified spaces to Space array for calculation', () => {
      const r1 = createDetectedRoom({ name: 'A', spaceType: 'bedroom', length: 10, width: 10, height: 10, unit: 'feet' });
      const r2 = createDetectedRoom({ name: 'B', spaceType: 'kitchen', length: 12, width: 12, height: 10, unit: 'feet' });

      const c1 = confirmDetectedRoom(r1);
      const c2 = confirmDetectedRoom(r2);

      const detection = createPlanDetectionResult({
        planReference: 'p1', rooms: [c1, c2], detectedUnit: 'feet',
      });

      const verified = detectionToVerifiedSpaces(detection);
      // Select both for painting
      const selected = verified.map((v) => selectForCalculation(v, 'painting'));
      const spaces = verifiedSpacesToSpaces(selected);
      expect(spaces).toHaveLength(2);
    });

    it('only includes selected spaces in conversion', () => {
      const r1 = createDetectedRoom({ name: 'A', spaceType: 'bedroom', length: 10, unit: 'feet' });
      const r2 = createDetectedRoom({ name: 'B', spaceType: 'kitchen', length: 12, unit: 'feet' });

      const c1 = confirmDetectedRoom(r1);
      const c2 = confirmDetectedRoom(r2);

      const detection = createPlanDetectionResult({
        planReference: 'p1', rooms: [c1, c2], detectedUnit: 'feet',
      });

      const verified = detectionToVerifiedSpaces(detection);
      // Select only r1 for calculation
      const selected = [selectForCalculation(verified[0], 'painting')];
      const spaces = verifiedSpacesToSpaces(selected);
      expect(spaces).toHaveLength(1);
      expect(spaces[0].name).toBe('A');
    });
  });

  describe('Detection summary', () => {
    it('returns correct summary counts', () => {
      const r1 = createDetectedRoom({ name: 'A', spaceType: 'bedroom', length: 10, unit: 'feet' });
      const r2 = createDetectedRoom({ name: 'B', spaceType: 'kitchen', length: 12, unit: 'feet' });
      const r3 = createDetectedRoom({ name: 'C', spaceType: 'store', length: 6, unit: 'feet' });

      const confirmed1 = confirmDetectedRoom(r1);
      const edited2 = editDetectedRoom(r2, { length: 14 });
      const rejected3 = rejectDetectedRoom(r3);

      const detection = createPlanDetectionResult({
        planReference: 'p1', rooms: [confirmed1, edited2, rejected3], detectedUnit: 'feet',
      });

      const summary = detectionSummary(detection);
      expect(summary.totalRooms).toBe(3);
      expect(summary.verified).toBe(1);
      expect(summary.rejected).toBe(1);
      expect(summary.pending).toBe(1); // edited2 is pending (user_corrected but not confirmed)
      expect(summary.corrected).toBe(1);
    });
  });

  describe('Room grouping by verification state', () => {
    it('groups rooms correctly', () => {
      const r1 = createDetectedRoom({ name: 'A', spaceType: 'bedroom', length: 10, unit: 'feet' });
      const r2 = createDetectedRoom({ name: 'B', spaceType: 'kitchen', length: 12, unit: 'feet' });

      const confirmed1 = confirmDetectedRoom(r1);
      const detection = createPlanDetectionResult({
        planReference: 'p1', rooms: [confirmed1, r2], detectedUnit: 'feet',
      });

      const groups = roomsByVerificationState(detection);
      expect(groups.user_verified).toHaveLength(1);
      expect(groups.ai_detected).toHaveLength(1);
      expect(groups.user_rejected).toHaveLength(0);
    });
  });

  describe('Verification state labels', () => {
    it('has labels for all states', () => {
      expect(VERIFICATION_STATE_LABELS.ai_detected).toBe('AI Detected');
      expect(VERIFICATION_STATE_LABELS.user_verified).toBe('User Verified');
      expect(VERIFICATION_STATE_LABELS.user_rejected).toBe('User Rejected');
      expect(VERIFICATION_STATE_LABELS.ai_detected_review).toContain('Review');
    });
  });

  describe('Integration with Space Engine', () => {
    it('produced Space can be calculated by Space Engine', async () => {
      const { calculateSpace } = await import('../space-engine');
      const room = createDetectedRoom({
        name: 'Bedroom',
        spaceType: 'bedroom',
        length: 12,
        width: 12,
        height: 10,
        unit: 'feet',
        detectedFinishType: 'paint',
        detectedSurfaceType: 'wall',
      });
      const confirmed = confirmDetectedRoom(room);
      const verified = detectedRoomToSpace(confirmed);
      const selected = selectForCalculation(verified, 'painting');
      const spaces = verifiedSpacesToSpaces([selected]);

      const result = calculateSpace(spaces[0]);
      expect(result.totalAreaM2).toBeGreaterThan(0);
      expect(result.finishType).toBe('paint');
    });
  });
});
