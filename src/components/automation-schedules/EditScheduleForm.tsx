import React, { useState, useEffect } from 'react'
import { automationSchedulesClient, AutomationSchedule } from '../../lib/automation-schedules-api'
import { automationClient } from '../../lib/automation-api'

interface EditScheduleFormProps {
  schedule: AutomationSchedule
  siteId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export const EditScheduleForm: React.FC<EditScheduleFormProps> = ({
  schedule,
  siteId,
  onSuccess,
  onCancel,
}) => {
  const [rssFeeds, setRssFeeds] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: schedule.name,
    description: schedule.description || '',
    rssFeedId: schedule.rssFeedId || '',
    scheduleType: schedule.scheduleType as 'ONCE' | 'EVERY_5_MIN' | 'EVERY_10_MIN' | 'EVERY_30_MIN' | 'HOURLY' | 'EVERY_2_HOURS' | 'EVERY_6_HOURS' | 'EVERY_12_HOURS' | 'DAILY' | 'WEEKLY' | 'CUSTOM',
    cronExpression: schedule.cronExpression || '0 8 * * *',
    timezone: schedule.timezone,
    autoPublish: schedule.autoPublish,
    publishStatus: schedule.publishStatus,
    maxArticles: schedule.maxArticles || 20,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchRSSFeeds()
  }, [])

  const fetchRSSFeeds = async () => {
    try {
      const response = await automationClient.getRSSFeeds({ siteId })
      setRssFeeds(response.feeds || [])
    } catch (error) {
      console.error('Failed to fetch RSS feeds:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSubmitting(true)
    try {
      const updateData: any = {
        name: formData.name,
        description: formData.description || undefined,
        timezone: formData.timezone,
        autoPublish: formData.autoPublish,
        publishStatus: formData.publishStatus,
        maxArticles: formData.maxArticles || undefined,
      }

      if (formData.scheduleType === 'CUSTOM') {
        updateData.cronExpression = formData.cronExpression
      }

      await automationSchedulesClient.updateSchedule(schedule.id, updateData)
      alert('Schedule updated successfully!')
      onSuccess?.()
    } catch (error: any) {
      console.error('Failed to update schedule:', error)
      alert(`Failed to update schedule: ${error.message}`)
    } finally {
      setIsSubmitting(false)
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
              RSS Feed
            </label>
            <select
              value={formData.rssFeedId}
              onChange={(e) => setFormData({ ...formData, rssFeedId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              disabled
            >
              <option value="">No RSS Feed (Manual)</option>
              {rssFeeds.map((feed) => (
                <option key={feed.id} value={feed.id}>
                  {feed.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              RSS Feed cannot be changed after creation
            </p>
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
              disabled
            >
              <option value="ONCE">Once</option>
              <option value="EVERY_5_MIN">Every 5 Minutes</option>
              <option value="EVERY_10_MIN">Every 10 Minutes</option>
              <option value="EVERY_30_MIN">Every 30 Minutes</option>
              <option value="HOURLY">Hourly</option>
              <option value="EVERY_2_HOURS">Every 2 Hours</option>
              <option value="EVERY_6_HOURS">Every 6 Hours</option>
              <option value="EVERY_12_HOURS">Every 12 Hours</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="CUSTOM">Custom (Cron)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Schedule type cannot be changed after creation
            </p>
          </div>

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
            <input
              type="text"
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Publishing Options */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Publishing Options</h3>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoPublish"
              checked={formData.autoPublish}
              onChange={(e) => setFormData({ ...formData, autoPublish: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoPublish" className="ml-2 block text-sm text-gray-700">
              Auto-publish to WordPress
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
              <option value="publish">Published</option>
              <option value="pending">Pending Review</option>
              <option value="private">Private</option>
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
          {isSubmitting ? 'Updating...' : 'Update Schedule'}
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

