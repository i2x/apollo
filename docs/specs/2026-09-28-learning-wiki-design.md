# Apollo Learning Wiki — Design Spec

- วันที่: 2026-09-28
- สถานะ: รอ review

## 1. เป้าหมาย

สร้าง wiki ที่เป็นศูนย์กลางความรู้ของการเรียน game craft ด้วยตัวเอง โดย wiki ต้อง:

1. บอกได้ทันทีว่า **เรียนอะไรไปแล้ว เหลืออะไร และเป้าหมายถัดไปคืออะไร**
2. นับว่า "เรียนรู้แล้ว" ได้ **ก็ต่อเมื่อมีหลักฐานจากการลงมือทำ** ความรู้ที่ไม่มีหลักฐานจะไม่ถูกนับ ข้อนี้คือกลไกหลักที่กันไม่ให้งานกลายเป็น slop
3. ใช้เป็นไกด์ตอน implement จริงได้ ทั้งช่วง tabletop design และช่วงสร้าง engine ในอนาคต

**ลำดับการเรียน:** tabletop game design ก่อน โดยเริ่มจากเกมกระดาษง่ายๆ แล้วขยับไปเกมที่ซับซ้อนขึ้น ปลายทางคือ **dungeon crawler RPG แบบไม่มี GM** จากนั้นจึงสร้าง game engine (node, scene, animation, effect) เพื่อทำเกมนั้นให้เล่นบนจอได้

**นอกขอบเขตของ spec นี้:** รายละเอียดสาขา engine ซึ่งจะมี spec ของตัวเองเมื่อโปรเจกต์ 04 จบ และ Othello ที่ตัดออกตามที่ผู้ใช้ขอ

## 2. การตัดสินใจหลัก

| เรื่อง | ตัดสินใจ |
|---|---|
| รูปแบบ wiki | ไฟล์ Markdown ใน `apollo/wiki/` เป็นแหล่งข้อมูลจริง ใช้ลิงก์ `[[...]]` และมี git เก็บประวัติ (remote: `github.com/i2x/apollo`, branch `main`) |
| การอ่าน wiki | ใช้ wiki viewer ที่สร้างเอง (หัวข้อ 11) ซึ่งอ่านอย่างเดียว ส่วนการเขียนใช้ editor อะไรก็ได้ |
| ภาษา | เนื้อหาภาษาไทย ศัพท์เทคนิคภาษาอังกฤษ ชื่อไฟล์ภาษาอังกฤษแบบ kebab-case |
| โครงสร้างการเรียน | Skill tree (concept + dependency + สถานะ) คู่กับบันไดโปรเจกต์ (เกมกระดาษที่ใหญ่ขึ้นเรื่อยๆ) |
| บทบาท Claude | ครูฝึกและคนตรวจ: เขียนคำอธิบายสั้นๆ ออกแบบแบบฝึก ตั้งคำถามตรวจ ดูแลส่วน "ตอนนี้" ใน dashboard และสร้าง viewer |
| บทบาทผู้ใช้ | ทำ prototype, playtest, จด log, เขียนความเข้าใจด้วยคำพูดตัวเอง และเลื่อนสถานะเป็น `learned` |
| ตัวอย่างประกอบ | เกม RPG จริง 6 เกม (หัวข้อ 7) และเกมสมมุติ "ถ้ำเทียนดับ" |

## 3. โครงสร้างโฟลเดอร์

```
apollo/
├── CLAUDE.md                  ← บทบาทและกติกาสำหรับ Claude ทุกรอบสนทนา
├── .gitignore
├── docs/specs/                ← spec การออกแบบ (ไฟล์นี้)
├── tools/
│   └── wiki-viewer/           ← หัวข้อ 11
└── wiki/
    ├── README.md              ← ส่วน "ตอนนี้" (เขียนด้วยมือ)
    ├── how-this-wiki-works.md ← กติกาของ wiki สำหรับผู้ใช้
    ├── examples/
    │   ├── rpg-references.md  ← เกม RPG จริงที่ใช้ศึกษา
    │   └── candle-cave.md     ← "ถ้ำเทียนดับ" เกมตัวอย่างประจำ wiki
    ├── skills/
    │   ├── design/            ← 17 node (หัวข้อ 5)
    │   └── engine/
    │       └── README.md      ← บอกว่า locked และจะเปิดเมื่อจบโปรเจกต์ 04
    ├── projects/
    │   ├── 01-dice-duel/
    │   │   ├── README.md      ← เป้าหมาย, ข้อจำกัด, concept, เงื่อนไขจบ, สรุปผล
    │   │   ├── dice-duel-rules-v1.md   ← เก็บกติกาทุกเวอร์ชัน ห้ามเขียนทับของเดิม
    │   │   └── playtests/     ← dice-duel-YYYY-MM-DD-vN.md
    │   ├── 02-one-room/
    │   ├── 03-the-descent/
    │   └── 04-capstone/
    └── _templates/
        ├── skill-node.md
        ├── project.md
        ├── rules.md
        └── playtest-log.md
```

