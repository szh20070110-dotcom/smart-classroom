# AI 智慧课堂工作台

纯前端的智慧课堂演示工作台：教师创建班级、课堂、作业并批改，学生加入班级、签到、提交作业、查看成绩，数据看板实时汇总出勤、提交率、平均分、分数分布与周趋势。

- 技术栈：Vue 3 + Vite + 原生 JavaScript
- 持久化：localStorage，零后端
- 图表：全部用 SVG / CSS 手绘，不依赖任何图表库
- 首次打开自带一套演示数据

## 角色与功能

### 教师端

| 视图 | 能力 |
| --- | --- |
| 数据看板 | 出勤率、作业提交率、已批改平均分、待批改数量；分数分布直方图、出勤环形图、近 3 周趋势（平均分 / 出勤率 / 提交量）、作业提交率、课堂出勤、学生表现排行、待批改队列 |
| 班级管理 | 创建班级（名称 / 学期 / 人数）、自动生成班级码、切换班级、查看学生名单与个人出勤 / 平均分 |
| 课堂管理 | 创建课堂（课题 / 时间 / 知识点 / 容量）、查看今日课堂、展开每次课堂的签到明细 |
| 作业与批改 | 发布作业（题目 / 截止时间 / 分值）、跟踪提交率与逾期情况、在批改台打分量并写评语、按待批 / 已批 / 全部筛选 |

### 学生端

| 视图 | 能力 |
| --- | --- |
| 今日课堂 | 输入班级码加入班级、查看今日课堂与知识点、课堂签到（开始 15 分钟后记为迟到）、查看同班同学 |
| 我的作业 | 查看题目与截止时间、提交文本答案、批改前修改答案、查看逾期状态 |
| 成绩与评语 | 个人平均分 / 出勤率 / 提交率、百分制成绩趋势、出勤明细、成绩单与老师评语 |

### 数据看板

看板随数据实时更新。所有指标由 `src/domain/` 中的纯函数计算，UI 只负责展示。

## 预置演示数据

第一次打开（localStorage 为空）会写入：

- 1 个班级：`高二(3)班 · 数据素养`，学期 `2026 秋季学期`，班级码 `SC-2026`，容量 48
- 6 名学生
- 3 次课堂（其中 1 次是今天，默认学生赵一鸣尚未签到）
- 3 次作业（共 16 份提交，10 份已批改，6 份待批改）
- 16 条真实感签到记录（覆盖已签到、迟到、缺勤、未签到）

数据按“今天”为基准生成相对日期，因此预置数据始终能展示“今日课堂”和近 3 周趋势。

### 推荐演示路径

1. 以教师身份查看「数据看板」；
2. 切到学生端（默认赵一鸣），在「今日课堂」点签到；
3. 打开「我的作业」提交作业三；
4. 切回教师端「作业与批改」，批改作业二待批的提交；
5. 回到「数据看板」，出勤率、提交率、平均分与分布会同步变化。

侧栏底部「重置演示」可恢复初始数据。

## 目录结构

```
smart-classroom/
├─ index.html
├─ vite.config.js
├─ src/
│  ├─ main.js                 # 应用入口
│  ├─ App.vue                 # 布局、角色切换、导航
│  ├─ style.css               # 全局设计系统与通用样式
│  ├─ data/
│  │  └─ seed.js              # 预置班级 / 学生 / 课堂 / 作业 / 签到 / 提交
│  ├─ domain/                 # 纯函数业务逻辑（可独立测试）
│  │  ├─ attendance.js        # 点名统计、出勤率
│  │  ├─ submissions.js       # 提交去重、提交率、逾期、待批改
│  │  ├─ grades.js            # 百分制换算、平均分、分数分布、个人成绩单
│  │  ├─ trend.js             # 周起点、周桶、按周趋势
│  │  └─ analytics.js         # 班级 / 学生看板聚合
│  ├─ store/
│  │  └─ classroom.js         # reactive 状态、localStorage 持久化、业务动作
│  ├─ utils/
│  │  └─ format.js            # 日期、百分比、分值、知识点解析等
│  └─ components/
│     ├─ ClassDashboard.vue
│     ├─ TeacherClasses.vue
│     ├─ TeacherSessions.vue
│     ├─ TeacherAssignments.vue
│     ├─ StudentHome.vue
│     ├─ StudentAssignments.vue
│     ├─ StudentGrades.vue
│     ├─ EmptyState.vue
│     └─ charts/
│        ├─ BarChart.vue      # 手绘 SVG 柱状图
│        ├─ LineChart.vue     # 手绘 SVG 折线 / 面积图
│        └─ RingChart.vue     # 手绘 SVG 环形进度
└─ tests/
   ├─ attendance.test.js
   ├─ submissions.test.js
   ├─ grades.test.js
   ├─ trend.test.js
   └─ app.smoke.test.js
```

## 运行

需要 Node.js 18+。

```bash
npm install
npm run dev
```

打开终端提示的地址（默认 <http://localhost:5173>）。

生产构建与本地预览：

```bash
npm run build
npm run preview
```

构建产物在 `dist/`，可直接部署为静态站点。

## 测试

```bash
npm test
```

当前共 **27 个用例**：

- `tests/attendance.test.js`：6 个
- `tests/submissions.test.js`：5 个
- `tests/grades.test.js`：7 个
- `tests/trend.test.js`：5 个
- `tests/app.smoke.test.js`：4 个（jsdom 挂载 App，覆盖看板渲染、学生签到、全部视图渲染、教师批改并保存）

只跑某个文件：

```bash
npx vitest run tests/trend.test.js
```

监听模式：

```bash
npm run test:watch
```

## 实现说明

- **纯函数分层**：点名统计、提交率、平均分与分布、周趋势都不依赖 Vue 或浏览器，输入数据输出结果，便于直接单测。
- **状态层**：`src/store/classroom.js` 用 Vue `reactive` 管理单例状态，`watch` 深度监听并写入 localStorage；刷新页面后数据保留。
- **图表**：柱状图、折线图、环形图均为组件内手写 SVG，无 ECharts / Chart.js 等依赖。
- **时间口径**：一周从周一开始；提交与课堂按发生时间归入对应周；作业平均分按百分制归一。
- **出勤口径**：已签到与迟到计为到课，请假与未签到不计；未签到在点名明细中显示为缺勤。