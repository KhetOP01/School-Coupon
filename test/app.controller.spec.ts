import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../src/app.controller';
import type { Response } from 'express';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('bootstrap: returns the root application response', () => {
    expect(appController.getHello()).toBe('School Coupon API');
  });

  it('health: returns ok status and iso timestamp', () => {
    const res = appController.getHealth();
    expect(res.status).toBe('ok');
    expect(new Date(res.timestamp).toISOString()).toBe(res.timestamp);
  });

  it('docs: returns Swagger UI HTML shell referencing openapi.yaml', () => {
    const html = appController.getSwaggerUi();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('/api/openapi.yaml');
    expect(html).toContain('SwaggerUIBundle');
  });

  it('openapi: sends openapi.yaml file content', () => {
    const mockRes = {
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;

    appController.getOpenApiYaml(mockRes);
    expect(mockRes.send).toHaveBeenCalled();
  });
});
