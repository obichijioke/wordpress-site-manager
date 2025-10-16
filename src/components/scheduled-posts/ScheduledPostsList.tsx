import React, { useEffect, useState } from 'react'
import { scheduledPostsClient, ScheduledPost } from '../../lib/scheduled-posts-api'

interface ScheduledPostsListProps {
  siteId: string
  onRefresh?: number
}

export const ScheduledPostsList: React.FC<ScheduledPostsListProps> = ({
  siteId,
  onRefresh,
}) => {
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'PUBLISHED' | 'FAILED'>('all')

  useEffect(() => {
    fetchPosts()
  }, [siteId, filter, onRefresh])

  const fetchPosts = async () => {
    setIsLoading(true)
    try {
      const response = await scheduledPostsClient.getScheduledPosts({
        siteId,
        status: filter === 'all' ? undefined : filter,
        perPage: 50,
      })
      setPosts(response.scheduledPosts || [])
    } catch (error) {
      console.error('Failed to fetch scheduled posts:', error)
      setPosts([])
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublishNow = async (postId: string) => {
    if (!confirm('Publish this post immediately?')) return

    try {
      await scheduledPostsClient.publishNow(postId)
      alert('Post published successfully!')
      fetchPosts()
    } catch (error: any) {
      alert(`Failed to publish post: ${error.message}`)
    }
  }

  const handleCancel = async (postId: string) => {
    if (!confirm('Cancel this scheduled post?')) return

    try {
      await scheduledPostsClient.cancelScheduledPost(postId)
      alert('Post cancelled successfully!')
      fetchPosts()
    } catch (error: any) {
      alert(`Failed to cancel post: ${error.message}`)
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this scheduled post?')) return

    try {
      await scheduledPostsClient.deleteScheduledPost(postId)
      alert('Post deleted successfully!')
      fetchPosts()
    } catch (error: any) {
      alert(`Failed to delete post: ${error.message}`)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PUBLISHING: 'bg-blue-100 text-blue-800',
      PUBLISHED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string, timezone: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    })
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
          onClick={() => setFilter('PENDING')}
          className={`px-4 py-2 rounded ${
            filter === 'PENDING'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('PUBLISHED')}
          className={`px-4 py-2 rounded ${
            filter === 'PUBLISHED'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Published
        </button>
        <button
          onClick={() => setFilter('FAILED')}
          className={`px-4 py-2 rounded ${
            filter === 'FAILED'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Failed
        </button>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No scheduled posts found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{post.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(post.status)}`}>
                      {post.status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <span className="font-medium">Scheduled for:</span>{' '}
                      {formatDate(post.scheduledFor, post.timezone)} ({post.timezone})
                    </div>
                    
                    {post.excerpt && (
                      <div className="text-gray-500 line-clamp-2">{post.excerpt}</div>
                    )}
                    
                    {post.publishedAt && (
                      <div>
                        <span className="font-medium">Published at:</span>{' '}
                        {formatDate(post.publishedAt, post.timezone)}
                      </div>
                    )}
                    
                    {post.lastError && (
                      <div className="text-red-600">
                        <span className="font-medium">Error:</span> {post.lastError}
                      </div>
                    )}
                    
                    {post.attempts > 0 && (
                      <div className="text-gray-500">
                        Attempts: {post.attempts}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  {post.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handlePublishNow(post.id)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Publish Now
                      </button>
                      <button
                        onClick={() => handleCancel(post.id)}
                        className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  
                  {(post.status === 'PUBLISHED' || post.status === 'CANCELLED' || post.status === 'FAILED') && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

