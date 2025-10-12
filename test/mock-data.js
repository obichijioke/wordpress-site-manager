/**
 * Mock data for testing the automation workflow
 * This file contains realistic sample responses for each step
 */

// Mock Research API Response (from user's example)
export const MOCK_RESEARCH_RESPONSE = {
  output: {
    title: "Regina Daniels Celebrates Milestone Birthday with N10 Million Fan Giveaway",
    content: `Nollywood star Regina Daniels is marking her October 10, 2025 birthday with unprecedented generosity and renewed excitement. The actress and wife of Senator Ned Nwoko announced she will be giving N1 million each to 10 lucky fans as part of her birthday celebration, totaling N10 million.

In an emotional social media post, Regina revealed this is the first time in six years she's felt genuinely excited about her birthday. The actress explained that her enthusiasm for celebrations had diminished after joining her husband's family, which doesn't prioritize such events. However, she shared that her perspective has shifted significantly over the past year.

"Believe it or not, I haven't felt this much excitement about celebrating my birthday in the last six years. I used to absolutely love birthdays back in the day — until I joined my beautiful family that didn't really care for celebrations," Regina wrote.

The movie star reflected on her personal growth and spiritual journey, describing herself as "carrying generations while building hers" at her young age. She expressed gratitude for what she sees as divine favor in her life, saying "You see why I say even God dey do partial."

This celebration comes shortly after Regina faced online controversy for posting a video of herself and husband Ned Nwoko in a restroom setting, which drew criticism from social media users. Despite the recent backlash, the actress appears focused on spreading positivity and joy through her birthday generosity.

Fans have flooded her social media with birthday wishes, with many referring to her as "Sweet 16" and praising her beauty and success. The N10 million giveaway demonstrates Regina's commitment to sharing her blessings with supporters as she enters this new chapter of renewed joy and gratitude.`,
    excerpt: "Nollywood actress Regina Daniels celebrates her October 10, 2025 birthday with N10 million giveaway to 10 fans, marking her most excited celebration in six years after finding renewed joy and purpose in motherhood and marriage."
  }
}

// Mock AI Metadata Generation Response
export const MOCK_METADATA_RESPONSE = {
  success: true,
  content: JSON.stringify({
    categories: ["Entertainment", "Celebrity News", "Nollywood"],
    tags: ["Regina Daniels", "Birthday Celebration", "Celebrity Giveaway", "Nollywood Actress", "Ned Nwoko", "Nigerian Entertainment"],
    seoDescription: "Nollywood actress Regina Daniels celebrates her birthday with a generous N10 million giveaway to 10 lucky fans, marking her most excited celebration in six years after finding renewed joy in her marriage and motherhood journey.",
    seoKeywords: ["Regina Daniels birthday", "N10 million giveaway", "Nollywood actress celebration", "Regina Daniels 2025", "celebrity birthday giveaway", "Ned Nwoko wife"]
  }),
  tokensUsed: 245,
  cost: 0.00245,
  model: 'gpt-3.5-turbo'
}

// Mock AI Image Search Phrase Generation Response
export const MOCK_IMAGE_SEARCH_RESPONSE = {
  success: true,
  content: JSON.stringify({
    phrases: [
      "Regina Daniels birthday celebration 2025",
      "Nollywood actress birthday party decorations",
      "African celebrity birthday celebration elegant"
    ]
  }),
  tokensUsed: 128,
  cost: 0.00128,
  model: 'gpt-3.5-turbo'
}

// Mock Serper Image Search API Response
export const MOCK_SERPER_IMAGE_RESPONSE = {
  searchInformation: {
    totalResults: 1250
  },
  images: [
    {
      title: "Regina Daniels Birthday Celebration",
      imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
      imageWidth: 800,
      imageHeight: 600,
      thumbnailUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=200",
      thumbnailWidth: 200,
      thumbnailHeight: 150,
      source: "Unsplash",
      domain: "unsplash.com",
      link: "https://unsplash.com/photos/birthday-celebration"
    },
    {
      title: "Elegant Birthday Party Setup",
      imageUrl: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800",
      imageWidth: 1200,
      imageHeight: 800,
      thumbnailUrl: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=200",
      thumbnailWidth: 200,
      thumbnailHeight: 133,
      source: "Unsplash",
      domain: "unsplash.com",
      link: "https://unsplash.com/photos/birthday-party"
    },
    {
      title: "African Celebrity Event",
      imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800",
      imageWidth: 1000,
      imageHeight: 667,
      thumbnailUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200",
      thumbnailWidth: 200,
      thumbnailHeight: 133,
      source: "Unsplash",
      domain: "unsplash.com",
      link: "https://unsplash.com/photos/celebration"
    },
    {
      title: "Birthday Cake and Decorations",
      imageUrl: "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=800",
      imageWidth: 800,
      imageHeight: 1200,
      thumbnailUrl: "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=200",
      thumbnailWidth: 200,
      thumbnailHeight: 300,
      source: "Unsplash",
      domain: "unsplash.com",
      link: "https://unsplash.com/photos/birthday-cake"
    },
    {
      title: "Luxury Birthday Celebration",
      imageUrl: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800",
      imageWidth: 1200,
      imageHeight: 800,
      thumbnailUrl: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=200",
      thumbnailWidth: 200,
      thumbnailHeight: 133,
      source: "Unsplash",
      domain: "unsplash.com",
      link: "https://unsplash.com/photos/party"
    }
  ]
}

// Mock transformed image results (after ImageService processing)
export const MOCK_TRANSFORMED_IMAGES = [
  {
    id: "img-1",
    url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=200",
    title: "Regina Daniels Birthday Celebration",
    description: "Birthday celebration",
    width: 800,
    height: 600,
    source: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/birthday-celebration",
    provider: "serper"
  },
  {
    id: "img-2",
    url: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=200",
    title: "Elegant Birthday Party Setup",
    description: "Birthday party decorations",
    width: 1200,
    height: 800,
    source: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/birthday-party",
    provider: "serper"
  },
  {
    id: "img-3",
    url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200",
    title: "African Celebrity Event",
    description: "Celebrity celebration",
    width: 1000,
    height: 667,
    source: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/celebration",
    provider: "serper"
  },
  {
    id: "img-4",
    url: "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=200",
    title: "Birthday Cake and Decorations",
    description: "Birthday cake",
    width: 800,
    height: 1200,
    source: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/birthday-cake",
    provider: "serper"
  },
  {
    id: "img-5",
    url: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800",
    thumbnailUrl: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=200",
    title: "Luxury Birthday Celebration",
    description: "Luxury party",
    width: 1200,
    height: 800,
    source: "Unsplash",
    sourceUrl: "https://unsplash.com/photos/party",
    provider: "serper"
  }
]

// Mock WordPress publish response
export const MOCK_WORDPRESS_RESPONSE = {
  id: 12345,
  link: "https://example-wordpress-site.com/2025/10/regina-daniels-celebrates-milestone-birthday",
  status: "publish",
  title: {
    rendered: "Regina Daniels Celebrates Milestone Birthday with N10 Million Fan Giveaway"
  },
  featured_media: 67890
}

// Mock test configuration
export const MOCK_TEST_CONFIG = {
  userId: 'test-user-123',
  siteId: 'test-site-456',
  rssFeedId: 'test-feed-789',
  articleTitle: 'Regina Daniels Birthday Celebration',
  articleUrl: 'https://example.com/rss/regina-daniels-birthday'
}
