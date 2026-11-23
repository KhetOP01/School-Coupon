# 🎯 แผนภาพ UML Use Case Diagram — ระบบคูปองดิจิทัลโรงเรียน

แผนภาพแสดงผู้ใช้งานทั้งหมด (Actors) และขอบเขตการทำงานของระบบ **School Coupon System** พร้อมความสัมพันธ์แบบ UML (`«include»` และ `«extend»`)

```mermaid
flowchart LR
    %% ผู้ใช้งานหลัก (ฝั่งซ้าย)
    Staff(["👤 เจ้าหน้าที่โรงเรียน<br/>(เว็บแอดมิน)"])
    Parent(["👤 ผู้ปกครอง<br/>(แอปผู้ปกครอง)"])
    Merchant(["👤 ร้านค้า / แคชเชียร์<br/>(แอป POS)"])

    %% ขอบเขตระบบ
    subgraph System["«ระบบ» School Coupon System"]
        direction TB

        subgraph AuthPkg["ระบบยืนยันตัวตน (UC-08)"]
            UC_Login(["เข้าสู่ระบบ OIDC"])
            UC_Session(["ตรวจสอบสิทธิ์เซสชัน"])
        end

        subgraph StudentPkg["บัญชีนักเรียนและบัตร RFID (UC-01..04)"]
            UC_Students(["ดูรายชื่อและยอดเงินนักเรียน"])
            UC_Reissue(["ออกบัตร RFID ใหม่"])
            UC_Freeze(["อายัด / ปลดอายัดบัตร"])
            UC_Refund(["คืนเงินนักเรียนลาออก"])
            UC_TopUp(["เติมเงินผ่าน QR PromptPay"])
            UC_GenQR(["สร้าง QR รับเงิน"])
            UC_Webhook(["รับแจ้งผลชำระเงิน Webhook"])
            UC_Limit(["ตั้งวงเงินใช้จ่ายรายวัน"])
            UC_ApplyLimit(["ปรับใช้วงเงินวันถัดไป"])
        end

        subgraph PayPkg["การชำระเงินและ POS (UC-05..06)"]
            UC_PayOnline(["คิดเงินโหมด Online"])
            UC_PayOffline(["คิดเงินโหมด Offline"])
            UC_Validate(["ตรวจบัตร วงเงิน และยอดคงเหลือ"])
            UC_Sync(["ซิงก์รายการออฟไลน์ขึ้นเซิร์ฟเวอร์"])
            UC_Void(["ยกเลิกบิลภายในวัน (Void)"])
        end

        subgraph SettlePkg["สรุปยอดและโอนเงินร้านค้า (UC-07)"]
            UC_Batch(["สรุปยอดขายเที่ยงคืน"])
            UC_Approve(["อนุมัติโอนเงินรอบ T+1"])
        end
    end

    %% ระบบภายนอกและระบบอัตโนมัติ (ฝั่งขวา)
    OIDC(["«ระบบภายนอก»<br/>ผู้ให้บริการยืนยันตัวตน OIDC"])
    Gateway(["«ระบบภายนอก»<br/>ระบบรับชำระเงิน (Omise / Sandbox)"])
    Cron(["«ระบบอัตโนมัติ»<br/>ตัวตั้งเวลา (Cron Job)"])

    %% ความสัมพันธ์ฝั่งเจ้าหน้าที่
    Staff --> UC_Login
    Staff --> UC_Students
    Staff --> UC_Reissue
    Staff --> UC_Freeze
    Staff --> UC_Refund
    Staff --> UC_Approve

    %% ความสัมพันธ์ฝั่งผู้ปกครอง
    Parent --> UC_TopUp
    Parent --> UC_Limit
    Parent --> UC_Freeze

    %% ความสัมพันธ์ฝั่งร้านค้า
    Merchant --> UC_PayOnline
    Merchant --> UC_PayOffline
    Merchant --> UC_Sync
    Merchant --> UC_Void

    %% ความสัมพันธ์ระบบภายนอก
    UC_Login <--> OIDC
    UC_GenQR <--> Gateway
    Gateway --> UC_Webhook
    Cron --> UC_Batch
    Cron --> UC_ApplyLimit

    %% ความสัมพันธ์ UML «include» และ «extend»
    UC_Reissue -.->|"«include»"| UC_Freeze
    UC_TopUp -.->|"«include»"| UC_GenQR
    UC_PayOnline -.->|"«include»"| UC_Validate
    UC_Approve -.->|"«include»"| UC_Session

    UC_Webhook -.->|"«extend»"| UC_TopUp
    UC_Sync -.->|"«extend»"| UC_PayOffline
    UC_Void -.->|"«extend»"| UC_PayOnline
```

---

## สรุปบทบาทผู้ใช้งานและระบบที่เกี่ยวข้อง (Actors)

| Actor | ช่องทางใช้งาน | หน้าที่และ Use Cases ที่เกี่ยวข้อง |
|---|---|---|
| **เจ้าหน้าที่โรงเรียน** | เว็บแอดมิน (Next.js) | เข้าสู่ระบบ OIDC (UC-08), ดูข้อมูลนักเรียน, ออกบัตรใหม่ (UC-01), อายัด/ปลดอายัด & คืนเงินลาออก (UC-02), อนุมัติโอนเงิน T+1 (UC-07) |
| **ผู้ปกครอง** | แอปผู้ปกครอง (Expo) | เติมเงิน QR PromptPay (UC-03), ตั้งวงเงินรายวัน (UC-04), อายัดบัตรหายชั่วคราว (UC-02) |
| **ร้านค้า / แคชเชียร์** | แอป POS (Expo) | คิดเงิน Online/Offline (UC-05), ซิงก์รายการออฟไลน์ (UC-05), ยกเลิกบิลภายในวัน (UC-06) |
| **ผู้ให้บริการ OIDC** | ระบบยืนยันตัวตนภายนอก | ตรวจสอบตัวตนและออกสิทธิ์เจ้าหน้าที่ (UC-08) |
| **ระบบรับชำระเงิน** | Omise / Sandbox API | สร้าง QR PromptPay และส่ง Webhook แจ้งผลเติมเงิน (UC-03) |
| **ตัวตั้งเวลาอัตโนมัติ** | Cron Job | สรุปยอดขายร้านค้าตอนเที่ยงคืน (UC-07) และปรับใช้วงเงินรายวันใหม่เวลา 00:00 น. (UC-04) |
