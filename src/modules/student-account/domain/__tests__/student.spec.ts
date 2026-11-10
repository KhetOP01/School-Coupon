import { RfidCard } from '../rfid-card';
import { Student } from '../student';

describe('Student', () => {
  const now = new Date('2026-11-04T10:00:00.000Z');

  it('AC1.1: replaces an active card and preserves the wallet balance', () => {
    const student = Student.restore({
      id: 101,
      studentCode: 'STU-101',
      firstName: 'Mali',
      lastName: 'Srisuk',
      walletBalance: '65.00',
      currentCard: RfidCard.restore({
        id: 101,
        uid: 'OLD-UID',
        status: 'active',
        issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    });

    const reissue = student.reissueCard(101, 102, 'NEW-UID', now);

    expect(reissue.replacedCard.status).toBe('deactivated');
    expect(reissue.newCard.status).toBe('active');
    expect(reissue.newCard.uid).toBe('NEW-UID');
    expect(student.walletBalance).toBe('65.00');
    expect(student.currentCard?.id).toBe(102);
  });

  it('AC1.1: allows replacing a lost card', () => {
    const student = Student.restore({
      id: 101,
      studentCode: 'STU-101',
      firstName: 'Mali',
      lastName: 'Srisuk',
      walletBalance: '-30.00',
      currentCard: RfidCard.restore({
        id: 101,
        uid: 'LOST-UID',
        status: 'lost',
        issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    });

    const reissue = student.reissueCard(101, 102, 'NEW-UID', now);

    expect(reissue.replacedCard.status).toBe('deactivated');
    expect(student.walletBalance).toBe('-30.00');
  });

  it('AC1.1: previews the current replaceable card and wallet balance', () => {
    const student = Student.restore({
      id: 101,
      studentCode: 'STU-101',
      firstName: 'Mali',
      lastName: 'Srisuk',
      walletBalance: '65.00',
      currentCard: RfidCard.restore({
        id: 101,
        uid: 'OLD-UID',
        status: 'active',
        issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    });

    expect(student.cardReissuePreview()).toEqual({
      studentId: 101,
      studentCode: 'STU-101',
      firstName: 'Mali',
      lastName: 'Srisuk',
      expectedCardId: 101,
      oldRfidUid: 'OLD-UID',
      oldCardStatus: 'active',
      walletBalance: '65.00',
    });
  });
});