**หลักการ**
- หลักฐานเก็บอยู่กับโปรเจกต์ skill node แค่ลิงก์ไปหา ไม่ก๊อปเนื้อหามาซ้ำ
- เก็บกติกาทุกเวอร์ชันไว้ เพื่อให้เห็นว่ากติกาเปลี่ยนไปอย่างไรและเพราะอะไร
- ไม่มี journal แยก เพราะ git history ทำหน้าที่นี้อยู่แล้ว
- ตอนเริ่มต้นทุกโปรเจกต์มีแค่ `README.md` ส่วนไฟล์ rules กับ `playtests/` สร้างเมื่อผู้ใช้เริ่มเขียนกติกาของโปรเจกต์นั้นจริง
- ชื่อไฟล์ใน `wiki/` ต้องไม่ซ้ำกันทั้ง wiki ยกเว้น `README.md` เพื่อให้ `[[ชื่อไฟล์]]` ชี้ไปไฟล์เดียวเสมอ ส่วน `README.md` ของโฟลเดอร์ให้ลิงก์ด้วยชื่อโฟลเดอร์ เช่น `[[01-dice-duel]]` ดังนั้นไฟล์ rules และ playtest ต้องมีชื่อโปรเจกต์นำหน้า เช่น `dice-duel-rules-v1.md`, `dice-duel-2026-10-01-v1.md`

## 4. Skill node

### 4.1 รูปแบบไฟล์

```markdown
---
type: skill
status: locked            # locked | learning | learned
requires: [player-goal, meaningful-choice]
evidence: []              # path (นับจาก wiki/) ไปยัง playtest log / rules ที่พิสูจน์ความเข้าใจ
---
# <ชื่อ concept>

## คืออะไร
<!-- Claude เขียน: ไม่เกิน 1 ย่อหน้า + ตัวอย่างจากเกมจริง/ถ้ำเทียนดับ 1–2 ตัวอย่าง -->

## แบบฝึก
<!-- Claude เขียน: งานที่ต้องลงมือทำ ผลลัพธ์ต้องกลายเป็น evidence ได้ -->

## ความเข้าใจของผม
<!-- ผู้ใช้เขียนเท่านั้น: ด้วยคำพูดตัวเอง หลังทำแบบฝึก -->

## คำถามที่ยังค้าง
<!-- ใครก็เขียนได้ -->

## คำถามตรวจ
<!-- Claude ถาม หลังผู้ใช้เขียน "ความเข้าใจของผม" / ผู้ใช้ตอบต่อท้ายแต่ละคำถาม -->
```

- `requires` ใน frontmatter เขียนเป็นชื่อ node เปล่าๆ เพื่อให้ parse ได้ ส่วนในเนื้อหาใช้ลิงก์ `[[...]]`
- node ที่ยัง `locked` มีแค่ frontmatter กับหัวข้อ `# ชื่อ` และประโยคเดียวบอกว่าต้อง learned node ไหนก่อน **ไม่เขียนเนื้อหาล่วงหน้า**

### 4.2 กติกาการเลื่อนสถานะ

