import type { InferSelectModel } from 'drizzle-orm'
import type { members, schedules } from '~/server/models/schema'

type Member = InferSelectModel<typeof members>
type Schedule = InferSelectModel<typeof schedules>

/**
 * 排班分配结果
 */
export interface ScheduleAssignment {
  memberId: number
  memberName: string
  scheduledDate: string // YYYY-MM-DD
  weekNumber: number
}

/**
 * 排班生成器
 *
 * 核心算法：按权重比例分配
 * 1. 每位成员有权重（0.5~3.0）
 * 2. 总权重 = 所有成员权重之和
 * 3. 每人值班概率 = 个人权重 / 总权重
 * 4. 一个周期内每人分配到 frequencyCount * 权重比例 次
 * 5. 同一个人不连续值班（中间至少隔1天）
 */
export class SchedulerService {
  /**
   * 生成排班计划
   * @param members 宿舍成员列表（含权重）
   * @param startDate 开始日期（YYYY-MM-DD）
   * @param days 要排班的天数
   * @param frequencyCount 每周期分配次数（如每周3次）
   * @param frequencyType 周期类型 'weekly' | 'monthly'
   * @returns 排班分配结果数组
   */
  generateSchedule(
    memberList: Member[],
    startDate: string,
    days: number,
    frequencyCount: number = 1,
    frequencyType: string = 'weekly',
  ): ScheduleAssignment[] {
    if (memberList.length === 0) return []

    const totalWeight = memberList.reduce((sum, m) => sum + parseFloat(m.weight || '1.0'), 0)
    if (totalWeight <= 0) return []

    const periodDays = frequencyType === 'monthly' ? 30 : 7
    const clampedFreq = Math.min(frequencyCount, periodDays)
    const totalShifts = clampedFreq * Math.ceil(days / periodDays)

    const activeMembers = memberList.filter(m => parseFloat(m.weight || '1.0') > 0)
    if (activeMembers.length === 0) return []

    // Calculate expected shifts proportional to weight
    const expectedShifts = new Map<number, number>()
    const assignedCount = new Map<number, number>()
    for (const m of activeMembers) {
      expectedShifts.set(m.id, totalShifts * (parseFloat(m.weight || '1.0') / totalWeight))
      assignedCount.set(m.id, 0)
    }

    // Build sorted offsets (which days to assign)
    const start = new Date(startDate)
    const assignmentDayOffsets = new Set<number>()
    for (let periodStart = 0; periodStart < days; periodStart += periodDays) {
      for (let slot = 0; slot < clampedFreq; slot++) {
        const offset = periodStart + Math.floor(slot * periodDays / clampedFreq)
        if (offset < days) {
          assignmentDayOffsets.add(offset)
        }
      }
    }
    const sortedOffsets = [...assignmentDayOffsets].sort((a, b) => a - b)

    const assignments: ScheduleAssignment[] = []
    let lastMemberId = -1

    for (const offset of sortedOffsets) {
      const currentDate = new Date(start)
      currentDate.setDate(start.getDate() + offset)
      const dateStr = currentDate.toISOString().slice(0, 10)
      const weekNumber = this.getWeekNumber(currentDate)

      // Priority queue: sort by (assignedCount / weight) ratio ascending
      activeMembers.sort((a, b) => {
        const ratioA = (assignedCount.get(a.id) || 0) / parseFloat(a.weight || '1.0')
        const ratioB = (assignedCount.get(b.id) || 0) / parseFloat(b.weight || '1.0')
        if (ratioA !== ratioB) return ratioA - ratioB
        return parseFloat(b.weight || '1.0') - parseFloat(a.weight || '1.0')
      })

      // Pick member with lowest ratio, skipping lastMemberId to avoid consecutive
      let selectedMember: Member | null = null
      for (const member of activeMembers) {
        if (member.id === lastMemberId) continue
        selectedMember = member
        break
      }

      // If only one member or all would be consecutive, allow consecutive
      if (!selectedMember && activeMembers.length > 0) {
        selectedMember = activeMembers[0]
      }

      if (selectedMember) {
        assignments.push({
          memberId: selectedMember.id,
          memberName: selectedMember.name,
          scheduledDate: dateStr,
          weekNumber,
        })
        assignedCount.set(selectedMember.id, (assignedCount.get(selectedMember.id) || 0) + 1)
        lastMemberId = selectedMember.id
      }
    }

    return assignments
  }

  /**
   * 获取 ISO 周数
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  /**
   * 从 schedules 表中获取某成员在指定周数的排班记录
   */
  getMemberScheduleForWeek(
    allSchedules: Schedule[],
    memberId: number,
    weekNumber: number,
  ): Schedule | undefined {
    return allSchedules.find(
      s => s.memberId === memberId && s.weekNumber === weekNumber
    )
  }

  /**
   * 检查互换是否有效（非连续、未被占用等）
   */
  validateSwap(
    scheduleA: Schedule,
    scheduleB: Schedule,
    allSchedules: Schedule[],
  ): { valid: boolean; reason?: string } {
    if (scheduleA.id === scheduleB.id) {
      return { valid: false, reason: '不能与自己互换' }
    }

    if (scheduleA.status !== 'pending' || scheduleB.status !== 'pending') {
      return { valid: false, reason: '只能互换待完成状态的排班' }
    }

    // 检查互换后是否导致同一人连续值班
    const dateA = new Date(scheduleA.scheduledDate)
    const dateB = new Date(scheduleB.scheduledDate)

    const dayA = dateA.getTime()
    const dayB = dateB.getTime()

    for (const s of allSchedules) {
      if (s.id === scheduleA.id || s.id === scheduleB.id) continue
      const sDate = new Date(s.scheduledDate).getTime()

      // A 的原成员换到 B 的日期后，是否和 B 前后日期的人相同
      if (Math.abs(sDate - dayB) === 86400000) {
        if (s.memberId === scheduleA.memberId) {
          return { valid: false, reason: '互换后会导致同一人连续值班' }
        }
      }
      // B 的原成员换到 A 的日期后同理
      if (Math.abs(sDate - dayA) === 86400000) {
        if (s.memberId === scheduleB.memberId) {
          return { valid: false, reason: '互换后会导致同一人连续值班' }
        }
      }
    }

    return { valid: true }
  }
}

export const schedulerService = new SchedulerService()
