/**
 * Check the status of automation jobs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAutomationStatus() {
  try {
    console.log('🔍 Checking Automation Job Status\n')
    
    // Get the most recent automation jobs
    const jobs = await prisma.automationJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        site: {
          select: { name: true, url: true }
        },
        rssFeed: {
          select: { name: true }
        }
      }
    })
    
    if (jobs.length === 0) {
      console.log('❌ No automation jobs found in database\n')
      return
    }
    
    console.log(`Found ${jobs.length} recent automation jobs:\n`)
    
    jobs.forEach((job, index) => {
      console.log(`${index + 1}. Job ID: ${job.id}`)
      console.log(`   Status: ${job.status}`)
      console.log(`   Site: ${job.site?.name || 'N/A'}`)
      console.log(`   RSS Feed: ${job.rssFeed?.name || 'N/A'}`)
      console.log(`   Source Title: ${job.sourceTitle || 'N/A'}`)
      console.log(`   Generated Title: ${job.generatedTitle || 'N/A'}`)
      console.log(`   Has Content: ${job.generatedContent ? 'Yes' : 'No'}`)
      console.log(`   Has Categories: ${job.categories ? 'Yes' : 'No'}`)
      console.log(`   Has Tags: ${job.tags ? 'Yes' : 'No'}`)
      console.log(`   Has Featured Image: ${job.featuredImageUrl ? 'Yes' : 'No'}`)
      console.log(`   WordPress Post ID: ${job.wpPostId || 'N/A'}`)
      console.log(`   Published At: ${job.publishedAt || 'N/A'}`)
      console.log(`   Error: ${job.errorMessage || 'None'}`)
      console.log(`   Created: ${job.createdAt}`)
      console.log(`   Updated: ${job.updatedAt}`)
      console.log('   ' + '─'.repeat(60))
    })
    
    // Check for jobs that are GENERATED but not PUBLISHED
    const generatedButNotPublished = jobs.filter(j => j.status === 'GENERATED')
    
    if (generatedButNotPublished.length > 0) {
      console.log(`\n⚠️  Found ${generatedButNotPublished.length} jobs with status GENERATED (not published):`)
      generatedButNotPublished.forEach(job => {
        console.log(`   - Job ${job.id}: ${job.generatedTitle || job.sourceTitle}`)
      })
      console.log('\n   These jobs were generated but not published to WordPress.')
      console.log('   This suggests the publishing step failed.\n')
    }
    
    // Check for failed jobs
    const failedJobs = jobs.filter(j => j.status === 'FAILED')
    
    if (failedJobs.length > 0) {
      console.log(`\n❌ Found ${failedJobs.length} failed jobs:`)
      failedJobs.forEach(job => {
        console.log(`   - Job ${job.id}: ${job.errorMessage}`)
      })
      console.log()
    }
    
    // Check for published jobs
    const publishedJobs = jobs.filter(j => j.status === 'PUBLISHED')
    
    if (publishedJobs.length > 0) {
      console.log(`\n✅ Found ${publishedJobs.length} successfully published jobs:`)
      publishedJobs.forEach(job => {
        console.log(`   - Job ${job.id}: WP Post ID ${job.wpPostId}`)
      })
      console.log()
    }
    
  } catch (error) {
    console.error('❌ Error checking automation status:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAutomationStatus()
