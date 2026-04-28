import { beforeEach, describe, expect, it, vi } from 'vitest'

const { removeMock, fromMock } = vi.hoisted(() => {
  const removeMockInner = vi.fn(async () => ({ error: null }))
  const makeDeleteBuilder = () => {
    const chain = {
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
    }
    return chain
  }

  const fromMockInner = vi.fn((table) => {
    if (table === 'dooh_brief_media') {
      const makeUpdateBuilder = () => {
        const eqScene = vi.fn(async () => ({ error: null }))
        const eqBrief = vi.fn(() => ({
          eq: eqScene,
        }))
        return {
          eq: eqBrief,
        }
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
        update: vi.fn(() => makeUpdateBuilder()),
        delete: vi.fn(() => makeDeleteBuilder()),
      }
    }

    return {
      delete: vi.fn(() => makeDeleteBuilder()),
    }
  })

  return { removeMock: removeMockInner, fromMock: fromMockInner }
})

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: fromMock,
    storage: {
      from: vi.fn(() => ({
        remove: removeMock,
      })),
    },
  },
}))

import { buildSceneIdReindexPlan, remapDoohBriefMediaSceneIds } from '../../features/dooh/doohUpload'

describe('buildSceneIdReindexPlan', () => {
  it('maps surviving scenes to their new ids and marks removed ids', () => {
    const oldSceneOrder = ['s1', 's2', 's3']
    const nextSceneOrder = ['s1', 's2']

    const plan = buildSceneIdReindexPlan({
      oldSceneOrder,
      nextSceneOrder,
      removedSceneIds: ['s2'],
    })

    expect(plan.sceneIdMap).toEqual({
      s3: 's2',
    })
    expect(plan.removedSceneIds).toEqual(['s2'])
  })
})

describe('remapDoohBriefMediaSceneIds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies two-phase media scene_id remap', async () => {
    await remapDoohBriefMediaSceneIds({
      briefSlug: 'demo',
      sceneIdMap: { s3: 's2' },
      removedSceneIds: ['s2'],
    })

    const doohCalls = fromMock.mock.calls.filter(([table]) => table === 'dooh_brief_media')
    expect(doohCalls.length).toBeGreaterThan(0)
  })
})
