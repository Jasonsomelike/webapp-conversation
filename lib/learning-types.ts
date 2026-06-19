export interface KnowledgeReference {
  id: string
  conversationId: string
  messageId?: string
  documentName: string
  datasetName?: string
  pageNumber?: number
  originalPageNumber?: number
  quote?: string
  score?: number
  pageImageUrl?: string
  sourceUrl?: string
  topic: string
  createdAt: string
}

export interface WeakTopic {
  topic: string
  reason: string
  confidence: number
}

export interface LearningRecommendation {
  title: string
  reason: string
  priority: string
  tone: 'primary' | 'mint' | 'orange'
}

export interface LearningAnalysis {
  summary: string
  currentStage: string
  momentum: number
  conversations: number
  references: number
  documents: number
  studyMinutes: number
  weakTopics: WeakTopic[]
  strongTopics: string[]
  trend: number[]
  recommendations: LearningRecommendation[]
}
