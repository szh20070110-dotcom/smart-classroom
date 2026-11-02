function atOffset(now, days, hour, minute = 0) {
  const date = new Date(now)
  date.setHours(hour, minute, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}

function iso(date) {
  return date.toISOString()
}

export const DEMO_CLASS_CODE = 'SC-2026'

export function createSeedState(now = new Date()) {
  const classId = 'cls-data-literacy'
  const students = [
    { id: 'stu-1', classId, name: '林小雨', joinedAt: iso(atOffset(now, -58, 9, 12)) },
    { id: 'stu-2', classId, name: '陈子昂', joinedAt: iso(atOffset(now, -58, 9, 16)) },
    { id: 'stu-3', classId, name: '周思远', joinedAt: iso(atOffset(now, -57, 10, 4)) },
    { id: 'stu-4', classId, name: '许知夏', joinedAt: iso(atOffset(now, -57, 10, 28)) },
    { id: 'stu-5', classId, name: '赵一鸣', joinedAt: iso(atOffset(now, -56, 14, 2)) },
    { id: 'stu-6', classId, name: '顾清和', joinedAt: iso(atOffset(now, -56, 14, 36)) }
  ]

  const classes = [
    {
      id: classId,
      name: '高二(3)班 · 数据素养',
      semester: '2026 秋季学期',
      capacity: 48,
      code: DEMO_CLASS_CODE,
      createdAt: iso(atOffset(now, -60, 8, 30))
    }
  ]

  const sessions = [
    {
      id: 'ses-1',
      classId,
      topic: '函数与图像：从表格到图形',
      time: iso(atOffset(now, -14, 9, 0)),
      knowledgePoints: ['函数图像', '坐标系', '变化率'],
      capacity: 30,
      createdAt: iso(atOffset(now, -17, 16, 0))
    },
    {
      id: 'ses-2',
      classId,
      topic: '概率初步：样本与频率',
      time: iso(atOffset(now, -7, 9, 0)),
      knowledgePoints: ['样本与总体', '频率分布', '概率初步'],
      capacity: 30,
      createdAt: iso(atOffset(now, -10, 16, 0))
    },
    {
      id: 'ses-3',
      classId,
      topic: '统计图表：读懂一张图',
      time: iso(atOffset(now, 0, 9, 0)),
      knowledgePoints: ['统计图表', '数据解读', '图表选择'],
      capacity: 30,
      createdAt: iso(atOffset(now, -3, 15, 30))
    }
  ]

  const assignments = [
    {
      id: 'asg-1',
      classId,
      sessionId: 'ses-1',
      title: '作业一 · 用图像描述变化',
      questions:
        '给出你生活中一组连续变化的数据（如气温、步数），画出折线图，并说明：1）横纵坐标分别代表什么；2）变化最快的一段出现在哪里；3）如果换成柱状图，会丢失什么信息。',
      dueAt: iso(atOffset(now, -12, 23, 59)),
      points: 100,
      createdAt: iso(atOffset(now, -15, 16, 20))
    },
    {
      id: 'asg-2',
      classId,
      sessionId: 'ses-2',
      title: '作业二 · 频率与概率小实验',
      questions:
        '掷一枚硬币 50 次并记录正反面频数，计算频率；再结合课堂上的样本概念回答：频率一定等于概率吗？请用你自己的实验数据说明理由（不少于 150 字）。',
      dueAt: iso(atOffset(now, -5, 23, 59)),
      points: 100,
      createdAt: iso(atOffset(now, -8, 16, 10))
    },
    {
      id: 'asg-3',
      classId,
      sessionId: 'ses-3',
      title: '作业三 · 给校运会数据选一张图',
      questions:
        '校运会五个项目的人气投票结果如下：短跑 128、长跑 96、跳远 84、铅球 52、接力 140。请选择一种统计图呈现数据，并写一段 120 字以内的解读，说明你为什么选择这种图。',
      dueAt: iso(atOffset(now, 2, 23, 59)),
      points: 100,
      createdAt: iso(atOffset(now, 0, 8, 40))
    }
  ]

  const attendance = [
    { id: 'att-1-1', sessionId: 'ses-1', studentId: 'stu-1', status: 'present', checkedAt: iso(atOffset(now, -14, 8, 52)) },
    { id: 'att-1-2', sessionId: 'ses-1', studentId: 'stu-2', status: 'present', checkedAt: iso(atOffset(now, -14, 8, 54)) },
    { id: 'att-1-3', sessionId: 'ses-1', studentId: 'stu-3', status: 'late', checkedAt: iso(atOffset(now, -14, 9, 8)) },
    { id: 'att-1-4', sessionId: 'ses-1', studentId: 'stu-4', status: 'present', checkedAt: iso(atOffset(now, -14, 8, 49)) },
    { id: 'att-1-5', sessionId: 'ses-1', studentId: 'stu-5', status: 'present', checkedAt: iso(atOffset(now, -14, 8, 57)) },
    { id: 'att-1-6', sessionId: 'ses-1', studentId: 'stu-6', status: 'present', checkedAt: iso(atOffset(now, -14, 8, 55)) },

    { id: 'att-2-1', sessionId: 'ses-2', studentId: 'stu-1', status: 'present', checkedAt: iso(atOffset(now, -7, 8, 50)) },
    { id: 'att-2-2', sessionId: 'ses-2', studentId: 'stu-2', status: 'present', checkedAt: iso(atOffset(now, -7, 8, 53)) },
    { id: 'att-2-3', sessionId: 'ses-2', studentId: 'stu-3', status: 'present', checkedAt: iso(atOffset(now, -7, 8, 56)) },
    { id: 'att-2-4', sessionId: 'ses-2', studentId: 'stu-4', status: 'late', checkedAt: iso(atOffset(now, -7, 9, 6)) },
    { id: 'att-2-5', sessionId: 'ses-2', studentId: 'stu-5', status: 'present', checkedAt: iso(atOffset(now, -7, 8, 58)) },

    { id: 'att-3-1', sessionId: 'ses-3', studentId: 'stu-1', status: 'present', checkedAt: iso(atOffset(now, 0, 8, 51)) },
    { id: 'att-3-2', sessionId: 'ses-3', studentId: 'stu-2', status: 'present', checkedAt: iso(atOffset(now, 0, 8, 53)) },
    { id: 'att-3-3', sessionId: 'ses-3', studentId: 'stu-3', status: 'late', checkedAt: iso(atOffset(now, 0, 9, 7)) },
    { id: 'att-3-4', sessionId: 'ses-3', studentId: 'stu-4', status: 'present', checkedAt: iso(atOffset(now, 0, 8, 48)) },
    { id: 'att-3-5', sessionId: 'ses-3', studentId: 'stu-6', status: 'present', checkedAt: iso(atOffset(now, 0, 8, 59)) }
  ]

  const submissions = [
    {
      id: 'sub-1-1',
      assignmentId: 'asg-1',
      studentId: 'stu-1',
      answer:
        '我记录了上学路上 7 天的气温：12、14、13、18、21、19、22℃。横轴是日期，纵轴是气温。第 4 天到第 5 天上升最快，斜率约 3℃/天。换成柱状图后，趋势的连续性会变弱，读者更难一眼看出“变化最快的一段”。',
      submittedAt: iso(atOffset(now, -13, 20, 12)),
      score: 92,
      comment: '论证完整，图表选用得当，对“丢失信息”的解释很到位。',
      gradedAt: iso(atOffset(now, -11, 10, 5))
    },
    {
      id: 'sub-1-2',
      assignmentId: 'asg-1',
      studentId: 'stu-2',
      answer:
        '我用一周步数做折线图：6200、6800、7100、5400、9000、10400、8600。横轴日期，纵轴步数。周五到周六增长最快。柱状图也能比较大小，但不如折线图容易看出连续上升的趋势。',
      submittedAt: iso(atOffset(now, -13, 21, 3)),
      score: 85,
      comment: '思路清晰，注意把“单位”和“刻度起点”写完整。',
      gradedAt: iso(atOffset(now, -11, 10, 18))
    },
    {
      id: 'sub-1-3',
      assignmentId: 'asg-1',
      studentId: 'stu-3',
      answer:
        '记录了一周睡眠时长，从 6.2 小时到 8.1 小时。折线图能看出周三最低。柱状图如果只看高度，也能比较，但没有折线顺滑。',
      submittedAt: iso(atOffset(now, -13, 22, 40)),
      score: 78,
      comment: '结论正确，但“变化最快的一段”缺少计算过程，建议补上斜率。',
      gradedAt: iso(atOffset(now, -11, 10, 31))
    },
    {
      id: 'sub-1-4',
      assignmentId: 'asg-1',
      studentId: 'stu-4',
      answer:
        '我用班级图书借阅量做图：周一 18 本、周二 22 本、周三 17 本、周四 30 本、周五 26 本。横轴星期，纵轴借阅量。周三到周四增幅最大。换成柱状图会弱化“连续变化”的阅读体验，但更适合比较单个星期的多少。',
      submittedAt: iso(atOffset(now, -13, 19, 55)),
      score: 88,
      comment: '数据真实、解读细腻，继续保持。',
      gradedAt: iso(atOffset(now, -11, 10, 44))
    },
    {
      id: 'sub-1-5',
      assignmentId: 'asg-1',
      studentId: 'stu-5',
      answer:
        '我画了气温折线图，横轴是日期，纵轴是温度。大致能看出中间有一天最热。柱状图应该也差不多，就是线变成了柱子。',
      submittedAt: iso(atOffset(now, -13, 22, 58)),
      score: 64,
      comment: '基础概念有混淆：柱状图与折线图表达的重点不同。建议复习坐标轴与变化率的含义。',
      gradedAt: iso(atOffset(now, -11, 11, 2))
    },
    {
      id: 'sub-1-6',
      assignmentId: 'asg-1',
      studentId: 'stu-6',
      answer:
        '我用家中电表读数（kWh）记录 6 天：31.2、33.5、34.1、38.8、40.2、41.0。折线图显示第 3 到第 4 天斜率最大，约 4.7 kWh/天。若改用柱状图，柱高仍可比较，但“变化最快的一段”需要读者自己两两相减，趋势感知会变弱。',
      submittedAt: iso(atOffset(now, -13, 20, 36)),
      score: 95,
      comment: '几乎满分，图表表达与数学解释都很有说服力。',
      gradedAt: iso(atOffset(now, -11, 11, 15))
    },

    {
      id: 'sub-2-1',
      assignmentId: 'asg-2',
      studentId: 'stu-1',
      answer:
        '我掷了 50 次，正面 27 次，频率 0.54。频率不等于概率：概率是理论上的稳定值 0.5，而频率会随实验次数波动。实验次数越多，频率越接近 0.5，这正是大数定律的直观体现。',
      submittedAt: iso(atOffset(now, -6, 19, 42)),
      score: 90,
      comment: '实验记录完整，能把频率稳定性说清楚。',
      gradedAt: iso(atOffset(now, -4, 9, 30))
    },
    {
      id: 'sub-2-2',
      assignmentId: 'asg-2',
      studentId: 'stu-2',
      answer:
        '50 次中正面 23 次，频率 0.46。频率不一定等于概率，因为每次抛掷都有随机性。次数少的时候偏差大，次数多会稳定在 0.5 附近。',
      submittedAt: iso(atOffset(now, -6, 20, 18)),
      score: 76,
      comment: '结论正确，建议补充“理论概率 0.5 是如何得到的”。',
      gradedAt: iso(atOffset(now, -4, 9, 45))
    },
    {
      id: 'sub-2-3',
      assignmentId: 'asg-2',
      studentId: 'stu-3',
      answer:
        '我的实验正面 26 次、反面 24 次，频率 0.52。频率和概率不是一回事：频率来自实验，概率来自模型假设。随着试验次数增加，频率会在 0.5 附近波动并逐渐稳定。',
      submittedAt: iso(atOffset(now, -6, 19, 5)),
      score: 88,
      comment: '概念区分准确，表达简洁。',
      gradedAt: iso(atOffset(now, -4, 10, 2))
    },
    {
      id: 'sub-2-4',
      assignmentId: 'asg-2',
      studentId: 'stu-4',
      answer:
        '我做了 60 次（比要求多 10 次），正面 31 次，频率约 0.517。频率是实验结果，概率是理论值。样本量越大，频率越稳定，但仍可能和 0.5 有偏差。',
      submittedAt: iso(atOffset(now, -6, 18, 48)),
      score: 81,
      comment: '多做了实验值得肯定，注意题目要求 50 次，答题时先对齐要求。',
      gradedAt: iso(atOffset(now, -4, 10, 20))
    },
    {
      id: 'sub-2-5',
      assignmentId: 'asg-2',
      studentId: 'stu-5',
      answer:
        '正面 25 次，反面 25 次，频率刚好 0.5。频率不一定等于概率，但这次刚好一样。次数多了会更接近 0.5。',
      submittedAt: iso(atOffset(now, -6, 20, 55)),
      score: null,
      comment: '',
      gradedAt: null
    },
    {
      id: 'sub-2-6',
      assignmentId: 'asg-2',
      studentId: 'stu-6',
      answer:
        '我掷硬币 50 次，记录到正面 28 次，频率 0.56。频率是“做出来”的比例，概率是“理论上”的可能性。单次实验的波动不能否定概率模型，样本量增加后频率才会收敛。',
      submittedAt: iso(atOffset(now, -6, 21, 26)),
      score: null,
      comment: '',
      gradedAt: null
    },

    {
      id: 'sub-3-1',
      assignmentId: 'asg-3',
      studentId: 'stu-1',
      answer:
        '我选择条形图：五个项目是并列类别，条形长度便于直接比较人气。接力 140 最高，铅球 52 最低。条形图比饼图更适合比较多个类别的具体差距，也不会因为扇区角度接近而难以分辨。',
      submittedAt: iso(atOffset(now, 0, 9, 44)),
      score: null,
      comment: '',
      gradedAt: null
    },
    {
      id: 'sub-3-2',
      assignmentId: 'asg-3',
      studentId: 'stu-2',
      answer:
        '用柱状图呈现，横轴项目、纵轴票数。接力最高，铅球最低。选择柱状图是因为类别之间没有连续关系，柱子高度能直观比较大小，而且五个类别的差距一眼就能看出来。',
      submittedAt: iso(atOffset(now, 0, 9, 56)),
      score: null,
      comment: '',
      gradedAt: null
    },
    {
      id: 'sub-3-4',
      assignmentId: 'asg-3',
      studentId: 'stu-4',
      answer:
        '我选横向条形图，并把项目按票数从高到低排序。这样读者从上到下就能读完排名，比未排序的柱状图更省力。数据解读上，接力和短跑构成第一梯队，铅球明显偏低，后续可以分析原因。',
      submittedAt: iso(atOffset(now, 0, 10, 8)),
      score: null,
      comment: '',
      gradedAt: null
    },
    {
      id: 'sub-3-6',
      assignmentId: 'asg-3',
      studentId: 'stu-6',
      answer:
        '我选择饼图，因为想强调五个项目在总票数中的占比。总票数 500，接力占 28%，短跑 25.6%，铅球只有 10.4%。不过类别较多时饼图不如条形图精确，如果重点是排名，我会改选条形图。',
      submittedAt: iso(atOffset(now, 0, 10, 22)),
      score: null,
      comment: '',
      gradedAt: null
    }
  ]

  return {
    version: 1,
    ui: {
      role: 'teacher',
      currentClassId: classId,
      currentStudentId: 'stu-5'
    },
    classes,
    students,
    sessions,
    assignments,
    attendance,
    submissions,
    meta: {
      seededAt: new Date(now).toISOString(),
      source: 'demo'
    }
  }
}
