# UC-08: Staff เข้าสู่ระบบและเข้าใช้งาน Web Admin

> สถานะ: Acceptance Criteria และแนวทาง API/ฐานข้อมูลผ่านการทบทวนแล้ว; กำลังดำเนิน implementation
> Bounded context: `school-configuration` (ระดับ `crud`)
> แหล่งที่มา: [PRD](../../product_requirement_document_prd.md), หัวข้อ Actors & Roles และ Web Admin Application
> Web Admin ใช้ Next.js ตามสถาปัตยกรรมที่กำหนดใน PRD

## ผู้ใช้งาน

เจ้าหน้าที่โรงเรียน (Staff / Admin) ที่มีบัญชีใน Identity Provider (IdP) ของโรงเรียนและได้รับสิทธิ์ Staff

## เงื่อนไขก่อนเริ่ม

- โรงเรียนตั้งค่า OpenID Connect (OIDC) IdP สำหรับ Web Admin แล้ว
- ระบบมีการตั้งค่า issuer, client credentials, callback URL และกติกา mapping claim เป็นสิทธิ์ Staff
- IdP ยืนยันตัวตนและส่ง claims ที่ตรวจสอบความถูกต้องได้

## ขั้นตอนหลัก

1. Staff เปิดหน้า Web Admin ที่ต้องเข้าสู่ระบบ
2. ระบบพา Staff ไปยืนยันตัวตนกับ OIDC IdP ที่โรงเรียนตั้งค่าไว้
3. ระบบตรวจสอบผลตอบกลับจาก IdP และ mapping สิทธิ์ Staff จาก claims ที่เชื่อถือได้
4. ระบบสร้าง session ของ Web Admin และแสดงหน้า Admin แก่ Staff
5. Staff สั่งออกจากระบบ ระบบเพิกถอน session และกลับไปหน้าเข้าสู่ระบบ

## กฎทางธุรกิจและข้อกำหนดการเข้าถึง

- การยืนยันตัวตนใช้ OIDC ของโรงเรียนเท่านั้น; ระบบนี้ไม่สร้างหรือเก็บรหัสผ่านของ Staff
- สิทธิ์ Staff ต้องมาจาก claim ที่ผ่านการตรวจสอบและ mapping ที่ผู้ดูแลระบบกำหนดไว้ ห้ามเชื่อ role จากข้อมูลที่ผู้ใช้ส่งเอง
- ผู้ที่ไม่มีสิทธิ์ Staff ต้องไม่ได้รับ session หรือข้อมูลหน้า Admin
- issuer, audience, ลายเซ็น, state, nonce และเวลาหมดอายุของ OIDC response ต้องตรวจสอบก่อนสร้าง session
- OIDC state/nonce ใช้ได้ครั้งเดียวและหมดอายุภายใน 5 นาที
- Session ฝั่ง Web Admin ต้องหมดอายุไม่ช้ากว่าเวลาหมดอายุของการยืนยันตัวตนที่ผ่านการตรวจสอบ และเพิกถอนได้เมื่อออกจากระบบ
- Session identifier ใช้ cookie ที่ตั้งค่า `HttpOnly` และ `Secure` ใน production; ห้ามเก็บ access token หรือ session identifier ใน Web Storage
- การป้องกันเส้นทาง Admin ต้องทำที่ server boundary ไม่พึ่งการซ่อนเมนูหรือ route guard ฝั่ง browser เพียงอย่างเดียว

## Acceptance criteria

