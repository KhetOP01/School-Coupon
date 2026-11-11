import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'School Coupon API';
  }

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('api/openapi.yaml')
  @Header('Content-Type', 'text/yaml; charset=utf-8')
  getOpenApiYaml(@Res() res: Response): void {
    const candidates = [
      join(process.cwd(), 'openapi.yaml'),
      join(__dirname, '..', 'openapi.yaml'),
      join(__dirname, '..', '..', 'openapi.yaml'),
    ];
    const path = candidates.find((p) => existsSync(p));
    if (!path) {
      res.status(404).send('openapi.yaml not found');
      return;
    }
    const content = readFileSync(path, 'utf8');
    res.send(content);
  }

  @Get('api/docs')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getSwaggerUi(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>School Coupon API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5/favicon-32x32.png" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .topbar { display: none !important; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "/api/openapi.yaml",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
  }
}
