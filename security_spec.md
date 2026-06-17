# Security Specification (TDD SPEC)

## 1. Data Invariants
- **Campaign Save Access**: Only the owner of the user document (`request.auth.uid == userId`) may read or write their active campaign.
- **Leaderboard Read**: Anyone can read the public leaderboard list.
- **Leaderboard Writes**: Only authenticated players can submit a leaderboard record.
- **Identity Integrity**: For both campaigns and leaderboard entries, `userId` MUST match `request.auth.uid`.
- **Temporal Honesty**: Timestamps like `createdAt` and `updatedAt` MUST validate against `request.time`.
- **Value Constraints**: No boolean/string/number type injection. No oversized fields (all strings restricted to sizes < 1000 characters).

---

## 2. The "Dirty Dozen" Payloads

### Payload 1: Spying on Sibling Campaign
*(Attempting to GET `users/attacker_uid/campaigns/active` while authenticated as `victim_uid`)*
- **Outcome**: `PERMISSION_DENIED` (Unauthorized read).

### Payload 2: Overwriting Sibling Campaign
*(Attempting to WRITE to `users/attacker_uid/campaigns/active` while authenticated as `victim_uid`)*
- **Outcome**: `PERMISSION_DENIED` (Unauthorized owner-mismatch write).

### Payload 3: Spoofing User ID in Global Leaderboard
- **Payload**: `{ userId: "victim_uid", partyZkratka: "ODS", preference: 44.5, createdAt: request.time }` (sent by `attacker_uid`)
- **Outcome**: `PERMISSION_DENIED` (UID mismatch: `request.auth.uid != incoming().userId`).

### Payload 4: Fake Retroactive Timestamp (Poisoning CreatedAt)
- **Payload**: `{ userId: "attacker_uid", partyZkratka: "STAN", preference: 30.0, createdAt: timestamp("1999-01-01T00:00:00Z") }`
- **Outcome**: `PERMISSION_DENIED` (Must match `request.time`).

### Payload 5: Preference Out of Range (Poisoning preference to 500%)
- **Payload**: `{ userId: "attacker_uid", partyZkratka: "STAN", preference: 500, createdAt: request.time }`
- **Outcome**: `PERMISSION_DENIED` (Preferential constraint: `preference <= 100` and `preference >= 0`).

### Payload 6: Mutating Immutable Sibling Campaign Creator UID
- **Action**: Update `users/attacker_uid/campaigns/active` changing `userId` to `victim_uid`
- **Outcome**: `PERMISSION_DENIED` (Immutable key guard).

### Payload 7: Shadow Fields Injection on Campaign (Ghost Fields)
- **Payload**: `{ userId: "attacker_uid", currentStage: "gameplay", updatedAt: request.time, cheatActivated: true }`
- **Outcome**: `PERMISSION_DENIED` (Strict schema hasAll/size match).

### Payload 8: Corrupting Seats with Float Numbers
- **Payload**: `{ userId: "attacker_uid", partyZkratka: "ODS", preference: 15.1, seats: 20.5, createdAt: request.time }`
- **Outcome**: `PERMISSION_DENIED` (Type validator checks that seats is an integer).

### Payload 9: Long String DOS (Poisoning advisorName with 10MB text)
- **Payload**: `{ userId: "attacker_uid", partyZkratka: "ODS", preference: 15.1, advisorName: "A...[10MB]...", createdAt: request.time }`
- **Outcome**: `PERMISSION_DENIED` (Advisor name size check `<= 128` characters).

### Payload 10: State Shortcut (Directly writing Victory on Leaderboard without completing campaign)
- **Payload**: `{ userId: "attacker_uid", partyZkratka: "ODS", preference: -5, seats: -10, createdAt: request.time }`
- **Outcome**: `PERMISSION_DENIED` (Limits out of bound check).

### Payload 11: Deleting Sibling Leaderboard Entries
- **Action**: Authenticated user trying to DELETE `leaderboard/some_entry_id` owned by another user.
- **Outcome**: `PERMISSION_DENIED`.

### Payload 12: Anonymous Cheat Upload
- **Action**: unauthenticated user (auth == null) writing to the global leaderboard.
- **Outcome**: `PERMISSION_DENIED` (Sign-in required).

---

## 3. The Firebase Security Rules Test Runner Reference
*(Mock tests illustrating how rules block the Dirty Dozen exploits)*

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";

describe("Czech Political Simulation Security Rules", () => {
  let testEnv;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "gen-lang-client-0787610986",
      firestore: {
        rules: require("fs").readFileSync("firestore.rules", "utf8"),
      }
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it("should block Payload 1: Spying on Sibling Campaign", async () => {
    const context = testEnv.authenticatedContext("attacker_uid");
    const db = context.firestore();
    await assertFails(db.doc("users/victim_uid/campaigns/active").get());
  });

  it("should block Payload 3: Spoofing user ID in Global Leaderboard", async () => {
    const context = testEnv.authenticatedContext("attacker_uid");
    const db = context.firestore();
    await assertFails(db.doc("leaderboard/entry").set({
      userId: "victim_uid",
      partyZkratka: "ODS",
      preference: 44.5,
      createdAt: new Date()
    }));
  });
});
```
