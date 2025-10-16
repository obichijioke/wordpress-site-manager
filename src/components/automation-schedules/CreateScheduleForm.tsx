import React, { useState, useEffect } from 'react'
import { automationSchedulesClient } from '../../lib/automation-schedules-api'
import { automationClient } from '../../lib/automation-api'

interface CreateScheduleFormProps {
  siteId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export const CreateScheduleForm: React.FC<CreateScheduleFormProps> = ({
  siteId,
  onSuccess,
  onCancel,
}) => {
  const [rssFeeds, setRssFeeds] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rssFeedId: '',
    scheduleType: 'DAILY' as 'ONCE' | 'EVERY_5_MIN' | 'EVERY_10_MIN' | 'EVERY_30_MIN' | 'HOURLY' | 'EVERY_2_HOURS' | 'EVERY_6_HOURS' | 'EVERY_12_HOURS' | 'DAILY' | 'WEEKLY' | 'CUSTOM',
    cronExpression: '0 8 * * *',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    scheduledDate: '',
    scheduledTime: '',
    autoPublish: false,
    publishStatus: 'draft',
    maxArticles: 20,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchRSSFeeds()
  }, [])

  const fetchRSSFeeds = async () => {
    try {
      const response = await automationClient.getRSSFeeds()
      setRssFeeds(response.feeds || [])
    } catch (error) {
      console.error('Failed to fetch RSS feeds:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name) {
      alert('Please enter a schedule name')
      return
    }

    setIsSubmitting(true)
    try {
      const scheduleData: any = {
        siteId,
        name: formData.name,
        description: formData.description || undefined,
        rssFeedId: formData.rssFeedId || undefined,
        scheduleType: formData.scheduleType,
        timezone: formData.timezone,
        autoPublish: formData.autoPublish,
        publishStatus: formData.publishStatus,
        maxArticles: formData.maxArticles || undefined,
      }

      if (formData.scheduleType === 'CUSTOM') {
        scheduleData.cronExpression = formData.cronExpression
      } else if (formData.scheduleType === 'ONCE') {
        if (!formData.scheduledDate || !formData.scheduledTime) {
          alert('Please select date and time for one-time schedule')
          setIsSubmitting(false)
          return
        }
        scheduleData.scheduledFor = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)
      }

      await automationSchedulesClient.createSchedule(scheduleData)
      alert('Schedule created successfully!')
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      alert(`Failed to create schedule: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCronDescription = () => {
    switch (formData.scheduleType) {
      case 'EVERY_5_MIN':
        return 'Runs every 5 minutes'
      case 'EVERY_10_MIN':
        return 'Runs every 10 minutes'
      case 'EVERY_30_MIN':
        return 'Runs every 30 minutes'
      case 'HOURLY':
        return 'Runs every hour'
      case 'EVERY_2_HOURS':
        return 'Runs every 2 hours'
      case 'EVERY_6_HOURS':
        return 'Runs every 6 hours'
      case 'EVERY_12_HOURS':
        return 'Runs every 12 hours'
      case 'DAILY':
        return 'Runs every day at 8:00 AM'
      case 'WEEKLY':
        return 'Runs every Monday at 8:00 AM'
      case 'CUSTOM':
        return 'Custom cron expression'
      case 'ONCE':
        return 'Runs once at specified time'
      default:
        return ''
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Daily Tech News"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RSS Feed (Optional)
            </label>
            <select
              value={formData.rssFeedId}
              onChange={(e) => setFormData({ ...formData, rssFeedId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select RSS Feed</option>
              {rssFeeds.map((feed) => (
                <option key={feed.id} value={feed.id}>
                  {feed.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Schedule Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Schedule Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Type
            </label>
            <select
              value={formData.scheduleType}
              onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="ONCE">Once</option>
              <optgroup label="Frequent Intervals">
                <option value="EVERY_5_MIN">Every 5 Minutes</option>
                <option value="EVERY_10_MIN">Every 10 Minutes</option>
                <option value="EVERY_30_MIN">Every 30 Minutes</option>
              </optgroup>
              <optgroup label="Hourly Intervals">
                <option value="HOURLY">Every Hour</option>
                <option value="EVERY_2_HOURS">Every 2 Hours</option>
                <option value="EVERY_6_HOURS">Every 6 Hours</option>
                <option value="EVERY_12_HOURS">Every 12 Hours</option>
              </optgroup>
              <optgroup label="Daily/Weekly">
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
              </optgroup>
              <option value="CUSTOM">Custom (Cron)</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">{getCronDescription()}</p>
          </div>

          {formData.scheduleType === 'ONCE' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {formData.scheduleType === 'CUSTOM' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cron Expression
              </label>
              <input
                type="text"
                value={formData.cronExpression}
                onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                placeholder="0 8 * * *"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: minute hour day month weekday (e.g., "0 8 * * *" = 8:00 AM daily)
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="UTC">UTC</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Publishing Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Publishing Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoPublish"
              checked={formData.autoPublish}
              onChange={(e) => setFormData({ ...formData, autoPublish: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="autoPublish" className="text-sm font-medium text-gray-700">
              Auto-publish generated articles
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Publish Status
            </label>
            <select
              value={formData.publishStatus}
              onChange={(e) => setFormData({ ...formData, publishStatus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="publish">Publish</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Articles per Run
            </label>
            <input
              type="number"
              value={formData.maxArticles}
              onChange={(e) => setFormData({ ...formData, maxArticles: parseInt(e.target.value) })}
              min={1}
              max={50}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum number of new articles to process from the RSS feed per execution. Default is 20.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Schedule'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

