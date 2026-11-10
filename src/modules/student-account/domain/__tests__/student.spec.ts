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

  it('AC2.1a: marks card as lost when parent reports it lost', () => {
    const student = Student.restore({
      id: 101,
      studentCode: 'STU-101',
      firstName: 'Mali',
      lastName: 'Srisuk',
      walletBalance: '65.00',
      currentCard: RfidCard.restore({
        id: 101,
        uid: 'CARD-101',
        status: 'active',
        issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    });

    const card = student.freezeCard(101, 'lost');
    expect(card.status).toBe('lost');
    expect(student.currentCard?.status).toBe('lost');
  });

  it('AC2.1b: suspends card when staff requests freeze', () => {
    const student = Student.restore({
      id: 101,
      studentCode: 'STU-101',
      firstName: 'Mali',
      lastName: 'Srisuk',
      walletBalance: '65.00',
      currentCard: RfidCard.restore({
        id: 101,
        uid: 'CARD-101',
        status: 'active',
        issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    });

    const card = student.freezeCard(101, 'suspended');
    expect(card.status).toBe('suspended');
    expect(student.currentCard?.status).toBe('suspended');
  });

  it('AC2.3: restores a suspended card back to active', () => {
    const student = Student.restore({
      id: 101,
      studentCode: 'STU-101',
      firstName: 'Mali',
      lastName: 'Srisuk',
      walletBalance: '65.00',
      currentCard: RfidCard.restore({
        id: 101,
        uid: 'CARD-101',
        status: 'suspended',
        issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    });

    const card = student.unfreezeCard(101);
    expect(card.status).toBe('active');
    expect(student.currentCard?.status).toBe('active');
  });

  it('AC2.3: rejects unfreezing a lost card with CARD_NOT_SUSPENDED', () => {
    const student = Student.restore({
      id: 101,
      studentCode: 'STU-101',
      firstName: 'Mali',
      lastName: 'Srisuk',
      walletBalance: '65.00',
      currentCard: RfidCard.restore({
        id: 101,
        uid: 'CARD-101',
        status: 'lost',
        issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    });

    expect(() => student.unfreezeCard(101)).toThrow('CARD_NOT_SUSPENDED');
  });

  it('AC2.2: processes departure refund for student with positive balance', () => {
    const student = Student.restore({
      id: 101,
      studentCode: 'STU-101',
      firstName: 'Mali',
      lastName: 'Srisuk',
      walletBalance: '250.00',
      currentCard: RfidCard.restore({
        id: 101,
        uid: 'CARD-101',
        status: 'active',
        issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    });

    const refund = student.refundDeparture(now);
    expect(refund.refundedAmount).toBe('250.00');
    expect(student.walletBalance).toBe('0.00');
    expect(student.departedAt).toEqual(now);
    expect(refund.card?.status).toBe('deactivated');
  });

  it('AC2.6: rejects refund when departure was already processed', () => {
    const student = Student.restore({
      id: 101,
      studentCode: 'STU-101',
      firstName: 'Mali',
      lastName: 'Srisuk',
      walletBalance: '0.00',
      departedAt: new Date('2026-11-01T00:00:00.000Z'),
      currentCard: null,
    });

    expect(() => student.refundDeparture(now)).toThrow('REFUND_ALREADY_PROCESSED');
  });

  it('AC2.7: processes departure for student with zero balance', () => {
    const student = Student.restore({
      id: 101,
      studentCode: 'STU-101',
      firstName: 'Mali',
      lastName: 'Srisuk',
      walletBalance: '0.00',
      currentCard: RfidCard.restore({
        id: 101,
        uid: 'CARD-101',
        status: 'active',
        issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    });

    const refund = student.refundDeparture(now);
    expect(refund.refundedAmount).toBe('0.00');
    expect(student.walletBalance).toBe('0.00');
    expect(student.departedAt).toEqual(now);
    expect(refund.card?.status).toBe('deactivated');
  });
});