| รหัส AC | Given | When | Then |
|---|---|---|---|
| **AC8.1** | IdP ตอบกลับ OIDC ที่ถูกต้อง และ claim ที่ผ่านการ mapping ระบุสิทธิ์ Staff | Staff เข้าสู่ระบบ Web Admin | สำเร็จ: ระบบสร้าง session ที่ปลอดภัยและแสดงหน้า Admin |
| **AC8.2** | ผู้ใช้ยืนยันตัวตนกับ IdP สำเร็จ แต่ claim ไม่ได้รับการ mapping เป็น Staff | ผู้ใช้พยายามเข้า Web Admin | ปฏิเสธ (`403 STAFF_ACCESS_REQUIRED`); ไม่สร้าง session และไม่ส่งข้อมูล Admin |
| **AC8.3** | ผู้ใช้ไม่มี session ที่ใช้งานได้ | ผู้ใช้เปิดเส้นทางหรือเรียกข้อมูล Admin โดยตรง | ระบบพาไปหน้าเข้าสู่ระบบ; ไม่แสดงหรือส่งข้อมูล Admin |
| **AC8.4** | OIDC callback รูปแบบไม่ครบ/ผิด หรือ state/nonce/issuer/audience/ลายเซ็นไม่ถูกต้อง หรือ response หมดอายุ | ระบบประมวลผล callback | ปฏิเสธ (`400 INVALID_OIDC_RESPONSE` เมื่อรูปแบบผิด หรือ `401 AUTHENTICATION_REQUIRED` เมื่อการตรวจยืนยันไม่ผ่าน); ไม่สร้าง session |
| **AC8.5** | IdP ใช้งานไม่ได้หรือผู้ใช้ยกเลิกการเข้าสู่ระบบ | ระบบดำเนินการ sign-in | แสดงข้อผิดพลาดที่เหมาะสม (`AUTHENTICATION_UNAVAILABLE` หรือ `AUTHENTICATION_CANCELLED`); ไม่มี session |
| **AC8.6** | Session หมดอายุหรือถูกเพิกถอน | ผู้ใช้เรียกเส้นทาง Admin | ปฏิเสธและพาไปเข้าสู่ระบบใหม่; ไม่ส่งข้อมูล Admin (`401 SESSION_EXPIRED`) |
| **AC8.7** | Staff มี session ที่ใช้งานได้ | Staff เลือกออกจากระบบ แล้วเปิดเส้นทาง Admin อีกครั้ง | ระบบเพิกถอน session; การเรียกครั้งถัดไปเป็นไปตาม AC8.3 |

## นอกขอบเขต

- การออก/เปลี่ยนบัตร RFID ผ่านหน้า Admin เป็น use case แยก ซึ่งจะเรียก API ของ UC-01 หลัง API พร้อมใช้งานบน branch หลัก
- การจัดการบัญชี Staff, กำหนดสิทธิ์หรือ claim mapping และการสมัครบัญชีที่ IdP
- การออกแบบระบบ login/password ภายใน School-Coupon
- การ logout จาก IdP ทั้งโรงเรียน; UC นี้เพิกถอนเฉพาะ session ของ Web Admin

## คำถามที่ต้องตอบก่อนนำขึ้นใช้งานจริง

- โรงเรียนใช้ OIDC IdP ใด และค่า issuer, audience, client/tenant และ callback URL คืออะไร?
- Claim/group ใดเป็นแหล่งสิทธิ์ Staff และใครเป็นผู้ดูแล mapping นี้?
- นโยบายอายุ session ของโรงเรียนมีข้อกำหนดเพิ่มเติมจากเวลาหมดอายุของ IdP หรือไม่?
- จะใช้ deployment platform ใด และตั้งค่า same-origin reverse proxy บน platform นั้นอย่างไร? ขอบเขตการ route `/admin/auth/*` ไป NestJS และ `/admin` ไป Next.js ได้รับการยืนยันแล้ว

## API และข้อมูล

- OIDC browser flow และ session endpoints ระบุใน [`openapi.yaml`](../../openapi.yaml)
- session ใช้ opaque identifier; ฐานข้อมูลเก็บ SHA-256 hash ไม่เก็บ identifier, รหัสผ่าน หรือ access token