| จาก → ไป | เงื่อนไข | ใครทำ |
|---|---|---|
| `locked → learning` | node ใน `requires` ทุกตัวเป็น `learned` แล้ว (node ที่ไม่มี `requires` เริ่มได้ทันที) | Claude เปลี่ยนสถานะ แล้วเขียน "คืออะไร" กับ "แบบฝึก" |
| `learning → learned` | ต้องครบทั้ง ① `evidence` มีอย่างน้อย 1 path ② ผู้ใช้เขียน "ความเข้าใจของผม" แล้ว ③ ผู้ใช้ตอบคำถามตรวจทุกข้อ และ Claude เห็นว่าคำตอบแสดงความเข้าใจ | **ผู้ใช้เท่านั้น** |
| `learned → learning` | พบระหว่างทำโปรเจกต์ถัดไปว่ายังไม่เข้าใจจริง ถือเป็นเรื่องปกติ | ใครก็ได้ พร้อมเขียนเหตุผลไว้ใน "คำถามที่ยังค้าง" |

**Claude ห้ามเขียนส่วน "ความเข้าใจของผม" และห้ามเปลี่ยนสถานะเป็น `learned`** ไม่ว่ากรณีใด

## 5. Skill tree สาขา design (17 node)

| ชั้น | node | requires | สาระ |
|---|---|---|---|
| 1 | `playtesting` | — | วิธีเล่นทดสอบและจด log (ทุก evidence มาจากตรงนี้) |
| 1 | `mechanic-vs-rule` | — | mechanic, rule, component ต่างกันอย่างไร |
| 1 | `player-goal` | — | เป้าหมาย, เงื่อนไขชนะหรือแพ้ |
| 1 | `meaningful-choice` | player-goal | การตัดสินใจที่มีผลและมีราคาที่ต้องจ่าย |
| 1 | `kinds-of-fun` | — | MDA framework, ความสนุก 8 แบบ |
| 2 | `core-loop` | player-goal, meaningful-choice | วงจรการเล่นที่วนซ้ำ |
| 2 | `randomness` | meaningful-choice | input vs output randomness |
| 2 | `resource-tension` | core-loop | ทรัพยากรที่ต้องเลือกว่าจะใช้กับอะไร |
| 2 | `feedback-loops` | core-loop | positive / negative loop, snowball |
| 3 | `probability` | randomness | 2d6 bell curve, expected value |
| 3 | `push-your-luck` | randomness, resource-tension | เสี่ยงต่อหรือพอแค่นี้ |
| 3 | `procedural-content` | probability | ตารางสุ่ม → ความหลากหลายในแต่ละรอบเล่น |
| 3 | `balance` | probability, feedback-loops | ความสมดุลของตัวเลือกและความยาก |
| 3 | `pacing` | feedback-loops | ความยากที่เพิ่มขึ้น, จังหวะการเล่น |
| 4 | `enemy-behavior` | procedural-content, meaningful-choice | ศัตรูตัดสินใจเองได้โดยไม่ต้องมี GM |
| 4 | `progression` | resource-tension, balance | ตัวละครพัฒนาขึ้นเรื่อยๆ |
| 4 | `rulebook-writing` | mechanic-vs-rule | เขียนกติกาให้คนอื่นอ่านแล้วเล่นได้เลย |

**สถานะเริ่มต้น:** node ที่ไม่มี `requires` คือ `playtesting`, `mechanic-vs-rule`, `player-goal`, `kinds-of-fun` จะเริ่มเป็น `learning` และมีเนื้อหา "คืออะไร" กับ "แบบฝึก" ตั้งแต่วันแรก node ที่เหลืออีก 13 ตัวเริ่มเป็น `locked`

## 6. บันไดโปรเจกต์

`README.md` ของแต่ละโปรเจกต์มี frontmatter ดังนี้

```yaml
type: project
status: not-started       # not-started | active | done
concepts: [playtesting, mechanic-vs-rule, player-goal, meaningful-choice, kinds-of-fun]
```

