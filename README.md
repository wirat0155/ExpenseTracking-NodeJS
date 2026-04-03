# Expense Tracker

ระบบบันทึกรายรับรายจ่าย (Expense Tracking System)

## Features

- ✅ ระบบ Login/Logout ด้วย JWT Authentication
- ✅ บันทึกรายจ่ายรายวัน
- ✅ Dashboard แสดงสถิติรายจ่ายพร้อมกราฟ ApexCharts
- ✅ Calendar view แสดงรายจ่ายในรูปแบบปฏิทิน
- ✅ ตั้งค่างบประมาณรายเดือน (Master Budget & Monthly Budget)
- ✅ จัดการหมวดหมู่ (Categories) - หมวดหมู่ระบบ + หมวดหมู่ของผู้ใช้
- ✅ Autocomplete ชื่อรายการจากประวัติเดิม
- ✅ Responsive Design รองรับมือถือและเดสก์ท็อป

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQL Server
- **Authentication**: JWT (JSON Web Token)
- **Frontend**: HTML, TailwindCSS, Vanilla JavaScript
- **Charts**: ApexCharts

## Installation

1. Clone repository:
```bash
git clone <repository-url>
cd expense-tracker
```

2. Install dependencies:
```bash
npm install
```

3. สร้างไฟล์ `.env`:
```env
DB_CONNECTION_STRING=Server=localhost;Database=ExpenseDB;User Id=sa;Password=your_password;TrustServerCertificate=true;
PORT=3000
```

4. รันโปรเจกต์:
```bash
npm run dev
```

5. เปิด browser ไปที่: http://localhost:3000

## Default Login

- **Email**: sunneed.2555@gmail.com
- **Password**: (ตามที่กำหนดใน seed script)

## Project Structure

```
├── controllers/        # API controllers
├── db/                # Database initialization
├── middleware/        # Express middleware (auth)
├── public/            # Frontend static files
│   ├── assets/       # CSS, JS, images
│   ├── partials/     # HTML components
│   └── *.html        # Page files
├── routes/           # API routes
├── db.js             # Database connection
├── server.js         # Express server
└── package.json      # Dependencies
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Expenses
- `GET /api/expenses` - List expenses (with pagination, filter, sort)
- `GET /api/expenses/suggestions` - Get expense title suggestions
- `GET /api/expenses/calendar` - Get calendar data
- `POST /api/expenses` - Create expense (supports split months)
- `DELETE /api/expenses/:id` - Delete expense

### Budgets
- `GET /api/budgets` - Get monthly budget
- `GET /api/budgets/master` - Get master budget
- `POST /api/budgets` - Set monthly budget
- `POST /api/budgets/master` - Set master budget

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create user category
- `DELETE /api/categories/:id` - Delete user category

### Dashboard
- `GET /api/dashboard/summary` - Get dashboard summary with chart data

## License

MIT
