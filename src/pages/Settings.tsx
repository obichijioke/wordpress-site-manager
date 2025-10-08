import React, { useState } from 'react'
import { Settings as SettingsIcon, Sparkles, Image, Search } from 'lucide-react'
import AISettings from './AISettings'
import ImageSettings from './ImageSettings'
import ResearchSettings from './ResearchSettings'

type SettingsTab = 'ai' | 'images' | 'research'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai')

  const tabs = [
    { id: 'ai' as SettingsTab, name: 'AI Settings', icon: Sparkles },
    { id: 'images' as SettingsTab, name: 'Image Providers', icon: Image },
    { id: 'research' as SettingsTab, name: 'Topic Research', icon: Search },
  ]

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'}`} />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'ai' && <AISettings />}
        {activeTab === 'images' && <ImageSettings />}
        {activeTab === 'research' && <ResearchSettings />}
      </div>
    </div>
  )
}