| # | ชื่อ | ข้อจำกัด | concept ที่โปรเจกต์นี้ผลิต evidence ให้ | เงื่อนไขจบ |
|---|---|---|---|---|
| 01 | **Dice Duel**: ต่อสู้ด้วยลูกเต๋า 2 คน | กติกาไม่เกิน 1 หน้า, ใช้ d6 ไม่เกิน 6 ลูก, เล่นจบใน 10 นาที | ชั้น 1 ทั้งหมด | playtest ≥ 3 ครั้ง (มีคนอื่นร่วมเล่นอย่างน้อย 1 ครั้ง) และมีกติกา ≥ 2 เวอร์ชัน |
| 02 | **One Room**: เล่นคนเดียว เอาชีวิตรอดในห้องเดียว | มีทรัพยากร 1 ชนิดที่ต้องบริหาร | core-loop, randomness, resource-tension | playtest ≥ 5 ครั้ง, log บันทึกจังหวะที่ต้องลังเลก่อนตัดสินใจอย่างน้อย 1 จุดต่อเกม |
| 03 | **The Descent**: ลงดันเจี้ยนหลายห้อง สร้างห้องจากตาราง | ตารางสุ่มไม่เกิน 2 ตาราง | push-your-luck, probability, procedural-content, feedback-loops | เล่น 5 รอบแล้ว log ยืนยันว่าแต่ละรอบต่างกัน และมีไฟล์คำนวณความน่าจะเป็นของตาราง |
| 04 | **Capstone**: dungeon crawler ฉบับเต็ม | ศัตรูต้องมี behavior rule, ตัวละครพัฒนาได้ | balance, pacing, enemy-behavior, progression, rulebook-writing | **Blind playtest**: คนอื่นอ่านกติกาแล้วเล่นเองโดยผู้ใช้ไม่ต้องอธิบาย |

- ชื่อโปรเจกต์เป็นชื่อชั่วคราว ผู้ใช้เปลี่ยนเป็นชื่อเกมจริงของตัวเองได้
- โปรเจกต์หนึ่งเริ่มได้เมื่อโปรเจกต์ก่อนหน้าเป็น `done` แล้ว concept ในคอลัมน์ที่ 4 **ไม่จำเป็นต้อง learned ก่อนเริ่มโปรเจกต์** เพราะโปรเจกต์คือที่ที่ผลิต evidence ให้ concept พวกนั้น และ node ใดที่ยัง locked จะถูก unlock ระหว่างทำโปรเจกต์ตามกติกาในหัวข้อ 4.2
- ผู้ใช้เป็นคนเปลี่ยนสถานะโปรเจกต์เป็น `done` เมื่อเงื่อนไขจบครบ
- **เชื่อมไปสู่ engine:** เกมจากโปรเจกต์ 04 จะเป็นเกมแรกที่ทำใน engine และเป็นจุดที่สาขา `skills/engine/` เริ่ม unlock

## 7. ตัวอย่างประกอบ

**เกม RPG จริง** (`examples/rpg-references.md`): Four Against Darkness (procedural generation), Mini Rogue (ออกแบบภายใต้ข้อจำกัด), Lasers & Feelings (elegance), Into the Odd (pacing: ตัดการทอยว่าตีโดนหรือไม่), Gloomhaven (controlled randomness ด้วยการ์ด), D&D 5e (core resolution แบบ d20) แต่ละเกมมีคำอธิบาย 2–3 บรรทัด ว่าเล่นอย่างไรและสอน concept ไหน โดยลิงก์ไปยัง node ที่เกี่ยวข้อง

**ถ้ำเทียนดับ** (`examples/candle-cave.md`): solo dungeon crawl, ใช้ 2d6 + กระดาษ, เล่นจบใน 15 นาที
- เป้าหมาย: ลงไปให้ลึกที่สุดแล้วกลับออกมาพร้อมสมบัติ
- ทรัพยากร: เทียน 10 ขีด (เข้าห้องใหม่ห้องละ 1 ขีด และต้องเหลือพอสำหรับเดินกลับ)
- Core loop: เข้าห้อง → ทอย 2d6 เปิดตาราง → เลือก สู้ / ย่อง / หนี → ตัดสินใจว่าจะลงลึกต่อหรือกลับ
- ในไฟล์นี้เขียนเป็น**ภาพรวมระดับ concept** เท่านั้น ไม่ใช่กติกาที่เล่นได้ครบ เพื่อไม่ให้กลายเป็นเกมที่ผู้ใช้ลอกไปเป็นโปรเจกต์ของตัวเอง

## 8. Dashboard

- **`wiki/README.md`** (เขียนด้วยมือ) มีแค่ส่วน **"ตอนนี้"**: โปรเจกต์ปัจจุบัน, node ที่กำลังเรียน, และ**ก้าวถัดไป 1 บรรทัด** Claude อัปเดตตอนจบทุกรอบ
- **หน้าแรกของ viewer** (คำนวณเอง) แสดงส่วน "ตอนนี้" จาก `README.md` แล้วตามด้วย skill tree, ตัวนับ `design N/17 · engine 🔒`, บันไดโปรเจกต์ และผลตรวจกติกา (หัวข้อ 11)

