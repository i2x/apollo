# wiki-viewer

ตัวอ่าน wiki แบบอ่านอย่างเดียวสำหรับ `../../wiki` พร้อมตัวตรวจกติกา ดูที่มาได้ใน spec หัวข้อ 11 (`docs/specs/2026-09-28-learning-wiki-design.md`)

```bash
npm install
npm run wiki       # http://localhost:4000  (เปลี่ยนด้วย PORT=… หรือ WIKI_DIR=…)
npm run check      # ตรวจกติกา จบด้วย exit 1 ถ้ามี error
npm test
npm run typecheck
```

ใช้ Node ≥ 20 รันด้วย `tsx` (TypeScript + JSX โดยไม่ต้อง build) · server คือ [Hono](https://hono.dev) + Hono JSX ซึ่ง escape ข้อความให้อัตโนมัติ · frontmatter อ่านด้วย `gray-matter`

| ไฟล์ | หน้าที่ |
|---|---|
| `src/wiki.ts` | โหลดไฟล์ `.md` (ข้ามโฟลเดอร์ที่ขึ้นต้นด้วย `_`), อ่าน frontmatter ด้วย gray-matter, กำหนด id ของหน้า |
| `src/markdown.ts` | tokenizer ของ `[[ลิงก์]]` ใช้ทั้งตอน render และตอนหาลิงก์ จึงข้ามลิงก์ใน code ได้ถูกต้อง |
| `src/check.ts` | กฎทุกข้อของ wiki |
| `src/search.ts`, `src/backlinks.ts`, `src/home.ts` | ค้นหา, backlinks, skill tree และ dashboard |
| `src/app.tsx` | route ทั้งหมดของ Hono (ทดสอบได้ด้วย `app.request()` โดยไม่ต้องเปิด server) |
| `src/views.tsx` | หน้าเว็บเป็น JSX component |
| `src/server.ts` | เปิด server ที่ `127.0.0.1` |
