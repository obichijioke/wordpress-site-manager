import React, { useEffect, useState } from 'react'
import { automationSchedulesClient, AutomationSchedule } from '../../lib/automation-schedules-api'

interface SchedulesListProps {
  siteId: string
  onRefresh?: number
}

export const SchedulesList: React.FC<SchedulesListProps> = ({
  siteId,
  onRefresh,
}) => {
  const [schedules, setSchedules] = useState<AutomationSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    fetchSchedules()
  }, [siteId, filter, onRefresh])

  const fetchSchedules = async () => {
    setIsLoading(true)
    try {
      const response = await automationSchedulesClient.getSchedules({
        siteId,
        isActive: filter === 'all' ? undefined : filter === 'active',
        perPage: 50,
      })
      setSchedules(response.schedules || [])
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
      setSchedules([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (scheduleId: string, isActive: boolean) => {
    try {
      await automationSchedulesClient.toggleSchedule(scheduleId, !isActive)
      alert(`Schedule ${!isActive ? 'resumed' : 'paused'} successfully!`)
      fetchSchedules()
    } catch (error: any) {
      alert(`Failed to toggle schedule: ${error.message}`)
    }
  }

  const handleRunNow = async (scheduleId: string) => {
    if (!confirm('Execute this schedule immediately?')) return

    try {
      await automationSchedulesClient.executeNow(scheduleId)
      alert('Schedule execution started!')
      fetchSchedules()
    } catch (error: any) {
      alert(`Failed to execute schedule: ${error.message}`)
    }
  }

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Delete this schedule? This action cannot be undone.')) return

    try {
      await automationSchedulesClient.deleteSchedule(scheduleId)
      alert('Schedule deleted successfully!')
      fetchSchedules()
    } catch (error: any) {
      alert(`Failed to delete schedule: ${error.message}`)
    }
  }

  const getScheduleTypeLabel = (type: string) => {
    const labels = {
      ONCE: 'One-time',
      DAILY: 'Daily',
      WEEKLY: 'Weekly',
      CUSTOM: 'Custom',
    }
    return labels[type as keyof typeof labels] || type
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded ${
            filter === 'active'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-2 rounded ${
            filter === 'inactive'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Inactive
        </button>
      </div>

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No schedules found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{schedule.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      schedule.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {schedule.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                      {getScheduleTypeLabel(schedule.scheduleType)}
                    </span>
                  </div>

                  {schedule.description && (
                    <p className="text-sm text-gray-600 mb-2">{schedule.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <div className="mb-1">
                        <span className="font-medium">RSS Feed:</span>{' '}
                        {schedule.rssFeed?.name || 'None'}
                      </div>
                      <div className="mb-1">
                        <span className="font-medium">Timezone:</span> {schedule.timezone}
                      </div>
                      {schedule.cronExpression && (
                        <div className="mb-1">
                          <span className="font-medium">Cron:</span>{' '}
                          <code className="bg-gray-100 px-1 rounded">{schedule.cronExpression}</code>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-1">
                        <span className="font-medium">Next Run:</span>{' '}
                        {formatDate(schedule.nextRun)}
                      </div>
                      <div className="mb-1">
                        <span className="font-medium">Last Run:</span>{' '}
                        {formatDate(schedule.lastRun)}
                      </div>
                      <div className="mb-1">
                        <span className="font-medium">Auto-publish:</span>{' '}
                        {schedule.autoPublish ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">Total Runs:</span>{' '}
                        <span className="font-medium">{schedule.totalRuns}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Successful:</span>{' '}
                        <span className="font-medium text-green-600">{schedule.successfulRuns}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Failed:</span>{' '}
                        <span className="font-medium text-red-600">{schedule.failedRuns}</span>
                      </div>
                      {schedule.totalRuns > 0 && (
                        <div>
                          <span className="text-gray-500">Success Rate:</span>{' '}
                          <span className="font-medium">
                            {Math.round((schedule.successfulRuns / schedule.totalRuns) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleToggle(schedule.id, schedule.isActive)}
                    className={`px-3 py-1 text-sm rounded ${
                      schedule.isActive
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {schedule.isActive ? 'Pause' : 'Resume'}
                  </button>
                  
                  <button
                    onClick={() => handleRunNow(schedule.id)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Run Now
                  </button>
                  
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

