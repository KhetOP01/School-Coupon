import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ApiExceptionFilter } from '../../../../../shared/api-exception.filter';
import { PostgresDatabase } from '../../../../../shared/postgres-database';
import { ParentAuthController } from '../parent-auth.controller';

describe('ParentAuthController (register multi-student)', () => {
  let app: INestApplication;
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const mockDb = {
    pool: {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ParentAuthController],
      providers: [
        {
          provide: PostgresDatabase,
          useValue: mockDb,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.pool.connect.mockResolvedValue(mockClient);
  });

  it('AC13.1: links multiple studentCodes during parent registration', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // parent check
      .mockResolvedValueOnce({
        rowCount: 2,
        rows: [
          { id: 1, student_code: 'STD-1001' },
          { id: 2, student_code: 'STD-1002' },
        ],
      }) // students lookup
      .mockResolvedValueOnce({
        rows: [{ id: 10, phone: '0855555555', full_name: 'คุณมานะ' }],
      }) // insert parent
      .mockResolvedValueOnce({}) // insert parent_students 1
      .mockResolvedValueOnce({}) // insert parent_students 2
      .mockResolvedValueOnce({}); // COMMIT

    mockDb.pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          student_code: 'STD-1001',
          first_name: 'Somchai',
          last_name: 'Jaidee',
          wallet_balance: '150.00',
          current_daily_limit: '200.00',
          next_daily_limit: '200.00',
          card_id: 1,
          rfid_uid: 'UID-1',
          card_status: 'active',
        },
        {
          id: 2,
          student_code: 'STD-1002',
          first_name: 'Somying',
          last_name: 'Jaidee',
          wallet_balance: '200.00',
          current_daily_limit: '200.00',
          next_daily_limit: '200.00',
          card_id: 2,
          rfid_uid: 'UID-2',
          card_status: 'active',
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .post('/parent/auth/register')
      .send({
        phone: '0855555555',
        fullName: 'คุณมานะ',
        pin: '123456',
        studentCodes: ['STD-1001', 'STD-1002'],
      })
      .expect(201);

    expect(response.body.students).toHaveLength(2);
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO parent_students'),
      [10, 1],
    );
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO parent_students'),
      [10, 2],
    );
  });

  it('AC13.2: rejects with 404 STUDENT_NOT_FOUND when any submitted studentCode is missing', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // parent check
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, student_code: 'STD-1001' }],
      }) // only 1 found out of 2
      .mockResolvedValueOnce({}); // ROLLBACK

    const response = await request(app.getHttpServer())
      .post('/parent/auth/register')
      .send({
        phone: '0855555555',
        fullName: 'คุณมานะ',
        pin: '123456',
        studentCodes: ['STD-1001', 'STD-9999'],
      })
      .expect(404);

    expect(response.body.code).toBe('STUDENT_NOT_FOUND');
  });
});