## 9. การทำงานในแต่ละรอบ

1. **เปิดรอบ**: Claude อ่าน `wiki/README.md` และรัน `npm run check` (เมื่อ viewer มีแล้ว) สรุปว่าอยู่ตรงไหน แล้วเสนอสิ่งที่ควรทำต่อ
2. **Unlock**: ถ้ามี node ที่เงื่อนไขครบ Claude เปลี่ยนเป็น `learning` แล้วเขียน "คืออะไร" กับ "แบบฝึก"
3. **ลงมือ**: ผู้ใช้ทำ prototype และ playtest บนกระดาษ (ทำนอกคอม)
4. **จด log**: ผู้ใช้จดตาม `_templates/playtest-log.md`
5. **เขียน**: ผู้ใช้เขียน "ความเข้าใจของผม"
6. **ตรวจ**: Claude อ่าน log กับความเข้าใจ แล้วเขียนคำถามตรวจ 2–3 ข้อ ผู้ใช้ตอบในไฟล์
7. **ปิด**: ถ้าผ่าน ผู้ใช้เปลี่ยนเป็น `learned` เอง Claude อัปเดตส่วน "ตอนนี้" แล้วรัน `npm run check` ถ้าผ่านจึง git commit

**Playtest log** (`_templates/playtest-log.md`): frontmatter `type: playtest`, `rules: <ชื่อไฟล์ rules>`, `concepts: [...]` และมีหัวข้อ: ผู้เล่น, เกิดอะไรขึ้นบ้าง, ผู้เล่นลังเลตรงไหน, เบื่อหรือสับสนตรงไหน, จะเปลี่ยนอะไรในเวอร์ชันต่อไป

## 10. `CLAUDE.md`

สรุปสั้นๆ ให้ Claude ทุกรอบสนทนาทำตาม:
- บทบาทครูฝึกและคนตรวจ พร้อมข้อห้ามในหัวข้อ 4.2
- เปิดรอบและปิดรอบตามหัวข้อ 9
- เขียนเนื้อหา node เฉพาะเมื่อ node นั้น unlock
- ภาษาไทยกับศัพท์เทคนิคภาษาอังกฤษ
- ห้ามใช้ Othello เป็นตัวอย่าง
- ถ้ากติกาของ wiki ต้องเปลี่ยน ให้แก้ spec นี้ก่อน

## 11. Wiki viewer (`tools/wiki-viewer/`)

**หลักการ:** ไฟล์ markdown เป็นแหล่งข้อมูลจริง viewer **อ่านอย่างเดียว** และไม่เก็บ state ของตัวเอง ทุก request อ่านไฟล์ใหม่จากดิสก์ แก้ไฟล์แล้วกด refresh ก็เห็นผลทันที

**ขอบเขตไฟล์:** โฟลเดอร์ที่ชื่อขึ้นต้นด้วย `_` (เช่น `_templates/`) ไม่นับเป็นหน้า wiki ทั้งตัว viewer และตัวตรวจกติกาข้ามไป แต่ยังแสดงเป็นไฟล์ดิบได้

**การรัน**
- `npm run wiki` เปิด server ที่ `http://localhost:4000`
- `npm run check` ตรวจกติกาใน terminal ถ้าเจอ error จะจบด้วย exit code 1

**ฟีเจอร์**

