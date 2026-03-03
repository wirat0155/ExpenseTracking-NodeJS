# Expense Tracker Web App 📊

ระบบบันทึกรายรับรายจ่ายแบบ Dashboard ที่สวยงามและใช้งานง่าย มาพร้อมระบบการจัดการงบประมาณ (Budget) รายเดือน

## ✨ ฟีเจอร์หลัก (Features)

- **📝 บันทึกรายจ่าย**: เพิ่มและลบรายการรายจ่ายได้ง่ายๆ
- **📅 ระบบปฏิทิน**: ดูสรุปรายจ่ายแต่ละวันในรูปแบบปฏิทิน (Calendar View)
- **💰 การจัดการงบประมาณ (Budget)**:
  - ตั้งค่างบประมาณเริ่มต้น (Master Budget)
  - กำหนดงบประมาณเฉพาะเดือนได้ (Custom Monthly Budget)
  - แถบความคืบหน้า (Progress Bar) แจ้งเตือนเมื่อใช้เกินงบ
  - **Sidebar Sync**: งบประมาณบน Sidebar อัปเดตทันทีเมื่อมีการเพิ่มหรือลบรายการ
- **📊 Dashboard Summary**: 
  - สรุปยอดรวมเดือนปัจจุบัน
  - กราฟแท่งแสดงรายจ่ายตามหมวดหมู่
  - ตารางสรุปประวัติรายเดือน
- **🗂️ ระบบแบ่งจ่าย (Split Expenses)**: รองรับการบันทึกรายการแบบจ่ายหลายงวด

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend**: HTML5, CSS3, Tailwind CSS, Bootstrap Icons
- **Backend**: Node.js, Express
- **Database**: SQL Server (MSSQL)
- **Utilities**: SweetAlert2 (แจ้งเตือน), Google Fonts (IBM Plex Sans Thai)

## 🚀 การติดตั้ง (Installation)

1. **Clone repository**:
   ```bash
   git clone <repository-url>
   cd expense-tracker
   ```

2. **ติดตั้ง Dependencies**:
   ```bash
   npm install
   ```

3. **ตั้งค่า Database**:
   - สร้างฐานข้อมูลใน SQL Server
   - รันสคริปต์ SQL (ถ้ามี) เพื่อสร้าง Table ที่จำเป็น

4. **ตั้งค่า Environment Variables**:
   สร้างไฟล์ `.env` ที่ root directory:
   ```env
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_SERVER=localhost
   DB_DATABASE=ExpenseDB
   PORT=3000
   ```

5. **เริ่มรันโปรเจกต์**:
   ```bash
   npm start
   # หรือสำหรับ Development (Auto reload)
   npm run dev
   ```

6. เข้าใช้งานผ่าน Browser ที่: `http://localhost:3000/expense`

## 📦 โครงสร้างโปรเจกต์ (Structure)

- `/public`: ส่วนแสดงผล Frontend และ Assets
- `/controllers`: ส่วนควบคุม Logic ของ Backend
- `/routes`: ส่วนจัดการเส้นทาง API
- `/db`: ส่วนเชื่อมต่อฐานข้อมูล
- `/test`: ชุดทดสอบระบบ (Test Suite)

---
**Version**: 1.0 (20260303)
