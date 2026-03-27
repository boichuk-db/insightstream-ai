import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
  }

  // Predefined taxonomy for Kanban filtering
  private readonly ALLOWED_CATEGORIES = [
    'Bug',
    'Feature',
    'Improvement',
    'UI/UX',
    'Performance',
    'Billing',
    'Support',
    'Security',
  ];

  private readonly ALLOWED_TAGS = [
    'urgent',
    'crash',
    'login',
    'signup',
    'api',
    'dashboard',
    'widget',
    'slow',
    'design',
    'mobile',
    'desktop',
    'integration',
    'pricing',
    'documentation',
    'missing-data',
    'workflow',
    'email',
    'notifications',
  ];

  async generateWeeklyDigest(stats: {
    projectName: string;
    totalCount: number;
    avgSentiment: number;
    categories: Record<string, number>;
    topTags: string[];
    mostNegative: Array<{ content: string; sentimentScore: number | null }>;
  }): Promise<string> {
    if (!this.model)
      return '<p>AI summary unavailable — Gemini key not configured.</p>';

    const prompt = `
You are a product analytics assistant. Based on the weekly feedback data below, write a concise executive digest (3–4 short paragraphs) in plain HTML.
Use only <p> tags. Be specific, actionable, and direct. Do not use markdown, headers, or bullet lists.

Project: ${stats.projectName}
Period: past 7 days
Total feedbacks: ${stats.totalCount}
Average sentiment: ${Math.round(stats.avgSentiment * 100)}% positive
Category breakdown: ${Object.entries(stats.categories)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')}
Top tags: ${stats.topTags.join(', ') || 'none'}
Most negative feedbacks:
${stats.mostNegative.map((f, i) => `${i + 1}. [${Math.round((f.sentimentScore ?? 0.5) * 100)}%] ${f.content}`).join('\n')}

Write the digest now:`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = (await result.response).text().trim();
      // Return as-is (already HTML paragraphs)
      return text || '<p>No summary generated.</p>';
    } catch (err) {
      console.error('Gemini digest error:', err);
      return '<p>AI summary could not be generated this week.</p>';
    }
  }

  async analyzeFeedback(content: string) {
    if (!this.model) {
      console.warn('Gemini API key not found, skipping AI analysis.');
      return null;
    }

    const prompt = `
      Analyze the following user feedback and return ONLY a valid JSON object.

      CRITICAL INSTRUCTIONS:
      1. You MUST categorize the feedback strictly using exactly ONE of the ALLOWED CATEGORIES.
      2. You MUST select 0 to 3 relevant tags strictly from the ALLOWED TAGS list. DO NOT invent new tags.

      ALLOWED CATEGORIES:
      ${this.ALLOWED_CATEGORIES.join(', ')}

      ALLOWED TAGS:
      ${this.ALLOWED_TAGS.join(', ')}

      Schema:
      {
        "sentimentScore": float (0-1),
        "category": "Selected Category From List",
        "aiSummary": "One short sentence summary (max 15 words)",
        "tags": ["tag1", "tag2"]
      }

      Feedback: "${content}"
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Gemini returned invalid format:', text);
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Strict Validation & Post-Processing
      if (parsed.tags && Array.isArray(parsed.tags)) {
        parsed.tags = parsed.tags
          .map((tag: string) => tag.toLowerCase().trim())
          .filter((tag: string) => this.ALLOWED_TAGS.includes(tag));
      }

      if (parsed.category) {
        // Find correct casing or fallback to 'Support'
        const validCat = this.ALLOWED_CATEGORIES.find(
          (c) => c.toLowerCase() === parsed.category.toLowerCase(),
        );
        parsed.category = validCat || 'Support';
      }

      return parsed;
    } catch (error) {
      console.error('Gemini Analysis Error:', error);
      return null;
    }
  }
}
