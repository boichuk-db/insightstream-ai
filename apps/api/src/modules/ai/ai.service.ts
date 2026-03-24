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

  async analyzeFeedback(content: string) {
    if (!this.model) {
      console.warn('Gemini API key not found, skipping AI analysis.');
      return null;
    }

    const prompt = `
      Analyze the following user feedback and return ONLY a JSON object.
      Schema:
      {
        "sentimentScore": float (0-1),
        "category": "Bug" | "Feature Request" | "UI/UX" | "Performance" | "General",
        "aiSummary": "one sentence summary",
        "tags": ["tag1", "tag2"]
      }

      Feedback: "${content}"
    `;

    try {
      console.log('Sending to Gemini:', content);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log('Gemini raw response:', text);
      
      // Better JSON extraction for potential markdown
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
         console.error('Gemini returned invalid format:', text);
         return null;
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Gemini Analysis Error:', error);
      return null;
    }
  }
}