| ฟีเจอร์ | รายละเอียด |
|---|---|
| หน้า wiki | แปลง markdown เป็นหน้าเว็บ, แสดง frontmatter เป็นป้ายสถานะ, ลิงก์ `[[ชื่อ]]` resolve จากชื่อไฟล์ (หรือชื่อโฟลเดอร์สำหรับ `README.md`), ลิงก์ที่หาปลายทางไม่เจอแสดงเป็นสีแดง, รองรับ code block `mermaid` |
| Backlinks | ท้ายทุกหน้ามีรายการหน้าที่ลิงก์มาที่นี่ ทั้งจาก `[[...]]` ในเนื้อหา และจาก `evidence` / `concepts` ใน frontmatter |
| หน้าแรก | ส่วน "ตอนนี้" จาก `wiki/README.md`, skill tree เป็น Mermaid `graph TD` สร้างจาก `requires` แยกสีด้วย `classDef` ตามสถานะ และแต่ละ node คลิกไปหน้านั้นได้, ตัวนับความคืบหน้า, บันไดโปรเจกต์จาก `status` ของโปรเจกต์, และผลตรวจกติกา |
| ค้นหา | ค้นข้อความเต็มทั้ง wiki ไม่สนตัวพิมพ์เล็กใหญ่ กรองได้ด้วย `type` (skill / project / playtest / อื่นๆ) และ `status` ผลลัพธ์แสดงชื่อหน้าและบรรทัดที่เจอ |

**กฎที่ตรวจ**

| ระดับ | กฎ |
|---|---|
| error | node เป็น `learned` แต่ `evidence` ว่าง |
| error | path ใน `evidence` ชี้ไปไฟล์ที่ไม่มีอยู่ |
| error | ชื่อใน `requires` หรือ `concepts` ไม่ตรงกับ node ใดเลย |
| error | node เป็น `learning` หรือ `learned` ทั้งที่มี node ใน `requires` ที่ยังไม่ `learned` |
| error | ชื่อไฟล์ซ้ำกันใน `wiki/` (ยกเว้น `README.md`) |
| error | `requires` เป็นวงวน |
| warning | ลิงก์ `[[...]]` หาปลายทางไม่เจอ |
| warning | node ยัง `locked` ทั้งที่เงื่อนไข unlock ครบแล้ว |
| warning | มีโปรเจกต์ `active` มากกว่า 1 โปรเจกต์ |

**เทคโนโลยี:** TypeScript รันด้วย `tsx` โดยไม่ต้อง build · server และหน้าเว็บใช้ **Hono + Hono JSX** ซึ่ง escape ข้อความให้อัตโนมัติ · markdown ใช้ `marked` (ส่วน `[[ลิงก์]]` เป็น extension ที่เขียนเอง) · frontmatter ใช้ `gray-matter` · `mermaid` ติดตั้งผ่าน npm แล้วเสิร์ฟจาก `node_modules` หลัง `npm install` ครั้งแรกจึงใช้ได้แม้ไม่มีอินเทอร์เน็ต ส่วนตัวตรวจกติกาแยกเป็นโมดูลที่ไม่ผูกกับ server เพื่อให้ `npm run check` กับหน้าเว็บใช้โค้ดชุดเดียวกัน server รับการเชื่อมต่อจาก `127.0.0.1` เท่านั้น

**การทดสอบ:** `npm test` รัน unit test ของตัว resolve ลิงก์, ตัวตรวจกติกาทุกข้อ, การค้นหา, backlinks, dashboard และ route ของเว็บ (รวมถึงการ escape) โดยแต่ละ test สร้าง wiki จำลองของตัวเองในโฟลเดอร์ชั่วคราว ส่วน `npm run typecheck` ใช้ตรวจ type

**ไม่ทำในรุ่นนี้ (YAGNI):** แก้ไฟล์ในเบราว์เซอร์, login, deploy ขึ้นเว็บ, graph view แบบลากได้, live reload อัตโนมัติ

## 12. ลำดับการ implement

**รอบที่ 1 เนื้อหา wiki** (ผู้ใช้เริ่มโปรเจกต์ 01 บนกระดาษได้ทันทีหลังจบรอบนี้)
- `.gitignore`, `CLAUDE.md`
- `wiki/README.md`, `wiki/how-this-wiki-works.md`
- `_templates/` 4 ไฟล์, `examples/` 2 ไฟล์
- `skills/design/` 17 ไฟล์ (มีเนื้อหาครบ 4 ไฟล์ที่เป็น `learning` อีก 13 ไฟล์เป็นแค่ stub)
- `skills/engine/README.md`
- `projects/01–04/README.md` (01 เป็น `active` ส่วน 02–04 เป็น `not-started`)

**รอบที่ 2 Wiki viewer** ตามหัวข้อ 11 และต้องผ่านเงื่อนไขว่า `npm run check` บน wiki จริงต้องไม่มี error
