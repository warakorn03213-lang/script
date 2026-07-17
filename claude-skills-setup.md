# ติดตั้ง Claude Code Skills จาก awesome-claude-skills

อ้างอิงจาก [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)

## สกิลที่เลือก (Dev/เว็บ)

| สกิล | คำอธิบาย | ที่มา |
|---|---|---|
| `frontend-design` | แนวทางออกแบบ UI แบบกล้าๆ ด้วย React + Tailwind | anthropics/skills |
| `webapp-testing` | ทดสอบเว็บแอปด้วย Playwright | anthropics/skills |
| `mcp-builder` | เฟรมเวิร์กสำหรับสร้าง MCP server | anthropics/skills |

## ขั้นตอนติดตั้ง

### 1. เพิ่ม marketplace

```
/plugin marketplace add anthropics/skills
```

### 2. ติดตั้งทีละสกิล

ยังไม่มีคำสั่งติดตั้งหลายตัวพร้อมกัน ต้องรันทีละบรรทัด และแทน `<marketplace-name>` ด้วยชื่อจริงที่ระบบตั้งให้หลังขั้นตอนที่ 1 (มักเป็น `skills`):

```
/plugin install frontend-design@<marketplace-name>
/plugin install webapp-testing@<marketplace-name>
/plugin install mcp-builder@<marketplace-name>
```

### 3. ถ้าไม่แน่ใจชื่อ marketplace หรือ syntax

พิมพ์ `/plugin` เปล่าๆ เพื่อเปิดเมนู แล้วไปที่แท็บ **Discover** จะเห็นรายชื่อสกิลทั้งหมดใน marketplace นั้น กด Enter เพื่อติดตั้งได้เลยโดยไม่ต้องเดาชื่อ

## หมายเหตุ

- คำสั่ง `/plugin` เป็นคำสั่ง CLI ของ Claude Code ต้องรันเองในพรอมต์ ไม่สามารถให้ Claude รันแทนได้
- สกิลอื่นๆ ที่มีใน repo แต่ยังไม่ได้เลือก: เอกสารออฟฟิศ (docx/pdf/pptx/xlsx), งานออกแบบ/ครีเอทีฟ, superpowers (TDD/debugging), และสกิลจากคอมมูนิตี้อื่นๆ — ดูรายชื่อเต็มได้ที่ลิงก์ด้านบน
