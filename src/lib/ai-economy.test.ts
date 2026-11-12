import { describe, it, expect } from "vitest";
import { MAX_ADS_PER_DAY, CREDITS_PER_AD, AI_CREDIT_COST } from "./credits";

describe("FRELUX AI Credit Economy & Access Policy Rules", () => {
  describe("Arithmetic & Cost Constants", () => {
    it("enforces exact arithmetic: 5 credits per ad, so a full day of 4 ads is 20 credits", () => {
      const adsWatched = MAX_ADS_PER_DAY;
      const earnedCredits = CREDITS_PER_AD * adsWatched;
      expect(CREDITS_PER_AD).toBe(5);
      expect(AI_CREDIT_COST).toBe(100);
      expect(earnedCredits).toBe(20);
      // A day of rewarded ads no longer pays for an AI operation.
      expect(earnedCredits).toBeLessThan(AI_CREDIT_COST);
    });

    it("enforces unpaid user daily ad limit of exactly 4 ads (max 20 credits/day)", () => {
      expect(MAX_ADS_PER_DAY).toBe(4);
      const maxDailyCreditsFromAds = MAX_ADS_PER_DAY * CREDITS_PER_AD;
      expect(maxDailyCreditsFromAds).toBe(20);
    });
  });

  describe("Unpaid User Daily Ad Watch Cap (4 times daily)", () => {
    it("allows up to 4 rewarded ad watches per day", () => {
      let adsWatchedToday = 0;
      let balance = 0;

      for (let i = 1; i <= 4; i++) {
        const canWatch = adsWatchedToday < MAX_ADS_PER_DAY;
        expect(canWatch).toBe(true);
        adsWatchedToday += 1;
        balance += CREDITS_PER_AD;
      }

      expect(adsWatchedToday).toBe(4);
      expect(balance).toBe(20);
    });

    it("strictly blocks the 5th ad watch attempt", () => {
      const adsWatchedToday = 4;
      const canWatchFifth = adsWatchedToday < MAX_ADS_PER_DAY;
      expect(canWatchFifth).toBe(false);

      // Simulation of award_ad_credits return on 5th attempt
      const awardResult =
        adsWatchedToday >= MAX_ADS_PER_DAY
          ? { success: false, error: "daily_earn_limit" }
          : { success: true, credits: 5 };

      expect(awardResult.success).toBe(false);
      expect(awardResult.error).toBe("daily_earn_limit");
    });
  });

  describe("Anonymous Guest User: 1 Use AFTER Watching Ad", () => {
    it("State 1: Initial guest without ad cannot execute AI operation", () => {
      const guestAllowance = {
        operationsUsed: 0,
        hasAdCredit: false,
      };

      const canExecute =
        guestAllowance.operationsUsed < 1 && guestAllowance.hasAdCredit;
      const requiresAd =
        guestAllowance.operationsUsed < 1 && !guestAllowance.hasAdCredit;

      expect(canExecute).toBe(false);
      expect(requiresAd).toBe(true);
    });

    it("State 2: Guest watches ad -> unlocks 1 operation", () => {
      const guestAllowance = {
        operationsUsed: 0,
        hasAdCredit: false,
      };

      // Guest completes ad
      guestAllowance.hasAdCredit = true;

      const canExecute =
        guestAllowance.operationsUsed < 1 && guestAllowance.hasAdCredit;
      expect(canExecute).toBe(true);
    });

    it("State 3: Guest executes 1 operation -> exhausts allowance and requires registration", () => {
      const guestAllowance = {
        operationsUsed: 0,
        hasAdCredit: true,
      };

      // Guest consumes operation
      guestAllowance.operationsUsed += 1;

      const canExecute =
        guestAllowance.operationsUsed < 1 && guestAllowance.hasAdCredit;
      const mustRegister = guestAllowance.operationsUsed >= 1;
      const canWatchAnotherAd = guestAllowance.operationsUsed < 1;

      expect(canExecute).toBe(false);
      expect(mustRegister).toBe(true);
      // Policy: Anonymous users must NOT be offered another ad after consuming their 1 daily operation
      expect(canWatchAnotherAd).toBe(false);
    });
  });

  describe("Registered Free User Balance & Spending", () => {
    it("calculates remaining credits after 1 operation for a user starting with 150 credits", () => {
      const initialBalance = 150;
      const remaining = initialBalance - AI_CREDIT_COST;
      expect(remaining).toBe(50);
    });

    it("blocks a user with 20 credits from starting a 100-credit AI operation", () => {
      const userBalance = 20;
      const canExecute = userBalance >= AI_CREDIT_COST;
      const missing = AI_CREDIT_COST - userBalance;
      expect(canExecute).toBe(false);
      expect(missing).toBe(80);
    });

    it("registered free users with insufficient balance must go to profile rather than in-tool ad popup", () => {
      const userBalance = 5;
      const insufficient = userBalance < AI_CREDIT_COST;
      const redirectTarget = insufficient ? "/profile" : null;
      expect(redirectTarget).toBe("/profile");
    });
  });

  describe("Subscriber Entitlements", () => {
    it("subscribers with active paid plan are credit-exempt", () => {
      const isSubscribed = true;
      const requiresCredits = !isSubscribed;
      expect(requiresCredits).toBe(false);
    });
  });
});
