import { describe, it, expect, beforeEach } from 'vitest';
import { getFirestore, isUsingMock } from './firestore';
import { Repository } from '../repository';
import { runMigration } from './migrate';

describe('Firestore Data Access & Sessions (Parts B & G)', () => {
  beforeEach(async () => {
    // In test environment, uses mock Firestore
  });

  it('1. Data-access module uses Firestore mock in test environment (never real database)', () => {
    expect(isUsingMock()).toBe(true);
  });

  it('2. Session management: Creating session, verifying, and deleting on logout', async () => {
    const sessionId = `test_sess_${Date.now()}`;
    const userId = 'mem-test-1';
    const email = 'testmember@example.com';

    await Repository.createSession(sessionId, userId, 'member', email, userId);

    // Session should be active
    const session = await Repository.getSession(sessionId);
    expect(session).not.toBeNull();
    expect(session.sessionId).toBe(sessionId);
    expect(session.userId).toBe(userId);

    // On logout: session is deleted
    await Repository.deleteSession(sessionId);
    const afterLogout = await Repository.getSession(sessionId);
    expect(afterLogout).toBeNull();
  });

  it('3. Logout from all devices: ends every active session of that user', async () => {
    const userId = 'mem-multi-device';
    const sess1 = `sess_phone_${Date.now()}`;
    const sess2 = `sess_laptop_${Date.now()}`;

    await Repository.createSession(sess1, userId, 'member', 'multi@example.com', userId);
    await Repository.createSession(sess2, userId, 'member', 'multi@example.com', userId);

    expect(await Repository.getSession(sess1)).not.toBeNull();
    expect(await Repository.getSession(sess2)).not.toBeNull();

    // End all sessions
    await Repository.deleteAllSessionsForUser(userId);

    expect(await Repository.getSession(sess1)).toBeNull();
    expect(await Repository.getSession(sess2)).toBeNull();
  });

  it('4. Member registration: Creates member with registered flag and enforces clean state', async () => {
    const regData = {
      fullName: 'New Student',
      phone: '01899999999',
      email: 'newstudent@example.com',
      address: 'Dhaka, Bangladesh',
      studentId: 'STU-12345',
      parentPhone: '01888888888',
      password: 'StrongPassword123!',
    };

    const res = await Repository.registerMember(regData);
    expect(res.success).toBe(true);
    expect(res.member).toBeDefined();
    expect(res.member.registered).toBe(true);
    expect(res.member.initialDeposit).toBe(0);
    expect(res.member.parentPhone).toBe('01888888888');

    // Duplicate email or phone should fail
    const dupRes = await Repository.registerMember(regData);
    expect(dupRes.success).toBe(false);
  });

  it('5. Deposit approval workflow: Atomic approval updates status and records approver', async () => {
    const dep = await Repository.createDepositRequest({
      memberId: 'mem-1',
      amount: 1200,
      paymentMethod: 'bKash',
      transactionId: `TXN_${Date.now()}`,
      date: '2026-10-01',
      note: 'Advance deposit',
    });

    expect(dep.status).toBe('pending');

    const approvalRes = await Repository.approveDeposit(dep.id, 1200, 'Admin Safat');
    expect(approvalRes.success).toBe(true);
    expect(approvalRes.deposit?.status).toBe('approved');
    expect(approvalRes.deposit?.approvedBy).toBe('Admin Safat');

    // Second approval attempt should fail (atomic idempotence)
    const secondApproval = await Repository.approveDeposit(dep.id, 1200, 'Admin Safat');
    expect(secondApproval.success).toBe(false);
    expect(secondApproval.error).toContain('ইতিমধ্যে অনুমোদিত');
  });

  it('6. Idempotent Migration: Can run repeatedly without corrupting data', async () => {
    const firstRun = await runMigration();
    expect(firstRun.admin_account).toBe(1);
    expect(firstRun.settings).toBe(1);

    const secondRun = await runMigration();
    expect(secondRun.admin_account).toBe(1);
    expect(secondRun.settings).toBe(1);
  });
});