| AC | API response | Database constraint / behavior |
|---|---|---|
| AC8.1 | OIDC callback สำเร็จ `303` ไป `/admin` และตั้ง HttpOnly session cookie; `GET /admin/auth/session` ตอบ `200` | เพิ่ม session หลังตรวจ OIDC และ Staff mapping; unique hash 32 bytes; `expires_at` ต้องมากกว่า `created_at` |
| AC8.2 | `403 STAFF_ACCESS_REQUIRED` | ไม่สร้าง session สำหรับ identity ที่ไม่ได้ mapping เป็น Staff |
| AC8.3 | `GET /admin/auth/session` ตอบ `401 AUTHENTICATION_REQUIRED`; Web Admin redirect ไป sign-in | ไม่พบ hash หรือ session ถูกเพิกถอน/หมดอายุ ต้องปฏิเสธ |
| AC8.4 | `400 INVALID_OIDC_RESPONSE` สำหรับ callback ที่ผิดรูปแบบ; `401 AUTHENTICATION_REQUIRED` สำหรับผลยืนยันที่ไม่ผ่าน | state/nonce ใช้ได้ครั้งเดียวภายใน 5 นาที; ตรวจ issuer/audience/signature/expiry ก่อน insert; callback ที่ไม่ผ่านต้องไม่มี session row |
| AC8.5 | `502 AUTHENTICATION_UNAVAILABLE` เมื่อ IdP ล้มเหลว; `400 AUTHENTICATION_CANCELLED` เมื่อผู้ใช้ยกเลิก | ไม่สร้าง session เมื่อ IdP ล้มเหลวหรือผู้ใช้ยกเลิก |
| AC8.6 | `401 SESSION_EXPIRED` | session ที่หมดอายุหรือมี `revoked_at` ใช้งานไม่ได้ |
| AC8.7 | `POST /admin/auth/logout` ตอบ `204` และล้าง cookie | ตั้ง `revoked_at` เพื่อเพิกถอน session; session ที่ revoke แล้วใช้ซ้ำไม่ได้ |

ตาราง `staff_admin_sessions` เก็บ hash ของ session identifier, issuer, subject และเวลาเริ่ม/หมดอายุ/เพิกถอน; unique index บน hash ใช้ค้น session โดยไม่เก็บค่า cookie จริง. ตาราง `staff_admin_oidc_flows` เก็บ state hash, nonce และ PKCE verifier ชั่วคราว; callback จะ consume รายการได้ครั้งเดียว และล้างรายการหมดอายุเมื่อเริ่ม sign-in ครั้งถัดไป

ข้อมูล seed มีเฉพาะ session ที่หมดอายุหรือถูกเพิกถอนสำหรับตรวจ AC8.6–AC8.7; ไม่ seed session ที่ใช้งานได้ เพราะจะเป็นการข้าม OIDC. AC8.1–AC8.5 ต้องใช้ OIDC test provider/fixtures ในชั้นทดสอบ ไม่ใช้ข้อมูล seed เพื่อจำลองผู้ใช้ที่ยืนยันตัวตนแล้ว

## ข้อตกลงสถาปัตยกรรมสำหรับ implementation

- Web Admin ใช้ Next.js ใน monorepo เดียวกับ NestJS ซึ่งเป็นเจ้าของ OIDC callback และ API จัดการ session
- Reverse proxy ของ deployment จะส่ง `/admin/auth/*` ไป NestJS และหน้า `/admin` ไป Next.js ภายใต้ same-origin เพื่อให้ session cookie ใช้ร่วมกันได้
- Next.js ใช้ `AUTH_API_ORIGIN` เพื่อเรียก NestJS session API จาก server-side; ค่าจริงขึ้นกับ platform ที่เลือก
- แพลตฟอร์ม deployment และการตั้งค่า reverse proxy จริงยังไม่ระบุ ต้องกำหนดก่อนนำขึ้นใช้งานจริง
- การเชื่อม OIDC ใช้ไลบรารีมาตรฐานผ่าน adapter ที่เปลี่ยนแทนได้; การทดสอบใช้ local OIDC provider โดยไม่ใช้ secret หรือบัญชีผู้ใช้จริง
